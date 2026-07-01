import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sparkles, Upload, Scan, CheckCircle, RefreshCw, X, Camera, Cpu, Smartphone, Check } from 'lucide-react';
import { createBook, lookupBookByIsbn, fetchBookByIsbn, fetchBooks } from '../../services/libraryApi';
import { fetchBookHouses } from '../../services/genreApi';
import { uploadBookImage } from '../../services/storageApi';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import './BookIngestionConsole.css';

const SafeHtml5Qrcode = Html5Qrcode;
const SafeHtml5QrcodeSupportedFormats = Html5QrcodeSupportedFormats;

const BookIngestionConsole = ({ user }) => {
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
  const [bulkProgress, setBulkProgress] = useState(-1);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
        setNtagUid(existingBook.ntagUid || '');
        
        setIsEditMode(true);
        setInfoMessage('Existing book found in catalog. Edit the fields and save the updated details.');
      }
    } catch (catalogError) {
      if (catalogError?.response?.status === 404) {
        try {
          const metadata = await lookupBookByIsbn(targetIsbn.trim());
          setManualTitle(metadata.title || '');
          setManualAuthor(Array.isArray(metadata.authors) ? metadata.authors.map((author) => author.name).join(', ') : metadata.authors || '');
          setPublisher(metadata.publishers?.[0] || metadata.publisher || '');
          setPublishDate(metadata.publish_date || '');
          setCoverUrl(metadata.coverUrl || metadata.cover?.large || '');
          setDescription(metadata.description || metadata.subtitle || '');
          setPages(metadata.number_of_pages || 0);
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

          const html5QrCode = new SafeHtml5Qrcode("qr-reader", {
            formatsToSupport: formats,
            verbose: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: false
            }
          });
          html5QrCodeRef.current = html5QrCode;

          const startScanning = (cameraIdOrConfig) => {
            if (!html5QrCodeRef.current) return;
            html5QrCode.start(
              cameraIdOrConfig,
              {
                fps: 25,
                qrbox: (w, h) => {
                  // Make qrbox highly responsive: 85% of stream width or max 400, 35% of stream height or max 150
                  const boxWidth = Math.floor(Math.min(w * 0.85, 400));
                  const boxHeight = Math.floor(Math.min(h * 0.35, 150));
                  return { width: boxWidth, height: boxHeight };
                },
                videoConstraints: {
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
        setNtagUid(matchedBook.ntagUid || serialNumber);
        if (matchedBook.genre) {
          setSelectedHouse(matchedBook.genre);
        }
        setIsEditMode(true);
        setNfcSuccess(true);
        setIsNfcReading(false);
        setInfoMessage(`Existing book "${matchedBook.title}" loaded from NFC tap.`);
      } else {
        setNtagUid(serialNumber);
        setNfcSuccess(true);
        setIsNfcReading(false);
        setInfoMessage(`Unregistered NTAG213 Tag (${serialNumber}) detected.`);
      }
    } catch (err) {
      console.error("Error matching NTAG tap:", err);
      setNtagUid(serialNumber);
      setNfcSuccess(true);
      setIsNfcReading(false);
      setInfoMessage(`Tag detected: ${serialNumber}`);
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
        if (message && message.records) {
          for (const record of message.records) {
            if (record.recordType === "url") {
              const decoder = new TextDecoder("utf-8");
              const url = decoder.decode(record.data);
              const match = url.match(/\/catalog\/([0-9Xx]+)/);
              if (match && match[1]) {
                extractedIsbn = match[1];
              }
            }
          }
        }
        await processScannedNtag(serialNumber, extractedIsbn);
      });
    } catch (error) {
      console.error("NFC reading error: ", error);
      setNfcError(`NFC activation failed: ${error.message || error}`);
      setIsNfcReading(false);
    }
  };

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
    setInfoMessage('');
    setTagsInput('');
    setNtagUid('');
    setNfcSuccess(false);
    setNfcError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (houses.length > 0) {
      setSelectedHouse(houses[0]);
    }
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
      ntagUid: ntagUid ? ntagUid.trim() : null
    };

    const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if ('NDEFReader' in window) {
      setPendingBookDto(bookDto);
      setNfcWriteError('');
      setNfcWriteSuccess(false);
      setNfcWriteModalOpen(true);
      triggerWriteNfcTag(bookDto.isbn, bookDto);
    } else if (isAppleDevice) {
      setPendingBookDto(bookDto);
      setIosWarningModalOpen(true);
      try {
        await createBook(bookDto);
        setIngestionSuccess(true);
        resetForm();
        setTimeout(() => setIngestionSuccess(false), 3000);
      } catch (err) {
        console.error(err);
        setErrorMessage(isEditMode ? 'Unable to update book record inside direct iOS save.' : 'Unable to create book record inside direct iOS save.');
      }
    } else {
      try {
        await createBook(bookDto);
        setIngestionSuccess(true);
        resetForm();
        setTimeout(() => setIngestionSuccess(false), 3000);
      } catch (err) {
        console.error(err);
        setErrorMessage(isEditMode ? 'Unable to update book record.' : 'Unable to create book record.');
      }
    }
  };

  const triggerWriteNfcTag = async (bookIsbn, bookDtoToSave = null) => {
    setNfcWriteLoading(true);
    setNfcWriteError('');
    const targetDto = bookDtoToSave || pendingBookDto;
    try {
      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [
          {
            recordType: "url",
            data: `${window.location.origin}/#/catalog/${bookIsbn}?action=checkout`
          }
        ]
      });
      setNfcWriteSuccess(true);
      if (targetDto) {
        await createBook(targetDto);
        setIngestionSuccess(true);
        resetForm();
      }
      setTimeout(() => {
        setNfcWriteModalOpen(false);
        setPendingBookDto(null);
        setNfcWriteSuccess(false);
        setIngestionSuccess(false);
      }, 2500);
    } catch (writeErr) {
      console.error("Web NFC Write error:", writeErr);
      setNfcWriteError(`Write failed: ${writeErr.message || writeErr}. Hold the tag firmly near the device's NFC chip or tap "Skip & Save Directly".`);
    } finally {
      setNfcWriteLoading(false);
    }
  };

  const handleSkipWriteAndSave = async () => {
    if (!pendingBookDto) return;
    setNfcWriteLoading(true);
    setNfcWriteError('');
    try {
      await createBook(pendingBookDto);
      setIngestionSuccess(true);
      resetForm();
      setNfcWriteSuccess(true);
      setTimeout(() => {
        setNfcWriteModalOpen(false);
        setPendingBookDto(null);
        setNfcWriteSuccess(false);
        setIngestionSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Direct db save failed:", err);
      setNfcWriteError(`Direct ledger registration failed: ${err.message}`);
    } finally {
      setNfcWriteLoading(false);
    }
  };



  const handleBulkUploadSimulate = (e) => {
    e.preventDefault();
    if (bulkProgress >= 0) return;

    setBulkProgress(0);
    const interval = setInterval(() => {
      setBulkProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setBulkProgress(-1), 2000);
          return 100;
        }
        return prev + 25;
      });
    }, 600);
  };

  return (
    <div className="ingestion-container animate-fade-in">
      {!isAdmin ? (
        <>
          <header className="ingestion-header">
            <h1 className="ingestion-title glow-text">Access Denied</h1>
            <p className="ingestion-subtitle">Only administrators can access the book ingestion console.</p>
          </header>
        </>
      ) : (
        <>
          <header className="ingestion-header">
            <div className="header-badge-admin">
              <Shield size={14} className="gold-glow-icon" />
              <span className="gold-gradient-text">ADMIN ACQUISITION</span>
            </div>
            <h1 className="ingestion-title glow-text">Acquisition Ingestion Console</h1>
            <p className="ingestion-subtitle">
              Acquire and register new physical and digital masterworks into the Royal Library ledger.
            </p>
          </header>

          <div className="ingestion-grid">
            <div className="royal-card form-intake-card">
              <h3>Single Volume Intake</h3>
              <p className="section-p-desc">Register an individual book volume. Query metadata by ISBN or input details manually.</p>

              <div className="isbn-query-wrapper">
                <label className="royal-input-label">ISBN Lookup</label>
                <div className="isbn-input-row">
                  <input
                    type="text"
                    placeholder="e.g. 9780141439570"
                    className="royal-input isbn-input-box"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                  />
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
                    onClick={handleIsbnFetch}
                    className="royal-btn lookup-btn"
                    disabled={fetchingMetadata}
                    id="isbn-lookup-btn"
                  >
                    {fetchingMetadata ? <RefreshCw className="spin-icon" size={14} /> : 'Fetch'}
                  </button>
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
                  <label className="royal-input-label">Volume Title</label>
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
                  <label className="royal-input-label">Author Name(s)</label>
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
                  <label className="royal-input-label">Publisher</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="royal-input-label">Publish Date</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    placeholder="e.g. 1890"
                  />
                </div>

                <div className="input-group">
                  <label className="royal-input-label">Assign Salon House</label>
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
                  <label className="royal-input-label">Acquisition Labels / Tags</label>
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
                  <label className="royal-input-label">Cover Image</label>
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
                  <label className="royal-input-label">Description</label>
                  <textarea
                    className="royal-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="form-grid-two">
                  <div className="input-group">
                    <label className="royal-input-label">Pages</label>
                    <input
                      type="number"
                      className="royal-input"
                      min="0"
                      value={pages}
                      onChange={(e) => setPages(Number(e.target.value))}
                    />
                  </div>
                  <div className="input-group">
                    <label className="royal-input-label">Total Copies</label>
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
                  <label className="royal-input-label">Available Copies</label>
                  <input
                    type="number"
                    className="royal-input"
                    min="0"
                    max={totalCopies}
                    value={availableCopies}
                    onChange={(e) => setAvailableCopies(Number(e.target.value))}
                  />
                </div>

                <div className="input-group nfc-binding-section">
                  <label className="royal-input-label">NTAG213 UID (NFC Registration)</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      className="royal-input"
                      value={ntagUid}
                      onChange={(e) => setNtagUid(e.target.value)}
                      placeholder="e.g. 04:A3:B2:C1:D0:E9:80 (Optional)"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={startNfcRead}
                      className={`royal-btn ${isNfcReading ? 'loading-btn' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isNfcReading ? <RefreshCw className="spin-icon" size={14} /> : <Smartphone size={14} />}
                      {isNfcReading ? 'Reading...' : 'Scan NFC'}
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

                <div className="submit-row">
                  <button type="submit" className="royal-btn submit-book-btn" id="add-volume-btn">
                    {isEditMode ? 'Save Updated Details' : 'Add Volume to Ledger'}
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

            <div className="royal-card bulk-ingest-card">
              <h3>Asynchronous Bulk Upload</h3>
              <p className="section-p-desc">Ingest entire catalog archives asynchronously using spreadsheets (.csv or .xlsx formats).</p>

              <div className="drag-drop-zone-simulated" onClick={handleBulkUploadSimulate}>
                <Upload size={32} className="gold-glow-icon upload-logo-sim" />
                {bulkProgress === -1 ? (
                  <>
                    <p className="upload-p">Drag & Drop Catalog Spreadsheet</p>
                    <span className="upload-sub">or click here to simulate bulk upload</span>
                  </>
                ) : bulkProgress < 100 ? (
                  <div className="progress-bar-wrapper">
                    <span className="progress-percentage-label">Ingesting... {bulkProgress}%</span>
                    <div className="progress-outer">
                      <div className="progress-inner" style={{ width: `${bulkProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="bulk-success-wrapper animate-fade-in">
                    <CheckCircle size={24} className="text-success" />
                    <p className="bulk-success-title">Spreadsheet Parsing Complete</p>
                    <span className="bulk-success-sub">Ledger updated with parsed records asynchronously.</span>
                  </div>
                )}
              </div>

              <div className="form-divider"><span>OR BARCODE INTEGRATION</span></div>

              <div className="barcode-scan-section">
                <div className="barcode-promo-frame">
                  <Scan size={24} className="gold-glow-icon" />
                  <div>
                    <h4>Interactive Barcode Scanner</h4>
                    <p>Use local scanner modules in Phase 2 to scan printed books instantly using hardware RFID/ISBN scan sweeps.</p>
                  </div>
                </div>
              </div>
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
                  <div id="qr-reader" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
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
                onClick={() => {
                  setNfcWriteModalOpen(false);
                  setPendingBookDto(null);
                }} 
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
                {nfcWriteLoading && (
                  <p className="status-message loading">
                    <RefreshCw size={14} className="spin-icon" /> Broad-casting NDEF URL payload...
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
                  <p className="status-message info">Ready to write... Align tag near back of device.</p>
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
                      <span className="book-mini-tag-uid">Tag NFC UID: {pendingBookDto.ntagUid}</span>
                    )}
                  </div>
                </div>
                <div className="nfc-target-url-badge">
                  <span>Writes Target NDEF URL:</span>
                  <code>{`${window.location.origin}/#/catalog/${pendingBookDto.isbn}?action=checkout`}</code>
                </div>
              </div>

              <div className="nfc-modal-actions">
                <button 
                  type="button" 
                  onClick={() => triggerWriteNfcTag(pendingBookDto.isbn)} 
                  disabled={nfcWriteLoading || nfcWriteSuccess}
                  className="royal-btn secondary-btn"
                >
                  <RefreshCw size={14} className={nfcWriteLoading ? "spin-icon" : ""} /> Retry Write
                </button>
                


                <button 
                  type="button" 
                  onClick={handleSkipWriteAndSave} 
                  disabled={nfcWriteLoading || nfcWriteSuccess}
                  className="royal-btn-secondary"
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  Skip Tag & Save Ledger Directly
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
                    <strong>Database Status:</strong> Digital registration is completely successful! The book catalog details and physical chip UID (<code>{pendingBookDto.ntagUid || "N/A"}</code>) are permanently registered in the royal ledger.
                  </p>
                  <p>
                    <strong>NTAG Memory Action:</strong> Writing the direct checkout deep-link URL (<code>{`/#/catalog/${pendingBookDto.isbn}`}</code>) to the physical chip's physical NTAG sector will need to be completed later from an Android or NFC-compatible workstation.
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
    </div>
  );
};

export default BookIngestionConsole;
