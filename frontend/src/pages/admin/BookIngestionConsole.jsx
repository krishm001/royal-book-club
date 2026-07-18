import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, Upload, Scan, CheckCircle, RefreshCw, X, Camera, Cpu, Smartphone, Check, ArrowLeft, Search, Compass, BookOpen } from 'lucide-react';
import { createBook, lookupBookByIsbn, fetchBookByIsbn, fetchBooks, searchBookMetadata } from '../../services/libraryApi';
import { fetchBookHouses } from '../../services/genreApi';
import { uploadBookImage } from '../../services/storageApi';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useLanguage } from '../../i18n/LanguageContext';
import './BookIngestionConsole.css';

const SafeHtml5Qrcode = Html5Qrcode;
const SafeHtml5QrcodeSupportedFormats = Html5QrcodeSupportedFormats;

const BookIngestionConsole = ({ user }) => {
  const formatUidWithColons = (val) => {
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
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState(0);
  const [totalCopies, setTotalCopies] = useState(1);
  const [availableCopies, setAvailableCopies] = useState(1);
  const [existingBooks, setExistingBooks] = useState([]);
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bookLanguage, setBookLanguage] = useState('en');

  const { t } = useLanguage();

  // New fields
  const [selectedHouse, setSelectedHouse] = useState('');
  const [houses, setHouses] = useState([]);
  const [tagsInput, setTagsInput] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  // NTAG213 and Camera Hardware states
  const [ntagUid, setNtagUid] = useState('');
  const [isNfcReading, setIsNfcReading] = useState(false);
  const [writeIosRedirect, setWriteIosRedirect] = useState(false);
  const [nfcError, setNfcError] = useState('');
  const [nfcSuccess, setNfcSuccess] = useState(false);

  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState('isbn'); // 'isbn' or 'cover'
  const [cameraError, setCameraError] = useState('');
  const [cameraStream, setCameraStream] = useState(null);

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
  const [shouldWriteNfc, setShouldWriteNfc] = useState(false);

  // Search Metadata Drawer states
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleMetadataSearch = async (e) => {
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

  const handleSelectSearchResult = (book) => {
    setManualTitle(book.title || '');
    setManualAuthor(Array.isArray(book.authors) ? book.authors.join(', ') : book.author || book.authors || '');
    setPublisher(book.publisher || '');
    setPublishDate(book.publishDate || '');
    setCoverUrl(book.coverUrl || '');
    setDescription(book.subtitle || '');
    setPages(book.pages || 0);
    setIsbn(book.isbn || '');
    setTotalCopies(1);
    setAvailableCopies(1);
    setTagsInput('');
    setNtagUid('');
    setIsSearchDrawerOpen(false);
    setInfoMessage('Auto-populated form with selected Google Books metadata; complete any remaining fields.');
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

  const handleSelectExistingBook = (book) => {
    if (!book) return;
    setIsEditMode(true);
    setIsEditingExisting(true);
    setIsbn(book.isbn || '');
    setManualTitle(book.title || '');
    setManualAuthor(Array.isArray(book.authors) ? book.authors.join(', ') : book.author || '');
    setPublisher(book.publisher || '');
    setPublishDate(book.publishDate || book.publishYear || '');
    setCoverUrl(book.coverUrl || '');
    setDescription(book.description || book.subtitle || '');
    setPages(book.pages || 0);
    setTotalCopies(book.totalCopies || 1);
    setAvailableCopies(book.availableCopies || 1);
    setBookLanguage(book.language || 'en');
    setSelectedHouse(book.houseName || (houses.length > 0 ? houses[0] : ''));
    setNtagUid(formatUidWithColons(book.ntagUid || ''));
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
    setBookLanguage('en');
    setSelectedHouse(houses.length > 0 ? houses[0] : '');
    setNtagUid('');
    setTagsInput('');
    setInfoMessage('');
    setErrorMessage('');
    setNfcSuccess(false);
    setNfcError('');
  };

  // Check if user is admin
  const isAdmin = user && user.role === 'ADMIN';

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
            }
          } else {
            const defaults = ['Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic'];
            setHouses(defaults);
            setSelectedHouse(defaults[0]);
          }
        } catch (err) {
          console.warn('Unable to load book houses', err);
          const defaults = ['Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic'];
          setHouses(defaults);
          setSelectedHouse(defaults[0]);
        }
      };
      loadHouses();
      loadExistingBooks();
    }
  }, [isAdmin]);

  const handleIsbnFetch = async (forcedIsbn) => {
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
        setSelectedHouse(existingBook.genre || (houses.length > 0 ? houses[0] : ''));
        setTagsInput(Array.isArray(existingBook.tags) ? existingBook.tags.join(', ') : '');
        setNtagUid(formatUidWithColons(existingBook.ntagUid || ''));
        setBookLanguage(existingBook.language || 'en');
        
        setIsEditMode(true);
        setInfoMessage('Existing book found in catalog. Edit the fields and save the updated details.');
      }
    } catch (catalogError) {
      if (catalogError?.response?.status === 404) {
        try {
          const metadata = await lookupBookByIsbn(targetIsbn.trim());
          setManualTitle(metadata.title || '');
          setManualAuthor(Array.isArray(metadata.authors) ? metadata.authors.map((author) => typeof author === 'object' && author ? author.name : author).join(', ') : metadata.authors || '');
          setPublisher(metadata.publishers?.[0] || metadata.publisher || '');
          setPublishDate(metadata.publish_date || metadata.publishDate || '');
          setCoverUrl(metadata.coverUrl || metadata.cover?.large || '');
          setDescription(metadata.description || metadata.subtitle || '');
          setPages(metadata.pages || metadata.number_of_pages || 0);

          setTotalCopies(1);
          setAvailableCopies(1);
          setTagsInput('');
          setNtagUid('');
          setInfoMessage('Lookup returned metadata from Open Library; complete any missing payload fields.');
        } catch (lookupError) {
          console.error(lookupError);
          setErrorMessage('Could not fetch book metadata from the backend lookup service.');
        }
      } else {
        console.error(catalogError);
        setErrorMessage('Could not fetch book details from catalog lookup.');
      }
    } finally {
      setFetchingMetadata(false);
    }
  };

  // Camera & Scanner Handlers
  const startCamera = async (mode) => {
    setCameraError('');
    setCameraMode(mode);
    setCameraModalOpen(true);

    if (mode === 'cover') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });
        setCameraStream(stream);
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
            track.applyConstraints({ advanced: [{ zoom: tempZoom }] })
              .then(() => {
                setTimeout(() => {
                  track.applyConstraints({ advanced: [{ zoom: currentZ }] })
                    .catch(err => console.warn('[Scanner refocus] Failed to restore zoom:', err));
                }, 120);
              })
              .catch(err => console.warn('[Scanner refocus] Failed to toggle zoom:', err));
          } else {
            // Nudge continuous focus if zoom isn't available
            const advancedConstraints = {};
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              advancedConstraints.focusMode = 'continuous';
            }
            if (Object.keys(advancedConstraints).length > 0) {
              track.applyConstraints({ advanced: [advancedConstraints] })
                .catch(err => console.warn('[Scanner refocus] Failed to apply focusMode:', err));
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Scanner refocus] Error during manual refocus trigger:', err);
    }
  };

  useEffect(() => {
    if (cameraModalOpen && cameraMode === 'isbn') {
      const timer = setTimeout(() => {
        const qrReaderElem = document.getElementById('qr-reader');
        if (!qrReaderElem) {
          console.error('qr-reader element not found in DOM');
          return;
        }

        try {
          const formats = [
            SafeHtml5QrcodeSupportedFormats.EAN_13,
            SafeHtml5QrcodeSupportedFormats.EAN_8,
            SafeHtml5QrcodeSupportedFormats.UPC_A,
            SafeHtml5QrcodeSupportedFormats.UPC_E,
            SafeHtml5QrcodeSupportedFormats.CODE_128,
            SafeHtml5QrcodeSupportedFormats.CODE_39,
            SafeHtml5QrcodeSupportedFormats.CODE_93
          ];

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
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } : { facingMode: "environment" };

          const startScanning = (cameraIdOrConfig) => {
            if (!html5QrCodeRef.current) return;
            const activeConfig = isIOS ? cameraConfig : cameraIdOrConfig;

            html5QrCode.start(
              activeConfig,
              {
                fps: 25,
                qrbox: (w, h) => {
                  const boxWidth = isIOS 
                    ? Math.floor(Math.min(w * 0.85, 340))
                    : Math.floor(Math.min(w * 0.85, 400));
                  const boxHeight = isIOS ? 160 : Math.floor(Math.min(h * 0.35, 150));
                  return { width: boxWidth, height: boxHeight };
                },
                videoConstraints: isIOS ? cameraConfig : {
                  facingMode: "environment"
                }
              },
              (decodedText, decodedResult) => {
                console.log(`Barcode decoded successfully: ${decodedText}`);
                setIsbn(decodedText);
                html5QrCode.stop().then(() => {
                  html5QrCodeRef.current = null;
                  setCameraModalOpen(false);
                  handleIsbnFetch(decodedText);
                }).catch(err => {
                  console.error('Failed to stop html5Qrcode', err);
                  setCameraModalOpen(false);
                  handleIsbnFetch(decodedText);
                });
              },
              (errorMessage) => {
                // Ignore scan failures per frame
              }
            ).then(() => {
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
                      track.applyConstraints({ advanced: [advancedConstraints] })
                        .then(() => console.log('[qr-reader] Track constraints applied successfully:', advancedConstraints))
                        .catch(err => console.warn('[qr-reader] Failed to apply track constraints', err));
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
                startScanning({ facingMode: "environment" });
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
                startScanning({ facingMode: "environment" });
              }
            }).catch(err => {
              console.warn("getCameras failed or denied, attempting default environment startup:", err);
              startScanning({ facingMode: "environment" });
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
  }, [cameraModalOpen, cameraMode]);

  const captureCoverPhoto = () => {
    if (!videoRef.current) return;
    
    const vWidth = videoRef.current.videoWidth || 1280;
    const vHeight = videoRef.current.videoHeight || 720;
    const streamAspect = vWidth / vHeight;
    const targetAspect = 3 / 4; // Portrait 3:4 aspect ratio
    
    // Create high-resolution 3:4 canvas for beautiful premium cover crops
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    
    let sx, sy, sWidth, sHeight;
    
    if (streamAspect > targetAspect) {
      // Source stream is wider than target aspect ratio (typical landscape/webcam streams)
      // Crop extra sides off horizontally
      sHeight = vHeight;
      sWidth = vHeight * targetAspect;
      sx = (vWidth - sWidth) / 2;
      sy = 0;
    } else {
      // Source stream is taller than target aspect ratio (uncommon portrait streams)
      // Crop extra top/bottom vertically
      sWidth = vWidth;
      sHeight = vWidth / targetAspect;
      sx = 0;
      sy = (vHeight - sHeight) / 2;
    }
    
    console.log(`Cropping live capture stream (${vWidth}x${vHeight}) to 3:4 aspect ratio: sx=${sx}, sy=${sy}, width=${sWidth}, height=${sHeight}`);
    
    ctx.drawImage(
      videoRef.current,
      sx, sy, sWidth, sHeight, // Source crop rectangle
      0, 0, canvas.width, canvas.height // Destination rectangle
    );
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `cover_snapshot_${Date.now()}.png`, { type: 'image/png' });
        setSelectedImageFile(file);
        
        // Preview
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target?.result);
        };
        reader.readAsDataURL(file);
        
        stopCamera();
      }
    }, 'image/png');
  };

  const handleSimulateIsbnScan = () => {
    const demoIsbns = [
      '9780141439570', // The Picture of Dorian Gray
      '9780451524935', // 1984
      '9780743273565', // The Great Gatsby
      '9780486280615', // Frankenstein
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
      const allBooks = await fetchBooks();
      let matchedBook = null;
      
      const cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
      matchedBook = allBooks.find(b => {
        const cleanBookTag = (b.ntagUid || '').toLowerCase().replace(/:/g, '');
        return cleanBookTag && cleanBookTag === cleanScanned;
      });

      if (!matchedBook && urlIsbn) {
        const cleanUrlIsbn = urlIsbn.trim().replace(/[-\s]/g, '');
        matchedBook = allBooks.find(b => (b.isbn || '').trim().replace(/[-\s]/g, '') === cleanUrlIsbn);
      }

      if (matchedBook) {
        setIsbn(matchedBook.isbn || '');
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
        setBookLanguage(matchedBook.language || 'en');
        if (matchedBook.genre) {
          setSelectedHouse(matchedBook.genre);
        }
        setIsEditMode(true);
        setNfcSuccess(true);
        setIsNfcReading(false);
        setInfoMessage(`Existing book "${matchedBook.title}" loaded from NFC tap.`);
      } else {
        setNtagUid(formatUidWithColons(cleanScanned));
        setNfcSuccess(true);
        setIsNfcReading(false);
        setInfoMessage(`Unregistered NTAG213 Tag (${formatUidWithColons(cleanScanned)}) detected.`);
      }
    } catch (err) {
      console.error("Error matching NTAG tap:", err);
      const fallbackClean = (serialNumber || '').toLowerCase().replace(/:/g, '');
      setNtagUid(formatUidWithColons(fallbackClean));
      setNfcSuccess(true);
      setIsNfcReading(false);
      setInfoMessage(`Tag detected: ${fallbackClean}`);
    }
  };

  // Web NFC NTAG213 Scanning Logic
  const startNfcRead = async () => {
    setNfcError('');
    setNfcSuccess(false);
    
    if (!('NDEFReader' in window)) {
      setNfcError('Web NFC is not supported on this browser/device. NFC registration requires an Android Chrome or Web NFC compatible device.');
      return;
    }

    try {
      setIsNfcReading(true);
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener("readingerror", () => {
        setNfcError("NFC Reading Error: Cannot read data from the tag. Try again.");
      });

      ndef.addEventListener("reading", async ({ serialNumber, message }) => {
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
        await processScannedNtag(extractedUid || serialNumber, extractedIsbn);
      });
    } catch (error) {
      console.error("NFC reading error: ", error);
      setNfcError(`NFC activation failed: ${error.message || error}`);
      setIsNfcReading(false);
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
        setWriteCountdown((prev) => {
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

  const handleSaveTagEdit = (index) => {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (editingTagValue.trim()) {
      tags[index] = editingTagValue.trim();
    } else {
      tags.splice(index, 1);
    }
    setTagsInput(tags.join(', '));
    setEditingTagIndex(null);
  };

  const handleRemoveTag = (index) => {
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
    setBookLanguage('en');
    setNfcSuccess(false);
    setNfcError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (houses.length > 0) {
      setSelectedHouse(houses[0]);
    }
    loadExistingBooks();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
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

  const handleIngestionSubmit = async (e) => {
    e.preventDefault();

    if (!isbn.trim() || !manualTitle.trim() || !manualAuthor.trim()) {
      setErrorMessage('ISBN, title, and author are required.');
      return;
    }

    setErrorMessage('');

    const authors = manualAuthor.split(',').map((name) => name.trim()).filter(Boolean);
    
    // Trim and deduplicate tags
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const deduplicatedTags = Array.from(new Set(tags));

    const bookDto = {
      isbn: isbn.trim(),
      title: manualTitle.trim(),
      subtitle: '',
      authors,
      publisher: publisher.trim(),
      publishDate: publishDate.trim(),
      description: description.trim(),
      coverUrl: coverUrl.trim(),
      pages: Number(pages) || 0,
      totalCopies: Number(totalCopies) || 1,
      availableCopies: Number(availableCopies) || 1,
      genre: selectedHouse,
      tags: deduplicatedTags,
      ntagUid: ntagUid ? ntagUid.trim().toLowerCase().replace(/:/g, '') : null,
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
        records: [
          {
            recordType: "url",
            data: `https://bookshelfnet.com/?u=${cleanUidToWrite}x000000`
          }
        ]
      }, { signal: controller.signal });
      
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


  return (
    <div className="ingestion-container animate-fade-in">
      {!isAdmin ? (
        <>
          <header className="ingestion-header">
            <h1 className="ingestion-title glow-text">{t('admin.privilegedSanctuary', 'Access Denied')}</h1>
            <p className="ingestion-subtitle">{t('admin.accessDeniedDesc', 'Only administrators can access the book ingestion console.')}</p>
          </header>
        </>
      ) : (
        <>
          <header className="ingestion-header">
            <Link to="/admin" className="back-link">
              <ArrowLeft size={16} /> {t('admin.backToConsole', 'Curator Console')}
            </Link>
            <div className="header-badge-admin">
              <Shield size={14} className="gold-glow-icon" />
              <span className="gold-gradient-text">ADMIN ACQUISITION</span>
            </div>
            <h1 className="ingestion-title glow-text">{t('admin.bookIngestionConsole', 'Acquisition Ingestion Console')}</h1>
            <p className="ingestion-subtitle">
              {t('admin.ingestionDesc', 'Acquire and register new physical and digital masterworks into the Royal Library ledger.')}
            </p>
          </header>

          {/* Streamlined, sleek internal database search bar */}
          <div className="royal-card db-catalog-search-card-top" style={{ maxWidth: '800px', margin: '0 auto 24px auto', padding: '16px 20px', border: '1px solid rgba(212, 175, 55, 0.2)', background: 'rgba(141, 18, 34, 0.03)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} style={{ color: 'var(--accent)' }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  Search & Edit Local Ledger Database
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Search and retrieve existing physical and digital volumes from the local database to update their catalog metadata or program their tag.
              </p>
              
              <div className="db-search-input-group" style={{ marginTop: '8px' }}>
                <div className="db-search-row" style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Search by Title, Author, or ISBN..."
                    className="royal-input db-search-input-box"
                    value={dbSearchQuery}
                    onChange={(e) => setDbSearchQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {dbSearchQuery && (
                    <button
                      type="button"
                      className="royal-btn-secondary clear-db-search-btn"
                      onClick={() => setDbSearchQuery('')}
                      style={{ padding: '0 16px' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {dbSearchQuery.trim() ? (
                <div className="db-search-results-list" style={{ marginTop: '12px', maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.2)' }}>
                  {existingBooks.filter(b => {
                    const q = dbSearchQuery.toLowerCase().trim();
                    return (b.title && b.title.toLowerCase().includes(q)) ||
                           (b.isbn && b.isbn.toLowerCase().includes(q)) ||
                           (Array.isArray(b.authors) && b.authors.some(a => a.toLowerCase().includes(q))) ||
                           (b.author && b.author.toLowerCase().includes(q));
                  }).length > 0 ? (
                    existingBooks.filter(b => {
                      const q = dbSearchQuery.toLowerCase().trim();
                      return (b.title && b.title.toLowerCase().includes(q)) ||
                             (b.isbn && b.isbn.toLowerCase().includes(q)) ||
                             (Array.isArray(b.authors) && b.authors.some(a => a.toLowerCase().includes(q))) ||
                             (b.author && b.author.toLowerCase().includes(q));
                    }).map((b) => (
                      <div key={b.isbn} className="db-search-result-item" onClick={() => { handleSelectExistingBook(b); setDbSearchQuery(''); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <div className="result-item-cover-wrapper" style={{ width: '36px', height: '48px', overflow: 'hidden', borderRadius: '3px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.2)' }}>
                          {b.coverUrl ? (
                            <img src={b.coverUrl} alt={b.title} className="result-item-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <BookOpen size={16} className="fallback-cover-icon" style={{ color: 'var(--accent, #d4af37)' }} />
                          )}
                        </div>
                        <div className="result-item-details" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                          <span className="result-item-title" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text, #f0f0f5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</span>
                          <span className="result-item-authors" style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #9a9ab0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {Array.isArray(b.authors) ? b.authors.join(', ') : b.author || 'Unknown Author'}
                          </span>
                          <span className="result-item-isbn" style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent, #d4af37)' }}>ISBN: {b.isbn}</span>
                        </div>
                        <button type="button" className="royal-btn-secondary select-db-book-btn" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                          Edit
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="no-db-results-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '20px 0' }}>No matching database records found.</p>
                  )}
                </div>
              ) : null}

              {isEditingExisting && (
                <div className="editing-indicator-box royal-card animate-fade-in" style={{ border: '1px solid var(--accent, #d4af37)', background: 'rgba(212, 175, 55, 0.05)', marginTop: '12px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--accent, #d4af37)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} /> <strong>Active Editing Mode: "{manualTitle}"</strong>
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Overwrites current record on save.
                      </p>
                    </div>
                    <button type="button" className="royal-btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={handleResetForm}>
                      Cancel & Add New Instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ingestion-grid" style={{ display: 'block', maxWidth: '800px', margin: '0 auto' }}>
            <div className="royal-card form-intake-card">
              <h3>{t('admin.manualIngestion', 'Single Volume Intake')}</h3>
              <p className="section-p-desc">Register an individual book volume. Query metadata by ISBN or input details manually.</p>

              <div className="intake-top-actions">
                <div className="isbn-query-column">
                  <label className="royal-input-label">{t('catalog.isbn', 'Query External ISBN API')}</label>
                  <div className="isbn-input-row">
                    <input
                      type="text"
                      placeholder={t('admin.isbnPlaceholder', 'e.g. 9780141439570')}
                      className="royal-input isbn-input-box"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                    />
                    <div className="isbn-btn-group">
                      <button
                        type="button"
                        onClick={() => startCamera('isbn')}
                        className="royal-btn lookup-btn"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Scan Barcode with Camera"
                      >
                        <Camera size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleIsbnFetch()}
                        className="royal-btn lookup-btn"
                        disabled={fetchingMetadata}
                        id="isbn-lookup-btn"
                      >
                        {fetchingMetadata ? <RefreshCw className="spin-icon" size={14} /> : t('admin.fetchMetadata', 'Fetch')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSearchDrawerOpen(true)}
                        className="royal-btn lookup-btn search-drawer-trigger-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        title="Search Metadata by Title, Author, Keyword"
                      >
                        <Compass size={14} />
                        <span>Search</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="nfc-query-column">
                  <label className="royal-input-label">{t('admin.nfcUidLabel', 'Assign/Search by NFC')}</label>
                  <div className="nfc-input-row">
                    <input
                      type="text"
                      className="royal-input nfc-input-box"
                      value={ntagUid}
                      onChange={(e) => setNtagUid(formatUidWithColons(e.target.value))}
                      placeholder="e.g. 04:A3:B2:C1:D0:E9:80"
                    />
                    <button
                      type="button"
                      onClick={startNfcRead}
                      className={`royal-btn nfc-top-btn ${isNfcReading ? 'loading-btn' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isNfcReading ? <RefreshCw className="spin-icon" size={14} /> : <Smartphone size={14} />}
                      <span>{isNfcReading ? 'Reading...' : t('admin.assignNfcBtn', 'Scan NFC')}</span>
                    </button>
                  </div>
                  {isNfcReading && (
                    <div className="nfc-pulse-overlay royal-card">
                      <div className="nfc-scanner-pulse">
                        <Smartphone size={32} className="gold-glow-icon animate-pulse" />
                        <div className="pulse-ring"></div>
                      </div>
                      <p className="pulse-help-text">Tap NTAG213 Tag to register this book volume in the ledger.</p>
                      <button
                        type="button"
                        onClick={() => setIsNfcReading(false)}
                        className="royal-btn-secondary"
                        style={{ marginTop: '12px', fontSize: '0.8rem', padding: '6px 14px' }}
                      >
                        Cancel Scan
                      </button>
                    </div>
                  )}

                  {nfcSuccess && (
                    <p className="nfc-success-text" style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> NTAG213 serial number bound successfully.
                    </p>
                  )}

                  {nfcError && (
                    <p className="nfc-error-text" style={{ fontSize: '0.85rem', color: '#ff7b72', marginTop: '6px' }}>
                      {nfcError}
                    </p>
                  )}
                </div>
              </div>

              <div className="form-divider"><span>OR MANUAL ENTRY</span></div>

              <form onSubmit={handleIngestionSubmit} className="manual-intake-form">
                {infoMessage && (
                  <div className="info-banner royal-card">
                    <p>{infoMessage}</p>
                  </div>
                )}
                <div className="input-group">
                  <label className="royal-input-label">{t('admin.titleLabel', 'Volume Title')}</label>
                  <input
                    type="text"
                    placeholder="The Picture of Dorian Gray"
                    className="royal-input"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('admin.authorLabel', 'Author Name(s)')}</label>
                  <input
                    type="text"
                    placeholder="Oscar Wilde, Mary Shelley"
                    className="royal-input"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('admin.publisherLabel', 'Publisher')}</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('admin.publishDateLabel', 'Publish Date')}</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    placeholder="e.g. 1890"
                  />
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('admin.houseLabel', 'Assign Salon House')}</label>
                  <select
                    className="royal-select"
                    value={selectedHouse}
                    onChange={(e) => setSelectedHouse(e.target.value)}
                    required
                  >
                    {houses.map((house) => (
                      <option key={house} value={house}>
                        {house}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('admin.languageLabel', 'Volume Language')}</label>
                  <select
                    className="royal-select"
                    value={bookLanguage}
                    onChange={(e) => setBookLanguage(e.target.value)}
                    required
                  >
                    <option value="en">{t('common.english', 'English (Sovereign Dialect)')}</option>
                    <option value="hi">{t('common.hindi', 'Hindi (Rajasthani Royal Style)')}</option>
                    <option value="kn">{t('common.kannada', 'Kannada (Classical Royal Style)')}</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('admin.tagsLabel', 'Acquisition Labels / Tags')}</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. aesthetic, victorian, philosophy"
                  />
                  <div className="interactive-tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {tagsInput.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                      editingTagIndex === idx ? (
                        <input
                          key={idx}
                          type="text"
                          value={editingTagValue}
                          onChange={(e) => setEditingTagValue(e.target.value)}
                          onBlur={() => handleSaveTagEdit(idx)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                               handleSaveTagEdit(idx);
                            } else if (e.key === 'Escape') {
                              setEditingTagIndex(null);
                            }
                          }}
                          autoFocus
                          className="royal-input"
                          style={{ width: '100px', padding: '2px 6px', fontSize: '0.8rem', height: 'auto', display: 'inline-block' }}
                        />
                      ) : (
                        <span
                          key={idx}
                          className="tag-pill-interactive"
                          onClick={() => handleStartTagEdit(idx, tag)}
                          style={{
                            background: 'rgba(210, 165, 116, 0.1)',
                            border: '1px solid rgba(210, 165, 116, 0.25)',
                            color: 'var(--accent)',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            userSelect: 'none',
                            transition: 'all 0.2s ease',
                          }}
                          title="Click to edit"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTag(idx);
                            }}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 0, cursor: 'pointer', fontSize: '10px' }}
                          >
                            ×
                          </button>
                        </span>
                      )
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Provide free text tags separated by commas. Click any tag pill above to edit inline. Trimming and deduplication will be applied automatically.</span>
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('admin.coverLabel', 'Cover Image')}</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageSelect}
                          style={{ display: 'none' }}
                          id="image-file-input"
                          ref={fileInputRef}
                        />
                        <label htmlFor="image-file-input" style={{ flex: 1 }}>
                          <button
                            type="button"
                            onClick={() => document.getElementById('image-file-input')?.click()}
                            className="royal-btn"
                            style={{ width: '100%' }}
                          >
                            {selectedImageFile ? `File: ${selectedImageFile.name}` : 'Upload Image'}
                          </button>
                        </label>
                        <button
                          type="button"
                          onClick={() => startCamera('cover')}
                          className="royal-btn"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Camera size={14} /> Snap Photo
                        </button>
                        {selectedImageFile && (
                          <button
                            type="button"
                            onClick={handleImageUpload}
                            className="royal-btn"
                            disabled={uploadingImage}
                          >
                            {uploadingImage ? 'Uploading...' : 'Confirm Upload'}
                          </button>
                        )}
                      </div>
                      {imagePreview && (
                        <div style={{ position: 'relative', marginBottom: '8px' }}>
                          <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px' }} />
                          <button
                            type="button"
                            onClick={removeImagePreview}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(0,0,0,0.6)',
                              border: 'none',
                              color: 'white',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '8px' }}>OR</p>
                  <input
                    type="text"
                    className="royal-input"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="Paste direct image URL (https://...)"
                  />
                  {coverUrl && (
                    <div style={{ position: 'relative', marginTop: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'inline-block', maxWidth: '100%' }}>
                      <img src={coverUrl} alt="Cover Preview" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '4px', display: 'block' }} />
                      <button
                        type="button"
                        onClick={() => setCoverUrl('')}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.7)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Clear cover URL"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('common.details', 'Description')}</label>
                  <textarea
                    className="royal-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="form-grid-two">
                  <div className="input-group">
                    <label className="royal-input-label">{t('admin.pagesLabel', 'Pages')}</label>
                    <input
                      type="number"
                      className="royal-input"
                      min="0"
                      value={pages}
                      onChange={(e) => setPages(Number(e.target.value))}
                    />
                  </div>
                  <div className="input-group">
                    <label className="royal-input-label">{t('admin.copiesLabel', 'Total Copies')}</label>
                    <input
                      type="number"
                      className="royal-input"
                      min="1"
                      value={totalCopies}
                      onChange={(e) => setTotalCopies(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="royal-input-label">{t('catalog.availableCopies', 'Available Copies')}</label>
                  <input
                    type="number"
                    className="royal-input"
                    min="0"
                    max={totalCopies}
                    value={availableCopies}
                    onChange={(e) => setAvailableCopies(Number(e.target.value))}
                  />
                </div>



                {'NDEFReader' in window && (
                  <div 
                    className="nfc-write-checkbox-row" 
                    onClick={() => setShouldWriteNfc(!shouldWriteNfc)}
                  >
                    <input
                      type="checkbox"
                      id="should-write-nfc-checkbox"
                      checked={shouldWriteNfc}
                      onChange={(e) => setShouldWriteNfc(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label 
                      htmlFor="should-write-nfc-checkbox" 
                      className="nfc-write-label"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Cpu size={16} className="nfc-write-icon" />
                      Write details to physical NFC tag on save
                    </label>
                  </div>
                )}

                <div className="submit-row">
                  <button type="submit" className="royal-btn submit-book-btn" id="add-volume-btn">
                    {isEditMode ? t('common.save', 'Save Updated Details') : t('admin.ingestBtn', 'Add Volume to Ledger')}
                  </button>
                </div>
              </form>

              {ingestionSuccess && (
                <div className="success-banner animate-fade-in">
                  <CheckCircle size={18} /> Volume successfully registered in Cloud Firestore ledger!
                </div>
              )}

              {errorMessage && (
                <div className="error-banner royal-card">
                  <p>{errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Hardware Camera Modal Overlay */}
      {cameraModalOpen && (
        <div className="camera-modal-overlay">
          <div className={`royal-card camera-modal-card ${cameraMode === 'cover' ? 'cover-mode' : 'isbn-mode'}`}>
            <div className="camera-modal-header">
              <h3>
                {cameraMode === 'isbn' ? 'Scanning Volume ISBN Barcode' : 'Capture Masterwork Cover'}
              </h3>
              <button onClick={stopCamera} className="close-camera-btn">
                <X size={18} />
              </button>
            </div>
            
            {cameraError ? (
              <div className="camera-error-view">
                <p className="camera-error-text">{cameraError}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                  {cameraMode === 'isbn' && (
                    <button onClick={handleSimulateIsbnScan} className="royal-btn">
                      Simulate ISBN Scan
                    </button>
                  )}
                  <button onClick={stopCamera} className="royal-btn-secondary">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className={`camera-stream-wrapper ${cameraMode === 'cover' ? 'cover-mode' : 'isbn-mode'}`}>
                {cameraMode === 'isbn' ? (
                  <div id="qr-reader" className="scanner-focus-ring-container" onClick={(e) => handleScannerClick(e, html5QrCodeRef.current)} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                )}
                
                {cameraMode === 'isbn' ? (
                  <div className="isbn-scanning-laser-guide">
                    <div className="scanning-focus-box">
                      <div className="scanning-laser"></div>
                      <div className="scanning-bracket top-left"></div>
                      <div className="scanning-bracket top-right"></div>
                      <div className="scanning-bracket bottom-left"></div>
                      <div className="scanning-bracket bottom-right"></div>
                    </div>
                    <span className="scanning-help-text">Align barcode inside the frame</span>
                  </div>
                ) : (
                  <div className="cover-capture-guide">
                    <div className="cover-frame-outline"></div>
                    <span className="scanning-help-text">Position cover inside the gold boundaries</span>
                  </div>
                )}
 
                <div className="camera-controls-bar">
                  {cameraMode === 'cover' ? (
                    <button onClick={captureCoverPhoto} className="royal-btn capture-action-btn">
                      <Camera size={16} /> Snap Cover Photo
                    </button>
                  ) : (
                    <button onClick={handleSimulateIsbnScan} className="royal-btn capture-action-btn simulation-badge">
                      <Sparkles size={16} /> Simulate Barcode Detection
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NFC Tag Writing Modal Overlay */}
      {nfcWriteModalOpen && pendingBookDto && (
        <div className="camera-modal-overlay">
          <div className="royal-card camera-modal-card nfc-write-card">
            <div className="camera-modal-header">
              <h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} className="spin-icon" style={{ color: 'var(--accent)' }} />
                  <span>Physical-to-Digital NFC Writer</span>
                </div>
              </h3>
              <button 
                onClick={handleCancelNfcWrite} 
                className="close-camera-btn"
              >
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
                {nfcWriteLoading && !nfcWriteSuccess && !nfcWriteError && (
                  <p className="status-message loading" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <span>
                      <RefreshCw size={14} className="spin-icon" /> Broadcasting NDEF URL payload...
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                      Please tap your physical tag. Auto-closing in {writeCountdown}s...
                    </span>
                  </p>
                )}
                {nfcWriteSuccess && (
                  <p className="status-message success">
                    <CheckCircle size={14} style={{ color: '#d4a574' }} /> NFC Tag written & registered!
                  </p>
                )}
                {nfcWriteError && (
                  <div className="status-error-box">
                    <p className="error-title">NDEF Writer Error</p>
                    <p className="error-desc">{nfcWriteError}</p>
                  </div>
                )}
                {!nfcWriteLoading && !nfcWriteSuccess && !nfcWriteError && (
                  <p className="status-message info" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                    <span>Ready to write... Align tag near back of device.</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                      Auto-closing in {writeCountdown}s...
                    </span>
                  </p>
                )}
              </div>

              <div className="nfc-write-book-details">
                <div className="book-mini-meta">
                  {pendingBookDto.coverUrl && (
                    <img 
                      src={pendingBookDto.coverUrl} 
                      alt="Cover preview" 
                      className="book-mini-cover" 
                    />
                  )}
                  <div className="book-mini-texts">
                    <span className="book-mini-title">{pendingBookDto.title}</span>
                    <span className="book-mini-author">by {pendingBookDto.author}</span>
                    <span className="book-mini-isbn">ISBN: {pendingBookDto.isbn}</span>
                    {pendingBookDto.ntagUid && (
                      <span className="book-mini-tag-uid">Tag NFC UID: {formatUidWithColons(pendingBookDto.ntagUid)}</span>
                    )}
                  </div>
                </div>
                <div className="nfc-target-url-badge">
                  <span>Writes Target NDEF URL:</span>
                  <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{`https://bookshelfnet.com/?u=${(pendingBookDto.ntagUid || ntagUid || '04:A3:B2:C1:D0:E9:80').toLowerCase().replace(/:/g, '')}x000000`}</code>
                </div>

                {/* NTAG213 Advanced Hardware Configuration Tool */}
                <div className="ntag-hw-config-section" style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(212, 165, 116, 0.2)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  lineHeight: '1.4'
                }}>
                  <div style={{ fontWeight: '600', color: 'var(--accent)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Cpu size={12} />
                    <span>NTAG213 Hardware Counter Mirror Guide</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Web NFC standard is sandboxed and cannot execute raw configuration register writes (Pages 29h-2Ch). After writing the NDEF URL using this browser console, use an NFC developer tool (such as NXP TagWriter) to issue these exact sector commands to enable the automatic counter:
                  </p>
                  
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
                    
                    const mirrorHex = (0x80 | (mirrorByte << 4)).toString(16).toUpperCase().padStart(2, '0') + "h";
                    const pageHex = mirrorPage.toString(16).toUpperCase().padStart(2, '0') + "h";
                    
                    return (
                      <div className="ntag-registers-table" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Placeholder Position Offset:</span>
                          <strong>Byte {absoluteOffset}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Configuration Target Page:</span>
                          <strong>Page {mirrorPage} ({pageHex})</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Target Byte Position:</span>
                          <strong>Byte {mirrorByte}</strong>
                        </div>
                        <div style={{ marginTop: '6px', fontWeight: '500', color: 'var(--accent)' }}>Raw Mifare / APDU Programming Commands:</div>
                        <code style={{ 
                          background: 'rgba(0, 0, 0, 0.2)', 
                          padding: '6px', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem', 
                          color: '#d4a574', 
                          fontFamily: 'monospace',
                          display: 'block',
                          whiteSpace: 'pre-wrap',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          {`// Command 1: Configure Page 29h (MIRROR=${mirrorHex.substring(0, 2)}, RFUI=00, MIRROR_PAGE=${pageHex.substring(0, 2)}, AUTH0=FF)\n`}
                          {`A2 29 ${mirrorHex.substring(0, 2)} 00 ${pageHex.substring(0, 2)} FF\n\n`}
                          {`// Command 2: Configure Page 2Ah (ACCESS: Enable NFC_CNT_EN bit to trigger counter increment)\n`}
                          {`A2 2A 04 00 00 00`}
                        </code>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="nfc-modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button 
                    type="button" 
                    onClick={() => triggerWriteNfcTag(pendingBookDto.isbn)} 
                    disabled={nfcWriteLoading || nfcWriteSuccess}
                    className="royal-btn secondary-btn"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} className={nfcWriteLoading ? "spin-icon" : ""} />
                    <span>Restart Write</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={handleCancelNfcWrite} 
                    className="royal-btn-secondary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: 'rgba(255, 107, 107, 0.4)', color: '#ff6b6b' }}
                  >
                    <X size={14} />
                    <span>Cancel & Void</span>
                  </button>
                </div>
                
                <button 
                  type="button" 
                  onClick={handleSkipWriteAndSave} 
                  disabled={nfcWriteLoading || nfcWriteSuccess}
                  className="royal-btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Check size={14} />
                  <span>Skip Tag & Save Ledger Directly</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Web NFC Restrictions Modal Overlay */}
      {iosWarningModalOpen && pendingBookDto && (
        <div className="camera-modal-overlay">
          <div className="royal-card camera-modal-card ios-warning-card">
            <div className="camera-modal-header">
              <h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} style={{ color: 'var(--accent)' }} />
                  <span>iOS Safari NFC Restriction Warning</span>
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
                <h4 style={{ color: 'var(--accent)', marginBottom: '8px', textAlign: 'center' }}>Secure Cloud Sync Successful</h4>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.45', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Apple iOS / Safari limits programmatic tag writing inside public web applications due to native security sandbox restrictions.
                </p>
                <div className="ios-badge-explanation">
                  <p>
                    <strong>Database Status:</strong> Digital registration is completely successful! The book catalog details and physical chip UID (<code>{formatUidWithColons(pendingBookDto.ntagUid) || "N/A"}</code>) are permanently registered in the royal ledger.
                  </p>
                  <p>
                    <strong>NTAG Memory Action:</strong> Writing the secure checkout instant deep-link URL (<code>{`https://bookshelfnet.com/?u=${(pendingBookDto.ntagUid || "uid").toLowerCase().replace(/:/g, '')}x000000`}</code>) with hardware counter mirror support will need to be completed later from an Android or NFC-compatible workstation.
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIosWarningModalOpen(false)} 
                className="royal-btn"
                style={{ width: '100%', marginTop: '16px' }}
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Metadata Drawer */}
      {isSearchDrawerOpen && (
        <div className="search-drawer-overlay animate-fade-in" onClick={() => setIsSearchDrawerOpen(false)}>
          <div className="search-drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="search-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={20} className="gold-glow-icon" />
                <h3 className="drawer-title">Search Google Books</h3>
              </div>
              <button onClick={() => setIsSearchDrawerOpen(false)} className="close-drawer-btn">
                <X size={18} />
              </button>
            </div>

            <div className="search-drawer-body">
              <p className="drawer-help-text">Search millions of volumes by title, author, or keyword to auto-populate the intake console.</p>
              
              <form onSubmit={handleMetadataSearch} className="drawer-search-form">
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Enter title, author, or keyword..."
                    className="royal-input search-drawer-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="royal-btn drawer-search-submit" disabled={isSearchingMetadata}>
                    {isSearchingMetadata ? <RefreshCw className="spin-icon" size={14} /> : <Search size={14} />}
                  </button>
                </div>
              </form>

              {searchError && (
                <div className="search-error-banner">
                  <p>{searchError}</p>
                </div>
              )}

              <div className="search-results-list">
                {isSearchingMetadata && (
                  <div className="drawer-searching-loader">
                    <RefreshCw className="spin-icon gold-glow-icon" size={24} />
                    <p>Consulting Google Books archives...</p>
                  </div>
                )}

                {!isSearchingMetadata && searchResults.length > 0 && (
                  <div className="results-scroll-container">
                    <p className="results-count-text">Found {searchResults.length} matches:</p>
                    {searchResults.map((book, index) => (
                      <div 
                        key={index} 
                        className="search-result-item royal-card"
                        onClick={() => handleSelectSearchResult(book)}
                      >
                        <div className="result-cover-frame">
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} className="result-cover-img" />
                          ) : (
                            <div className="result-cover-fallback">
                              <BookOpen size={16} />
                            </div>
                          )}
                        </div>
                        <div className="result-metadata-info">
                          <h4 className="result-title">{book.title}</h4>
                          {book.authors && book.authors.length > 0 && (
                            <p className="result-author">by {book.authors.join(', ')}</p>
                          )}
                          <div className="result-meta-bottom">
                            {book.publisher && <span className="result-publisher">{book.publisher}</span>}
                            {book.publishDate && <span className="result-pub-date">({book.publishDate})</span>}
                          </div>
                          {book.isbn && <span className="result-isbn">ISBN: {book.isbn}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookIngestionConsole;
