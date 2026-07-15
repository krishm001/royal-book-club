import React, { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, BookOpen, Sparkles, X, Smartphone, RefreshCw, AlertTriangle, CheckCircle, Scan, Camera, Check, Clock, ShoppingBag, Loader2 } from 'lucide-react';
import BookCard from '../../components/shared/BookCard';
import { useLanguage } from '../../i18n/LanguageContext';
import { fetchBooks, fetchCheckoutsByMember, verifiedCheckout, verifiedReturn, requestCheckout, requestReturn } from '../../services/libraryApi';
import { fetchBookHouses } from '../../services/genreApi';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../../api/apiClient';
import './CatalogPage.css';

const SafeHtml5Qrcode = Html5Qrcode;
const SafeHtml5QrcodeSupportedFormats = Html5QrcodeSupportedFormats;

const CatalogPage = ({ user, triggerOnboarding }) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [books, setBooks] = useState([]);
  const [houses, setHouses] = useState(['All']);
  const [memberCheckouts, setMemberCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Top-of-Study P2D Self-Checkout States
  const [topScannerOpen, setTopScannerOpen] = useState(false);
  const [topScannerError, setTopScannerError] = useState('');
  const [topNfcActive, setTopNfcActive] = useState(false);
  const [topNfcError, setTopNfcError] = useState('');
  const [p2dModalOpen, setP2dModalOpen] = useState(false);
  const [p2dBook, setP2dBook] = useState(null);
  const [p2dActionType, setP2dActionType] = useState('checkout'); // 'checkout' or 'return'
  const [p2dSuccess, setP2dSuccess] = useState(false);
  const [p2dError, setP2dError] = useState('');
  const [p2dLoading, setP2dLoading] = useState(false);

  // Direct Transactions States (for book cards NFC triggers)
  const [selectedBook, setSelectedBook] = useState(null);
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [nfcActionType, setNfcActionType] = useState('checkout'); // 'checkout' or 'return'
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcError, setNfcError] = useState('');
  const [nfcSuccess, setNfcSuccess] = useState(false);

  const [fallbackModalOpen, setFallbackModalOpen] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackSuccess, setFallbackSuccess] = useState(false);

  // Card-level preferences state
  const [cardScannerOpen, setCardScannerOpen] = useState(false);
  const [cardScannerError, setCardScannerError] = useState('');
  const [activeTab, setActiveTab] = useState('NDEFReader' in window ? 'nfc' : 'barcode');

  const topHtml5QrCodeRef = useRef(null);
  const cardHtml5QrCodeRef = useRef(null);
  const topScannerTimeoutRef = useRef(null);
  const topScannerActiveRef = useRef(false);
  const cardScannerTimeoutRef = useRef(null);
  const cardScannerActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      topScannerActiveRef.current = false;
      cardScannerActiveRef.current = false;
      if (topScannerTimeoutRef.current) clearTimeout(topScannerTimeoutRef.current);
      if (cardScannerTimeoutRef.current) clearTimeout(cardScannerTimeoutRef.current);

      if (topHtml5QrCodeRef.current) {
        const currentScanner = topHtml5QrCodeRef.current;
        topHtml5QrCodeRef.current = null;
        if (currentScanner.isScanning) {
          currentScanner.stop().catch(err => console.warn("Failed cleanup stop", err));
        }
      }
      if (cardHtml5QrCodeRef.current) {
        const currentScanner = cardHtml5QrCodeRef.current;
        cardHtml5QrCodeRef.current = null;
        if (currentScanner.isScanning) {
          currentScanner.stop().catch(err => console.warn("Failed card cleanup stop", err));
        }
      }
    };
  }, []);

  useEffect(() => {
    if (nfcModalOpen && selectedBook) {
      const timer = setTimeout(() => {
        const cameraView = document.getElementById("card-barcode-reader");
        const modalContent = cameraView || document.querySelector(".nfc-modal-card") || document.querySelector(".nfc-modal-overlay");
        if (modalContent) {
          modalContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [nfcModalOpen, activeTab, selectedBook]);

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

  const startTopBarcodeScanner = () => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({ actionType: 'scan' });
      return;
    }
    setTopScannerOpen(true);
    setTopScannerError('');

    if (topScannerTimeoutRef.current) {
      clearTimeout(topScannerTimeoutRef.current);
    }

    topScannerActiveRef.current = true;

    topScannerTimeoutRef.current = setTimeout(() => {
      if (!topScannerActiveRef.current) {
        return;
      }

      try {
        const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const html5QrCode = new SafeHtml5Qrcode("top-barcode-reader", {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: !isIOS
          }
        });
        topHtml5QrCodeRef.current = html5QrCode;

        // iOS rejects width/height resolution constraints on several models (Safari/Chrome), causing false permission crashes.
        // We drop resolution constraints completely on iOS and rely solely on facingMode.
        const cameraConfig = isIOS ? {
          facingMode: "environment"
        } : { facingMode: "environment" };

        html5QrCode.start(
          cameraConfig,
          {
            fps: 25, // Boosted scan rate for faster recognition
            qrbox: (width, height) => {
              const idealW = Math.min(width * 0.9, 350);
              const idealH = Math.min(height * 0.8, 250);
              return { width: idealW, height: idealH };
            },
            formatsToSupport: [
              SafeHtml5QrcodeSupportedFormats.EAN_13,
              SafeHtml5QrcodeSupportedFormats.EAN_8,
              SafeHtml5QrcodeSupportedFormats.ISBN_13,
              SafeHtml5QrcodeSupportedFormats.UPC_A,
              SafeHtml5QrcodeSupportedFormats.UPC_E,
              SafeHtml5QrcodeSupportedFormats.CODE_128,
              SafeHtml5QrcodeSupportedFormats.CODE_39
            ]
          },
          (decodedText) => {
            console.log("Top barcode scanned successfully:", decodedText);
            handleTopBarcodeScanned(decodedText);
          },
          (errorMessage) => {
            // non-critical error feedback during scanning
          }
        ).then(() => {
          try {
            const videoElem = document.querySelector("#top-barcode-reader video");
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
                  advancedConstraints.zoom = Math.min(Math.max(1.75, minZ), maxZ);
                  console.log('[top-barcode-reader] Applied optimal iOS WebRTC zoom:', advancedConstraints.zoom);
                }

                if (Object.keys(advancedConstraints).length > 0) {
                  track.applyConstraints({ advanced: [advancedConstraints] })
                    .then(() => console.log('[top-barcode-reader] Track constraints applied successfully:', advancedConstraints))
                    .catch(err => {
                      console.warn('[top-barcode-reader] Failed to apply advanced zoom/focus constraints. Retrying with focus only.', err);
                      if (advancedConstraints.focusMode) {
                        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
                          .then(() => console.log('[top-barcode-reader] Continuous focus-only applied successfully'))
                          .catch(e => console.warn('[top-barcode-reader] Focus-only failed too', e));
                      }
                    });
                }
              }
            }
          } catch (e) {
            console.warn('[top-barcode-reader] Unable to configure autofocus:', e);
          }

          if (topHtml5QrCodeRef.current !== html5QrCode || !topScannerActiveRef.current) {
            console.log("Top scanner cancelled or replaced during boot. Stopping now.");
            html5QrCode.stop().catch(err => console.warn("Failed late stop inside start promise", err));
          }
        }).catch(err => {
          console.error("Failed to start scanner:", err);
          if (topScannerActiveRef.current) {
            setTopScannerError("Camera initialization failed. Please ensure camera permissions are granted.");
          }
        });
      } catch (err) {
        console.error("Scanner exception:", err);
        if (topScannerActiveRef.current) {
          setTopScannerError("Could not initialize the barcode scanner: " + err.message);
        }
      }
    }, 150);
  };

  const stopTopBarcodeScanner = async () => {
    topScannerActiveRef.current = false;

    if (topScannerTimeoutRef.current) {
      clearTimeout(topScannerTimeoutRef.current);
      topScannerTimeoutRef.current = null;
    }

    if (topHtml5QrCodeRef.current) {
      const currentScanner = topHtml5QrCodeRef.current;
      topHtml5QrCodeRef.current = null;
      try {
        if (currentScanner.isScanning) {
          await currentScanner.stop();
        }
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }

    try {
      const videos = document.querySelectorAll('#top-barcode-reader video');
      videos.forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject;
          if (typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => {
              track.stop();
              console.log("Top video track stopped manually:", track.label);
            });
          }
          video.srcObject = null;
        }
      });
    } catch (err) {
      console.warn("Failed to manually stop top track fallback", err);
    }

    setTopScannerOpen(false);
  };

  const handleTopBarcodeScanned = async (decodedText) => {
    await stopTopBarcodeScanner();
    if (!user) {
      window.alert(t('catalog.signInToCheckoutOrReturn'));
      return;
    }
    const scannedCode = (decodedText || '').trim().replace(/[-\s]/g, '');
    const matchedBook = books.find(b => {
      const bIsbn = (b.isbn || '').trim().replace(/[-\s]/g, '');
      return bIsbn === scannedCode;
    });

    if (matchedBook) {
      const resolvedStatus = getResolvedStatus(matchedBook);
      if (resolvedStatus !== 'checked-out') {
        const passes = await checkGatingPasses('checkout', matchedBook.isbn);
        if (!passes) return;
      }
      openP2dOverlay(matchedBook);
    } else {
      window.alert(t('catalog.noBarcodeMatch') + decodedText + ".");
    }
  };

  const startTopNfcRead = async () => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({ actionType: 'scan' });
      return;
    }
    setTopNfcActive(true);
    setTopNfcError('');

    if (!('NDEFReader' in window)) {
      setTopNfcError("Web NFC is not supported on this browser/device. Use Simulator Deck or Barcode scanning.");
      setTopNfcActive(false);
      return;
    }

    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();

      ndef.addEventListener("readingerror", () => {
        setTopNfcError("NFC Reading Error: Place tag firmly against your device's NFC hot spot.");
      });

      ndef.addEventListener("reading", async ({ serialNumber, message }) => {
        console.log(`Top NFC scanned: ${serialNumber}`);
        let matchedBook = null;
        
        // Match by UID first
        const cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
        matchedBook = books.find(b => {
          const cleanBookTag = (b.ntagUid || '').toLowerCase().replace(/:/g, '');
          return cleanBookTag && cleanBookTag === cleanScanned;
        });

        // Fallback match by URL NDEF record containing ISBN
        if (!matchedBook && message && message.records) {
          for (const record of message.records) {
            if (record.recordType === "url") {
              const textDecoder = new TextDecoder("utf-8");
              const url = textDecoder.decode(record.data);
              console.log("NDEF URL read:", url);
              const isbnMatch = url.match(/\/catalog\/([0-9Xx]+)/);
              if (isbnMatch && isbnMatch[1]) {
                const urlIsbn = isbnMatch[1];
                matchedBook = books.find(b => (b.isbn || '').trim().replace(/[-\s]/g, '') === urlIsbn.trim().replace(/[-\s]/g, ''));
              }
            }
          }
        }

        if (matchedBook) {
          setTopNfcActive(false);
          const resolvedStatus = getResolvedStatus(matchedBook);
          if (resolvedStatus !== 'checked-out') {
            const passes = await checkGatingPasses('checkout', matchedBook.isbn);
            if (!passes) return;
          }
          openP2dOverlay(matchedBook);
        } else {
          setTopNfcError(`No book in catalog registered with NFC Serial ${serialNumber}`);
        }
      });
    } catch (err) {
      console.error("Top NFC error:", err);
      setTopNfcError(`NFC Scan failed: ${err.message || err}`);
      setTopNfcActive(false);
    }
  };

  const stopTopNfcRead = () => {
    setTopNfcActive(false);
  };

  const openP2dOverlay = (book) => {
    setP2dBook(book);
    setP2dError('');
    setP2dSuccess(false);
    
    const resolvedStatus = getResolvedStatus(book);
    if (resolvedStatus === 'checked-out') {
      setP2dActionType('return');
    } else {
      setP2dActionType('checkout');
    }
    
    setP2dModalOpen(true);
  };

  const handleP2dSubmit = async () => {
    if (!p2dBook || !user) return;
    setP2dLoading(true);
    setP2dError('');
    try {
      const targetUid = p2dBook.ntagUid || '04:A3:B2:C1:D0:E9:80';
      if (p2dActionType === 'checkout') {
        await verifiedCheckout({ bookId: p2dBook.isbn, memberId: user.uid || user.id, ntagUid: targetUid, memberName: user?.displayName, memberEmail: user?.email });
      } else {
        await verifiedReturn({ bookId: p2dBook.isbn, memberId: user.uid || user.id, ntagUid: targetUid, memberName: user?.displayName, memberEmail: user?.email });
      }
      setP2dSuccess(true);
      await refreshCatalogState();
      setTimeout(() => {
        setP2dModalOpen(false);
        setP2dBook(null);
      }, 2500);
    } catch (txError) {
      console.error('P2D direct transaction error:', txError);
      setP2dError(`Ledger rejected transaction: ${txError.response?.data?.message || txError.message}`);
    } finally {
      setP2dLoading(false);
    }
  };



  const loadBooksAndData = async () => {
    setLoading(true);
    try {
      const data = await fetchBooks();
      setBooks(data || []);
    } catch (err) {
      setError('Unable to load the Royal study catalog at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadHouses = async () => {
      try {
        const res = await fetchBookHouses();
        if (res?.success && Array.isArray(res.data)) {
          const names = res.data.map(h => h.name);
          setHouses(['All', ...names]);
        } else {
          setHouses(['All', 'Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic']);
        }
      } catch (err) {
        console.warn('Unable to load book houses, using defaults', err);
        setHouses(['All', 'Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic']);
      }
    };

    loadBooksAndData();
    loadHouses();
  }, []);

  const loadMemberCheckouts = async () => {
    const memberId = user?.uid || user?.id;
    if (memberId) {
      try {
        const data = await fetchCheckoutsByMember(memberId);
        setMemberCheckouts(data || []);
      } catch (err) {
        console.warn('Unable to load member checkouts', err);
      }
    } else {
      setMemberCheckouts([]);
    }
  };

  useEffect(() => {
    loadMemberCheckouts();
  }, [user]);

  useEffect(() => {
    const handleOnboardingFocus = (e) => {
      const target = e.detail;
      if (!target || !target.isbn) return;
      
      console.info("Onboarding closed/completed for catalog, scrolling book card into focus:", target.isbn);
      setTimeout(() => {
        const el = document.getElementById(`book-card-${target.isbn}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('glow-highlight');
          setTimeout(() => {
            el.classList.remove('glow-highlight');
          }, 3000);
        }
      }, 100);
    };

    window.addEventListener('onboarding_closed', handleOnboardingFocus);
    window.addEventListener('onboarding_complete', handleOnboardingFocus);
    return () => {
      window.removeEventListener('onboarding_closed', handleOnboardingFocus);
      window.removeEventListener('onboarding_complete', handleOnboardingFocus);
    };
  }, []);

  const refreshCatalogState = async () => {
    try {
      const data = await fetchBooks();
      setBooks(data || []);
    } catch (err) {
      console.warn('Unable to refresh catalog books', err);
    }
    await loadMemberCheckouts();
  };

  const checkGatingPasses = async (actionType, isbn) => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({ actionType, isbn });
      return false;
    }

    try {
      // 1. Fetch gating settings
      let gating = null;
      try {
        const response = await api.get('/api/v1/public/checkout-settings');
        if (response?.data?.success && response?.data?.data) {
          gating = response.data.data;
        } else if (response?.data) {
          gating = response.data;
        }
      } catch (err) {
        console.error("Failed to load gating settings in CatalogPage", err);
      }

      // 2. Fetch detailed profile
      const res = await api.get('/api/v1/auth/me');
      const backendUser = res?.data?.data;
      if (!backendUser) {
        if (triggerOnboarding) triggerOnboarding({ actionType, isbn });
        return false;
      }

      // 3. Consent Check
      if (!backendUser.consentAcceptedAt) {
        if (triggerOnboarding) triggerOnboarding({ actionType, isbn });
        return false;
      }

      // 4. Gating Settings Check
      if (gating) {
        const phoneMissing = gating.phoneMandatory && !backendUser.phone;
        const houseNoMissing = gating.houseNoMandatory && !backendUser.houseNo;
        const streetMissing = gating.streetMandatory && !backendUser.street;
        const cityMissing = gating.cityMandatory && !backendUser.city;
        const pinCodeMissing = gating.pinCodeMandatory && !backendUser.pinCode;

        if (phoneMissing || houseNoMissing || streetMissing || cityMissing || pinCodeMissing) {
          if (triggerOnboarding) triggerOnboarding({ actionType, isbn });
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error("Gating check error in CatalogPage:", err);
      if (triggerOnboarding) triggerOnboarding({ actionType, isbn });
      return false;
    }
  };

  const handleCheckoutClick = async (book) => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({ actionType: 'checkout', isbn: book?.isbn });
      return;
    }
    const passes = await checkGatingPasses('checkout', book?.isbn);
    if (!passes) return;

    setSelectedBook(book);
    setNfcActionType('checkout');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);
    const defaultTab = 'NDEFReader' in window ? 'nfc' : 'barcode';
    setActiveTab(defaultTab);
    setNfcModalOpen(true);
    if (defaultTab === 'nfc') {
      startNfcAction(book, 'checkout');
    } else {
      startCardBarcodeScanner(book);
    }
  };

  const handleReturnClick = (book) => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({ actionType: 'return', isbn: book?.isbn });
      return;
    }
    setSelectedBook(book);
    setNfcActionType('return');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);
    const defaultTab = 'NDEFReader' in window ? 'nfc' : 'barcode';
    setActiveTab(defaultTab);
    setNfcModalOpen(true);
    if (defaultTab === 'nfc') {
      startNfcAction(book, 'return');
    } else {
      startCardBarcodeScanner(book);
    }
  };

  const startNfcAction = async (targetBook, actionType) => {
    setNfcReading(true);
    setNfcError('');
    setNfcSuccess(false);

    if (!('NDEFReader' in window)) {
      setNfcError("Web NFC is not supported on this browser/device. Please use the Barcode Scan tab or manual request fallback.");
      setNfcReading(false);
      return;
    }

    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();

      ndef.addEventListener("readingerror", () => {
        setNfcError("NFC Reading Error: Unable to read tag. Place tag firmly against your device's NFC sweet spot.");
      });

      ndef.addEventListener("reading", async ({ serialNumber }) => {
        console.log(`NFC tag scanned: ${serialNumber}`);
        
        const cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
        const cleanBookTag = (targetBook.ntagUid || '').toLowerCase().replace(/:/g, '');

        if (cleanScanned === cleanBookTag) {
          try {
            if (actionType === 'checkout') {
              await verifiedCheckout({ bookId: targetBook.isbn, memberId: user.uid || user.id, ntagUid: cleanScanned });
            } else {
              await verifiedReturn({ bookId: targetBook.isbn, memberId: user.uid || user.id, ntagUid: cleanScanned });
            }
            setNfcSuccess(true);
            setNfcReading(false);
            await refreshCatalogState();
            setTimeout(() => {
              setNfcModalOpen(false);
              setSelectedBook(null);
            }, 2000);
          } catch (txError) {
            console.error('NFC verified transaction database error:', txError);
            setNfcError(`Database rejected verification: ${txError.response?.data?.message || txError.message}`);
          }
        } else {
          setNfcError(`Security Mismatch: This NFC tag (${serialNumber || 'Unknown'}) does not match this book volume's registered ID (${targetBook.ntagUid}).`);
        }
      });
    } catch (err) {
      console.error('NFC scanning error:', err);
      setNfcError(`NFC Scan failed: ${err.message || err}. Please use the Barcode Scan tab or manual request fallback.`);
      setNfcReading(false);
    }
  };

  const startCardBarcodeScanner = (targetBook) => {
    setCardScannerError('');
    setCardScannerOpen(true);
    const bookToUse = targetBook || selectedBook;
    if (!bookToUse) return;

    if (cardScannerTimeoutRef.current) {
      clearTimeout(cardScannerTimeoutRef.current);
    }

    cardScannerActiveRef.current = true;

    cardScannerTimeoutRef.current = setTimeout(() => {
      if (!cardScannerActiveRef.current) {
        return;
      }

      try {
        const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const html5QrCode = new SafeHtml5Qrcode("card-barcode-reader", {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: !isIOS
          }
        });
        cardHtml5QrCodeRef.current = html5QrCode;

        // iOS rejects width/height resolution constraints on several models (Safari/Chrome), causing false permission crashes.
        // We drop resolution constraints completely on iOS and rely solely on facingMode.
        const cameraConfig = isIOS ? {
          facingMode: "environment"
        } : { facingMode: "environment" };

        html5QrCode.start(
          cameraConfig,
          {
            fps: 25, // Boosted scan rate for faster recognition
            qrbox: (width, height) => {
              const idealW = Math.min(width * 0.9, 350);
              const idealH = Math.min(height * 0.8, 250);
              return { width: idealW, height: idealH };
            },
            formatsToSupport: [
              SafeHtml5QrcodeSupportedFormats.EAN_13,
              SafeHtml5QrcodeSupportedFormats.EAN_8,
              SafeHtml5QrcodeSupportedFormats.ISBN_13,
              SafeHtml5QrcodeSupportedFormats.UPC_A,
              SafeHtml5QrcodeSupportedFormats.UPC_E,
              SafeHtml5QrcodeSupportedFormats.CODE_128,
              SafeHtml5QrcodeSupportedFormats.CODE_39
            ]
          },
          (decodedText) => {
            console.log("Card barcode scanned successfully:", decodedText);
            handleCardBarcodeScanned(decodedText, bookToUse);
          },
          (errorMessage) => {
            // silent scan progression
          }
        ).then(() => {
          try {
            const videoElem = document.querySelector("#card-barcode-reader video");
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
                  advancedConstraints.zoom = Math.min(Math.max(1.75, minZ), maxZ);
                  console.log('[card-barcode-reader] Applied optimal iOS WebRTC zoom:', advancedConstraints.zoom);
                }

                if (Object.keys(advancedConstraints).length > 0) {
                  track.applyConstraints({ advanced: [advancedConstraints] })
                    .then(() => console.log('[card-barcode-reader] Track constraints applied successfully:', advancedConstraints))
                    .catch(err => {
                      console.warn('[card-barcode-reader] Failed to apply advanced zoom/focus constraints. Retrying with focus only.', err);
                      if (advancedConstraints.focusMode) {
                        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
                          .then(() => console.log('[card-barcode-reader] Continuous focus-only applied successfully'))
                          .catch(e => console.warn('[card-barcode-reader] Focus-only failed too', e));
                      }
                    });
                }
              }
            }
          } catch (e) {
            console.warn('[card-barcode-reader] Unable to configure autofocus:', e);
          }

          if (cardHtml5QrCodeRef.current !== html5QrCode || !cardScannerActiveRef.current) {
            console.log("Card scanner cancelled or replaced during boot. Stopping now.");
            html5QrCode.stop().catch(err => console.warn("Failed late stop inside card start promise", err));
          }
        }).catch(err => {
          console.error("Failed to start card scanner:", err);
          if (cardScannerActiveRef.current) {
            setCardScannerError("Camera initialization failed. Please ensure camera permissions are granted.");
          }
        });
      } catch (err) {
        console.error("Card scanner exception:", err);
        if (cardScannerActiveRef.current) {
          setCardScannerError("Could not initialize scanner: " + err.message);
        }
      }
    }, 150);
  };

  const stopCardBarcodeScanner = async () => {
    cardScannerActiveRef.current = false;

    if (cardScannerTimeoutRef.current) {
      clearTimeout(cardScannerTimeoutRef.current);
      cardScannerTimeoutRef.current = null;
    }

    if (cardHtml5QrCodeRef.current) {
      const currentScanner = cardHtml5QrCodeRef.current;
      cardHtml5QrCodeRef.current = null;
      try {
        if (currentScanner.isScanning) {
          await currentScanner.stop();
        }
      } catch (err) {
        console.error("Failed to stop card scanner:", err);
      }
    }

    try {
      const videos = document.querySelectorAll('#card-barcode-reader video');
      videos.forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject;
          if (typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => {
              track.stop();
              console.log("Card video track stopped manually:", track.label);
            });
          }
          video.srcObject = null;
        }
      });
    } catch (err) {
      console.warn("Failed to manually stop card video track fallback", err);
    }

    setCardScannerOpen(false);
  };

  const handleCardBarcodeScanned = async (decodedText, bookToUse) => {
    await stopCardBarcodeScanner();
    const currentBook = bookToUse || selectedBook;
    if (!currentBook) return;
    if (!user) {
      window.alert(t('catalog.signInToCompleteTx'));
      return;
    }
    const scannedCode = (decodedText || '').trim().replace(/[-\s]/g, '');
    const cleanBookIsbn = (currentBook.isbn || '').trim().replace(/[-\s]/g, '');

    if (scannedCode === cleanBookIsbn) {
      try {
        const targetUid = currentBook.ntagUid || '04:A3:B2:C1:D0:E9:80';
        if (nfcActionType === 'checkout') {
          await verifiedCheckout({ bookId: currentBook.isbn, memberId: user.uid || user.id, ntagUid: targetUid });
        } else {
          await verifiedReturn({ bookId: currentBook.isbn, memberId: user.uid || user.id, ntagUid: targetUid });
        }
        setNfcSuccess(true);
        await refreshCatalogState();
        setTimeout(() => {
          setNfcModalOpen(false);
          setSelectedBook(null);
        }, 2000);
      } catch (txError) {
        console.error('Verified card barcode database error:', txError);
        setNfcError(`Database rejected verification: ${txError.response?.data?.message || txError.message}`);
      }
    } else {
      setNfcError(`Security Mismatch: Scanned barcode (${decodedText}) does not match this book's ISBN (${currentBook.isbn}).`);
    }
  };

  const handleCardTabChange = (tabName) => {
    setActiveTab(tabName);
    if (tabName !== 'barcode') {
      stopCardBarcodeScanner();
    }
    if (tabName === 'nfc') {
      startNfcAction(selectedBook, nfcActionType);
    } else if (tabName === 'barcode') {
      startCardBarcodeScanner(selectedBook);
    }
  };

  const handleCloseCardModal = () => {
    stopCardBarcodeScanner();
    setNfcModalOpen(false);
    setSelectedBook(null);
  };

  const handleSubmitFallbackRequest = async () => {
    if (!selectedBook) return;
    setFallbackLoading(true);
    try {
      if (nfcActionType === 'checkout') {
        await requestCheckout({ bookId: selectedBook.isbn, memberId: user.uid || user.id, memberName: user?.displayName, memberEmail: user?.email });
      } else {
        await requestReturn({ bookId: selectedBook.isbn, memberId: user.uid || user.id, memberName: user?.displayName, memberEmail: user?.email });
      }
      setFallbackSuccess(true);
      setFallbackLoading(false);
      await refreshCatalogState();
      setTimeout(() => {
        setNfcModalOpen(false);
        setFallbackSuccess(false);
        setSelectedBook(null);
      }, 2500);
    } catch (err) {
      console.error('Fallback request failed:', err);
      window.alert(t('catalog.unableToSubmitRequest') + (err.response?.data?.message || err.message));
      setFallbackLoading(false);
    }
  };

  const getResolvedStatus = (book) => {
    if (!user) {
      return book.availableCopies > 0 ? 'available' : 'checked-out-by-other';
    }

    const bookIsbn = book.isbn || '';
    const userActiveCheckout = memberCheckouts.find(
      (c) => c.bookId === bookIsbn && 
             (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN')
    );

    if (userActiveCheckout) {
      if (userActiveCheckout.status === 'CHECKED_OUT') return 'checked-out';
      if (userActiveCheckout.status === 'REQUESTED_CHECKOUT') return 'requested-checkout';
      if (userActiveCheckout.status === 'REQUESTED_RETURN') return 'requested-return';
    }

    return book.availableCopies > 0 ? 'available' : 'checked-out-by-other';
  };

  const filteredBooks = books
    .filter((book) => {
      const title = book.title || '';
      const authors = Array.isArray(book.authors) ? book.authors.join(', ') : book.author || '';
      const isbn = book.isbn || '';
      const genre = book.genre || book.subtitle || 'Unknown';
      const tags = Array.isArray(book.tags) ? book.tags : [];

      const matchesSearch =
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
        isbn.includes(searchQuery) ||
        tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesHouse = selectedHouse === 'All' || genre === selectedHouse;

      return matchesSearch && matchesHouse;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'year-desc') return (b.publishYear || 0) - (a.publishYear || 0);
      if (sortBy === 'year-asc') return (a.publishYear || 0) - (b.publishYear || 0);
      return 0;
    });

  return (
    <div className="catalog-container animate-fade-in">
      <header className="catalog-header">
        <div className="header-badge">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('common.study').toUpperCase()}</span>
        </div>
        <h1 className="catalog-title glow-text">{t('catalog.studyTitle')}</h1>
        <p className="catalog-subtitle">
          {t('catalog.studySubtitle')}
        </p>
      </header>

      <section className="self-checkout-portal royal-card glassmorphic-panel">
        <div className="portal-left">
          <div className="portal-icon-box">
            <Scan className="gold-glow-icon scanner-animation-icon" size={24} />
          </div>
          <div className="portal-info">
            <h2 className="portal-title gold-gradient-text">{t('catalog.selfCheckout')}</h2>
            <p className="portal-desc">
              {t('catalog.selfCheckoutDesc')}
            </p>
          </div>
        </div>
        <div className="portal-actions">
          <button 
            className="royal-btn portal-btn btn-barcode"
            onClick={startTopBarcodeScanner}
          >
            <Camera size={16} /> {t('catalog.scanBarcode')}
          </button>
          
          <button 
            className={`royal-btn portal-btn btn-nfc ${topNfcActive ? 'active-pulse' : ''}`}
            onClick={topNfcActive ? stopTopNfcRead : startTopNfcRead}
          >
            <Smartphone size={16} /> {topNfcActive ? t('catalog.tappingActive') : t('catalog.tapNfcBook')}
          </button>
        </div>

        {topNfcActive && (
          <div className="top-nfc-status-banner animate-fade-in">
            <span className="pulse-dot"></span>
            <span>{t('catalog.nfcActiveBanner')}</span>
            <button className="text-btn cancel-btn" onClick={stopTopNfcRead}>{t('common.cancel')}</button>
          </div>
        )}

        {topNfcError && (
          <div className="top-p2d-error-banner animate-fade-in">
            <AlertTriangle size={14} />
            <span>{topNfcError}</span>
            <button className="text-btn close-error-btn" onClick={() => setTopNfcError('')}>{t('catalog.dismiss')}</button>
          </div>
        )}
      </section>

      <section className="catalog-controls royal-card">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder={t('common.searchPlaceholder')}
            className="royal-input search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="controls-action-group">
          <button
            className={`royal-btn-secondary filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} /> {t('catalog.filterHouses')}
          </button>

          <div className="sort-wrapper">
            <span className="sort-label">{t('catalog.sortBy')}</span>
            <select
              className="royal-select sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">{t('catalog.featuredCurations')}</option>
              <option value="rating">{t('catalog.sovereignRating')}</option>
              <option value="year-desc">{t('catalog.chronologyNewest')}</option>
              <option value="year-asc">{t('catalog.chronologyOldest')}</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="genre-filter-row animate-fade-in">
            {houses.map((house) => (
              <button
                key={house}
                onClick={() => setSelectedHouse(house)}
                className={`genre-tag-btn ${selectedHouse === house ? 'active' : ''}`}
              >
                {house}
              </button>
            ))}
          </div>
        )}
      </section>

      <main className="catalog-grid-main">
        {loading ? (
          <div className="royal-card no-results-card">
            <p>{t('common.loading')}</p>
          </div>
        ) : error ? (
          <div className="royal-card no-results-card">
            <p>{error}</p>
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="catalog-grid">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.isbn || book.title}
                book={book}
                user={user}
                resolvedStatus={getResolvedStatus(book)}
                onCheckoutClick={handleCheckoutClick}
                onReturnClick={handleReturnClick}
              />
            ))}
          </div>
        ) : (
          <div className="royal-card no-results-card">
            <BookOpen size={48} className="no-results-icon" />
            <h3>{t('catalog.noVolumesFound')}</h3>
            <p>{t('catalog.noVolumesDesc')}</p>
            <button
              className="royal-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedHouse('All');
              }}
            >
              {t('catalog.resetArchives')}
            </button>
          </div>
        )}
      </main>

      {/* Sovereign Verification modal overlay */}
      {nfcModalOpen && selectedBook && (
        <div className="nfc-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="royal-card nfc-modal-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'rgba(26, 21, 16, 0.95)', border: '1px solid var(--accent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div className="nfc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.15rem', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.05em' }}>
                {nfcActionType === 'checkout' ? t('catalog.sovereignCheckoutVerif') : t('catalog.sovereignReturnVerif')}
              </h3>
              <button onClick={handleCloseCardModal} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div className="verification-tabs-header">
              <button
                className={`verification-tab-btn ${activeTab === 'nfc' ? 'active' : ''}`}
                onClick={() => handleCardTabChange('nfc')}
                disabled={nfcSuccess || fallbackSuccess}
              >
                <Smartphone size={14} />
                <span>{t('catalog.nfcTap')}</span>
              </button>
              <button
                className={`verification-tab-btn ${activeTab === 'barcode' ? 'active' : ''}`}
                onClick={() => handleCardTabChange('barcode')}
                disabled={nfcSuccess || fallbackSuccess}
              >
                <ShoppingBag size={14} />
                <span>{t('catalog.barcodeScan')}</span>
              </button>
              <button
                className={`verification-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                onClick={() => handleCardTabChange('manual')}
                disabled={nfcSuccess || fallbackSuccess}
              >
                <Clock size={14} />
                <span>{t('catalog.manualRequest')}</span>
              </button>
            </div>

            <div className="nfc-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '16px' }}>
              {nfcSuccess ? (
                <div className="nfc-success-animation animate-fade-in" style={{ padding: '10px 0' }}>
                  <CheckCircle size={48} className="text-success gold-glow-icon" style={{ marginBottom: '12px' }} />
                  <h4 style={{ color: 'rgba(255, 255, 255, 0.95)', margin: '0 0 4px 0', fontSize: '1rem' }}>{t('catalog.verifConfirmed')}</h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.8rem', margin: 0 }}>{t('catalog.ledgerUpdated')}</p>
                </div>
              ) : fallbackSuccess ? (
                <div className="nfc-success-animation animate-fade-in" style={{ padding: '10px 0' }}>
                  <CheckCircle size={48} className="gold-glow-icon" style={{ color: 'var(--accent)', marginBottom: '12px' }} />
                  <h4 style={{ color: 'rgba(255, 255, 255, 0.95)', margin: '0 0 4px 0', fontSize: '1rem' }}>{t('catalog.scribeRequestSaved')}</h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.8rem', margin: 0 }}>{t('catalog.requestSubmittedDesc')}</p>
                </div>
              ) : (
                <>
                  {activeTab === 'nfc' && (
                    <div className="tab-pane nfc-tab-pane animate-fade-in" style={{ width: '100%' }}>
                      <div className="nfc-scanner-pulse" style={{ margin: '15px 0' }}>
                        <Smartphone size={40} className="gold-glow-icon animate-pulse" />
                        <div className="pulse-ring"></div>
                      </div>
                      
                      <p className="nfc-prompt-desc" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                        {t('catalog.holdNfcTagDesc')}
                      </p>

                      <div className="nfc-meta-box" style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '8px 12px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{t('catalog.targetVolumeId')}</span>
                        <code style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedBook.ntagUid}</code>
                      </div>

                      {nfcError && (
                        <div className="nfc-error-message royal-card" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)', color: '#ff7b72', marginBottom: '16px', fontSize: '0.75rem', textAlign: 'left', width: '100%' }}>
                          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{nfcError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleCloseCardModal}
                        className="royal-btn-secondary"
                        style={{ width: '100%', padding: '10px', marginTop: '8px' }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  )}

                  {activeTab === 'barcode' && (
                    <div className="tab-pane barcode-tab-pane animate-fade-in" style={{ width: '100%' }}>
                      <div className="barcode-scanner-viewfinder" style={{ margin: '15px auto', position: 'relative', width: '100%', maxWidth: '320px', height: '280px', overflow: 'hidden', background: '#000', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                        <div id="card-barcode-reader" className="scanner-focus-ring-container" onClick={(e) => handleScannerClick(e, cardHtml5QrCodeRef.current)} style={{ width: '100%', height: '100%' }}></div>
                        <div className="scanner-laser-line"></div>
                      </div>

                      <p className="scanner-iphone-tip" style={{ fontSize: '0.78rem', color: 'var(--accent)', background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.2)', padding: '6px 10px', borderRadius: '4px', margin: '0 auto 12px auto', maxWidth: '320px', textAlign: 'center', lineHeight: '1.4' }}>
                        {t('catalog.iphoneAutofocusTip')}
                      </p>

                      <p className="barcode-prompt-desc" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', margin: '0 0 10px 0' }}>
                        {t('catalog.alignBarcodePrompt')}
                      </p>

                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0', marginBottom: '16px' }}>
                        {t('catalog.cantScanBarcode')} <button type="button" onClick={() => handleCardTabChange('manual')} style={{ background: 'none', border: 'none', color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>{t('catalog.submitManualRequest')}</button>
                      </p>

                      {cardScannerError && (
                        <div className="nfc-error-message royal-card" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)', color: '#ff7b72', marginBottom: '16px', fontSize: '0.75rem', textAlign: 'left', width: '100%' }}>
                          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{cardScannerError}</span>
                        </div>
                      )}

                      {nfcError && (
                        <div className="nfc-error-message royal-card" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)', color: '#ff7b72', marginBottom: '16px', fontSize: '0.75rem', textAlign: 'left', width: '100%' }}>
                          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{nfcError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleCloseCardModal}
                        className="royal-btn-secondary"
                        style={{ width: '100%', padding: '10px', marginTop: '8px' }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  )}

                  {activeTab === 'manual' && (
                    <div className="tab-pane manual-tab-pane animate-fade-in" style={{ width: '100%' }}>
                      <p className="fallback-explanation" style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.5', margin: '0 0 16px 0', textAlign: 'left' }}>
                        {nfcActionType === 'checkout'
                          ? t('catalog.fallbackExplanationCheckout')
                          : t('catalog.fallbackExplanationReturn')}
                      </p>

                      <div className="fallback-form-summary royal-card" style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', textAlign: 'left', width: '100%', marginBottom: '16px' }}>
                        <h5 style={{ color: 'var(--accent)', fontWeight: '600', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('catalog.volumeDetails')}</h5>
                        <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>{selectedBook.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', margin: '2px 0 0 0' }}>{t('catalog.isbn')}: {selectedBook.isbn}</p>
                      </div>

                      <div className="fallback-actions-row" style={{ display: 'flex', gap: '12px', width: '100%' }}>
                        <button
                          type="button"
                          onClick={handleCloseCardModal}
                          className="royal-btn-secondary"
                          style={{ flex: 1, padding: '10px' }}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitFallbackRequest}
                          disabled={fallbackLoading}
                          className="royal-btn"
                          style={{ flex: 2, padding: '10px' }}
                        >
                          {fallbackLoading ? <Loader2 className="animate-spin" size={16} /> : t('catalog.submitManualRequest')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fallback Request Ledger Submission Modal Overlay */}
      {fallbackModalOpen && selectedBook && (
        <div className="nfc-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="royal-card nfc-modal-card fallback-modal-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '30px', background: 'rgba(26, 21, 16, 0.95)', border: '1px solid var(--accent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div className="nfc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.05em' }}>
                {nfcActionType === 'checkout' ? t('catalog.manualRequest') : t('catalog.manualRequest')}
              </h3>
              <button onClick={() => setFallbackModalOpen(false)} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div className="nfc-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {fallbackSuccess ? (
                <div className="nfc-success-animation animate-fade-in">
                  <CheckCircle size={56} className="gold-glow-icon" style={{ color: 'var(--success)', marginBottom: '16px' }} />
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1.1rem' }}>{t('catalog.scribeRequestSaved')}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{t('catalog.requestSubmittedDesc')}</p>
                </div>
              ) : (
                <>
                  <p className="fallback-explanation" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 20px 0', textAlign: 'left' }}>
                    {nfcActionType === 'checkout'
                      ? t('catalog.fallbackExplanationCheckout')
                      : t('catalog.fallbackExplanationReturn')}
                  </p>

                  <div className="fallback-form-summary royal-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', textAlign: 'left', width: '100%', marginBottom: '24px' }}>
                    <h5 style={{ color: 'var(--accent)', fontWeight: '600', marginBottom: '6px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('catalog.volumeDetails')}</h5>
                    <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{selectedBook.title}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{t('catalog.isbn')}: {selectedBook.isbn}</p>
                  </div>

                  <div className="fallback-actions-row" style={{ display: 'flex', gap: '14px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setFallbackModalOpen(false)}
                      className="royal-btn-secondary"
                      style={{ flex: 1, padding: '10px' }}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitFallbackRequest}
                      className="royal-btn"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                      disabled={fallbackLoading}
                    >
                      {fallbackLoading ? <RefreshCw className="spin-icon" size={14} /> : <CheckCircle size={14} />}
                      {fallbackLoading ? t('profile.submitting') : t('catalog.submitManualRequest')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Barcode Scanner Viewfinder Modal Overlay */}
      {topScannerOpen && (
        <div className="scanner-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="royal-card scanner-modal-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '24px', background: 'rgba(26, 21, 16, 0.95)', border: '1px solid var(--accent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderRadius: '12px' }}>
            <div className="scanner-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scan size={18} className="gold-glow-icon" />
                <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {t('catalog.scanBarcode')}
                </h3>
              </div>
              <button onClick={stopTopBarcodeScanner} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div className="scanner-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div id="top-barcode-reader" className="scanner-focus-ring-container" onClick={(e) => handleScannerClick(e, topHtml5QrCodeRef.current)} style={{ width: '100%', maxWidth: '400px', background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}></div>
              
              <p className="scanner-iphone-tip" style={{ fontSize: '0.78rem', color: 'var(--accent)', background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.2)', padding: '6px 10px', borderRadius: '4px', marginTop: '12px', marginBottom: '0', maxWidth: '400px', textAlign: 'center', lineHeight: '1.4', width: '100%' }}>
                {t('catalog.iphoneAutofocusTip')}
              </p>
              
              {topScannerError ? (
                <div className="top-p2d-error-banner" style={{ marginTop: '16px', padding: '12px', background: 'rgba(255, 123, 114, 0.1)', border: '1px solid #ff7b72', color: '#ff7b72', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '4px', width: '100%' }}>
                  <AlertTriangle size={16} />
                  <span>{topScannerError}</span>
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '16px', textAlign: 'center', marginHorizontal: '12px' }}>
                  {t('catalog.alignBarcodePrompt')}
                </p>
              )}

              <button 
                className="royal-btn-secondary" 
                onClick={stopTopBarcodeScanner} 
                style={{ marginTop: '20px', width: '100%' }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* P2D Self-Checkout Modal Overlay */}
      {p2dModalOpen && p2dBook && (
        <div className="nfc-modal-overlay p2d-checkout-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="royal-card nfc-modal-card p2d-checkout-modal animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '30px', background: 'rgba(26, 21, 16, 0.98)', border: '2px solid var(--accent)', boxShadow: '0 15px 50px rgba(0,0,0,0.6)', borderRadius: '12px' }}>
            <div className="nfc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.05em' }}>
                {p2dActionType === 'checkout' ? t('catalog.sovereignCheckoutVerif') : t('catalog.sovereignReturnVerif')}
              </h3>
              <button onClick={() => setP2dModalOpen(false)} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div className="nfc-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {p2dSuccess ? (
                <div className="p2d-success-view animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="gold-check-animation-wrapper" style={{ margin: '10px 0 20px' }}>
                    <div className="gold-circle-pulse">
                      <Check className="gold-check-icon animate-scale-up" size={48} />
                    </div>
                  </div>
                  <h4 style={{ color: 'var(--accent)', fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.02em' }}>
                    {t('catalog.verifConfirmed')}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 10px 0' }}>
                    {p2dActionType === 'checkout' 
                      ? `"${p2dBook.title}" ${t('catalog.borrowedByMe').toLowerCase()}`
                      : `"${p2dBook.title}" ${t('catalog.returned').toLowerCase()}`}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>
                    {t('catalog.nfcUid')}: <code>{p2dBook.ntagUid || 'P2D-VERIFIED'}</code>
                  </p>
                </div>
              ) : (
                <>
                  <div className="p2d-book-showcase" style={{ display: 'flex', gap: '16px', alignItems: 'center', textAlign: 'left', width: '100%', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                    {p2dBook.coverUrl && (
                      <div className="p2d-cover-wrapper" style={{ width: '60px', height: '90px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--accent)', flexShrink: 0 }}>
                        <img src={p2dBook.coverUrl} alt={p2dBook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div className="p2d-book-details">
                      <span className="p2d-book-title" style={{ display: 'block', fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>{p2dBook.title}</span>
                      <span className="p2d-book-author" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('common.genre')}: {Array.isArray(p2dBook.authors) ? p2dBook.authors.join(', ') : p2dBook.author || 'Unknown Author'}</span>
                      <span className="p2d-book-isbn" style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>{t('catalog.isbn')}: {p2dBook.isbn}</span>
                    </div>
                  </div>

                  <p className="p2d-action-desc" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', marginBottom: '24px' }}>
                    {p2dActionType === 'checkout' ? t('catalog.physicalCheckoutPrompt') : t('catalog.physicalReturnPrompt')}
                  </p>

                  {p2dError && (
                    <div className="top-p2d-error-banner royal-card" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)', color: '#ff7b72', marginBottom: '20px', fontSize: '0.8rem', textAlign: 'left', width: '100%' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{p2dError}</span>
                    </div>
                  )}

                  <div className="fallback-actions-row" style={{ display: 'flex', gap: '14px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setP2dModalOpen(false)}
                      className="royal-btn-secondary"
                      style={{ flex: 1, padding: '12px' }}
                      disabled={p2dLoading}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleP2dSubmit}
                      className="royal-btn"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                      disabled={p2dLoading}
                    >
                      {p2dLoading ? <RefreshCw className="spin-icon" size={14} /> : <CheckCircle size={14} />}
                      {p2dLoading ? t('common.loading') : (p2dActionType === 'checkout' ? t('catalog.confirmCheckout') : t('catalog.confirmReturn'))}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
