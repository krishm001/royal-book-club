import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, BookOpen, Sparkles, X, Smartphone, RefreshCw, AlertTriangle, CheckCircle, Scan, Camera, Check, Clock, ShoppingBag, Loader2, Star, Shield, QrCode, Wifi, ArrowRight } from 'lucide-react';
import BookCard from '../../components/shared/BookCard';
import { useLanguage } from '../../i18n/LanguageContext';
import { fetchBooks, fetchCheckoutsByMember, verifiedCheckout, verifiedReturn, requestCheckout, requestReturn, rateCheckout } from '../../services/libraryApi';
import { fetchBookHouses } from '../../services/genreApi';
import { getLogoSvgString } from '../../utils/qrStickerGenerator';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../../api/apiClient';
import { auth } from '../../config/firebase';
import './CatalogPage.css';
const SafeHtml5Qrcode = Html5Qrcode;
const SafeHtml5QrcodeSupportedFormats = Html5QrcodeSupportedFormats;
export const isNfcTagMatched = (b, cleanScanned) => {
  if (!b || !cleanScanned) return false;
  // 1. Check primary tag
  const primaryTag = (b.ntagUid || '').toLowerCase().replace(/:/g, '');
  if (primaryTag && primaryTag === cleanScanned) return true;

  // 2. Check legacy/alt tag array
  if (Array.isArray(b.ntagUids)) {
    const matchedAlt = b.ntagUids.some(uid => (uid || '').toLowerCase().replace(/:/g, '') === cleanScanned);
    if (matchedAlt) return true;
  }

  // 3. Check nested copy documents
  if (Array.isArray(b.copies)) {
    const matchedCopy = b.copies.some(copy => {
      if (!copy) return false;
      const copyTag = (copy.ntagUid || '').toLowerCase().replace(/:/g, '');
      if (copyTag && copyTag === cleanScanned) return true;
      if (Array.isArray(copy.ntagUids)) {
        return copy.ntagUids.some(uid => (uid || '').toLowerCase().replace(/:/g, '') === cleanScanned);
      }
      return false;
    });
    if (matchedCopy) return true;
  }
  return false;
};

import ContinuousScannerAnimation from '../../components/shared/ContinuousScannerAnimation';
import ScannerModal from '../../components/shared/ScannerModal';
const CatalogPage = ({
  user,
  triggerOnboarding
}) => {
  const {
    t
  } = useLanguage();
  const navigate = useNavigate();
  const getCoordinates = () => {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve({
          latitude: null,
          longitude: null
        });
        return;
      }
      navigator.geolocation.getCurrentPosition(position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, error => {
        console.warn("Unable to obtain GPS coordinates:", error.message);
        resolve({
          latitude: null,
          longitude: null
        });
      }, {
        enableHighAccuracy: true,
        timeout: 3500
      });
    });
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
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
  const [topScannerLoading, setTopScannerLoading] = useState(false);
  const [topNfcActive, setTopNfcActive] = useState(false);
  const [topNfcError, setTopNfcError] = useState('');
  const [p2dModalOpen, setP2dModalOpen] = useState(false);
  const [p2dBook, setP2dBook] = useState(null);
  const [p2dActionType, setP2dActionType] = useState('checkout'); // 'checkout' or 'return'
  const [p2dSuccess, setP2dSuccess] = useState(false);
  const [p2dError, setP2dError] = useState('');
  const [p2dLoading, setP2dLoading] = useState(false);
  const [processingActionIsbn, setProcessingActionIsbn] = useState(null);

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
  const [createdCheckoutId, setCreatedCheckoutId] = useState(null);
  const [checkoutRating, setCheckoutRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const resetRatingAndCheckoutId = () => {
    setCreatedCheckoutId(null);
    setCheckoutRating(0);
    setRatingSubmitted(false);
  };

  const stateRef = useRef({ books, user });
  useEffect(() => {
    stateRef.current = { books, user };
  }, [books, user]);
  const handleRateExperience = async ratingValue => {
    if (!createdCheckoutId) {
      console.warn("No created checkout ID found to rate");
      return;
    }
    try {
      setCheckoutRating(ratingValue);
      await rateCheckout(createdCheckoutId, ratingValue);
      setRatingSubmitted(true);
    } catch (err) {
      console.error("Failed to submit experience rating:", err);
    }
  };

  // Card-level preferences state
  const [cardScannerOpen, setCardScannerOpen] = useState(false);
  const [cardScannerError, setCardScannerError] = useState('');
  const [cardScannerLoading, setCardScannerLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('NDEFReader' in window ? 'nfc' : 'barcode');
  useEffect(() => {
    if (selectedBook) {
      const defaultTab = 'NDEFReader' in window && selectedBook.ntagUid ? 'nfc' : 'barcode';
      setActiveTab(defaultTab);
    }
  }, [selectedBook]);
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
          modalContent.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
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
  const startTopBarcodeScanner = () => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({
        actionType: 'scan_barcode'
      });
      return;
    }
    setActiveTab('barcode');
    setTopScannerLoading(false);
    setTopScannerOpen(true);
    setTopScannerError('');
    setTopNfcError('');
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
        } : {
          facingMode: "environment"
        };
        html5QrCode.start(cameraConfig, {
          fps: 25,
          // Boosted scan rate for faster recognition
          qrbox: (width, height) => {
            const safeW = width || 400;
            const idealW = Math.max(100, Math.min(safeW * 0.9, 350));
            const idealH = 120;
            return {
              width: Math.round(idealW),
              height: Math.round(idealH)
            };
          },
          formatsToSupport: [SafeHtml5QrcodeSupportedFormats.QR_CODE, SafeHtml5QrcodeSupportedFormats.EAN_13, SafeHtml5QrcodeSupportedFormats.EAN_8, SafeHtml5QrcodeSupportedFormats.ISBN_13, SafeHtml5QrcodeSupportedFormats.UPC_A, SafeHtml5QrcodeSupportedFormats.UPC_E, SafeHtml5QrcodeSupportedFormats.CODE_128, SafeHtml5QrcodeSupportedFormats.CODE_39]
        }, decodedText => {
          console.log("Top barcode scanned successfully:", decodedText);
          handleTopBarcodeScanned(decodedText);
        }, errorMessage => {
          // non-critical error feedback during scanning
        }).then(() => {
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
                  track.applyConstraints({
                    advanced: [advancedConstraints]
                  }).then(() => console.log('[top-barcode-reader] Track constraints applied successfully:', advancedConstraints)).catch(err => {
                    console.warn('[top-barcode-reader] Failed to apply advanced zoom/focus constraints. Retrying with focus only.', err);
                    if (advancedConstraints.focusMode) {
                      track.applyConstraints({
                        advanced: [{
                          focusMode: 'continuous'
                        }]
                      }).then(() => console.log('[top-barcode-reader] Continuous focus-only applied successfully')).catch(e => console.warn('[top-barcode-reader] Focus-only failed too', e));
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
    }, 800);
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
  };
  const handleTopBarcodeScanned = async decodedText => {
    const { user: currentUser, books: currentBooks } = stateRef.current;
    if (!currentUser) {
      await stopTopBarcodeScanner();
      window.alert(t('catalog.signInToCheckoutOrReturn'));
      return;
    }
    const scannedCode = (decodedText || '').trim();
    let qrId = null;

    // Detect QR schema
    const qrMatch = scannedCode.match(/qr=(\d+)/);
    if (qrMatch) {
      qrId = parseInt(qrMatch[1], 10);
    } else if (/^\d+$/.test(scannedCode) && scannedCode.length <= 9) {
      // Short numeric value is treated as copy-level QR ID
      qrId = parseInt(scannedCode, 10);
    }
    let matchedBook = null;
    let matchedCopy = null;
    if (qrId !== null) {
      // Give explicit precedence to QR code resolution
      matchedBook = currentBooks.find(b => Array.isArray(b.copies) && b.copies.some(c => {
        if (c.qrId === qrId) {
          matchedCopy = c;
          return true;
        }
        return false;
      }));
    }
    if (!matchedBook) {
      // Fallback or primary resolution via primary/alternative ISBN or QR ID matching
      const cleanCode = scannedCode.replace(/[-\s]/g, '');
      matchedBook = currentBooks.find(b => {
        const bIsbn = (b.isbn || '').trim().replace(/[-\s]/g, '');
        if (bIsbn === cleanCode) return true;

        // Match alternative ISBNs
        if (Array.isArray(b.alternativeIsbns) && b.alternativeIsbns.some(alt => alt && alt.trim().replace(/[-\s]/g, '') === cleanCode)) {
          return true;
        }

        // Match copy QR codes
        if (Array.isArray(b.copies) && b.copies.some(c => {
          if (String(c.qrId) === cleanCode) {
            matchedCopy = c;
            return true;
          }
          return false;
        })) {
          return true;
        }
        return false;
      });
    }
    if (matchedBook) {
      // Create a shallow copy of matchedBook to map copy details safely
      const resolvedBook = {
        ...matchedBook
      };
      if (matchedCopy && matchedCopy.ntagUid) {
        resolvedBook.ntagUid = matchedCopy.ntagUid;
      }
      await stopTopBarcodeScanner();
      const resolvedStatus = getResolvedStatus(resolvedBook);
      if (resolvedStatus !== 'checked-out') {
        const passes = await checkGatingPasses('checkout', resolvedBook.isbn);
        if (!passes) {
          setTopScannerLoading(false);
          setTopScannerOpen(false);
          return;
        }
      }
      setTopScannerLoading(false);
      openP2dOverlay(resolvedBook);
    } else {
      setTopScannerLoading(false);
      if (Date.now() - (topScannerActiveRef.current_lastError || 0) > 3000) {
        setTopScannerError(t('catalog.securityMismatch') + decodedText + ". Please try again.");
        topScannerActiveRef.current_lastError = Date.now();
      }
    }
  };
  const startTopNfcRead = async () => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({
        actionType: 'scan_nfc'
      });
      return;
    }
    setTopNfcActive(true);
    setTopNfcError('');
    setTopScannerError('');
    setActiveTab('nfc');
    setTopScannerLoading(false);
    setTopScannerOpen(true);
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
      ndef.addEventListener("reading", async ({
        serialNumber,
        message
      }) => {
        console.log(`Top NFC scanned: ${serialNumber}`);
        let matchedBook = null;

        // Match by UID first
        const cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
        matchedBook = books.find(b => isNfcTagMatched(b, cleanScanned));

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
  const openP2dOverlay = book => {
    setTopScannerOpen(false);
    setCardScannerOpen(false);
    setNfcModalOpen(false);
    resetRatingAndCheckoutId();
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
        const res = await verifiedCheckout({
          bookId: p2dBook.isbn,
          memberId: user.uid || user.id,
          ntagUid: targetUid,
          memberName: user?.displayName,
          memberEmail: user?.email
        });
        if (res) {
          setCreatedCheckoutId(res.id || res.data?.id);
          if (res.status === 'RETURNED' || res.data?.status === 'RETURNED') {
            setP2dActionType('return');
          }
        }
      } else {
        const coords = await getCoordinates();
        const res = await verifiedReturn({
          bookId: p2dBook.isbn,
          memberId: user.uid || user.id,
          ntagUid: targetUid,
          memberName: user?.displayName,
          memberEmail: user?.email,
          returnLatitude: coords.latitude,
          returnLongitude: coords.longitude,
          nfcOrBarcode: 'BARCODE'
        });
        if (res) {
          setCreatedCheckoutId(res.id || res.data?.id);
        }
      }
      setP2dSuccess(true);
      await refreshCatalogState();
    } catch (txError) {
      console.error('P2D direct transaction error:', txError);
      const errMsg = txError.response?.data?.message || txError.message || '';
      const isLocationError = /geofence|location|coordinate|outside/i.test(errMsg);
      if (isLocationError && p2dActionType === 'return') {
        setP2dModalOpen(false);
        navigate(`/catalog/${p2dBook.isbn}?action=return&geofenceFailed=true`);
      } else {
        setP2dError(`Ledger rejected transaction: ${errMsg}`);
      }
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

    // Smooth scroll so that the Self-checkout panel is aligned right below the sticky navigation header
    setTimeout(() => {
      const selfCheckoutEl = document.querySelector('.self-checkout-portal');
      if (selfCheckoutEl) {
        const navbarHeight = 80; // approximate height of floating navigation bar
        const elementPosition = selfCheckoutEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 800);
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
    return () => {
      if (topScannerActiveRef.current) stopTopBarcodeScanner();
      if (cardScannerActiveRef.current) stopCardBarcodeScanner();
    };
  }, []);
  useEffect(() => {
    loadMemberCheckouts();
  }, [user]);
  useEffect(() => {
    const handleOnboardingFocus = e => {
      const target = e.detail;
      if (!target) return;
      
      setTimeout(() => {
        if (target.isbn) {
          console.info("Onboarding closed/completed for catalog, scrolling book card into focus:", target.isbn);
          const el = document.getElementById(`book-card-${target.isbn}`);
          if (el) {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            el.classList.add('glow-highlight');
            setTimeout(() => {
              el.classList.remove('glow-highlight');
            }, 3000);
          }
        }
        
        // Auto-resume action if event was complete
        if (e.type === 'onboarding_complete' && target.actionType) {
           if (target.actionType === 'scan_barcode') {
              startTopBarcodeScanner();
           } else if (target.actionType === 'scan_nfc') {
              startTopNfcRead();
           } else {
             const matchedBook = books.find(b => b.isbn === target.isbn);
             if (matchedBook) {
                if (target.actionType === 'checkout') handleCheckoutClick(matchedBook);
                else if (target.actionType === 'return') handleReturnClick(matchedBook);
             }
           }
        }
      }, 100);
    };
    window.addEventListener('onboarding_closed', handleOnboardingFocus);
    window.addEventListener('onboarding_complete', handleOnboardingFocus);
    return () => {
      window.removeEventListener('onboarding_closed', handleOnboardingFocus);
      window.removeEventListener('onboarding_complete', handleOnboardingFocus);
    };
  }, [books, user]); // Added user so it doesn't use stale closure
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
      if (triggerOnboarding) triggerOnboarding({
        actionType,
        isbn
      });
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
        if (triggerOnboarding) triggerOnboarding({
          actionType,
          isbn
        });
        return false;
      }

      // 3. Consent Check
      if (!backendUser.consentAcceptedAt) {
        if (triggerOnboarding) triggerOnboarding({
          actionType,
          isbn
        });
        return false;
      }

      // 4. Gating Settings Check
      if (gating) {
        const phoneMissing = gating.phoneMandatory && !backendUser.phone;
        const houseNoMissing = gating.houseNoMandatory && !backendUser.houseNo;
        const streetMissing = gating.streetMandatory && !backendUser.street;
        const cityMissing = gating.cityMandatory && !backendUser.city;
        const pinCodeMissing = gating.pinCodeMandatory && !backendUser.pinCode;

        // Email Verification check for email/password based sign ins
        const currentUser = auth.currentUser;
        const isPasswordUser = currentUser?.providerData?.some(p => p.providerId === 'password');
        const emailUnverified = gating.enforceEmailVerification && isPasswordUser && !currentUser?.emailVerified;
        if (phoneMissing || houseNoMissing || streetMissing || cityMissing || pinCodeMissing || emailUnverified) {
          if (triggerOnboarding) triggerOnboarding({
            actionType,
            isbn
          });
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error("Gating check error in CatalogPage:", err);
      if (triggerOnboarding) triggerOnboarding({
        actionType,
        isbn
      });
      return false;
    }
  };
  const handleCheckoutClick = async book => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({
        actionType: 'checkout',
        isbn: book?.isbn
      });
      return;
    }
    setProcessingActionIsbn(book?.isbn);
    const passes = await checkGatingPasses('checkout', book?.isbn);
    setProcessingActionIsbn(null);
    if (!passes) return;
    resetRatingAndCheckoutId();
    setSelectedBook(book);
    setNfcActionType('checkout');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);
    const defaultTab = 'NDEFReader' in window && book?.ntagUid ? 'nfc' : 'barcode';
    setActiveTab(defaultTab);
    setNfcModalOpen(true);
    if (defaultTab === 'nfc') {
      startNfcAction(book, 'checkout');
    } else {
      startCardBarcodeScanner(book);
    }
  };
  const handleReturnClick = book => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({
        actionType: 'return',
        isbn: book?.isbn
      });
      return;
    }
    resetRatingAndCheckoutId();
    setSelectedBook(book);
    setNfcActionType('return');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);
    const defaultTab = 'NDEFReader' in window && book?.ntagUid ? 'nfc' : 'barcode';
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
      ndef.addEventListener("reading", async ({
        serialNumber
      }) => {
        console.log(`NFC tag scanned: ${serialNumber}`);
        const cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
        if (isNfcTagMatched(targetBook, cleanScanned)) {
          try {
            if (actionType === 'checkout') {
              const res = await verifiedCheckout({
                bookId: targetBook.isbn,
                memberId: user.uid || user.id,
                ntagUid: cleanScanned
              });
              if (res) {
                setCreatedCheckoutId(res.id || res.data?.id);
              }
            } else {
              const coords = await getCoordinates();
              const res = await verifiedReturn({
                bookId: targetBook.isbn,
                memberId: user.uid || user.id,
                ntagUid: cleanScanned,
                returnLatitude: coords.latitude,
                returnLongitude: coords.longitude,
                nfcOrBarcode: 'NFC'
              });
              if (res) {
                setCreatedCheckoutId(res.id || res.data?.id);
              }
            }
            setNfcSuccess(true);
            setNfcReading(false);
            await refreshCatalogState();
          } catch (txError) {
            console.error('NFC verified transaction database error:', txError);
            const errMsg = txError.response?.data?.message || txError.message || '';
            const isLocationError = /geofence|location|coordinate|outside/i.test(errMsg);
            if (isLocationError && actionType === 'return') {
              setNfcModalOpen(false);
              navigate(`/catalog/${targetBook.isbn}?action=return&geofenceFailed=true`);
            } else {
              setNfcError(`Database rejected verification: ${errMsg}`);
            }
          }
        } else {
          setNfcError(`Security Mismatch: This NFC tag (${serialNumber || 'Unknown'}) does not match this book volume's registered IDs.`);
        }
      });
    } catch (err) {
      console.error('NFC scanning error:', err);
      setNfcError(`NFC Scan failed: ${err.message || err}. Please use the Barcode Scan tab or manual request fallback.`);
      setNfcReading(false);
    }
  };
  const startCardBarcodeScanner = targetBook => {
    setCardScannerError('');
    setNfcError('');
    setCardScannerLoading(false);
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
        } : {
          facingMode: "environment"
        };
        html5QrCode.start(cameraConfig, {
          fps: 25,
          // Boosted scan rate for faster recognition
          qrbox: (width, height) => {
            const safeW = width || 400;
            const idealW = Math.max(100, Math.min(safeW * 0.9, 350));
            const idealH = 120;
            return {
              width: Math.round(idealW),
              height: Math.round(idealH)
            };
          },
          formatsToSupport: [SafeHtml5QrcodeSupportedFormats.EAN_13, SafeHtml5QrcodeSupportedFormats.EAN_8, SafeHtml5QrcodeSupportedFormats.ISBN_13, SafeHtml5QrcodeSupportedFormats.UPC_A, SafeHtml5QrcodeSupportedFormats.UPC_E, SafeHtml5QrcodeSupportedFormats.CODE_128, SafeHtml5QrcodeSupportedFormats.CODE_39]
        }, decodedText => {
          console.log("Card barcode scanned successfully:", decodedText);
          handleCardBarcodeScanned(decodedText, bookToUse);
        }, errorMessage => {
          // silent scan progression
        }).then(() => {
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
                  track.applyConstraints({
                    advanced: [advancedConstraints]
                  }).then(() => console.log('[card-barcode-reader] Track constraints applied successfully:', advancedConstraints)).catch(err => {
                    console.warn('[card-barcode-reader] Failed to apply advanced zoom/focus constraints. Retrying with focus only.', err);
                    if (advancedConstraints.focusMode) {
                      track.applyConstraints({
                        advanced: [{
                          focusMode: 'continuous'
                        }]
                      }).then(() => console.log('[card-barcode-reader] Continuous focus-only applied successfully')).catch(e => console.warn('[card-barcode-reader] Focus-only failed too', e));
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
    }, 800);
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
  };
  const handleCardBarcodeScanned = async (decodedText, bookToUse) => {
    const { user: currentUser } = stateRef.current;
    const currentBook = bookToUse || selectedBook;
    if (!currentBook) {
      await stopCardBarcodeScanner();
      return;
    }
    if (!currentUser) {
      await stopCardBarcodeScanner();
      window.alert(t('catalog.signInToCompleteTx'));
      return;
    }
    setCardScannerLoading(true);
    const scannedCode = (decodedText || '').trim();
    let qrId = null;

    // Detect QR schema (e.g. ?qr=100000001 or standalone 9-digit ID)
    const qrMatch = scannedCode.match(/qr=(\d+)/);
    if (qrMatch) {
      qrId = parseInt(qrMatch[1], 10);
    } else if (/^\d+$/.test(scannedCode) && scannedCode.length <= 9) {
      qrId = parseInt(scannedCode, 10);
    }
    const cleanBookIsbn = (currentBook.isbn || '').trim().replace(/[-\s]/g, '');
    const cleanScannedCode = scannedCode.replace(/[-\s]/g, '');

    // 1. Match primary ISBN
    let isMatch = cleanScannedCode === cleanBookIsbn;

    // 2. Match alternative ISBNs
    if (!isMatch && Array.isArray(currentBook.alternativeIsbns)) {
      isMatch = currentBook.alternativeIsbns.some(alt => alt && alt.trim().replace(/[-\s]/g, '') === cleanScannedCode);
    }

    // 3. Match copy-level QR IDs
    let matchedCopy = null;
    if (!isMatch && Array.isArray(currentBook.copies)) {
      matchedCopy = currentBook.copies.find(c => qrId !== null && c.qrId === qrId || String(c.qrId) === cleanScannedCode);
      if (matchedCopy) {
        isMatch = true;
      }
    }
    if (isMatch) {
      await stopCardBarcodeScanner();
      try {
        const targetUid = matchedCopy && matchedCopy.ntagUid || currentBook.ntagUid || '04:A3:B2:C1:D0:E9:80';
        if (nfcActionType === 'checkout') {
          const res = await verifiedCheckout({
            bookId: currentBook.isbn,
            memberId: user.uid || user.id,
            ntagUid: targetUid,
            memberName: user?.displayName,
            memberEmail: user?.email
          });
          if (res) {
            setCreatedCheckoutId(res.id || res.data?.id);
            if (res.status === 'RETURNED' || res.data?.status === 'RETURNED') {
              setNfcActionType('return');
            }
          }
        } else {
          const coords = await getCoordinates();
          const res = await verifiedReturn({
            bookId: currentBook.isbn,
            memberId: user.uid || user.id,
            ntagUid: targetUid,
            memberName: user?.displayName,
            memberEmail: user?.email,
            returnLatitude: coords.latitude,
            returnLongitude: coords.longitude,
            nfcOrBarcode: matchedCopy ? 'QR' : 'BARCODE'
          });
          if (res) {
            setCreatedCheckoutId(res.id || res.data?.id);
          }
        }
        setCardScannerLoading(false);
        setCardScannerOpen(false);
        setP2dBook(currentBook);
        setP2dActionType(nfcActionType);
        setP2dSuccess(true);
        setP2dModalOpen(true);
        await refreshCatalogState();
      } catch (txError) {
        console.error('Verified card barcode database error:', txError);
        const errMsg = txError.response?.data?.message || txError.message || '';
        const isLocationError = /geofence|location|coordinate|outside/i.test(errMsg);
        if (isLocationError && nfcActionType === 'return') {
          setNfcModalOpen(false);
          navigate(`/catalog/${currentBook.isbn}?action=return&geofenceFailed=true`);
        } else {
          setNfcError(`Database rejected verification: ${errMsg}`);
        }
      }
    } else {
      setNfcError(`Security Mismatch: Scanned code (${decodedText}) does not match this book's ISBN or registered copy QR codes.`);
    }
  };
  const handleCardTabChange = tabName => {
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
  const handleCloseCardModal = async (keepBook = false) => {
    await stopCardBarcodeScanner();
    setNfcModalOpen(false);
    if (!keepBook) {
      setSelectedBook(null);
    }
  };
  const handleSubmitFallbackRequest = async () => {
    if (!selectedBook) return;
    setFallbackLoading(true);
    try {
      if (nfcActionType === 'checkout') {
        const res = await requestCheckout({
          bookId: selectedBook.isbn,
          memberId: user.uid || user.id,
          memberName: user?.displayName,
          memberEmail: user?.email
        });
        if (res) {
          setCreatedCheckoutId(res.id || res.data?.id);
        }
      } else {
        const res = await requestReturn({
          bookId: selectedBook.isbn,
          memberId: user.uid || user.id,
          memberName: user?.displayName,
          memberEmail: user?.email
        });
        if (res) {
          setCreatedCheckoutId(res.id || res.data?.id);
        }
      }
      setFallbackSuccess(true);
      setFallbackLoading(false);
      await refreshCatalogState();
    } catch (err) {
      console.error('Fallback request failed:', err);
      window.alert(t('catalog.unableToSubmitRequest') + (err.response?.data?.message || err.message));
      setFallbackLoading(false);
    }
  };
  const getResolvedStatus = book => {
    if (!user) {
      return book.availableCopies > 0 ? 'available' : 'checked-out-by-other';
    }
    const bookIsbn = book.isbn || '';
    const userActiveCheckout = memberCheckouts.find(c => c.bookId === bookIsbn && (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN'));
    if (userActiveCheckout) {
      if (userActiveCheckout.status === 'CHECKED_OUT') return 'checked-out';
      if (userActiveCheckout.status === 'REQUESTED_CHECKOUT') return 'requested-checkout';
      if (userActiveCheckout.status === 'REQUESTED_RETURN') return 'requested-return';
    }
    return book.availableCopies > 0 ? 'available' : 'checked-out-by-other';
  };
  const filteredBooks = books.filter(book => {
    const title = book.title || '';
    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : book.author || '';
    const isbn = book.isbn || '';
    const genre = book.genre || book.subtitle || 'Unknown';
    const tags = Array.isArray(book.tags) ? book.tags : [];
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || authors.toLowerCase().includes(searchQuery.toLowerCase()) || isbn.includes(searchQuery) || tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesHouse = selectedHouse === 'All' || genre === selectedHouse;
    const matchesTag = !selectedTag || tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase());
    return matchesSearch && matchesHouse && matchesTag;
  }).sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'year-desc') return (b.publishYear || 0) - (a.publishYear || 0);
    if (sortBy === 'year-asc') return (a.publishYear || 0) - (b.publishYear || 0);
    return 0;
  });
  return <div className="catalog-container animate-fade-in">
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
          <button className="royal-btn portal-btn btn-barcode" onClick={startTopBarcodeScanner}>
            <Camera size={16} /> {t('catalog.scanBarcode')}
          </button>
          
          <button className={`royal-btn portal-btn btn-nfc ${topNfcActive ? 'active-pulse' : ''}`} onClick={topNfcActive ? stopTopNfcRead : startTopNfcRead}>
            <Smartphone size={16} /> {topNfcActive ? t('catalog.tappingActive') : t('catalog.tapNfcBook')}
          </button>
        </div>



        
      </section>

      <section className="catalog-controls royal-card">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input type="text" placeholder={t('common.searchPlaceholder')} className="royal-input search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <div className="controls-action-group">
          <button className={`royal-btn-secondary filter-toggle-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={16} /> {t('catalog.filterHouses')}
          </button>

          <div className="sort-wrapper">
            <span className="sort-label">{t('catalog.sortBy')}</span>
            <select className="royal-select sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="featured">{t('catalog.featuredCurations')}</option>
              <option value="rating">{t('catalog.royalRating')}</option>
              <option value="year-desc">{t('catalog.chronologyNewest')}</option>
              <option value="year-asc">{t('catalog.chronologyOldest')}</option>
            </select>
          </div>
        </div>

        {showFilters && <div className="genre-filter-row animate-fade-in">
            {houses.map(house => <button key={house} onClick={() => setSelectedHouse(house)} className={`genre-tag-btn ${selectedHouse === house ? 'active' : ''}`}>
                {house}
              </button>)}
          </div>}
      </section>

      {/* Dynamic Premium Tag Filter Row */}
      <div className="catalog-tags-filter-row" style={{
      display: 'flex',
      gap: '8px',
      overflowX: 'auto',
      padding: '12px 16px',
      marginBottom: '20px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      background: 'var(--glass-bg)',
      border: '1px solid rgba(212, 175, 55, 0.08)',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)'
    }}>
        <button type="button" onClick={() => setSelectedTag(null)} className={`royal-tag-pill ${!selectedTag ? 'active' : ''}`} style={{
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '500',
        border: '1px solid ' + (!selectedTag ? 'var(--accent, #d4af37)' : 'var(--glass-border)'),
        background: !selectedTag ? 'rgba(212, 175, 55, 0.15)' : 'var(--glass-bg)',
        color: !selectedTag ? 'var(--accent, #d4af37)' : 'var(--text-secondary, #9a9ab0)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
        boxShadow: !selectedTag ? '0 0 10px rgba(212, 175, 55, 0.2)' : 'none'
      }}>
          {t('auto_3492', 'All Tags')}
        </button>
        {Array.from(new Set(books.flatMap(b => Array.isArray(b.tags) ? b.tags : []))).filter(Boolean).map(tag => <button key={tag} type="button" onClick={() => setSelectedTag(selectedTag === tag ? null : tag)} className={`royal-tag-pill ${selectedTag === tag ? 'active' : ''}`} style={{
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '500',
        border: '1px solid ' + (selectedTag === tag ? 'var(--accent, #d4af37)' : 'var(--glass-border)'),
        background: selectedTag === tag ? 'rgba(212, 175, 55, 0.15)' : 'var(--glass-bg)',
        color: selectedTag === tag ? 'var(--accent, #d4af37)' : 'var(--text-secondary, #9a9ab0)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
        boxShadow: selectedTag === tag ? '0 0 10px rgba(212, 175, 55, 0.2)' : 'none'
      }}>
            #{tag}
          </button>)}
      </div>

      <main className="catalog-grid-main">
        {loading ? <div className="royal-card no-results-card">
            <p>{t('common.loading')}</p>
          </div> : error ? <div className="royal-card no-results-card">
            <p>{error}</p>
          </div> : filteredBooks.length > 0 ? <div className="catalog-grid">
            {filteredBooks.map(book => <BookCard key={book.isbn || book.title} book={book} user={user} resolvedStatus={getResolvedStatus(book)} onCheckoutClick={handleCheckoutClick} onReturnClick={handleReturnClick} isProcessing={processingActionIsbn === book.isbn} />)}
          </div> : <div className="royal-card no-results-card">
            <BookOpen size={48} className="no-results-icon" />
            <h3>{t('catalog.noVolumesFound')}</h3>
            <p>{t('catalog.noVolumesDesc')}</p>
            <button className="royal-btn" onClick={() => {
          setSearchQuery('');
          setSelectedHouse('All');
        }}>
              {t('catalog.resetArchives')}
            </button>
          </div>}
      </main>

      
      {/* Royal Verification modal overlay */}
      <ScannerModal 
          key={'card-scanner-' + (nfcModalOpen ? 'open' : 'closed')}
          isOpen={nfcModalOpen && selectedBook}
          loading={cardScannerLoading}
          onClose={handleCloseCardModal}
          activeTab={activeTab}
          onTabChange={(tab) => {
              if (tab === 'manual') { handleCloseCardModal(true); setFallbackModalOpen(true); }
              else handleCardTabChange(tab);
          }}
          book={selectedBook}
          actionType={nfcActionType || "checkout"}
          isConfirmation={false}
          error={nfcError}
          scannerId="card-barcode-reader"
          onScannerClick={handleScannerClick}
          html5QrCodeRef={cardHtml5QrCodeRef}
          showManualTab={true}
      />
{/* Fallback Request Ledger Submission Modal Overlay */}
      {fallbackModalOpen && selectedBook && <div className="nfc-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "var(--glass-bg)",
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'flex-start',
        overflowY: 'auto',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
          <div className="royal-card nfc-modal-card fallback-modal-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '30px',
        background: 'var(--surface)',
        border: '1px solid var(--accent)',
        boxShadow: "0 10px 40px var(--card-shadow)"
      }}>
            <div className="nfc-modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        overflowY: 'auto',
          marginBottom: '24px',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          paddingBottom: '12px'
        }}>
              <h3 style={{
            margin: 0,
            color: 'var(--accent)',
            fontSize: '1.25rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            letterSpacing: '0.05em'
          }}>
                {nfcActionType === 'checkout' ? t('catalog.manualRequest') : t('catalog.manualRequest')}
              </h3>
              <button onClick={() => setFallbackModalOpen(false)} className="close-nfc-btn" style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px'
          }}>
                <X size={18} />
              </button>
            </div>

            <div className="nfc-modal-body" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        overflowY: 'auto',
          textAlign: 'center'
        }}>
              {fallbackSuccess ? <div className="nfc-success-animation animate-fade-in">
                  <CheckCircle size={56} className="gold-glow-icon" style={{
              color: 'var(--success)',
              marginBottom: '16px'
            }} />
                  <h4 style={{
              color: 'var(--text-primary)',
              marginBottom: '8px',
              fontSize: '1.1rem'
            }}>{t('catalog.scribeRequestSaved')}</h4>
                  <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              margin: 0
            }}>{t('catalog.requestSubmittedDesc')}</p>
                </div> : <>
                  <p className="fallback-explanation" style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              margin: '0 0 20px 0',
              textAlign: 'left'
            }}>
                    {nfcActionType === 'checkout' ? t('catalog.fallbackExplanationCheckout') : t('catalog.fallbackExplanationReturn')}
                  </p>

                  <div className="fallback-form-summary royal-card" style={{
              padding: '16px',
              background: "var(--glass-bg)",
              border: '1px solid var(--glass-border)',
              borderRadius: '4px',
              textAlign: 'left',
              width: '100%',
              marginBottom: '24px'
            }}>
                    <h5 style={{
                color: 'var(--accent)',
                fontWeight: '600',
                marginBottom: '6px',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>{t('catalog.volumeDetails')}</h5>
                    <p style={{
                fontSize: '0.95rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                margin: 0
              }}>{selectedBook.title}</p>
                    <p style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0'
              }}>{t('catalog.isbn')}: {selectedBook.isbn}</p>
                  </div>

                  <div className="fallback-actions-row" style={{
              display: 'flex',
              gap: '14px',
              width: '100%'
            }}>
                    <button type="button" onClick={() => setFallbackModalOpen(false)} className="royal-btn-secondary" style={{
                flex: 1,
                padding: '10px'
              }}>
                      {t('common.cancel')}
                    </button>
                    <button type="button" onClick={handleSubmitFallbackRequest} className="royal-btn" style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-start',
        overflowY: 'auto',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px'
              }} disabled={fallbackLoading}>
                      {fallbackLoading ? <RefreshCw className="spin-icon" size={14} /> : <CheckCircle size={14} />}
                      {fallbackLoading ? t('profile.submitting') : t('catalog.submitManualRequest')}
                    </button>
                  </div>
                </>}
            </div>
          </div>
        </div>}

      
      <ScannerModal 
          key={'top-scanner-' + (topScannerOpen ? 'open' : 'closed')}
          isOpen={topScannerOpen}
          loading={topScannerLoading}
          onClose={() => { stopTopBarcodeScanner(); stopTopNfcRead(); setTopScannerOpen(false); }}
          activeTab={activeTab}
          onTabChange={(tab) => {
              if (tab === 'nfc') { stopTopBarcodeScanner(); setActiveTab('nfc'); startTopNfcRead(); }
              if (tab === 'barcode') { stopTopNfcRead(); setActiveTab('barcode'); startTopBarcodeScanner(); }
          }}
          book={null}
          actionType="checkout"
          isConfirmation={true}
          error={topScannerError || topNfcError}
          scannerId="top-barcode-reader"
          onScannerClick={handleScannerClick}
          html5QrCodeRef={topHtml5QrCodeRef}
      />
{/* P2D Self-Checkout Modal Overlay */}
      {p2dModalOpen && p2dBook && <div className="nfc-modal-overlay p2d-checkout-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "var(--glass-bg)",
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'flex-start',
        overflowY: 'auto',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
          <div className="royal-card nfc-modal-card p2d-checkout-modal animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '30px',
        background: 'var(--surface)',
        border: '2px solid var(--accent)',
        boxShadow: "0 15px 50px var(--card-shadow)",
        borderRadius: '12px'
      }}>
            <div className="nfc-modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        overflowY: 'auto',
          marginBottom: '24px',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          paddingBottom: '12px'
        }}>
              <h3 style={{
            margin: 0,
            color: 'var(--accent)',
            fontSize: '1.3rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            letterSpacing: '0.05em'
          }}>
                {p2dActionType === 'checkout' ? t('catalog.royalCheckoutVerif') : t('catalog.royalReturnVerif')}
              </h3>
              <button onClick={() => setP2dModalOpen(false)} className="close-nfc-btn" style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px'
          }}>
                <X size={18} />
              </button>
            </div>

            <div className="nfc-modal-body" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        overflowY: 'auto',
          textAlign: 'center'
        }}>
              {p2dSuccess ? <div className="p2d-success-view animate-fade-in" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
        overflowY: 'auto',
            width: '100%'
          }}>
                  <div className="gold-check-animation-wrapper" style={{
              margin: '10px 0 20px'
            }}>
                    <div className="gold-circle-pulse">
                      <Check className="gold-check-icon animate-scale-up" size={48} />
                    </div>
                  </div>
                  <h4 style={{
              color: 'var(--accent)',
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 'bold',
              marginBottom: '8px',
              letterSpacing: '0.02em'
            }}>
                    {t('catalog.verifConfirmed')}
                  </h4>
                  <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              margin: '0 0 10px 0'
            }}>
                    {p2dActionType === 'checkout' ? `"${p2dBook.title}" ${t('catalog.borrowedByMe').toLowerCase()}` : `"${p2dBook.title}" ${t('catalog.returned').toLowerCase()}`}
                  </p>
                  <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              margin: '0 0 20px 0'
            }}>
                    {t('catalog.nfcUid')}: <code>{p2dBook.ntagUid || 'P2D-VERIFIED'}</code>
                  </p>

                  {/* Rating control */}
                  {createdCheckoutId && <div style={{
              width: '100%',
              marginBottom: '20px',
              padding: '15px',
              background: 'rgba(212, 175, 55, 0.04)',
              border: '1px solid rgba(212, 175, 55, 0.15)',
              borderRadius: '6px'
            }}>
                      <p style={{
                margin: '0 0 10px 0',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                fontWeight: '600'
              }}>
                        {ratingSubmitted ? "Thank you for your feedback!" : "How was your experience today?"}
                      </p>
                      <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center'
              }}>
                        {[1, 2, 3, 4, 5].map(starValue => <button key={starValue} type="button" onClick={() => handleRateExperience(starValue)} style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'transform 0.15s ease'
                }} onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.2)';
                }} onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}>
                            <Star size={24} fill={starValue <= checkoutRating ? "var(--accent)" : "none"} stroke={starValue <= checkoutRating ? "var(--accent)" : "var(--glass-border-hover)"} />
                          </button>)}
                      </div>
                    </div>}

                  {/* Action buttons */}
                  <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              width: '100%',
              marginTop: '10px'
            }}>
                    {p2dActionType === 'checkout' && createdCheckoutId && <Link to={`/gatepass/${createdCheckoutId}`} className="royal-btn" style={{
                display: 'flex',
                alignItems: 'flex-start',
        overflowY: 'auto',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                textDecoration: 'none',
                background: 'var(--accent)', color: '#ffffff',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                        <Shield size={14} /> {t('auto_3499', 'View Gatepass')}
                      </Link>}
                    {p2dActionType === 'return' && p2dBook && <Link to={`/catalog/${p2dBook.isbn || p2dBook.id}#reviews-section`} className="royal-btn" style={{
                display: 'flex',
                alignItems: 'flex-start',
        overflowY: 'auto',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                textDecoration: 'none',
                background: 'var(--accent)', color: '#ffffff',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                        <Sparkles size={14} /> {t('auto_3500', 'Write a Book Review')}
                      </Link>}
                    <button onClick={() => {
                setP2dModalOpen(false);
                setP2dBook(null);
              }} className="royal-btn-secondary" style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: '4px'
              }}>
                      {t('auto_3501', 'Done')}
                    </button>
                  </div>
                </div> : <>
                  <div className="p2d-book-showcase" style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
        overflowY: 'auto',
              textAlign: 'left',
              width: '100%',
              padding: '16px',
              background: "var(--glass-bg)",
              borderRadius: '8px',
        maxHeight: '90vh',
        overflowY: 'auto',
              border: '1px solid var(--glass-border)',
              marginBottom: '24px'
            }}>
                    {p2dBook.coverUrl && <div className="p2d-cover-wrapper" style={{
                width: '60px',
                height: '90px',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid var(--accent)',
                flexShrink: 0
              }}>
                        <img src={p2dBook.coverUrl} alt={p2dBook.title} style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }} />
                      </div>}
                    <div className="p2d-book-details">
                      <span className="p2d-book-title" style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>{p2dBook.title}</span>
                      <span className="p2d-book-author" style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>{t('common.genre')}: {Array.isArray(p2dBook.authors) ? p2dBook.authors.join(', ') : p2dBook.author || 'Unknown Author'}</span>
                      <span className="p2d-book-isbn" style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-muted)'
                }}>{t('catalog.isbn')}: {p2dBook.isbn}</span>
                    </div>
                  </div>

                  <p className="p2d-action-desc" style={{
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
                    {p2dActionType === 'checkout' ? t('catalog.physicalCheckoutPrompt') : t('catalog.physicalReturnPrompt')}
                  </p>

                  {p2dError && <div className="top-p2d-error-banner royal-card" style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              padding: '12px',
              border: '1px solid #ff7b72',
              background: 'rgba(255, 123, 114, 0.05)',
              color: '#ff7b72',
              marginBottom: '20px',
              fontSize: '0.8rem',
              textAlign: 'left',
              width: '100%'
            }}>
                      <AlertTriangle size={16} style={{
                flexShrink: 0,
                marginTop: '2px'
              }} />
                      <span>{p2dError}</span>
                    </div>}

                  <div className="fallback-actions-row" style={{
              display: 'flex',
              gap: '14px',
              width: '100%'
            }}>
                    <button type="button" onClick={() => setP2dModalOpen(false)} className="royal-btn-secondary" style={{
                flex: 1,
                padding: '12px'
              }} disabled={p2dLoading}>
                      {t('common.cancel')}
                    </button>
                    <button type="button" onClick={handleP2dSubmit} className="royal-btn" style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-start',
        overflowY: 'auto',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px'
              }} disabled={p2dLoading}>
                      {p2dLoading ? <RefreshCw className="spin-icon" size={14} /> : <CheckCircle size={14} />}
                      {p2dLoading ? t('common.loading') : p2dActionType === 'checkout' ? t('catalog.confirmCheckout') : t('catalog.confirmReturn')}
                    </button>
                  </div>
                </>}
            </div>
          </div>
        </div>}
    </div>;
};
export default CatalogPage;