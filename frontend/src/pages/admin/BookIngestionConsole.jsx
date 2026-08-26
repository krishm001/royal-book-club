import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, Upload, Scan, CheckCircle, RefreshCw, X, Camera, Cpu, Smartphone, Check, ArrowLeft, Search, Compass, BookOpen, ChevronDown, Plus, Minus, Sliders } from 'lucide-react';
import { createBook, lookupBookByIsbn, fetchBookByIsbn, fetchBooks, searchBookMetadata, fetchBookByNtagUid, fetchBookByQrId } from '../../services/libraryApi';
import { fetchBookHouses, createBookHouse } from '../../services/genreApi';
import { uploadBookImage } from '../../services/storageApi';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useLanguage } from '../../i18n/LanguageContext';
import './BookIngestionConsole.css';
const SafeHtml5Qrcode = Html5Qrcode;
const SafeHtml5QrcodeSupportedFormats = Html5QrcodeSupportedFormats;
const BookIngestionConsole = ({
  user
}) => {
  const formatUidWithColons = val => {
    if (!val) return '';
    const clean = val.replace(/[^0-9a-fA-F]/g, '').substring(0, 14).toUpperCase();
    const chunks = [];
    for (let i = 0; i < clean.length; i += 2) {
      chunks.push(clean.substring(i, i + 2));
    }
    return chunks.join(':');
  };
  const [isbn, setIsbn] = useState('');
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [ingestionSuccess, setIngestionSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [backCoverUrl, setBackCoverUrl] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState(0);
  const [totalCopies, setTotalCopies] = useState(1);
  const [availableCopies, setAvailableCopies] = useState(1);
  const [existingBooks, setExistingBooks] = useState([]);
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [editingBookId, setEditingBookId] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bookLanguage, setBookLanguage] = useState('en');
  const {
    t
  } = useLanguage();

  // New fields
  const [selectedHouse, setSelectedHouse] = useState('');
  const [houses, setHouses] = useState([]);
  const [tagsInput, setTagsInput] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [editingTagValue, setEditingTagValue] = useState('');
  const [customGenre, setCustomGenre] = useState('');
  const [subjectPromptOpen, setSubjectPromptOpen] = useState(false);
  const [promptSubjects, setPromptSubjects] = useState([]);
  const [cachedMetadata, setCachedMetadata] = useState(null);
  const [isFieldFetching, setIsFieldFetching] = useState(false);

  // Epic 1 Auto-Suggest Searchable Genre Dropdown
  const [genreSearchQuery, setGenreSearchQuery] = useState('');
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const genreDropdownRef = useRef(null);

  // Epic 2 Interactive "Email To-List" Tag Pills Input
  const [tagTypedValue, setTagTypedValue] = useState('');
  const tagInputRef = useRef(null);

  // NTAG213 and Camera Hardware states
  const [ntagUid, setNtagUid] = useState('');
  const [ntagUids, setNtagUids] = useState([]);
  const [activeScanningIndex, setActiveScanningIndex] = useState(null);
  const [isNfcReading, setIsNfcReading] = useState(false);
  const [writeIosRedirect, setWriteIosRedirect] = useState(false);
  const [nfcError, setNfcError] = useState('');
  const [nfcSuccess, setNfcSuccess] = useState(false);
  const [alternativeIsbnsInput, setAlternativeIsbnsInput] = useState('');
  const [copyQrIds, setCopyQrIds] = useState([]);

  // Synchronize ntagUids and copyQrIds size with totalCopies
  useEffect(() => {
    setNtagUids(prev => {
      const copy = [...prev];
      if (copy.length < totalCopies) {
        while (copy.length < totalCopies) {
          copy.push('');
        }
      } else if (copy.length > totalCopies) {
        copy.splice(totalCopies);
      }
      return copy;
    });
    setCopyQrIds(prev => {
      const copy = [...prev];
      if (copy.length < totalCopies) {
        while (copy.length < totalCopies) {
          copy.push('');
        }
      } else if (copy.length > totalCopies) {
        copy.splice(totalCopies);
      }
      return copy;
    });
  }, [totalCopies]);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState('isbn'); // 'isbn' or 'cover'
  const [cameraError, setCameraError] = useState('');
  const [activeQrScanningIndex, setActiveQrScanningIndex] = useState(null);
  const activeQrScanningIndexRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);

  // Advanced camera control states
  const [zoomValue, setZoomValue] = useState(1.0);
  const [activeVideoTrack, setActiveVideoTrack] = useState(null);
  const [zoomCapabilities, setZoomCapabilities] = useState(null);
  const [isHardwareZoomActive, setIsHardwareZoomActive] = useState(false);
  const [isFitMode, setIsFitMode] = useState(false); // false = cover (fill), true = contain (fit)
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const videoRef = useRef(null);
  const barcodeIntervalRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);

  // NFC Write & iOS warning states
  const [nfcWriteModalOpen, setNfcWriteModalOpen] = useState(false);
  const [nfcWriteLoading, setNfcWriteLoading] = useState(false);
  const [nfcWriteSuccess, setNfcWriteSuccess] = useState(false);
  const [nfcWriteError, setNfcWriteError] = useState('');
  const [pendingBookDto, setPendingBookDto] = useState(null);
  const [iosWarningModalOpen, setIosWarningModalOpen] = useState(false);
  const [writeCountdown, setWriteCountdown] = useState(10);
  const nfcAbortControllerRef = useRef(null);
  const nfcScanAbortControllerRef = useRef(null);
  const [shouldWriteNfc, setShouldWriteNfc] = useState(false);

  // Clean up active scan/write abort controllers on unmount
  useEffect(() => {
    return () => {
      if (nfcScanAbortControllerRef.current) {
        try {
          nfcScanAbortControllerRef.current.abort();
        } catch (err) {
          console.warn("Failed to abort NFC scan on unmount:", err);
        }
      }
      if (nfcAbortControllerRef.current) {
        try {
          nfcAbortControllerRef.current.abort();
        } catch (err) {
          console.warn("Failed to abort NFC write on unmount:", err);
        }
      }
    };
  }, []);

  // Search Metadata Drawer states
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [searchError, setSearchError] = useState('');
  const handleMetadataSearch = async e => {
    if (e) e.preventDefault();
    if (!searchQuery || !searchQuery.trim()) return;
    setIsSearchingMetadata(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const data = await searchBookMetadata(searchQuery.trim());
      setSearchResults(data || []);
      if (!data || data.length === 0) {
        setSearchError('No matching metadata records found.');
      }
    } catch (err) {
      console.error('Metadata search failed:', err);
      setSearchError('Failed to retrieve search results from Google Books API.');
    } finally {
      setIsSearchingMetadata(false);
    }
  };
  const handleSelectSearchResult = book => {
    try {
      setErrorMessage('');
      setManualTitle(book.title || '');
      setManualAuthor(Array.isArray(book.authors) ? book.authors.join(', ') : book.author || book.authors || '');
      setPublisher(book.publisher || '');
      setPublishDate(book.publishDate || '');
      setCoverUrl(book.coverUrl || '');
      setBackCoverUrl(book.backCoverUrl || '');
      setDescription(book.description || book.subtitle || '');
      setPages(book.pages || 0);
      setIsbn(book.isbn || '');
      setTotalCopies(1);
      setAvailableCopies(1);
      setTagsInput('');
      setNtagUid('');
      setIsSearchDrawerOpen(false);
      setInfoMessage('Auto-populated form with selected Google Books metadata; complete any remaining fields.');
    } catch (err) {
      console.error("Error inside handleSelectSearchResult:", err);
      setErrorMessage(`Failed to parse selected book card: ${err.message}`);
    }
  };
  const loadExistingBooks = async () => {
    try {
      const res = await fetchBooks();
      if (Array.isArray(res)) {
        setExistingBooks(res);
      }
    } catch (err) {
      console.warn("Unable to load existing catalog for admin editing:", err);
    }
  };
  const handleSelectExistingBook = book => {
    if (!book) return;
    setIsEditMode(true);
    setIsEditingExisting(true);
    setEditingBookId(book.id || book.isbn || '');
    setIsbn(book.isbn || '');
    setManualTitle(book.title || '');
    setManualAuthor(Array.isArray(book.authors) ? book.authors.join(', ') : book.author || '');
    setPublisher(book.publisher || '');
    setPublishDate(book.publishDate || book.publishYear || '');
    setCoverUrl(book.coverUrl || '');
    setBackCoverUrl(book.backCoverUrl || '');
    setDescription(book.description || book.subtitle || '');
    setPages(book.pages || 0);
    setTotalCopies(book.totalCopies || 1);
    setAvailableCopies(book.availableCopies || 1);
    setBookLanguage(book.language || 'en');
    const defaultHouse = book.genre || book.houseName || (houses.length > 0 ? houses[0] : '');
    setSelectedHouse(defaultHouse);
    setGenreSearchQuery(defaultHouse);
    setNtagUid(formatUidWithColons(book.ntagUid || ''));
    setAlternativeIsbnsInput(Array.isArray(book.alternativeIsbns) ? book.alternativeIsbns.join(', ') : '');
    if (book.copies) {
      setCopyQrIds(book.copies.map(c => c.qrId || ''));
      setNtagUids(book.copies.map(c => formatUidWithColons(c.ntagUid || '')));
    } else {
      setCopyQrIds([]);
      setNtagUids(book.ntagUids ? book.ntagUids.map(uid => formatUidWithColons(uid || '')) : []);
    }
    if (book.tags) {
      setTagsInput(Array.isArray(book.tags) ? book.tags.join(', ') : book.tags);
    } else {
      setTagsInput('');
    }
    setInfoMessage(`Loaded existing database record for "${book.title}". Editing this form will overwrite its catalog entry on save.`);
  };
  const handleResetForm = () => {
    setIsEditMode(false);
    setIsEditingExisting(false);
    setEditingBookId('');
    setIsbn('');
    setManualTitle('');
    setManualAuthor('');
    setPublisher('');
    setPublishDate('');
    setCoverUrl('');
    setBackCoverUrl('');
    setDescription('');
    setPages(0);
    setTotalCopies(1);
    setAvailableCopies(1);
    setBookLanguage('en');
    const defaultHouse = houses.length > 0 ? houses[0] : '';
    setSelectedHouse(defaultHouse);
    setGenreSearchQuery(defaultHouse);
    setNtagUid('');
    setNtagUids([]);
    setAlternativeIsbnsInput('');
    setCopyQrIds([]);
    setActiveScanningIndex(null);
    setTagsInput('');
    setInfoMessage('');
    setErrorMessage('');
    setNfcSuccess(false);
    setNfcError('');
  };

  // Check if user is admin
  const isAdmin = user && user.role === 'ADMIN';

  // Scroll directly to "Search & Edit Local Ledger Database" panel on landing
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById('db-search-panel');
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const handleClickOutside = event => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target)) {
        setGenreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  useEffect(() => {
    if (isAdmin) {
      const loadHouses = async () => {
        try {
          const res = await fetchBookHouses();
          if (res?.success && Array.isArray(res.data)) {
            const names = res.data.map(h => h.name);
            setHouses(names);
            if (names.length > 0) {
              setSelectedHouse(names[0]);
              setGenreSearchQuery(names[0]);
            }
          } else {
            const defaults = ['Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic'];
            setHouses(defaults);
            setSelectedHouse(defaults[0]);
            setGenreSearchQuery(defaults[0]);
          }
        } catch (err) {
          console.warn('Unable to load book houses', err);
          const defaults = ['Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic'];
          setHouses(defaults);
          setSelectedHouse(defaults[0]);
          setGenreSearchQuery(defaults[0]);
        }
      };
      loadHouses();
      loadExistingBooks();
    }
  }, [isAdmin]);
  const fetchExternalMetadata = async targetIsbn => {
    try {
      const metadata = await lookupBookByIsbn(targetIsbn);
      if (!metadata || !metadata.title && !metadata.authors) {
        setErrorMessage('Could not find metadata for this ISBN on external registries.');
        return;
      }
      setCachedMetadata(metadata);
      setManualTitle(metadata.title || '');
      setManualAuthor(Array.isArray(metadata.authors) ? metadata.authors.map(author => typeof author === 'object' && author ? author.name : author).join(', ') : metadata.authors || '');
      setPublisher(metadata.publishers?.[0] || metadata.publisher || '');
      setPublishDate(metadata.publish_date || metadata.publishDate || '');
      setCoverUrl(metadata.coverUrl || metadata.cover?.large || '');
      setDescription(metadata.description || metadata.subtitle || '');
      setPages(metadata.pages || metadata.number_of_pages || 0);
      setTotalCopies(1);
      setAvailableCopies(1);
      setTagsInput('');
      setNtagUid('');
      setInfoMessage('Lookup returned metadata from external registry; complete any missing payload fields.');
      if (metadata.subjects && metadata.subjects.length > 0) {
        await handleSubjectsFetch(metadata.subjects);
      }
    } catch (lookupError) {
      console.error("External lookup error:", lookupError);
      setErrorMessage(`Could not fetch book metadata from the backend lookup service: ${lookupError.message}`);
    }
  };
  const handleSubjectsFetch = async fetchedSubjects => {
    if (!fetchedSubjects || fetchedSubjects.length === 0) return;
    const normalizeString = str => {
      if (!str) return '';
      return str.toLowerCase().replace(/[\p{P}\p{Z}\p{S}]/gu, '');
    };

    // Flatten any elements containing internal commas so that they are treated as separate individual tags
    const flattenedSubjects = Array.from(new Set(fetchedSubjects.flatMap(s => (s || '').split(',')).map(s => s.trim()).filter(Boolean)));
    const currentTags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
    const promptList = [];
    const tagsToAdd = [];
    let matchedGenreForSelection = null;
    for (const subject of flattenedSubjects) {
      const cleanSubj = subject.trim();
      if (!cleanSubj) continue;
      const exactGenreMatch = houses.find(h => h === cleanSubj);
      const caseInsensitiveGenreMatch = houses.find(h => h.toLowerCase() === cleanSubj.toLowerCase());
      const closeGenreMatch = houses.find(h => normalizeString(h) === normalizeString(cleanSubj));
      const matchedGenre = exactGenreMatch || caseInsensitiveGenreMatch || closeGenreMatch;
      if (matchedGenre) {
        if (!matchedGenreForSelection) {
          matchedGenreForSelection = matchedGenre;
        }
        promptList.push({
          name: cleanSubj,
          status: 'matched-genre',
          matchedName: matchedGenre
        });
        continue;
      }
      const exactTagMatch = currentTags.find(t => t === cleanSubj);
      const caseInsensitiveTagMatch = currentTags.find(t => t.toLowerCase() === cleanSubj.toLowerCase());
      const closeTagMatch = currentTags.find(t => normalizeString(t) === normalizeString(cleanSubj));
      const matchedTag = exactTagMatch || caseInsensitiveTagMatch || closeTagMatch;
      if (matchedTag) {
        promptList.push({
          name: cleanSubj,
          status: 'matched-tag',
          matchedName: matchedTag
        });
        continue;
      }

      // No match found across genres and existing tags
      promptList.push({
        name: cleanSubj,
        status: 'no-match'
      });

      // Ensure we don't add duplicate tags in the same batch
      const exactTagToAddMatch = tagsToAdd.find(t => t === cleanSubj);
      const closeTagToAddMatch = tagsToAdd.find(t => normalizeString(t) === normalizeString(cleanSubj));
      if (!exactTagToAddMatch && !closeTagToAddMatch) {
        tagsToAdd.push(cleanSubj);
      }
    }

    // Automatically append any truly unmatched tags to form tagsInput
    if (tagsToAdd.length > 0) {
      setTagsInput(prev => {
        const existing = prev ? prev.split(',').map(s => s.trim()).filter(Boolean) : [];
        // Ensure no duplicate matching with incoming tagsToAdd
        const filteredNewTags = tagsToAdd.filter(newTag => {
          const isDup = existing.some(exTag => normalizeString(exTag) === normalizeString(newTag));
          return !isDup;
        });
        const combined = Array.from(new Set([...existing, ...filteredNewTags]));
        return combined.join(', ');
      });
    }
    if (matchedGenreForSelection) {
      setSelectedHouse(matchedGenreForSelection);
      setGenreSearchQuery(matchedGenreForSelection);
      setInfoMessage(`Genre "${matchedGenreForSelection}" automatically selected based on matched subject.`);
    }
    setPromptSubjects(promptList);
    setSubjectPromptOpen(true);
  };
  const handleCreateGenreFromSubject = async subjectName => {
    try {
      const payload = {
        id: subjectName.toLowerCase().replace(/\s+/g, '-'),
        name: subjectName,
        translations: {
          hi: {
            name: subjectName
          },
          kn: {
            name: subjectName
          }
        }
      };
      const res = await createBookHouse(payload);
      if (res && res.success) {
        setHouses(prev => [...prev, res.data.name]);
        setSelectedHouse(res.data.name);
        setGenreSearchQuery(res.data.name);
        setInfoMessage(`Created and selected new genre "${res.data.name}" from subjects.`);
      } else {
        setErrorMessage('Failed to create new genre on the server.');
      }
    } catch (err) {
      console.error('Failed to create genre from subject:', err);
      setErrorMessage('Failed to create genre from subject.');
    } finally {
      setSubjectPromptOpen(false);
    }
  };
  const handleCreateGenreSearchDropdown = async name => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    try {
      const payload = {
        id: trimmedName.toLowerCase().replace(/\s+/g, '-'),
        name: trimmedName,
        translations: {
          hi: {
            name: trimmedName
          },
          kn: {
            name: trimmedName
          }
        }
      };
      const res = await createBookHouse(payload);
      if (res && res.success) {
        const newGenreName = res.data.name;
        setHouses(prev => [...prev, newGenreName]);
        setSelectedHouse(newGenreName);
        setGenreSearchQuery(newGenreName);
        setInfoMessage(`Created and selected new genre "${newGenreName}".`);
      } else {
        setErrorMessage('Failed to establish custom genre on server.');
      }
    } catch (err) {
      console.error('Failed to create custom genre from search:', err);
      setErrorMessage('Failed to create custom genre on server.');
    } finally {
      setGenreDropdownOpen(false);
    }
  };
  const currentTagsArray = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  const handleDeleteTag = tagToDelete => {
    const updated = currentTagsArray.filter(t => t !== tagToDelete);
    setTagsInput(updated.join(', '));
  };
  const handleTagInputChange = e => {
    const val = e.target.value;
    if (val.endsWith(',')) {
      const newTag = val.slice(0, -1).trim();
      if (newTag) {
        addTagPill(newTag);
      }
      setTagTypedValue('');
    } else {
      setTagTypedValue(val);
    }
  };
  const handleTagInputKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagTypedValue.trim();
      if (newTag) {
        addTagPill(newTag);
      }
      setTagTypedValue('');
    } else if (e.key === 'Backspace' && !tagTypedValue) {
      if (currentTagsArray.length > 0) {
        handleDeleteTag(currentTagsArray[currentTagsArray.length - 1]);
      }
    }
  };
  const addTagPill = newTag => {
    const normalizeString = str => {
      if (!str) return '';
      return str.toLowerCase().replace(/[\p{P}\p{Z}\p{S}]/gu, '');
    };
    const isDup = currentTagsArray.some(t => normalizeString(t) === normalizeString(newTag));
    if (!isDup) {
      const updated = [...currentTagsArray, newTag];
      setTagsInput(updated.join(', '));
    }
  };
  const fetchFieldMetadata = async () => {
    if (!isbn || !isbn.trim()) {
      setErrorMessage('Please enter an ISBN first to fetch field metadata.');
      return null;
    }
    const cleanIsbn = isbn.trim();
    if (cachedMetadata && cachedMetadata.isbn === cleanIsbn) {
      return cachedMetadata;
    }
    setIsFieldFetching(true);
    setErrorMessage('');
    try {
      const metadata = await lookupBookByIsbn(cleanIsbn);
      if (metadata && (metadata.title || metadata.authors)) {
        setCachedMetadata(metadata);
        return metadata;
      } else {
        setErrorMessage('Could not find metadata for this ISBN on external registries.');
        return null;
      }
    } catch (err) {
      console.error('Field metadata fetch failed:', err);
      setErrorMessage('Failed to fetch external metadata for this ISBN.');
      return null;
    } finally {
      setIsFieldFetching(false);
    }
  };
  const handleFetchField = async fieldName => {
    const metadata = await fetchFieldMetadata();
    if (!metadata) return;
    switch (fieldName) {
      case 'title':
        setManualTitle(metadata.title || '');
        setInfoMessage('Fetched title successfully!');
        break;
      case 'author':
        setManualAuthor(Array.isArray(metadata.authors) ? metadata.authors.map(a => typeof a === 'object' && a ? a.name : a).join(', ') : metadata.authors || '');
        setInfoMessage('Fetched author successfully!');
        break;
      case 'publisher':
        setPublisher(metadata.publisher || '');
        setInfoMessage('Fetched publisher successfully!');
        break;
      case 'publishDate':
        setPublishDate(metadata.publishDate || metadata.publish_date || '');
        setInfoMessage('Fetched publication date successfully!');
        break;
      case 'coverUrl':
        setCoverUrl(metadata.coverUrl || '');
        setInfoMessage('Fetched cover URL successfully!');
        break;
      case 'description':
        setDescription(metadata.description || metadata.subtitle || '');
        setInfoMessage('Fetched description successfully!');
        break;
      case 'pages':
        setPages(metadata.pages || 0);
        setInfoMessage('Fetched pages successfully!');
        break;
      case 'genreTags':
        if (metadata.subjects && metadata.subjects.length > 0) {
          await handleSubjectsFetch(metadata.subjects);
        } else {
          setInfoMessage('No subjects found on the external registry for this volume.');
        }
        break;
      default:
        break;
    }
  };
  const handleIsbnFetch = async forcedIsbn => {
    const targetIsbn = typeof forcedIsbn === 'string' ? forcedIsbn : isbn;
    if (!targetIsbn || !targetIsbn.trim()) return;
    setErrorMessage('');
    setInfoMessage('');
    setFetchingMetadata(true);
    setIsEditMode(false);
    try {
      const existingBook = await fetchBookByIsbn(targetIsbn.trim());
      if (existingBook && existingBook.title) {
        setManualTitle(existingBook.title || '');
        setManualAuthor(Array.isArray(existingBook.authors) ? existingBook.authors.join(', ') : existingBook.author || '');
        setPublisher(existingBook.publisher || '');
        setPublishDate(existingBook.publishDate || existingBook.publishYear || '');
        setCoverUrl(existingBook.coverUrl || '');
        setDescription(existingBook.description || existingBook.subtitle || '');
        setPages(existingBook.pages || 0);
        setTotalCopies(existingBook.totalCopies || 1);
        setAvailableCopies(existingBook.availableCopies || existingBook.totalCopies || 1);

        // Populate new fields
        const matchedGenre = existingBook.genre || (houses.length > 0 ? houses[0] : '');
        setSelectedHouse(matchedGenre);
        setGenreSearchQuery(matchedGenre);
        setTagsInput(Array.isArray(existingBook.tags) ? existingBook.tags.join(', ') : '');
        setNtagUid(formatUidWithColons(existingBook.ntagUid || ''));
        setAlternativeIsbnsInput(Array.isArray(existingBook.alternativeIsbns) ? existingBook.alternativeIsbns.join(', ') : '');
        if (existingBook.copies) {
          setCopyQrIds(existingBook.copies.map(c => c.qrId || ''));
          setNtagUids(existingBook.copies.map(c => formatUidWithColons(c.ntagUid || '')));
        } else {
          setCopyQrIds([]);
          setNtagUids(existingBook.ntagUids ? existingBook.ntagUids.map(uid => formatUidWithColons(uid || '')) : []);
        }
        setBookLanguage(existingBook.language || 'en');
        setIsEditMode(true);
        setIsEditingExisting(true);
        setInfoMessage('Existing book found in catalog. Edit the fields and save the updated details.');
      } else {
        await fetchExternalMetadata(targetIsbn.trim());
      }
    } catch (catalogError) {
      console.warn("Catalog lookup failed, falling back to external ISBN fetch:", catalogError);
      await fetchExternalMetadata(targetIsbn.trim());
    } finally {
      setFetchingMetadata(false);
    }
  };

  // Camera & Scanner Handlers
  const startCopyQrScan = index => {
    setCameraError('');
    activeQrScanningIndexRef.current = index;
    setActiveQrScanningIndex(index);
    setCameraMode('copy_qr');
    setCameraModalOpen(true);
  };
  const startCamera = async mode => {
    setCameraError('');
    setCameraMode(mode);
    setCameraModalOpen(true);
    if (mode === 'cover') {
      try {
        // Enumerate video devices first to see if multiple sensors (ultra-wide/front/telephoto) are available
        let devices = [];
        let targetCameraId = null;
        try {
          devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          setCameraDevices(videoDevices);
          const backCameras = videoDevices.filter(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'));
          if (backCameras.length > 1) {
            // Default to the second back camera (index 1) for the wider view by default
            targetCameraId = backCameras[1].deviceId;
          } else if (backCameras.length === 1) {
            targetCameraId = backCameras[0].deviceId;
          } else if (videoDevices.length > 0) {
            targetCameraId = videoDevices[videoDevices.length - 1].deviceId;
          }
          if (targetCameraId) {
            setSelectedCameraId(targetCameraId);
          }
        } catch (enumErr) {
          console.warn("Failed to enumerate camera devices:", enumErr);
        }
        let stream;
        try {
          const videoConstraints = targetCameraId ? {
            deviceId: {
              exact: targetCameraId
            },
            width: {
              ideal: 1080
            },
            height: {
              ideal: 1440
            },
            // Native vertical 3:4 aspect ratio
            aspectRatio: {
              ideal: 0.75
            },
            frameRate: {
              ideal: 30
            }
          } : {
            facingMode: 'environment',
            width: {
              ideal: 1080
            },
            height: {
              ideal: 1440
            },
            aspectRatio: {
              ideal: 0.75
            },
            frameRate: {
              ideal: 30
            }
          };
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints
          });
        } catch (streamErr) {
          console.warn("Failed to get stream with exact deviceId, falling back to facingMode environment:", streamErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: {
                ideal: 1080
              },
              height: {
                ideal: 1440
              },
              aspectRatio: {
                ideal: 0.75
              },
              frameRate: {
                ideal: 30
              }
            }
          });
        }
        setCameraStream(stream);
        const track = stream.getVideoTracks()[0];
        setActiveVideoTrack(track);
        if (track && typeof track.getCapabilities === 'function') {
          try {
            const capabilities = track.getCapabilities();
            if (capabilities && capabilities.zoom) {
              setZoomCapabilities({
                min: capabilities.zoom.min || 1.0,
                max: capabilities.zoom.max || 3.0,
                step: capabilities.zoom.step || 0.1
              });
            } else {
              setZoomCapabilities(null);
            }
          } catch (capErr) {
            console.warn("Could not retrieve track capabilities:", capErr);
            setZoomCapabilities(null);
          }
        } else {
          setZoomCapabilities(null);
        }
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError('Camera access denied or unavailable. Please upload a file manually.');
      }
    }
  };
  const switchCamera = async () => {
    if (cameraDevices.length <= 1) return;

    // Stop current stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    // Find next device to use
    const currentIndex = cameraDevices.findIndex(d => d.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameraDevices.length;
    const nextDevice = cameraDevices[nextIndex];
    setSelectedCameraId(nextDevice.deviceId);
    console.log(`Switching camera to: ${nextDevice.label} (ID: ${nextDevice.deviceId})`);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: {
            exact: nextDevice.deviceId
          },
          width: {
            ideal: 1080
          },
          height: {
            ideal: 1440
          },
          aspectRatio: {
            ideal: 0.75
          },
          frameRate: {
            ideal: 30
          }
        }
      });
      setCameraStream(stream);
      const track = stream.getVideoTracks()[0];
      setActiveVideoTrack(track);
      if (track && typeof track.getCapabilities === 'function') {
        try {
          const capabilities = track.getCapabilities();
          if (capabilities && capabilities.zoom) {
            setZoomCapabilities({
              min: capabilities.zoom.min || 1.0,
              max: capabilities.zoom.max || 3.0,
              step: capabilities.zoom.step || 0.1
            });
          } else {
            setZoomCapabilities(null);
          }
        } catch (capErr) {
          setZoomCapabilities(null);
        }
      } else {
        setZoomCapabilities(null);
      }

      // Reset zoom to 1.0 on camera switch
      setZoomValue(1.0);
      setIsHardwareZoomActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Failed to switch camera source stream:", err);
      setCameraError(`Failed to load selected camera: ${err.message || err}`);
    }
  };
  const handleZoomChange = async newVal => {
    const val = parseFloat(newVal);
    setZoomValue(val);
    if (val >= 1.0 && activeVideoTrack && zoomCapabilities) {
      try {
        await activeVideoTrack.applyConstraints({
          advanced: [{
            zoom: val
          }]
        });
        setIsHardwareZoomActive(true);
      } catch (err) {
        console.warn("Failed to apply hardware zoom constraint, using digital zoom fallback:", err);
        setIsHardwareZoomActive(false);
      }
    } else {
      setIsHardwareZoomActive(false);
      // Reset hardware zoom constraint if zoomValue is less than 1.0 (digital zoom-out mode)
      if (activeVideoTrack && zoomCapabilities) {
        try {
          await activeVideoTrack.applyConstraints({
            advanced: [{
              zoom: 1.0
            }]
          });
        } catch (err) {
          console.warn("Failed to reset hardware track constraint:", err);
        }
      }
    }
  };
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping html5QrCode during manual stop:', err);
      }
      html5QrCodeRef.current = null;
    }
    if (cameraStream) {
      try {
        cameraStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn('Error stopping cameraStream tracks:', err);
      }
      setCameraStream(null);
    }
    setActiveVideoTrack(null);
    setZoomCapabilities(null);
    setIsHardwareZoomActive(false);
    setZoomValue(1.0);
    setCameraDevices([]);
    setSelectedCameraId('');
    try {
      const videos = document.querySelectorAll('#qr-reader video');
      videos.forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject;
          if (typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => track.stop());
          }
          video.srcObject = null;
        }
      });
    } catch (err) {
      console.warn('Failed to manually stop track fallback', err);
    }
    if (barcodeIntervalRef.current) {
      clearInterval(barcodeIntervalRef.current);
      barcodeIntervalRef.current = null;
    }
    setCameraModalOpen(false);
  };
  const handleScannerClick = (e, scannerInstance) => {
    if (!scannerInstance) return;
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Create a beautiful focus ring element
    const ring = document.createElement('div');
    ring.className = 'scanner-focus-ring';
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    container.appendChild(ring);

    // Remove the ring after animation completes
    setTimeout(() => {
      ring.remove();
    }, 750);

    // Refocus trick!
    try {
      const videoElem = container.querySelector('video');
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject;
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
          if (capabilities.zoom) {
            const currentZ = 2.0; // default ideal zoom
            const tempZoom = 1.8;
            track.applyConstraints({
              advanced: [{
                zoom: tempZoom
              }]
            }).then(() => {
              setTimeout(() => {
                track.applyConstraints({
                  advanced: [{
                    zoom: currentZ
                  }]
                }).catch(err => console.warn('[Scanner refocus] Failed to restore zoom:', err));
              }, 120);
            }).catch(err => console.warn('[Scanner refocus] Failed to toggle zoom:', err));
          } else {
            // Nudge continuous focus if zoom isn't available
            const advancedConstraints = {};
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              advancedConstraints.focusMode = 'continuous';
            }
            if (Object.keys(advancedConstraints).length > 0) {
              track.applyConstraints({
                advanced: [advancedConstraints]
              }).catch(err => console.warn('[Scanner refocus] Failed to apply focusMode:', err));
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Scanner refocus] Error during manual refocus trigger:', err);
    }
  };
  useEffect(() => {
    if (cameraModalOpen && (cameraMode === 'isbn' || cameraMode === 'copy_qr')) {
      const timer = setTimeout(() => {
        const qrReaderElem = document.getElementById('qr-reader');
        if (!qrReaderElem) {
          console.error('qr-reader element not found in DOM');
          return;
        }
        try {
          const formats = [SafeHtml5QrcodeSupportedFormats.QR_CODE, SafeHtml5QrcodeSupportedFormats.EAN_13, SafeHtml5QrcodeSupportedFormats.EAN_8, SafeHtml5QrcodeSupportedFormats.UPC_A, SafeHtml5QrcodeSupportedFormats.UPC_E, SafeHtml5QrcodeSupportedFormats.CODE_128, SafeHtml5QrcodeSupportedFormats.CODE_39, SafeHtml5QrcodeSupportedFormats.CODE_93];
          const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          const html5QrCode = new SafeHtml5Qrcode("qr-reader", {
            formatsToSupport: formats,
            verbose: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: !isIOS
            }
          });
          html5QrCodeRef.current = html5QrCode;
          const cameraConfig = isIOS ? {
            facingMode: "environment",
            width: {
              ideal: 1920
            },
            height: {
              ideal: 1080
            }
          } : {
            facingMode: "environment"
          };
          const startScanning = cameraIdOrConfig => {
            if (!html5QrCodeRef.current) return;
            const activeConfig = isIOS ? cameraConfig : cameraIdOrConfig;
            html5QrCode.start(activeConfig, {
              fps: 25,
              qrbox: (w, h) => {
                const idealW = Math.min(w * 0.9, 350);
                const idealH = Math.min(h * 0.8, 250);
                return {
                  width: idealW,
                  height: idealH
                };
              },
              videoConstraints: isIOS ? cameraConfig : {
                facingMode: "environment"
              }
            }, (decodedText, decodedResult) => {
              console.log(`Scan decoded successfully: ${decodedText}`);

              // Parse scanned text
              const clean = decodedText.trim();
              const qrMatch = clean.match(/qr=(\d+)/i) || clean.match(/^(\d{1,9})$/);
              const isQrId = !!qrMatch;
              const parsedValue = isQrId ? qrMatch[1] || clean : clean.replace(/[^0-9]/g, '');
              html5QrCode.stop().then(async () => {
                html5QrCodeRef.current = null;
                setCameraModalOpen(false);
                if (cameraMode === 'copy_qr') {
                  const targetIndex = activeQrScanningIndexRef.current !== null ? activeQrScanningIndexRef.current : activeQrScanningIndex;
                  setCopyQrIds(prev => {
                    const next = [...prev];
                    while (next.length <= targetIndex) next.push('');
                    next[targetIndex] = parsedValue;
                    return next;
                  });
                  setInfoMessage(`Successfully scanned QR ID: ${parsedValue} for Copy #${targetIndex + 1}.`);
                } else {
                  if (isQrId) {
                    setInfoMessage(`Searching database for Copy QR ID: ${parsedValue}...`);
                    try {
                      const book = await fetchBookByQrId(parsedValue);
                      if (book) {
                        handleSelectExistingBook(book);
                        setInfoMessage(`Book "${book.title}" successfully loaded via copy QR ID #${parsedValue}.`);
                      } else {
                        setErrorMessage(`No matching book found for Copy QR ID #${parsedValue}.`);
                      }
                    } catch (err) {
                      console.error("Failed to fetch book by QR ID:", err);
                      setErrorMessage(`Failed to search Copy QR ID #${parsedValue}.`);
                    }
                  } else {
                    setInfoMessage(`Searching ledger for ISBN: ${parsedValue}...`);
                    try {
                      const allBooks = await fetchBooks();
                      const matchedBook = allBooks.find(b => b.isbn && b.isbn.replace(/[-\s]/g, '') === parsedValue || Array.isArray(b.alternativeIsbns) && b.alternativeIsbns.some(alt => alt && alt.replace(/[-\s]/g, '') === parsedValue));
                      if (matchedBook) {
                        handleSelectExistingBook(matchedBook);
                        setInfoMessage(`Existing book "${matchedBook.title}" loaded from database.`);
                        return;
                      }
                    } catch (err) {
                      console.warn("Local ledger check failed:", err);
                    }
                    setIsbn(parsedValue);
                    handleIsbnFetch(parsedValue);
                  }
                }
              }).catch(err => {
                console.error('Failed to stop html5Qrcode', err);
                setCameraModalOpen(false);
              });
            }, errorMessage => {
              // Ignore scan failures per frame
            }).then(() => {
              try {
                const videoElem = document.querySelector("#qr-reader video");
                if (videoElem && videoElem.srcObject) {
                  const stream = videoElem.srcObject;
                  const track = stream.getVideoTracks()[0];
                  if (track) {
                    const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
                    const advancedConstraints = {};
                    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                      advancedConstraints.focusMode = 'continuous';
                    }
                    if (isIOS && capabilities.zoom) {
                      const minZ = capabilities.zoom.min || 1;
                      const maxZ = capabilities.zoom.max || 10;
                      advancedConstraints.zoom = Math.min(Math.max(2.0, minZ), maxZ);
                      console.log('[qr-reader] Applied optimal iOS WebRTC zoom:', advancedConstraints.zoom);
                    }
                    if (Object.keys(advancedConstraints).length > 0) {
                      track.applyConstraints({
                        advanced: [advancedConstraints]
                      }).then(() => console.log('[qr-reader] Track constraints applied successfully:', advancedConstraints)).catch(err => console.warn('[qr-reader] Failed to apply track constraints', err));
                    }
                  }
                }
              } catch (e) {
                console.warn('[qr-reader] Unable to configure autofocus:', e);
              }
              if (html5QrCodeRef.current !== html5QrCode || !cameraModalOpen) {
                console.log('Ingestion scanner started but was cancelled during boot. Stopping now.');
                html5QrCode.stop().catch(err => console.warn('Failed late stop inside start promise', err));
              }
            }).catch(err => {
              console.error('Html5Qrcode start error:', err);
              // Fallback to simpler facingMode config object if device ID string start failed
              if (typeof cameraIdOrConfig === 'string') {
                console.log('Retrying barcode scanner with facingMode constraint object...');
                startScanning({
                  facingMode: "environment"
                });
              } else {
                setCameraError(`Failed to start barcode scanner: ${err.message || err}`);
              }
            });
          };
          if (isIOS) {
            console.log("iOS device detected. Starting directly with environment HD config to bypass lens bugs.");
            startScanning(cameraConfig);
          } else {
            // Actively probe for hardware back cameras first for robust mobile compatibility
            SafeHtml5Qrcode.getCameras().then(devices => {
              if (devices && devices.length > 0) {
                console.log("Ingestion barcode scanner detected video devices:", devices);

                // Filter to find physical back/rear/environment cameras
                let selectedDevice = devices.find(device => {
                  const label = device.label.toLowerCase();
                  return label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('main') || label.includes('external');
                });

                // Fallback: any camera that doesn't state it's a front-facing lens
                if (!selectedDevice) {
                  selectedDevice = devices.find(device => {
                    const label = device.label.toLowerCase();
                    return !label.includes('front') && !label.includes('selfie') && !label.includes('user');
                  });
                }

                // Fallback to the last video input device (rear cameras are usually indexed last on standard dual-camera mobiles)
                const finalCameraId = selectedDevice ? selectedDevice.id : devices[devices.length - 1].id;
                console.log(`Starting barcode scanner with camera ID: ${finalCameraId} (${selectedDevice?.label || 'Last input fallback'})`);
                startScanning(finalCameraId);
              } else {
                console.log("No video devices listed. Starting with environment constraint directly.");
                startScanning({
                  facingMode: "environment"
                });
              }
            }).catch(err => {
              console.warn("getCameras failed or denied, attempting default environment startup:", err);
              startScanning({
                facingMode: "environment"
              });
            });
          }
        } catch (err) {
          console.error('Html5Qrcode initialization error:', err);
          setCameraError(`Failed to initialize scanner: ${err.message || err}`);
        }
      }, 150);
      return () => {
        clearTimeout(timer);
        if (html5QrCodeRef.current) {
          const currentScanner = html5QrCodeRef.current;
          if (currentScanner.isScanning) {
            currentScanner.stop().then(() => {
              html5QrCodeRef.current = null;
            }).catch(err => {
              console.error('Failed to stop html5Qrcode in cleanup', err);
            });
          } else {
            html5QrCodeRef.current = null;
          }
        }
      };
    }
  }, [cameraModalOpen, cameraMode, activeQrScanningIndex]);
  const captureCoverPhoto = () => {
    if (!videoRef.current) return;
    const vWidth = videoRef.current.videoWidth || 1280;
    const vHeight = videoRef.current.videoHeight || 720;
    const streamAspect = vWidth / vHeight;
    const targetAspect = 3 / 4; // Portrait 3:4 aspect ratio

    // Create canvas
    const canvas = document.createElement('canvas');
    let sx, sy, cropWidth, cropHeight;
    const finalZoom = !isHardwareZoomActive ? zoomValue : 1.0;
    if (isFitMode) {
      // In Fit Frame mode, capture the complete uncropped camera stream sensor to maximize field of view
      canvas.width = vWidth;
      canvas.height = vHeight;
      cropWidth = vWidth;
      cropHeight = vHeight;
      sx = 0;
      sy = 0;
      console.log(`Capturing uncropped Fit Frame stream (${vWidth}x${vHeight}) directly.`);
    } else {
      // In Fill Frame mode, crop to standard high-resolution 3:4 portrait
      canvas.width = 900;
      canvas.height = 1200;
      let baseWidth, baseHeight;
      if (streamAspect > targetAspect) {
        baseHeight = vHeight;
        baseWidth = vHeight * targetAspect;
      } else {
        baseWidth = vWidth;
        baseHeight = vWidth / targetAspect;
      }
      cropWidth = baseWidth / finalZoom;
      cropHeight = baseHeight / finalZoom;

      // Clamp bounds-safety for digital zoom-out (< 1.0) while maintaining standard 3:4 aspect ratio
      if (cropWidth > vWidth) {
        cropWidth = vWidth;
        cropHeight = vWidth / targetAspect;
      }
      if (cropHeight > vHeight) {
        cropHeight = vHeight;
        cropWidth = vHeight * targetAspect;
      }
      sx = (vWidth - cropWidth) / 2;
      sy = (vHeight - cropHeight) / 2;
      console.log(`Cropping live capture stream (${vWidth}x${vHeight}) to 3:4 aspect ratio with zoom factor ${finalZoom}: sx=${sx}, sy=${sy}, width=${cropWidth}, height=${cropHeight}`);
    }
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, sx, sy, cropWidth, cropHeight,
    // Source crop rectangle
    0, 0, canvas.width, canvas.height // Destination rectangle
    );
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `cover_snapshot_${Date.now()}.png`, {
          type: 'image/png'
        });
        setSelectedImageFile(file);

        // Preview
        const reader = new FileReader();
        reader.onload = event => {
          setImagePreview(event.target?.result);
        };
        reader.readAsDataURL(file);
        stopCamera();
      }
    }, 'image/png');
  };
  const handleSimulateIsbnScan = () => {
    const demoIsbns = ['9780141439570',
    // The Picture of Dorian Gray
    '9780451524935',
    // 1984
    '9780743273565',
    // The Great Gatsby
    '9780486280615' // Frankenstein
    ];
    const chosenIsbn = demoIsbns[Math.floor(Math.random() * demoIsbns.length)];
    setIsbn(chosenIsbn);
    stopCamera();
    handleIsbnFetch(chosenIsbn);
  };
  const processScannedNtag = async (serialNumber, urlIsbn = null) => {
    setErrorMessage('');
    setInfoMessage('Analyzing tag contents...');
    try {
      let cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
      if (cleanScanned.indexOf('x') !== -1) {
        cleanScanned = cleanScanned.split('x')[0];
      }
      let matchedBook = null;
      try {
        matchedBook = await fetchBookByNtagUid(cleanScanned);
      } catch (err) {
        console.warn("Ntag direct backend lookup failed, checking local catalog fallback:", err);
      }
      if (!matchedBook) {
        const allBooks = await fetchBooks();
        matchedBook = allBooks.find(b => {
          const cleanBookTag = (b.ntagUid || '').toLowerCase().replace(/:/g, '');
          return cleanBookTag && cleanBookTag === cleanScanned;
        });
        if (!matchedBook && urlIsbn) {
          const cleanUrlIsbn = urlIsbn.trim().replace(/[-\s]/g, '');
          matchedBook = allBooks.find(b => (b.isbn || '').trim().replace(/[-\s]/g, '') === cleanUrlIsbn);
        }
      }
      if (matchedBook) {
        setIsbn(matchedBook.isbn || '');
        setEditingBookId(matchedBook.id || matchedBook.isbn || '');
        setManualTitle(matchedBook.title || '');
        setManualAuthor(Array.isArray(matchedBook.authors) ? matchedBook.authors.join(', ') : matchedBook.author || '');
        setPublisher(matchedBook.publisher || '');
        setPublishDate(matchedBook.publishDate || matchedBook.publishYear || '');
        setCoverUrl(matchedBook.coverUrl || '');
        setDescription(matchedBook.description || '');
        setPages(matchedBook.pages || 0);
        setTotalCopies(matchedBook.totalCopies || 1);
        setAvailableCopies(matchedBook.availableCopies || 1);
        setTagsInput(Array.isArray(matchedBook.tags) ? matchedBook.tags.join(', ') : '');
        setNtagUid(formatUidWithColons(matchedBook.ntagUid || cleanScanned));
        setAlternativeIsbnsInput(Array.isArray(matchedBook.alternativeIsbns) ? matchedBook.alternativeIsbns.join(', ') : '');
        if (matchedBook.copies) {
          setCopyQrIds(matchedBook.copies.map(c => c.qrId || ''));
          setNtagUids(matchedBook.copies.map(c => formatUidWithColons(c.ntagUid || '')));
        } else {
          setCopyQrIds([]);
          setNtagUids(matchedBook.ntagUids ? matchedBook.ntagUids.map(uid => formatUidWithColons(uid || '')) : []);
        }
        setBookLanguage(matchedBook.language || 'en');
        if (matchedBook.genre) {
          setSelectedHouse(matchedBook.genre);
          setGenreSearchQuery(matchedBook.genre);
        }
        setIsEditMode(true);
        setIsEditingExisting(true);
        setNfcSuccess(true);
        setIsNfcReading(false);
        setInfoMessage(`Existing book "${matchedBook.title}" loaded from NFC tap.`);
      } else {
        setNtagUid(formatUidWithColons(cleanScanned));
        setNtagUids([formatUidWithColons(cleanScanned)]);
        setNfcSuccess(true);
        setIsNfcReading(false);
        setInfoMessage(`Tag ID "${formatUidWithColons(cleanScanned)}" read successfully. Complete the metadata details to pair and ingest this book.`);
      }
    } catch (err) {
      console.error("Error matching NTAG tap:", err);
      const fallbackClean = (serialNumber || '').toLowerCase().replace(/:/g, '');
      setNtagUid(formatUidWithColons(fallbackClean));
      setNtagUids([formatUidWithColons(fallbackClean)]);
      setNfcSuccess(true);
      setIsNfcReading(false);
      setInfoMessage(`Tag detected: ${fallbackClean}`);
    }
  };

  // Web NFC NTAG213 Scanning Logic
  const startNfcRead = async (copyIndex = null) => {
    setNfcError('');
    setNfcSuccess(false);
    setActiveScanningIndex(copyIndex);
    if (!('NDEFReader' in window)) {
      setNfcError('Web NFC is not supported on this browser/device. NFC registration requires an Android Chrome or Web NFC compatible device.');
      return;
    }

    // Cancel/abort any active NFC scanning before starting a new one
    if (nfcScanAbortControllerRef.current) {
      try {
        nfcScanAbortControllerRef.current.abort();
      } catch (err) {
        console.warn("Failed to abort previous NFC scan:", err);
      }
      nfcScanAbortControllerRef.current = null;
    }

    // Create a new abort controller for this scanning session
    const controller = new AbortController();
    nfcScanAbortControllerRef.current = controller;
    try {
      setIsNfcReading(true);
      const ndef = new window.NDEFReader();
      await ndef.scan({
        signal: controller.signal
      });
      ndef.addEventListener("readingerror", () => {
        if (controller.signal.aborted) return;
        setNfcError("NFC Reading Error: Cannot read data from the tag. Try again.");
        setActiveScanningIndex(null);
      });
      ndef.addEventListener("reading", async ({
        serialNumber,
        message
      }) => {
        // Only proceed if this controller is still the active one and hasn't been aborted
        if (controller.signal.aborted) return;
        console.log(`NFC tag read. Serial Number: ${serialNumber}`);
        let extractedIsbn = null;
        let extractedUid = null;
        if (message && message.records) {
          for (const record of message.records) {
            if (record.recordType === "url") {
              const decoder = new TextDecoder("utf-8");
              const url = decoder.decode(record.data);
              const match = url.match(/\/catalog\/([0-9Xx]+)/);
              if (match && match[1]) {
                extractedIsbn = match[1];
              }
              const uMatch = url.match(/[?&]u=([^&]+)/);
              if (uMatch && uMatch[1]) {
                extractedUid = uMatch[1];
              }
            }
          }
        }
        const targetUid = extractedUid || serialNumber;
        const cleanScanned = (targetUid || '').trim().toLowerCase().replace(/:/g, '');

        // Always search database first for this scanned NFC tag!
        setInfoMessage(`Searching database for tag ID: ${formatUidWithColons(cleanScanned)}...`);
        let matchedBook = null;
        try {
          matchedBook = await fetchBookByNtagUid(cleanScanned);
        } catch (err) {
          console.warn("Backend lookup failed, checking local catalog fallback:", err);
        }
        if (!matchedBook) {
          try {
            const allBooks = await fetchBooks();
            matchedBook = allBooks.find(b => {
              const cleanBookTag = (b.ntagUid || '').toLowerCase().replace(/:/g, '');
              if (cleanBookTag === cleanScanned) return true;
              if (b.copies && Array.isArray(b.copies)) {
                return b.copies.some(c => c.ntagUid && c.ntagUid.toLowerCase().replace(/:/g, '') === cleanScanned);
              }
              return false;
            });
          } catch (err) {
            console.error("Local fallback search failed:", err);
          }
        }

        // Re-check aborted status after async backend calls
        if (controller.signal.aborted) return;
        const isCurrentBook = matchedBook && (editingBookId && (matchedBook.id === editingBookId || matchedBook.isbn === editingBookId) || isbn && matchedBook.isbn && matchedBook.isbn.trim().replace(/[-\s]/g, '') === isbn.trim().replace(/[-\s]/g, ''));
        if (matchedBook && !isCurrentBook) {
          // Found an existing DIFFERENT book with this NFC tag! Load it!
          handleSelectExistingBook(matchedBook);
          setNfcSuccess(true);
          setIsNfcReading(false);
          setActiveScanningIndex(null);
          setInfoMessage(`Existing book "${matchedBook.title}" loaded because it matches the scanned tag ID.`);
        } else {
          // Either no book matched, or the matched book is the one we are already editing/ingesting!
          if (copyIndex !== null) {
            setNtagUids(prev => {
              const next = [...prev];
              while (next.length <= copyIndex) next.push('');
              next[copyIndex] = formatUidWithColons(cleanScanned);
              return next;
            });
            if (copyIndex === 0) {
              setNtagUid(formatUidWithColons(cleanScanned));
            }
            setNfcSuccess(true);
            setIsNfcReading(false);
            setActiveScanningIndex(null);
            setInfoMessage(`Tag ID "${formatUidWithColons(cleanScanned)}" bound to Copy #${copyIndex + 1}.`);
          } else {
            if (matchedBook) {
              // copyIndex is null, but it's the current book. Just set info message and stop.
              setNfcSuccess(true);
              setIsNfcReading(false);
              setActiveScanningIndex(null);
              setInfoMessage(`This tag is already registered to the current book "${matchedBook.title}".`);
            } else {
              await processScannedNtag(targetUid, extractedIsbn);
            }
          }
        }
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("NFC reading error: ", error);
      setNfcError(`NFC activation failed: ${error.message || error}`);
      setIsNfcReading(false);
      setActiveScanningIndex(null);
    }
  };
  const handleCancelNfcWrite = () => {
    if (nfcAbortControllerRef.current) {
      try {
        nfcAbortControllerRef.current.abort();
      } catch (err) {
        console.error("Failed to abort NFC write:", err);
      }
      nfcAbortControllerRef.current = null;
    }
    setNfcWriteModalOpen(false);
    setPendingBookDto(null);
    setNfcWriteSuccess(false);
    setNfcWriteLoading(false);
  };
  useEffect(() => {
    let timer;
    if (nfcWriteModalOpen && !nfcWriteSuccess) {
      setWriteCountdown(10);
      timer = setInterval(() => {
        setWriteCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleCancelNfcWrite();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [nfcWriteModalOpen, nfcWriteSuccess]);
  useEffect(() => {
    return () => {
      if (barcodeIntervalRef.current) clearInterval(barcodeIntervalRef.current);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);
  const handleStartTagEdit = (index, value) => {
    setEditingTagIndex(index);
    setEditingTagValue(value);
  };
  const handleSaveTagEdit = index => {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (editingTagValue.trim()) {
      tags[index] = editingTagValue.trim();
    } else {
      tags.splice(index, 1);
    }
    setTagsInput(tags.join(', '));
    setEditingTagIndex(null);
  };
  const handleRemoveTag = index => {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    tags.splice(index, 1);
    setTagsInput(tags.join(', '));
  };
  const resetForm = () => {
    setIsbn('');
    setManualTitle('');
    setManualAuthor('');
    setPublisher('');
    setPublishDate('');
    setCoverUrl('');
    setDescription('');
    setPages(0);
    setTotalCopies(1);
    setAvailableCopies(1);
    setSelectedImageFile(null);
    setImagePreview(null);
    setIsEditMode(false);
    setIsEditingExisting(false);
    setInfoMessage('');
    setTagsInput('');
    setNtagUid('');
    setNtagUids([]);
    setActiveScanningIndex(null);
    setBookLanguage('en');
    setNfcSuccess(false);
    setNfcError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (houses.length > 0) {
      setSelectedHouse(houses[0]);
      setGenreSearchQuery(houses[0]);
    }
    loadExistingBooks();
  };
  const handleImageSelect = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = event => {
      setImagePreview(event.target?.result);
    };
    reader.readAsDataURL(file);
  };
  const handleImageUpload = async () => {
    if (!selectedImageFile) {
      setErrorMessage('Please select an image file.');
      return;
    }
    setUploadingImage(true);
    setErrorMessage('');
    try {
      const uploadedUrl = await uploadBookImage(selectedImageFile);
      setCoverUrl(uploadedUrl);
      setSelectedImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };
  const removeImagePreview = () => {
    setSelectedImageFile(null);
    setImagePreview(null);
  };
  const handleIngestionSubmit = async e => {
    e.preventDefault();
    if (!isbn.trim() || !manualTitle.trim() || !manualAuthor.trim()) {
      setErrorMessage('ISBN, title, and author are required.');
      return;
    }
    setErrorMessage('');
    let finalGenre = selectedHouse;
    if (selectedHouse === 'Other') {
      if (!customGenre.trim()) {
        setErrorMessage('Please specify the custom genre/house name.');
        return;
      }
      try {
        const payload = {
          id: customGenre.trim().toLowerCase().replace(/\s+/g, '-'),
          name: customGenre.trim(),
          translations: {
            hi: {
              name: customGenre.trim()
            },
            kn: {
              name: customGenre.trim()
            }
          }
        };
        const res = await createBookHouse(payload);
        if (res && res.success) {
          const newGenreName = res.data.name;
          setHouses(prev => [...prev, newGenreName]);
          setSelectedHouse(newGenreName);
          setGenreSearchQuery(newGenreName);
          setCustomGenre('');
          finalGenre = newGenreName;
        } else {
          setErrorMessage('Failed to establish custom genre on server.');
          return;
        }
      } catch (err) {
        console.error('Failed to create custom genre:', err);
        setErrorMessage('Failed to create custom genre on server.');
        return;
      }
    }
    const authors = manualAuthor.split(',').map(name => name.trim()).filter(Boolean);

    // Trim and deduplicate tags
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const deduplicatedTags = Array.from(new Set(tags));
    const alternativeIsbns = alternativeIsbnsInput.split(',').map(alt => alt.trim().replace(/[-\s]/g, '')).filter(alt => alt.length > 0);
    const deduplicatedAlternativeIsbns = Array.from(new Set(alternativeIsbns));
    const copies = Array.from({
      length: totalCopies
    }).map((_, index) => {
      const u = ntagUids[index] ? ntagUids[index].trim().toLowerCase().replace(/:/g, '') : '';
      const q = copyQrIds[index] ? parseInt(copyQrIds[index], 10) : null;
      return {
        copyNo: index + 1,
        ntagUid: u || null,
        qrId: q || null,
        status: 'AVAILABLE'
      };
    });
    const bookDto = {
      id: editingBookId || undefined,
      isbn: isbn.trim(),
      title: manualTitle.trim(),
      subtitle: '',
      authors,
      publisher: publisher.trim(),
      publishDate: publishDate.trim(),
      description: description.trim(),
      coverUrl: coverUrl.trim(),
      backCoverUrl: backCoverUrl.trim(),
      pages: Number(pages) || 0,
      totalCopies: Number(totalCopies) || 1,
      availableCopies: Number(availableCopies) || 1,
      genre: finalGenre,
      tags: deduplicatedTags,
      alternativeIsbns: deduplicatedAlternativeIsbns,
      copies,
      ntagUid: ntagUid ? ntagUid.trim().toLowerCase().replace(/:/g, '') : null,
      ntagUids: ntagUids.map(uid => uid ? uid.trim().toLowerCase().replace(/:/g, '') : ''),
      language: bookLanguage
    };

    // 1. Immediately save to local/cloud database first in BOTH cases
    try {
      await createBook(bookDto);
      setIngestionSuccess(true);

      // 2. If the user checked the physical write option and browser has NDEFReader
      if (shouldWriteNfc && 'NDEFReader' in window) {
        setPendingBookDto(bookDto);
        setNfcWriteError('');
        setNfcWriteSuccess(false);
        setNfcWriteModalOpen(true);
        triggerWriteNfcTag(bookDto.isbn, bookDto);
      } else {
        // Otherwise, do not open any popup or wait for physical tap. Complete immediately!
        resetForm();
        setTimeout(() => setIngestionSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(isEditMode ? 'Unable to update book record in the database.' : 'Unable to create book record in the database.');
    }
  };
  const triggerWriteNfcTag = async (bookIsbn, bookDtoToSave = null) => {
    setNfcWriteLoading(true);
    setNfcWriteError('');
    const targetDto = bookDtoToSave || pendingBookDto;

    // Create a new abort controller for this write operation
    const controller = new AbortController();
    nfcAbortControllerRef.current = controller;
    setWriteCountdown(10);
    try {
      const ndef = new window.NDEFReader();
      const tagUidToWrite = targetDto?.ntagUid || ntagUid || '04:A3:B2:C1:D0:E9:80';
      const cleanUidToWrite = tagUidToWrite.trim().toLowerCase().replace(/:/g, '');
      await ndef.write({
        records: [{
          recordType: "url",
          data: `https://bookshelfnet.com/?u=${cleanUidToWrite}x000000`
        }]
      }, {
        signal: controller.signal
      });
      setNfcWriteSuccess(true);
      resetForm();
      setTimeout(() => {
        setNfcWriteModalOpen(false);
        setPendingBookDto(null);
        setNfcWriteSuccess(false);
        setIngestionSuccess(false);
      }, 2500);
    } catch (writeErr) {
      if (writeErr.name === 'AbortError') {
        console.log("NFC Write operation aborted by user or timeout.");
        return; // Silent exit for intentional cancellations
      }
      console.error("Web NFC Write error:", writeErr);
      setNfcWriteError(`Write failed: ${writeErr.message || writeErr}. Hold the tag firmly near the device's NFC chip or tap "Skip & Save Directly".`);
    } finally {
      if (nfcAbortControllerRef.current === controller) {
        nfcAbortControllerRef.current = null;
      }
      setNfcWriteLoading(false);
    }
  };
  const handleSkipWriteAndSave = () => {
    setNfcWriteSuccess(true);
    resetForm();
    setTimeout(() => {
      setNfcWriteModalOpen(false);
      setPendingBookDto(null);
      setNfcWriteSuccess(false);
      setIngestionSuccess(false);
    }, 1500);
  };
  return <div className="ingestion-container animate-fade-in">
      {!isAdmin ? <>
          <header className="ingestion-header">
            <h1 className="ingestion-title glow-text">{t('admin.privilegedSanctuary', 'Access Denied')}</h1>
            <p className="ingestion-subtitle">{t('admin.accessDeniedDesc', 'Only administrators can access the book ingestion console.')}</p>
          </header>
        </> : <>
          <header className="ingestion-header">
            <Link to="/admin" className="back-link">
              <ArrowLeft size={16} /> {t('admin.backToConsole', 'Curator Console')}
            </Link>
            <div className="header-badge-admin">
              <Shield size={14} className="gold-glow-icon" />
              <span className="gold-gradient-text">{t('auto_3203', 'ADMIN ACQUISITION')}</span>
            </div>
            <h1 className="ingestion-title glow-text">{t('admin.bookIngestionConsole', 'Acquisition Ingestion Console')}</h1>
            <p className="ingestion-subtitle">
              {t('admin.ingestionDesc', 'Acquire and register new physical and digital masterworks into the Royal Library ledger.')}
            </p>
          </header>

          {/* Streamlined, sleek internal database search bar */}
          <div id="db-search-panel" className="royal-card db-catalog-search-card-top" style={{
        maxWidth: '800px',
        margin: '0 auto 24px auto',
        padding: '16px 20px',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        background: 'rgba(141, 18, 34, 0.03)'
      }}>
            <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
                <Search size={18} style={{
              color: 'var(--accent)'
            }} />
                <h3 style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 'bold',
              color: 'var(--text-primary)'
            }}>
                  {t('auto_3204', 'Search & Edit Local Ledger Database')}
                </h3>
              </div>
              <p style={{
            margin: 0,
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
                {t('auto_3205', 'Search and retrieve existing physical and digital volumes from the local database by Title, Author, Keyword, ISBN, QR Code, or NFC Tag ID.')}
              </p>
              
              <div className="db-search-input-group" style={{
            marginTop: '8px'
          }}>
                <div className="db-search-row" style={{
              display: 'flex',
              gap: '8px'
            }}>
                  <input type="text" placeholder={t("str_5110", "Search by Title, Author, Keyword, ISBN, QR, NFC...")} className="royal-input db-search-input-box" value={dbSearchQuery} onChange={e => setDbSearchQuery(e.target.value)} style={{
                flex: 1
              }} />
                  {dbSearchQuery && <button type="button" className="royal-btn-secondary clear-db-search-btn" onClick={() => setDbSearchQuery('')} style={{
                padding: '0 16px'
              }}>
                      {t('auto_3206', 'Clear')}
                    </button>}
                </div>
                
                {/* Premium Action Row */}
                <div className="top-search-actions-row" style={{
              display: 'flex',
              gap: '10px',
              marginTop: '12px',
              flexWrap: 'wrap'
            }}>
                  <button type="button" className="royal-btn camera-scan-btn glow-accent-btn" onClick={() => startCamera('isbn')} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: 1,
                justifyContent: 'center',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))',
                border: '1px solid rgba(212, 175, 55, 0.45)',
                color: 'var(--text-primary, #ffffff)'
              }}>
                    <Camera size={16} style={{
                  color: 'var(--accent)'
                }} />
                    <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}>{t("str_5111", "Camera Scanner (Barcode/QR)")}</span>
                  </button>
                  
                  <button type="button" className={`royal-btn nfc-scan-btn glow-accent-btn ${isNfcReading && activeScanningIndex === null ? 'loading-btn' : ''}`} onClick={() => startNfcRead(null)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: 1,
                justifyContent: 'center',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))',
                border: '1px solid rgba(212, 175, 55, 0.45)',
                color: 'var(--text-primary, #ffffff)'
              }}>
                    {isNfcReading && activeScanningIndex === null ? <RefreshCw className="spin-icon" size={16} /> : <Smartphone size={16} style={{
                  color: 'var(--accent)'
                }} />}
                    <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}>
                      {isNfcReading && activeScanningIndex === null ? 'Scanning...' : 'NFC Tap Search'}
                    </span>
                  </button>
                  
                  <button type="button" className="royal-btn external-search-btn" onClick={() => setIsSearchDrawerOpen(true)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: 1,
                justifyContent: 'center',
                padding: '10px 16px',
                border: '1px solid var(--accent, rgba(212, 175, 55, 0.45))',
                background: 'rgba(212, 175, 55, 0.05)',
                color: 'var(--text-primary, #ffffff)'
              }}>
                    <Compass size={16} style={{
                  color: 'var(--accent)'
                }} />
                    <span style={{
                  fontSize: '0.85rem'
                }}>{t('auto_3207', 'Search External Metadata')}</span>
                  </button>
                </div>
              </div>

              {dbSearchQuery.trim() ? <div className="db-search-results-list" style={{
            marginTop: '12px',
            maxHeight: '320px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            border: '1px solid rgba(212, 175, 55, 0.1)',
            padding: '8px',
            borderRadius: '6px',
            background: "var(--glass-bg)"
          }}>
                  {existingBooks.filter(b => {
              const q = dbSearchQuery.toLowerCase().trim();
              const cleanQ = q.replace(/[-\s]/g, '');

              // Match title
              if (b.title && b.title.toLowerCase().includes(q)) return true;

              // Match authors
              if (Array.isArray(b.authors) && b.authors.some(a => a && a.toLowerCase().includes(q))) return true;
              if (b.author && b.author.toLowerCase().includes(q)) return true;

              // Match primary ISBN
              if (b.isbn && b.isbn.replace(/[-\s]/g, '').toLowerCase().includes(cleanQ)) return true;

              // Match alternative ISBNs
              if (Array.isArray(b.alternativeIsbns) && b.alternativeIsbns.some(alt => alt && alt.replace(/[-\s]/g, '').toLowerCase().includes(cleanQ))) return true;

              // Match tags
              if (Array.isArray(b.tags) && b.tags.some(tag => tag && tag.toLowerCase().includes(q))) return true;

              // Match primary NTAG
              if (b.ntagUid && b.ntagUid.replace(/:/g, '').toLowerCase().includes(cleanQ)) return true;
              if (Array.isArray(b.ntagUids) && b.ntagUids.some(uid => uid && uid.replace(/:/g, '').toLowerCase().includes(cleanQ))) return true;

              // Match copy-level NTAG
              if (Array.isArray(b.copies) && b.copies.some(c => c.ntagUid && c.ntagUid.replace(/:/g, '').toLowerCase().includes(cleanQ))) return true;

              // Match copy-level QR ID
              if (Array.isArray(b.copies) && b.copies.some(c => c.qrId && String(c.qrId).includes(q))) return true;
              if (Array.isArray(b.qrIds) && b.qrIds.some(qr => String(qr).includes(q))) return true;
              return false;
            }).length > 0 ? existingBooks.filter(b => {
              const q = dbSearchQuery.toLowerCase().trim();
              const cleanQ = q.replace(/[-\s]/g, '');

              // Match title
              if (b.title && b.title.toLowerCase().includes(q)) return true;

              // Match authors
              if (Array.isArray(b.authors) && b.authors.some(a => a && a.toLowerCase().includes(q))) return true;
              if (b.author && b.author.toLowerCase().includes(q)) return true;

              // Match primary ISBN
              if (b.isbn && b.isbn.replace(/[-\s]/g, '').toLowerCase().includes(cleanQ)) return true;

              // Match alternative ISBNs
              if (Array.isArray(b.alternativeIsbns) && b.alternativeIsbns.some(alt => alt && alt.replace(/[-\s]/g, '').toLowerCase().includes(cleanQ))) return true;

              // Match tags
              if (Array.isArray(b.tags) && b.tags.some(tag => tag && tag.toLowerCase().includes(q))) return true;

              // Match primary NTAG
              if (b.ntagUid && b.ntagUid.replace(/:/g, '').toLowerCase().includes(cleanQ)) return true;
              if (Array.isArray(b.ntagUids) && b.ntagUids.some(uid => uid && uid.replace(/:/g, '').toLowerCase().includes(cleanQ))) return true;

              // Match copy-level NTAG
              if (Array.isArray(b.copies) && b.copies.some(c => c.ntagUid && c.ntagUid.replace(/:/g, '').toLowerCase().includes(cleanQ))) return true;

              // Match copy-level QR ID
              if (Array.isArray(b.copies) && b.copies.some(c => c.qrId && String(c.qrId).includes(q))) return true;
              if (Array.isArray(b.qrIds) && b.qrIds.some(qr => String(qr).includes(q))) return true;
              return false;
            }).map(b => <div key={b.id || b.isbn} className="db-search-result-item" onClick={() => {
              handleSelectExistingBook(b);
              setDbSearchQuery('');
            }} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
                        <div className="result-item-cover-wrapper" style={{
                width: '36px',
                height: '48px',
                overflow: 'hidden',
                borderRadius: '3px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: "var(--glass-bg)"
              }}>
                          {b.coverUrl ? <img src={b.coverUrl} alt={b.title} className="result-item-cover" style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }} /> : <BookOpen size={16} className="fallback-cover-icon" style={{
                  color: 'var(--accent, #d4af37)'
                }} />}
                        </div>
                        <div className="result-item-details" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: 0
              }}>
                          <span className="result-item-title" style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: 'var(--text, #f0f0f5)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{b.title}</span>
                          <span className="result-item-authors" style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary, #9a9ab0)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                            {Array.isArray(b.authors) ? b.authors.join(', ') : b.author || 'Unknown Author'}
                          </span>
                          <span className="result-item-isbn" style={{
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  color: 'var(--accent, #d4af37)'
                }}>{t("str_5112", "ISBN:")} {b.isbn}</span>
                        </div>
                        <button type="button" className="royal-btn-secondary select-db-book-btn" style={{
                fontSize: '0.75rem',
                padding: '4px 10px'
              }}>
                          {t('auto_3208', 'Edit')}
                        </button>
                      </div>) : <p className="no-db-results-text" style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              margin: '20px 0'
            }}>{t('auto_3209', 'No matching database records found.')}</p>}
                </div> : null}

              {isEditingExisting && <div className="editing-indicator-box royal-card animate-fade-in" style={{
            border: '1px solid var(--accent, #d4af37)',
            background: 'rgba(212, 175, 55, 0.05)',
            marginTop: '12px',
            padding: '12px'
          }}>
                  <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
                    <div>
                      <p style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  color: 'var(--accent, #d4af37)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                        <Sparkles size={14} /> <strong>{t("str_5113", "Active Editing Mode: \"")}{manualTitle}"</strong>
                      </p>
                      <p style={{
                  margin: '2px 0 0 0',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                        {t('auto_3210', 'Overwrites current record on save.')}
                      </p>
                    </div>
                    <button type="button" className="royal-btn-secondary" style={{
                fontSize: '0.8rem',
                padding: '6px 12px'
              }} onClick={handleResetForm}>
                      {t('auto_3211', 'Cancel & Add New Instead')}
                    </button>
                  </div>
                </div>}
            </div>
          </div>

          <div className="ingestion-grid" style={{
        display: 'block',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
            <div className="royal-card form-intake-card">
              <h3>{t('admin.manualIngestion', 'Single Volume Intake')}</h3>
              <p className="section-p-desc">{t('auto_3212', 'Register an individual book volume. Query metadata by ISBN or input details manually.')}</p>

              <div className="intake-top-actions">
                <div className="isbn-query-column">
                  <label className="royal-input-label">{t('catalog.isbn', 'Query External ISBN API')}</label>
                  <div className="isbn-input-row">
                    <input type="text" placeholder={t('admin.isbnPlaceholder', 'e.g. 9780141439570')} className="royal-input isbn-input-box" value={isbn} onChange={e => setIsbn(e.target.value)} />
                    <div className="isbn-btn-group">
                      <button type="button" onClick={() => startCamera('isbn')} className="royal-btn lookup-btn" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }} title={t("str_5114", "Scan Barcode with Camera")}>
                        <Camera size={14} />
                      </button>
                      <button type="button" onClick={() => handleIsbnFetch()} className="royal-btn lookup-btn" disabled={fetchingMetadata} id="isbn-lookup-btn">
                        {fetchingMetadata ? <RefreshCw className="spin-icon" size={14} /> : t('admin.fetchMetadata', 'Fetch')}
                      </button>
                      <button type="button" onClick={() => setIsSearchDrawerOpen(true)} className="royal-btn lookup-btn search-drawer-trigger-btn" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }} title={t("str_5115", "Search Metadata by Title, Author, Keyword")}>
                        <Compass size={14} />
                        <span>{t('auto_3213', 'Search')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="alternative-isbns-group" style={{
                marginTop: '12px'
              }}>
                    <label className="royal-input-label">{t("str_5116", "Alternative ISBN Barcodes (Comma-separated)")}</label>
                    <input type="text" placeholder={t("str_5117", "e.g. 9780141439571, 9780141439572")} className="royal-input alternative-isbn-input" value={alternativeIsbnsInput} onChange={e => setAlternativeIsbnsInput(e.target.value)} />
                    <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginTop: '4px'
                }}>
                      {t('auto_3214', 'Add any mistakenly printed alternative ISBN barcodes. These map to the parent book document, not specific copies.')}
                    </span>
                  </div>
                </div>

                <div className="nfc-query-column" style={{
              position: 'relative'
            }}>
                  <div className="multi-copy-tags-container royal-card" style={{
                padding: '16px',
                background: 'var(--glass-bg)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: '12px'
              }}>
                    <h4 style={{
                  color: '#d4af37',
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                      <Smartphone size={15} />
                      <span>{t('admin.physicalVolumeRegistry', {
                      count: totalCopies
                    })}</span>
                    </h4>
                    <p style={{
                  fontSize: '0.78rem',
                  opacity: 0.7,
                  marginBottom: '14px',
                  lineHeight: '1.4'
                }}> {t("str_5118", "Pair physical NFC tags (NTAG213) and unique copy-level QR sticker IDs parallel to each volume copy.")} </p>
                    
                    <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  paddingRight: '4px'
                }}>
                      {Array.from({
                    length: totalCopies
                  }).map((_, index) => <div key={index} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    background: "var(--glass-bg)",
                    borderRadius: '8px',
                    border: '1px solid var(--glass-bg)'
                  }}>
                          <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                            <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: 'var(--accent)'
                      }}>{t("str_5119", "Copy #")}{index + 1}</span>
                            {copyQrIds[index] && <span style={{
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        color: 'var(--text-muted)'
                      }}> {t("str_5120", "QR Schema: https://bookshelfnet.com/qr=")}{copyQrIds[index]}
                              </span>}
                          </div>
                          
                          <div style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}>
                            {/* NFC Registration */}
                            <div style={{
                        flex: 1,
                        minWidth: '220px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                              <span style={{
                          fontSize: '0.75rem',
                          opacity: 0.7,
                          width: '55px'
                        }}>{t("str_5121", "NFC UID:")}</span>
                              <input type="text" className="royal-input" style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '0.8rem',
                          background: "var(--glass-bg)",
                          border: '1px solid var(--glass-border)'
                        }} value={ntagUids[index] || ''} onChange={e => {
                          const val = formatUidWithColons(e.target.value);
                          setNtagUids(prev => {
                            const next = [...prev];
                            while (next.length <= index) next.push('');
                            next[index] = val;
                            return next;
                          });
                          if (index === 0) {
                            setNtagUid(val);
                          }
                        }} placeholder={t("str_5122", "Blank (Unscanned NFC)")} />
                              <button type="button" onClick={() => startNfcRead(index)} className={`royal-btn-secondary ${isNfcReading && activeScanningIndex === index ? 'loading-btn' : ''}`} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 8px',
                          fontSize: '0.75rem',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          background: 'transparent'
                        }}>
                                <Smartphone size={11} />
                                <span>{isNfcReading && activeScanningIndex === index ? 'Scanning' : 'Scan'}</span>
                              </button>
                            </div>

                            {/* Copy QR Code ID */}
                            <div style={{
                        flex: 1,
                        minWidth: '180px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                              <span style={{
                          fontSize: '0.75rem',
                          opacity: 0.7,
                          width: '50px'
                        }}>{t("str_5123", "QR ID:")}</span>
                              <input type="text" pattern="[0-9]*" maxLength={9} className="royal-input" style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '0.8rem',
                          background: "var(--glass-bg)",
                          border: '1px solid var(--glass-border)'
                        }} value={copyQrIds[index] || ''} onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setCopyQrIds(prev => {
                            const next = [...prev];
                            while (next.length <= index) next.push('');
                            next[index] = val;
                            return next;
                          });
                        }} placeholder={t("str_5124", "Sticker QR #")} />
                              <button type="button" onClick={() => startCopyQrScan(index)} className="royal-btn-secondary" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 8px',
                          fontSize: '0.75rem',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          background: 'transparent'
                        }}>
                                <Camera size={11} />
                                <span>{t('auto_3215', 'Scan')}</span>
                              </button>
                            </div>
                          </div>
                        </div>)}
                    </div>

                    <div className="copy-registry-action-row" style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '14px'
                }}>
                      <button type="button" onClick={() => {
                    const val = totalCopies + 1;
                    setTotalCopies(val);
                    setAvailableCopies(prev => prev + 1);
                  }} className="royal-btn-secondary" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    border: '1px solid var(--accent, rgba(212, 175, 55, 0.45))',
                    background: 'rgba(212, 175, 55, 0.05)',
                    borderRadius: '6px',
                    color: 'var(--accent, #d4af37)',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}>
                        <Plus size={13} />
                        <span>{t('auto_3216', 'Add Copy')}</span>
                      </button>
                      {totalCopies > 1 && <button type="button" onClick={() => {
                    const val = Math.max(1, totalCopies - 1);
                    setTotalCopies(val);
                    setAvailableCopies(prev => Math.max(0, prev - 1));
                    setNtagUids(prev => prev.slice(0, -1));
                    setCopyQrIds(prev => prev.slice(0, -1));
                  }} className="royal-btn-secondary" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    border: '1px solid var(--glass-border)',
                    background: 'transparent',
                    borderRadius: '6px',
                    color: 'var(--text-secondary, #9a9ab0)',
                    cursor: 'pointer'
                  }}>
                          <Minus size={13} />
                          <span>{t('auto_3217', 'Remove Last Copy')}</span>
                        </button>}
                    </div>

                    {activeScanningIndex !== null && isNfcReading && <div className="nfc-pulse-overlay royal-card" style={{
                  zIndex: 10
                }}>
                        <div className="nfc-scanner-pulse">
                          <Smartphone size={32} className="gold-glow-icon animate-pulse" />
                          <div className="pulse-ring"></div>
                        </div>
                        <p className="pulse-help-text" style={{
                    fontSize: '0.85rem'
                  }}> {t("str_5125", "Tap NTAG213 Tag to register Copy #")}{activeScanningIndex + 1} {t("str_5126", "in the ledger.")} </p>
                        <button type="button" onClick={() => {
                    setIsNfcReading(false);
                    setActiveScanningIndex(null);
                  }} className="royal-btn-secondary" style={{
                    marginTop: '12px',
                    fontSize: '0.8rem',
                    padding: '6px 14px'
                  }}>
                          {t('auto_3218', 'Cancel Scan')}
                        </button>
                      </div>}
                  </div>

                  {nfcSuccess && <p className="nfc-success-text" style={{
                fontSize: '0.85rem',
                color: 'var(--success)',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                      <Check size={14} /> {t('auto_3219', 'NTAG213 serial number bound successfully.')}
                    </p>}

                  {nfcError && <p className="nfc-error-text" style={{
                fontSize: '0.85rem',
                color: '#ff7b72',
                marginTop: '6px'
              }}>
                      {nfcError}
                    </p>}
                </div>
              </div>

              <div className="form-divider"><span>{t('auto_3220', 'OR MANUAL ENTRY')}</span></div>

              <form onSubmit={handleIngestionSubmit} className="manual-intake-form">
                {infoMessage && <div className="info-banner royal-card">
                    <p>{infoMessage}</p>
                  </div>}
                <div className="input-group">
                  <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                    <label className="royal-input-label" style={{
                  margin: 0
                }}>{t('admin.titleLabel', 'Volume Title')}</label>
                    <button type="button" onClick={() => handleFetchField('title')} className="royal-field-fetch-btn" title={t("str_5127", "Fetch Title selectively from Open Library")} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  opacity: 0.8
                }} onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                }} onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.8';
                }}>
                      <Sparkles size={11} className="gold-glow-icon" />
                      <span>{t('auto_3221', 'Fetch Title')}</span>
                    </button>
                  </div>
                  <input type="text" placeholder={t("str_5128", "The Picture of Dorian Gray")} className="royal-input" value={manualTitle} onChange={e => setManualTitle(e.target.value)} required />
                </div>

                <div className="input-group">
                  <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                    <label className="royal-input-label" style={{
                  margin: 0
                }}>{t('admin.authorLabel', 'Author Name(s)')}</label>
                    <button type="button" onClick={() => handleFetchField('author')} className="royal-field-fetch-btn" title={t("str_5129", "Fetch Author selectively from Open Library")} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  opacity: 0.8
                }} onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                }} onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.8';
                }}>
                      <Sparkles size={11} className="gold-glow-icon" />
                      <span>{t('auto_3222', 'Fetch Author')}</span>
                    </button>
                  </div>
                  <input type="text" placeholder={t("str_5130", "Oscar Wilde, Mary Shelley")} className="royal-input" value={manualAuthor} onChange={e => setManualAuthor(e.target.value)} required />
                </div>

                <div className="input-group">
                  <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                    <label className="royal-input-label" style={{
                  margin: 0
                }}>{t('admin.publisherLabel', 'Publisher')}</label>
                    <button type="button" onClick={() => handleFetchField('publisher')} className="royal-field-fetch-btn" title={t("str_5131", "Fetch Publisher selectively from Open Library")} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  opacity: 0.8
                }} onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                }} onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.8';
                }}>
                      <Sparkles size={11} className="gold-glow-icon" />
                      <span>{t('auto_3223', 'Fetch Publisher')}</span>
                    </button>
                  </div>
                  <input type="text" className="royal-input" value={publisher} onChange={e => setPublisher(e.target.value)} />
                </div>

                <div className="input-group">
                  <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                    <label className="royal-input-label" style={{
                  margin: 0
                }}>{t('admin.publishDateLabel', 'Publish Date')}</label>
                    <button type="button" onClick={() => handleFetchField('publishDate')} className="royal-field-fetch-btn" title={t("str_5132", "Fetch Publish Date selectively from Open Library")} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  opacity: 0.8
                }} onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                }} onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.8';
                }}>
                      <Sparkles size={11} className="gold-glow-icon" />
                      <span>{t('auto_3224', 'Fetch Publish Date')}</span>
                    </button>
                  </div>
                  <input type="text" className="royal-input" value={publishDate} onChange={e => setPublishDate(e.target.value)} placeholder={t("str_5133", "e.g. 1890")} />
                </div>

                <div className="input-group" style={{
              position: 'relative'
            }} ref={genreDropdownRef}>
                  <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                    <label className="royal-input-label" style={{
                  margin: 0
                }}>{t('admin.houseLabel', 'Assign Library House')}</label>
                    <button type="button" onClick={() => handleFetchField('genreTags')} className="royal-field-fetch-btn" title={t("str_5134", "Fetch Genre & Tags selectively from Open Library")} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  opacity: 0.8
                }} onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                }} onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.8';
                }}>
                      <Sparkles size={11} className="gold-glow-icon" />
                      <span>{t('auto_3225', 'Fetch Genre & Tags')}</span>
                    </button>
                  </div>
                  <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                    <input type="text" className="royal-input" placeholder={t("str_5135", "Type to search or establish genre...")} value={genreSearchQuery} onChange={e => {
                  setGenreSearchQuery(e.target.value);
                  setGenreDropdownOpen(true);
                }} onFocus={() => setGenreDropdownOpen(true)} style={{
                  paddingRight: '36px',
                  width: '100%'
                }} />
                    <button type="button" onClick={() => setGenreDropdownOpen(!genreDropdownOpen)} style={{
                  position: 'absolute',
                  right: '4px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  opacity: 0.8
                }}>
                      <ChevronDown size={16} style={{
                    transform: genreDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }} />
                    </button>
                  </div>
                  {genreDropdownOpen && <div className="royal-dropdown-list" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--surface-elevated, var(--glass-bg, rgba(26, 21, 16, 0.98)))',
                border: '1px solid var(--glass-border, rgba(212, 175, 55, 0.3))',
                boxShadow: "0 8px 30px var(--card-shadow)",
                borderRadius: '6px',
                marginTop: '4px',
                maxHeight: '220px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                padding: '6px',
                backdropFilter: 'blur(12px)'
              }}>
                      {houses.filter(h => (h || '').toLowerCase().includes(genreSearchQuery.toLowerCase())).length > 0 ? houses.filter(h => (h || '').toLowerCase().includes(genreSearchQuery.toLowerCase())).map(house => <div key={house} onClick={() => {
                  setSelectedHouse(house);
                  setGenreSearchQuery(house);
                  setGenreDropdownOpen(false);
                }} style={{
                  padding: '8px 12px',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                  background: selectedHouse === house ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderLeft: selectedHouse === house ? '3px solid var(--accent)' : '3px solid transparent'
                }} onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
                }} onMouseLeave={e => {
                  e.currentTarget.style.background = selectedHouse === house ? 'rgba(212, 175, 55, 0.1)' : 'transparent';
                }}>
                            {house}
                          </div>) : <div style={{
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  textAlign: 'left'
                }}>
                          {t('auto_3226', 'No matching genres found')}
                        </div>}
                      {genreSearchQuery.trim() && !houses.some(h => (h || '').toLowerCase().trim() === genreSearchQuery.toLowerCase().trim()) && <div onClick={() => handleCreateGenreSearchDropdown(genreSearchQuery)} style={{
                  padding: '10px 12px',
                  fontSize: '0.85rem',
                  color: 'var(--accent)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderTop: '1px solid rgba(212, 175, 55, 0.15)',
                  textAlign: 'left',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }} onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                }} onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}>
                          <Plus size={14} />
                          <span>{t("str_5136", "Establish House: \"")}{genreSearchQuery.trim()}"</span>
                        </div>}
                    </div>}
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('admin.languageLabel', 'Volume Language')}</label>
                  <select className="royal-select" value={bookLanguage} onChange={e => setBookLanguage(e.target.value)} required>
                    <option value="en">{t('common.english', 'English (Royal Dialect)')}</option>
                    <option value="hi">{t('common.hindi', 'Hindi (Rajasthani Royal Style)')}</option>
                    <option value="kn">{t('common.kannada', 'Kannada (Classical Royal Style)')}</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('admin.tagsLabel', 'Acquisition Labels / Tags')}</label>
                  <div onClick={() => tagInputRef.current && tagInputRef.current.focus()} style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(26, 21, 16, 0.4)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '6px',
                minHeight: '42px',
                cursor: 'text',
                alignItems: 'center',
                transition: 'border-color 0.2s'
              }} onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
              }} onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.25)';
              }}>
                    {currentTagsArray.map((tag, idx) => <span key={idx} className="tag-pill-interactive" style={{
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  color: 'var(--accent)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}>
                        <span>{tag}</span>
                        <button type="button" onClick={e => {
                    e.stopPropagation();
                    handleDeleteTag(tag);
                  }} style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '12px',
                    height: '12px',
                    lineHeight: 1
                  }} onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--accent)';
                  }} onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}>
                          ×
                        </button>
                      </span>)}
                    <input ref={tagInputRef} type="text" value={tagTypedValue} onChange={handleTagInputChange} onKeyDown={handleTagInputKeyDown} placeholder={currentTagsArray.length === 0 ? "Type tag & press comma (,) or Enter..." : ""} style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  flexGrow: 1,
                  padding: 0,
                  minWidth: '120px'
                }} />
                  </div>
                  <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '4px',
                display: 'block'
              }}> {t("str_5137", "Type a tag and press comma (`,`) or `Enter` to commit. Hitting `Backspace` on empty input deletes the last tag.")} </span>
                </div>

                <div className="input-group">
                  <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                    <label className="royal-input-label" style={{
                  margin: 0
                }}>{t('admin.coverLabel', 'Cover Image')}</label>
                    <button type="button" onClick={() => handleFetchField('cover')} className="royal-field-fetch-btn" title={t("str_5138", "Fetch Cover selectively from Open Library")} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  opacity: 0.8
                }} onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                }} onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.8';
                }}>
                      <Sparkles size={11} className="gold-glow-icon" />
                      <span>{t('auto_3227', 'Fetch Cover')}</span>
                    </button>
                  </div>
                  <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                    <div style={{
                  flex: 1
                }}>
                      <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '8px',
                    flexWrap: 'wrap'
                  }}>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} style={{
                      display: 'none'
                    }} id="image-file-input" ref={fileInputRef} />
                        <label htmlFor="image-file-input" style={{
                      flex: '1 1 calc(50% - 4px)'
                    }}>
                          <button type="button" onClick={() => document.getElementById('image-file-input')?.click()} className="royal-btn" style={{
                        width: '100%'
                      }}>
                            {selectedImageFile ? `File: ${selectedImageFile.name}` : 'Upload Image'}
                          </button>
                        </label>
                        <button type="button" onClick={() => startCamera('cover')} className="royal-btn" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      flex: '1 1 calc(50% - 4px)'
                    }}>
                          <Camera size={14} /> {t('auto_3228', 'Snap Photo')}
                        </button>
                        {selectedImageFile && <button type="button" onClick={handleImageUpload} className="royal-btn" disabled={uploadingImage} style={{
                      flex: '1 1 100%',
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}>
                            <Upload size={14} /> {uploadingImage ? 'Uploading...' : 'Confirm Upload'}
                          </button>}
                      </div>
                      {imagePreview && <div style={{
                    position: 'relative',
                    marginBottom: '8px'
                  }}>
                          <img src={imagePreview} alt={t("str_5139", "Preview")} style={{
                      maxWidth: '100%',
                      maxHeight: '150px',
                      borderRadius: '4px'
                    }} />
                          <button type="button" onClick={removeImagePreview} style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: "var(--glass-bg)",
                      border: 'none',
                      color: "var(--text-primary)",
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                            <X size={16} />
                          </button>
                        </div>}
                    </div>
                  </div>
                  <p style={{
                fontSize: '0.85rem',
                color: '#999',
                marginTop: '8px'
              }}>{t("str_5140", "OR")}</p>
                  <input type="text" className="royal-input" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder={t("str_5141", "Paste direct image URL (https://...)")} />
                  {coverUrl && <div style={{
                position: 'relative',
                marginTop: '12px',
                border: '1px solid var(--glass-border)',
                padding: '6px',
                borderRadius: '6px',
                background: "var(--glass-bg)",
                display: 'inline-block',
                maxWidth: '100%'
              }}>
                      <img src={coverUrl} alt={t("str_5142", "Cover Preview")} style={{
                  maxWidth: '100%',
                  maxHeight: '180px',
                  borderRadius: '4px',
                  display: 'block'
                }} />
                      <button type="button" onClick={() => setCoverUrl('')} style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  background: "var(--glass-bg)",
                  border: 'none',
                  color: "var(--text-primary)",
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }} title={t("str_5143", "Clear cover URL")}>
                        <X size={14} />
                      </button>
                    </div>}
                </div>

                <div className="input-group">
                  <label className="royal-input-label">Back Cover Image URL (Optional)</label>
                  <input type="text" className="royal-input" value={backCoverUrl} onChange={e => setBackCoverUrl(e.target.value)} placeholder="Paste direct image URL for back cover (https://...)" />
                  {backCoverUrl && <div style={{
                position: 'relative',
                marginTop: '12px',
                border: '1px solid var(--glass-border)',
                padding: '6px',
                borderRadius: '6px',
                background: "var(--glass-bg)",
                display: 'inline-block',
                maxWidth: '100%'
              }}>
                      <img src={backCoverUrl} alt="Back Cover Preview" style={{
                  maxWidth: '100%',
                  maxHeight: '180px',
                  borderRadius: '4px',
                  display: 'block'
                }} />
                      <button type="button" onClick={() => setBackCoverUrl('')} style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  background: "var(--glass-bg)",
                  border: 'none',
                  color: "var(--text-primary)",
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }} title="Clear back cover URL">
                        <X size={14} />
                      </button>
                    </div>}
                </div>

                <div className="input-group">
                  <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                    <label className="royal-input-label" style={{
                  margin: 0
                }}>{t('common.details', 'Description')}</label>
                    <button type="button" onClick={() => handleFetchField('description')} className="royal-field-fetch-btn" title={t("str_5144", "Fetch Description selectively from Open Library")} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  opacity: 0.8
                }} onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                }} onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.8';
                }}>
                      <Sparkles size={11} className="gold-glow-icon" />
                      <span>{t('auto_3229', 'Fetch Description')}</span>
                    </button>
                  </div>
                  <textarea className="royal-textarea" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                </div>

                <div className="form-grid-two">
                  <div className="input-group">
                    <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                      <label className="royal-input-label" style={{
                    margin: 0
                  }}>{t('admin.pagesLabel', 'Pages')}</label>
                      <button type="button" onClick={() => handleFetchField('pages')} className="royal-field-fetch-btn" title={t("str_5145", "Fetch Pages selectively from Open Library")} style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                    opacity: 0.8
                  }} onMouseEnter={e => {
                    e.currentTarget.style.opacity = '1';
                  }} onMouseLeave={e => {
                    e.currentTarget.style.opacity = '0.8';
                  }}>
                        <Sparkles size={11} className="gold-glow-icon" />
                        <span>{t('auto_3230', 'Fetch Pages')}</span>
                      </button>
                    </div>
                    <input type="number" className="royal-input" min="0" value={pages} onChange={e => {
                  const val = e.target.value;
                  setPages(val === '' ? '' : Number(val));
                }} />
                  </div>
                  <div className="input-group">
                    <label className="royal-input-label">{t('admin.copiesLabel', 'Total Copies')}</label>
                    <input type="number" className="royal-input" min="1" value={totalCopies} onChange={e => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  const diff = val - totalCopies;
                  setTotalCopies(val);
                  setAvailableCopies(prev => Math.max(0, prev + diff));
                }} />
                  </div>
                </div>




                {'NDEFReader' in window && <div className="nfc-write-checkbox-row" onClick={() => setShouldWriteNfc(!shouldWriteNfc)}>
                    <input type="checkbox" id="should-write-nfc-checkbox" checked={shouldWriteNfc} onChange={e => setShouldWriteNfc(e.target.checked)} onClick={e => e.stopPropagation()} />
                    <label htmlFor="should-write-nfc-checkbox" className="nfc-write-label" onClick={e => e.stopPropagation()}>
                      <Cpu size={16} className="nfc-write-icon" />
                      {t('auto_3231', 'Write details to physical NFC tag on save')}
                    </label>
                  </div>}

                <div className="submit-row">
                  <button type="submit" className="royal-btn submit-book-btn" id="add-volume-btn">
                    {isEditMode ? t('common.save', 'Save Updated Details') : t('admin.ingestBtn', 'Add Volume to Ledger')}
                  </button>
                </div>
              </form>

              {ingestionSuccess && <div className="success-banner animate-fade-in">
                  <CheckCircle size={18} /> {t('auto_3232', 'Volume successfully registered in Cloud Firestore ledger!')}
                </div>}

              {errorMessage && <div className="error-banner royal-card">
                  <p>{errorMessage}</p>
                </div>}
            </div>
          </div>
        </>}

      {/* Hardware Camera Modal Overlay */}
      {cameraModalOpen && <div className="camera-modal-overlay">
          <div className={`royal-card camera-modal-card ${cameraMode === 'cover' ? 'cover-mode' : 'isbn-mode'}`}>
            <div className="camera-modal-header">
              <h3>
                {cameraMode === 'isbn' ? 'Scanning Volume ISBN Barcode' : cameraMode === 'copy_qr' ? 'Scanning Physical Copy QR Code' : 'Capture Masterwork Cover'}
              </h3>
              <button onClick={stopCamera} className="close-camera-btn">
                <X size={18} />
              </button>
            </div>
            
            {cameraError ? <div className="camera-error-view">
                <p className="camera-error-text">{cameraError}</p>
                <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '16px',
            justifyContent: 'center'
          }}>
                  {(cameraMode === 'isbn' || cameraMode === 'copy_qr') && <button onClick={handleSimulateIsbnScan} className="royal-btn">
                      {t('auto_3233', 'Simulate Scan')}
                    </button>}
                  <button onClick={stopCamera} className="royal-btn-secondary">
                    {t('auto_3234', 'Close')}
                  </button>
                </div>
              </div> : <div className="camera-modal-body">
                <div className={`camera-stream-wrapper ${cameraMode === 'cover' ? 'cover-mode' : 'isbn-mode'} ${isFitMode ? 'contain-mode' : 'cover-mode'}`}>
                  {cameraMode === 'isbn' || cameraMode === 'copy_qr' ? <div id="qr-reader" className="scanner-focus-ring-container" onClick={e => handleScannerClick(e, html5QrCodeRef.current)} style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0
            }} /> : <video ref={videoRef} autoPlay playsInline muted className={`camera-video ${isFitMode ? 'contain-mode' : 'cover-mode'}`} style={{
              transform: !isHardwareZoomActive && zoomValue > 1.0 ? `scale(${zoomValue})` : 'none',
              transformOrigin: 'center',
              transition: 'transform 0.1s ease-out'
            }} />}
                  
                  {cameraMode === 'isbn' || cameraMode === 'copy_qr' ? null : <div className="cover-capture-guide">
                      <div className="cover-frame-outline"></div>
                    </div>}
                </div>

                {cameraMode === 'cover' && <div className="camera-under-view-controls">
                    <span className="camera-help-text-below">{t('auto_3235', 'Position cover inside the gold boundaries')}</span>
                    
                    <div className="camera-advanced-controls">
                      <div className="camera-controls-row">
                        {/* Fit/Fill Toggle */}
                        <button onClick={() => setIsFitMode(!isFitMode)} className={`control-toggle-btn ${isFitMode ? 'active' : ''}`} title={isFitMode ? "Switch to Fill Screen (Crop)" : "Switch to Fit Screen (Full Lens)"}>
                          <Sliders size={13} />
                          <span>{isFitMode ? "Fit Frame (Full)" : "Fill Frame (Crop)"}</span>
                        </button>

                        {/* Switch Camera Sensor Toggle */}
                        {cameraDevices.length > 1 && <button onClick={switchCamera} className="control-toggle-btn switch-camera-btn" title={t("str_5146", "Switch Camera Sensor (Ultra-wide / Main)")}>
                            <RefreshCw size={13} />
                            <span>{t('auto_3236', 'Switch Sensor')}</span>
                          </button>}
                      </div>

                      {/* Zoom Slider */}
                      <div className="camera-zoom-slider-group">
                        <button onClick={() => handleZoomChange(Math.max(0.5, zoomValue - 0.1))} className="zoom-increment-btn" title={t("str_5147", "Zoom Out")} disabled={zoomValue <= 0.5}>
                          <Minus size={13} />
                        </button>
                        <input type="range" min="0.5" max={zoomCapabilities ? zoomCapabilities.max : "3.0"} step="0.1" value={zoomValue} onChange={e => handleZoomChange(e.target.value)} className="zoom-range-input" />
                        <button onClick={() => handleZoomChange(Math.min(zoomCapabilities ? zoomCapabilities.max : 3.0, zoomValue + 0.1))} className="zoom-increment-btn" title={t("str_5148", "Zoom In")} disabled={zoomValue >= (zoomCapabilities ? zoomCapabilities.max : 3.0)}>
                          <Plus size={13} />
                        </button>
                        <span className="zoom-value-label">{zoomValue.toFixed(1)}x</span>
                      </div>
                    </div>
                  </div>}
 
                {cameraMode === 'cover' && <div className="camera-controls-bar">
                    <button onClick={captureCoverPhoto} className="royal-btn capture-action-btn">
                      <Camera size={16} /> {t('auto_3237', 'Snap Cover Photo')}
                    </button>
                  </div>}
              </div>}
          </div>
        </div>}

      {/* NFC Tag Writing Modal Overlay */}
      {nfcWriteModalOpen && pendingBookDto && <div className="camera-modal-overlay">
          <div className="royal-card camera-modal-card nfc-write-card">
            <div className="camera-modal-header">
              <h3>
                <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
                  <Cpu size={18} className="spin-icon" style={{
                color: 'var(--accent)'
              }} />
                  <span>{t('auto_3238', 'Physical-to-Digital NFC Writer')}</span>
                </div>
              </h3>
              <button onClick={handleCancelNfcWrite} className="close-camera-btn">
                <X size={18} />
              </button>
            </div>

            <div className="nfc-write-content">
              <div className="nfc-pulsing-area">
                <div className="nfc-pulse-ring ring-1"></div>
                <div className="nfc-pulse-ring ring-2"></div>
                <div className="nfc-pulse-ring ring-3"></div>
                <div className="nfc-glowing-circle">
                  <Smartphone size={32} className="phone-bounce-icon" />
                </div>
              </div>

              <div className="nfc-write-status">
                {nfcWriteLoading && !nfcWriteSuccess && !nfcWriteError && <p className="status-message loading" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'center'
            }}>
                    <span>
                      <RefreshCw size={14} className="spin-icon" /> {t('auto_3239', 'Broadcasting NDEF URL payload...')}
                    </span>
                    <span style={{
                fontSize: '0.82rem',
                color: 'var(--accent)',
                fontWeight: 'bold'
              }}> {t("str_5149", "Please tap your physical tag. Auto-closing in")} {writeCountdown}{t("str_5150", "s...")} </span>
                  </p>}
                {nfcWriteSuccess && <p className="status-message success">
                    <CheckCircle size={14} style={{
                color: '#d4a574'
              }} /> {t('auto_3240', 'NFC Tag written & registered!')}
                  </p>}
                {nfcWriteError && <div className="status-error-box">
                    <p className="error-title">{t('auto_3241', 'NDEF Writer Error')}</p>
                    <p className="error-desc">{nfcWriteError}</p>
                  </div>}
                {!nfcWriteLoading && !nfcWriteSuccess && !nfcWriteError && <p className="status-message info" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              alignItems: 'center'
            }}>
                    <span>{t('auto_3242', 'Ready to write... Align tag near back of device.')}</span>
                    <span style={{
                fontSize: '0.82rem',
                color: 'var(--accent)',
                fontWeight: 'bold'
              }}> {t("str_5151", "Auto-closing in")} {writeCountdown}{t("str_5152", "s...")} </span>
                  </p>}
              </div>

              <div className="nfc-write-book-details">
                <div className="book-mini-meta">
                  {pendingBookDto.coverUrl && <img src={pendingBookDto.coverUrl} alt={t("str_5153", "Cover preview")} className="book-mini-cover" />}
                  <div className="book-mini-texts">
                    <span className="book-mini-title">{pendingBookDto.title}</span>
                    <span className="book-mini-author">{t("str_5154", "by")} {pendingBookDto.author}</span>
                    <span className="book-mini-isbn">{t("str_5155", "ISBN:")} {pendingBookDto.isbn}</span>
                    {pendingBookDto.ntagUid && <span className="book-mini-tag-uid">{t("str_5156", "Tag NFC UID:")} {formatUidWithColons(pendingBookDto.ntagUid)}</span>}
                  </div>
                </div>
                <div className="nfc-target-url-badge">
                  <span>{t("str_5157", "Writes Target NDEF URL:")}</span>
                  <code style={{
                fontSize: '0.8rem',
                wordBreak: 'break-all'
              }}>{`https://bookshelfnet.com/?u=${(pendingBookDto.ntagUid || ntagUid || '04:A3:B2:C1:D0:E9:80').toLowerCase().replace(/:/g, '')}x000000`}</code>
                </div>

                {/* NTAG213 Advanced Hardware Configuration Tool */}
                <div className="ntag-hw-config-section" style={{
              marginTop: '12px',
              padding: '12px',
              background: 'var(--glass-bg)',
              border: '1px solid rgba(212, 165, 116, 0.2)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              lineHeight: '1.4'
            }}>
                  <div style={{
                fontWeight: '600',
                color: 'var(--accent)',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                    <Cpu size={12} />
                    <span>{t('auto_3243', 'NTAG213 Hardware Counter Mirror Guide')}</span>
                  </div>
                  <p style={{
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}> {t("str_5158", "Web NFC standard is sandboxed and cannot execute raw configuration register writes (Pages 29h-2Ch). After writing the NDEF URL using this browser console, use an NFC developer tool (such as NXP TagWriter) to issue these exact sector commands to enable the automatic counter:")} </p>
                  
                  {(() => {
                const tagUid = pendingBookDto.ntagUid || ntagUid || '04:A3:B2:C1:D0:E9:80';
                const fullUrl = `https://bookshelfnet.com/?u=${tagUid.trim().toLowerCase().replace(/:/g, '')}x000000`;
                let cleanUrl = fullUrl;
                let prefixCode = "03h (https://)";
                let idCode = 0x03;
                if (fullUrl.startsWith("https://")) {
                  idCode = 0x03;
                  cleanUrl = fullUrl.substring(8);
                } else if (fullUrl.startsWith("http://")) {
                  idCode = 0x01;
                  prefixCode = "01h (http://)";
                  cleanUrl = fullUrl.substring(7);
                } else {
                  idCode = 0x00;
                  prefixCode = "00h (raw)";
                }
                const separatorIndex = cleanUrl.indexOf("x000000");
                if (separatorIndex === -1) return null;
                const zerosIndex = separatorIndex + 1; // Index of first '0' of '000000' relative to cleanUrl.
                const absoluteOffset = 23 + zerosIndex; // 23 byte offset from Page 0 in standard NDEF.
                const mirrorPage = Math.floor(absoluteOffset / 4);
                const mirrorByte = absoluteOffset % 4;
                const mirrorHex = (0x80 | mirrorByte << 4).toString(16).toUpperCase().padStart(2, '0') + "h";
                const pageHex = mirrorPage.toString(16).toUpperCase().padStart(2, '0') + "h";
                return <div className="ntag-registers-table" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                        <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--glass-border)',
                    paddingBottom: '4px'
                  }}>
                          <span style={{
                      color: 'var(--text-secondary)'
                    }}>{t("str_5159", "Placeholder Position Offset:")}</span>
                          <strong>{t("str_5160", "Byte")} {absoluteOffset}</strong>
                        </div>
                        <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--glass-border)',
                    paddingBottom: '4px'
                  }}>
                          <span style={{
                      color: 'var(--text-secondary)'
                    }}>{t("str_5161", "Configuration Target Page:")}</span>
                          <strong>{t("str_5162", "Page")} {mirrorPage} ({pageHex})</strong>
                        </div>
                        <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--glass-border)',
                    paddingBottom: '4px'
                  }}>
                          <span style={{
                      color: 'var(--text-secondary)'
                    }}>{t("str_5163", "Target Byte Position:")}</span>
                          <strong>{t("str_5164", "Byte")} {mirrorByte}</strong>
                        </div>
                        <div style={{
                    marginTop: '6px',
                    fontWeight: '500',
                    color: 'var(--accent)'
                  }}>{t("str_5165", "Raw Mifare / APDU Programming Commands:")}</div>
                        <code style={{
                    background: "var(--glass-bg)",
                    padding: '6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    color: '#d4a574',
                    fontFamily: 'monospace',
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid var(--glass-border)'
                  }}>
                          {`// Command 1: Configure Page 29h (MIRROR=${mirrorHex.substring(0, 2)}, RFUI=00, MIRROR_PAGE=${pageHex.substring(0, 2)}, AUTH0=FF)\n`}
                          {`A2 29 ${mirrorHex.substring(0, 2)} 00 ${pageHex.substring(0, 2)} FF\n\n`}
                          {`// Command 2: Configure Page 2Ah (ACCESS: Enable NFC_CNT_EN bit to trigger counter increment)\n`}
                          {`A2 2A 04 00 00 00`}
                        </code>
                      </div>;
              })()}
                </div>
              </div>

              <div className="nfc-modal-actions" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '100%'
          }}>
                <div style={{
              display: 'flex',
              gap: '10px',
              width: '100%'
            }}>
                  <button type="button" onClick={() => triggerWriteNfcTag(pendingBookDto.isbn)} disabled={nfcWriteLoading || nfcWriteSuccess} className="royal-btn secondary-btn" style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                    <RefreshCw size={14} className={nfcWriteLoading ? "spin-icon" : ""} />
                    <span>{t('auto_3244', 'Restart Write')}</span>
                  </button>

                  <button type="button" onClick={handleCancelNfcWrite} className="royal-btn-secondary" style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderColor: 'rgba(255, 107, 107, 0.4)',
                color: '#ff6b6b'
              }}>
                    <X size={14} />
                    <span>{t('auto_3245', 'Cancel & Void')}</span>
                  </button>
                </div>
                
                <button type="button" onClick={handleSkipWriteAndSave} disabled={nfcWriteLoading || nfcWriteSuccess} className="royal-btn-secondary" style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
                  <Check size={14} />
                  <span>{t('auto_3246', 'Skip Tag & Save Ledger Directly')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>}

      {/* iOS Safari Web NFC Restrictions Modal Overlay */}
      {iosWarningModalOpen && pendingBookDto && <div className="camera-modal-overlay">
          <div className="royal-card camera-modal-card ios-warning-card">
            <div className="camera-modal-header">
              <h3>
                <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
                  <Shield size={18} style={{
                color: 'var(--accent)'
              }} />
                  <span>{t('auto_3247', 'iOS Safari NFC Restriction Warning')}</span>
                </div>
              </h3>
              <button onClick={() => setIosWarningModalOpen(false)} className="close-camera-btn">
                <X size={18} />
              </button>
            </div>

            <div className="ios-warning-content">
              <div className="apple-badge-header">
                <div className="apple-logo-glow"></div>
              </div>

              <div className="warning-body">
                <h4 style={{
              color: 'var(--accent)',
              marginBottom: '8px',
              textAlign: 'center'
            }}>{t('auto_3248', 'Secure Cloud Sync Successful')}</h4>
                <p style={{
              fontSize: '0.9rem',
              lineHeight: '1.45',
              color: 'var(--text-secondary)',
              textAlign: 'center'
            }}>
                  {t('auto_3249', 'Apple iOS / Safari limits programmatic tag writing inside public web applications due to native security sandbox restrictions.')}
                </p>
                <div className="ios-badge-explanation">
                  <p>
                    <strong>{t("str_5166", "Database Status:")}</strong> {t("str_5167", "Digital registration is completely successful! The book catalog details and physical chip UID (")}<code>{formatUidWithColons(pendingBookDto.ntagUid) || "N/A"}</code>{t("str_5168", ") are permanently registered in the royal ledger.")} </p>
                  <p>
                    <strong>{t("str_5169", "NTAG Memory Action:")}</strong> {t("str_5170", "Writing the secure checkout instant deep-link URL (")}<code>{`https://bookshelfnet.com/?u=${(pendingBookDto.ntagUid || "uid").toLowerCase().replace(/:/g, '')}x000000`}</code>{t("str_5171", ") with hardware counter mirror support will need to be completed later from an Android or NFC-compatible workstation.")} </p>
                </div>
              </div>

              <button type="button" onClick={() => setIosWarningModalOpen(false)} className="royal-btn" style={{
            width: '100%',
            marginTop: '16px'
          }}>
                {t('auto_3250', 'Acknowledge & Continue')}
              </button>
            </div>
          </div>
        </div>}

      {/* Search Metadata Drawer */}
      {isSearchDrawerOpen && <div className="search-drawer-overlay animate-fade-in" onClick={() => setIsSearchDrawerOpen(false)}>
          <div className="search-drawer-container" onClick={e => e.stopPropagation()}>
            <div className="search-drawer-header">
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
                <Compass size={20} className="gold-glow-icon" />
                <h3 className="drawer-title">{t('auto_3251', 'Search Google Books')}</h3>
              </div>
              <button onClick={() => setIsSearchDrawerOpen(false)} className="close-drawer-btn">
                <X size={18} />
              </button>
            </div>

            <div className="search-drawer-body">
              <p className="drawer-help-text">{t('auto_3252', 'Search millions of volumes by title, author, or keyword to auto-populate the intake console.')}</p>
              
              <form onSubmit={handleMetadataSearch} className="drawer-search-form">
                <div className="search-input-wrapper">
                  <input type="text" placeholder={t("str_5172", "Enter title, author, or keyword...")} className="royal-input search-drawer-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
                  <button type="submit" className="royal-btn drawer-search-submit" disabled={isSearchingMetadata}>
                    {isSearchingMetadata ? <RefreshCw className="spin-icon" size={14} /> : <Search size={14} />}
                  </button>
                </div>
              </form>

              {searchError && <div className="search-error-banner">
                  <p>{searchError}</p>
                </div>}

              <div className="search-results-list">
                {isSearchingMetadata && <div className="drawer-searching-loader">
                    <RefreshCw className="spin-icon gold-glow-icon" size={24} />
                    <p>{t('auto_3253', 'Consulting Google Books archives...')}</p>
                  </div>}

                {!isSearchingMetadata && searchResults.length > 0 && <div className="results-scroll-container">
                    <p className="results-count-text">{t("str_5173", "Found")} {searchResults.length} {t("str_5174", "matches:")}</p>
                    {searchResults.map((book, index) => <div key={index} className="search-result-item royal-card" onClick={() => handleSelectSearchResult(book)}>
                        <div className="result-cover-frame">
                          {book.coverUrl ? <img src={book.coverUrl} alt={book.title} className="result-cover-img" /> : <div className="result-cover-fallback">
                              <BookOpen size={16} />
                            </div>}
                        </div>
                        <div className="result-metadata-info">
                          <h4 className="result-title">{book.title}</h4>
                          {book.authors && book.authors.length > 0 && <p className="result-author">{t("str_5175", "by")} {book.authors.join(', ')}</p>}
                          <div className="result-meta-bottom">
                            {book.publisher && <span className="result-publisher">{book.publisher}</span>}
                            {book.publishDate && <span className="result-pub-date">({book.publishDate})</span>}
                          </div>
                          {book.isbn && <span className="result-isbn">{t("str_5176", "ISBN:")} {book.isbn}</span>}
                        </div>
                      </div>)}
                  </div>}
              </div>
            </div>
          </div>
        </div>}
      {/* Subject-to-Genre Creation Prompt Modal (Epic 3) */}
      {subjectPromptOpen && <div className="camera-modal-overlay" style={{
      zIndex: 1100
    }}>
          <div className="royal-card camera-modal-card" style={{
        maxWidth: '550px',
        width: '95%',
        padding: '24px'
      }}>
            <div className="camera-modal-header" style={{
          marginBottom: '16px'
        }}>
              <h3 style={{
            fontSize: '1.25rem',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
                <Sparkles size={18} className="gold-glow-icon" />
                <span>{t('auto_3254', 'Registry Subjects Analysis')}</span>
              </h3>
              <button onClick={() => setSubjectPromptOpen(false)} className="close-camera-btn">
                <X size={18} />
              </button>
            </div>
            <p style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          marginBottom: '16px',
          lineHeight: '1.5'
        }}> {t("str_5177", "The Open Library API returned the following subject tags. We have automatically matched close-matches (ignoring case, spaces, and hyphens) against pre-existing genres and tags:")} </p>
            <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '12px',
          background: "var(--glass-bg)",
          borderRadius: '8px',
          border: '1px solid var(--glass-border)',
          marginBottom: '20px',
          scrollbarWidth: 'thin'
        }}>
              {promptSubjects.map((subj, idx) => <div key={idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            gap: '12px'
          }}>
                  <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              flex: 1,
              textAlign: 'left'
            }}>
                    <span style={{
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                      "{subj.name}"
                    </span>
                    {subj.status === 'matched-genre' && <span style={{
                fontSize: '0.8rem',
                color: 'rgba(212,175,55,0.9)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                        <span>{t("str_5178", "Matches existing Genre:")} <strong>{subj.matchedName}</strong> {t("str_5179", "(Selected)")}</span>
                      </span>}
                    {subj.status === 'matched-tag' && <span style={{
                fontSize: '0.8rem',
                color: '#90caf9',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                        <span>{t("str_5180", "Matches existing Tag:")} <strong>{subj.matchedName}</strong> {t("str_5181", "(Already Added)")}</span>
                      </span>}
                    {subj.status === 'no-match' && <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                        {t('auto_3255', 'No match found. Appended to manual tags list.')}
                      </span>}
                  </div>

                  {subj.status === 'no-match' ? <button type="button" onClick={() => handleCreateGenreFromSubject(subj.name)} className="royal-btn-secondary" style={{
              fontSize: '0.8rem',
              padding: '5px 10px',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              background: 'rgba(212, 165, 116, 0.05)'
            }} onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212, 165, 116, 0.15)';
            }} onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(212, 165, 116, 0.05)';
            }}>
                      {t('auto_3256', '+ Create Genre')}
                    </button> : <span style={{
              fontSize: '1.1rem'
            }}>
                      {subj.status === 'matched-genre' ? '✅' : '🏷️'}
                    </span>}
                </div>)}
            </div>
            <div style={{
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
              <button type="button" onClick={() => setSubjectPromptOpen(false)} className="royal-btn" style={{
            fontSize: '0.85rem',
            padding: '8px 16px'
          }}>
                {t('auto_3257', 'Acknowledge & Close')}
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
export default BookIngestionConsole;