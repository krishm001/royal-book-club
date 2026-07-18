import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Star, ArrowLeft, BadgeCheck, ShoppingBag, CheckCircle, Clock, Smartphone, RefreshCw, X, Sparkles, AlertTriangle, Pencil, Trash2, Shield, Check, Loader2 } from 'lucide-react';
import { fetchBookByIsbn, checkoutBook, fetchBookReviews, submitBookReview, requestCheckout, requestReturn, verifiedCheckout, verifiedReturn, fetchCheckoutsByMember, updateBookReview, deleteBookReview } from '../../services/libraryApi';
import api from '../../api/apiClient';
import { auth } from '../../config/firebase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useLanguage } from '../../i18n/LanguageContext';
import './BookDetailPage.css';

const SafeHtml5Qrcode = Html5Qrcode;
const SafeHtml5QrcodeSupportedFormats = Html5QrcodeSupportedFormats;

const BookDetailPage = ({ user, triggerOnboarding }) => {
  const { id } = useParams();
  const { t } = useLanguage();

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Unable to obtain GPS coordinates:", error.message);
          resolve({ latitude: null, longitude: null });
        },
        { enableHighAccuracy: true, timeout: 3500 }
      );
    });
  };
  const [book, setBook] = useState(null);
  const [memberCheckouts, setMemberCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState(5);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editingReviewText, setEditingReviewText] = useState('');
  const [editingReviewRating, setEditingReviewRating] = useState(5);
  const [nfcSession, setNfcSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gatingSettings, setGatingSettings] = useState(null);

  // Custom Instant Confirmation modal states
  const [instantConfirmOpen, setInstantConfirmOpen] = useState(false);
  const [instantActionType, setInstantActionType] = useState('checkout');
  const [instantSuccess, setInstantSuccess] = useState(false);
  const [instantError, setInstantError] = useState('');

  // Load gating settings on mount
  useEffect(() => {
    const fetchGatingSettings = async () => {
      try {
        const response = await api.get('/api/v1/public/checkout-settings');
        if (response?.data?.success && response?.data?.data) {
          setGatingSettings(response.data.data);
        } else if (response?.data) {
          setGatingSettings(response.data);
        }
      } catch (err) {
        console.error("Failed to load gating settings", err);
      }
    };
    fetchGatingSettings();
  }, []);

  // Monitor NFC active session with a countdown timer
  useEffect(() => {
    const checkNfcSession = () => {
      const sessionStr = sessionStorage.getItem('nfc_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          // 5-minute timeout check
          if (Date.now() - session.timestamp < 300000) {
            if (session.isbn === id) {
              setNfcSession(session);
            }
          } else {
            sessionStorage.removeItem('nfc_session');
            setNfcSession(null);
          }
        } catch (e) {
          console.error("Error reading NFC session from storage", e);
        }
      } else {
        setNfcSession(null);
      }
    };

    checkNfcSession();

    // Listen to focus and visibility change to check for suspended tabs waking up
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNfcSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkNfcSession);

    const handleNfcTap = (e) => {
      const session = e.detail;
      if (session && session.isbn === id) {
        setNfcSession(session);
      }
    };

    window.addEventListener('nfc_tap_detected', handleNfcTap);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkNfcSession);
      window.removeEventListener('nfc_tap_detected', handleNfcTap);
    };
  }, [id]);

  // Handle live 5-minute clock ticks
  useEffect(() => {
    if (!nfcSession) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const elapsed = Date.now() - nfcSession.timestamp;
      const remaining = Math.max(0, Math.floor((300000 - elapsed) / 1000));
      return remaining;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        sessionStorage.removeItem('nfc_session');
        setNfcSession(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nfcSession]);

  // Progressive profile gating checker
  const checkGatingPasses = async (actionType) => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({ actionType: actionType, isbn: book?.isbn });
      return false;
    }

    try {
      setLoading(true);
      const res = await api.get('/api/v1/auth/me');
      const backendUser = res?.data?.data;
      
      if (!backendUser) {
        if (triggerOnboarding) triggerOnboarding({ actionType: actionType, isbn: book?.isbn });
        return false;
      }

      // 1. Consent Check
      if (!backendUser.consentAcceptedAt) {
        if (triggerOnboarding) triggerOnboarding({ actionType: actionType, isbn: book?.isbn });
        return false;
      }

      // 2. Gating Settings Check
      const gating = gatingSettings;
      if (gating) {
        const phoneMissing = gating.phoneMandatory && !backendUser.phone;
        const houseNoMissing = gating.houseNoMandatory && !backendUser.houseNo;
        const streetMissing = gating.streetMandatory && !backendUser.street;
        const cityMissing = gating.cityMandatory && !backendUser.city;
        const pinCodeMissing = gating.pinCodeMandatory && !backendUser.pinCode;

        if (phoneMissing || houseNoMissing || streetMissing || cityMissing || pinCodeMissing) {
          if (triggerOnboarding) triggerOnboarding({ actionType: actionType, isbn: book?.isbn });
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error("Gating check error:", err);
      if (triggerOnboarding) triggerOnboarding({ actionType: actionType, isbn: book?.isbn });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleInstantNfcAction = async (actionType) => {
    const passes = await checkGatingPasses(actionType);
    if (!passes) return;

    setInstantActionType(actionType);
    setInstantConfirmOpen(true);
    setInstantSuccess(false);
    setInstantError('');
  };

  const handleConfirmInstantAction = async () => {
    try {
      setLoading(true);
      setInstantError('');
      resetRatingAndCheckoutId();
      const targetUid = nfcSession?.ntagUid || book?.ntagUid || '04:A3:B2:C1:D0:E9:80';
      let txRes;
      if (instantActionType === 'checkout') {
        txRes = await verifiedCheckout({
          bookId: book.isbn,
          memberId: user.uid || user.id,
          ntagUid: targetUid,
          memberName: user?.displayName,
          memberEmail: user?.email
        });
      } else {
        const coords = await getCoordinates();
        txRes = await verifiedReturn({
          bookId: book.isbn,
          memberId: user.uid || user.id,
          ntagUid: targetUid,
          memberName: user?.displayName,
          memberEmail: user?.email,
          returnLatitude: coords.latitude,
          returnLongitude: coords.longitude,
          nfcOrBarcode: 'NFC'
        });
      }
      
      if (txRes && txRes.id) {
        setCreatedCheckoutId(txRes.id);
      } else if (txRes && txRes.data && txRes.data.id) {
        setCreatedCheckoutId(txRes.data.id);
      }
      
      setInstantSuccess(true);
      sessionStorage.removeItem('nfc_session');
      setNfcSession(null);
      await refreshState();
    } catch (txError) {
      console.error('Instant NFC transaction error:', txError);
      setInstantError(txError.response?.data?.message || txError.message);
    } finally {
      setLoading(false);
    }
  };

  // NFC & Fallback request states
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [nfcActionType, setNfcActionType] = useState('checkout'); // 'checkout' or 'return'
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcError, setNfcError] = useState('');
  const [nfcSuccess, setNfcSuccess] = useState(false);

  const [fallbackModalOpen, setFallbackModalOpen] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackSuccess, setFallbackSuccess] = useState(false);

  // Experience rating and transaction tracking
  const [createdCheckoutId, setCreatedCheckoutId] = useState(null);
  const [checkoutRating, setCheckoutRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const resetRatingAndCheckoutId = () => {
    setCreatedCheckoutId(null);
    setCheckoutRating(0);
    setRatingSubmitted(false);
  };

  const handleRateExperience = async (ratingValue) => {
    setCheckoutRating(ratingValue);
    if (!createdCheckoutId) return;
    try {
      await api.post(`/api/v1/checkout/${createdCheckoutId}/rate?rating=${ratingValue}`);
      setRatingSubmitted(true);
    } catch (err) {
      console.error("Failed to submit rating:", err);
    }
  };


  // Preference-hierarchy tab & scanner states
  const [activeTab, setActiveTab] = useState('NDEFReader' in window ? 'nfc' : 'barcode');
  const [detailScannerOpen, setDetailScannerOpen] = useState(false);
  const [detailScannerError, setDetailScannerError] = useState('');
  const detailHtml5QrCodeRef = React.useRef(null);
  const detailScannerTimeoutRef = React.useRef(null);
  const detailScannerActiveRef = React.useRef(false);


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

  const getResolvedStatus = () => {
    if (!book) return 'available';
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

  const getActiveCheckoutInstance = () => {
    if (!book || !user) return null;
    const bookIsbn = book.isbn || '';
    const bookMatches = memberCheckouts.filter(
      (c) => c.bookId === bookIsbn && 
             (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN' || c.status === 'RETURNED')
    );
    if (bookMatches.length === 0) return null;
    return bookMatches.sort((a, b) => {
      const aTime = new Date(a.checkedOutAt || a.returnedAt || a.createdAt || 0);
      const bTime = new Date(b.checkedOutAt || b.returnedAt || b.createdAt || 0);
      return bTime - aTime;
    })[0];
  };

  const checkoutStatus = getResolvedStatus();

  const refreshState = async () => {
    try {
      const fetched = await fetchBookByIsbn(id);
      setBook(fetched);
    } catch (err) {
      console.warn('Unable to refresh book details', err);
    }
    await loadMemberCheckouts();
  };

  useEffect(() => {
    const loadBookAndReviews = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetched = await fetchBookByIsbn(id);
        setBook(fetched);
        
        // Fetch real reviews
        const reviewsRes = await fetchBookReviews(id);
        if (reviewsRes?.success && Array.isArray(reviewsRes.data)) {
          setReviews(reviewsRes.data);
        } else if (Array.isArray(reviewsRes)) {
          setReviews(reviewsRes);
        }
      } catch (err) {
        setError(t('catalog.errorLoadingDetails'));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadBookAndReviews();
    }
  }, [id]);

  useEffect(() => {
    loadMemberCheckouts();
  }, [user]);

  useEffect(() => {
    const handleOnboardingFocus = () => {
      console.info("Onboarding closed/completed, scrolling checkout action box into viewport focus.");
      setTimeout(() => {
        const el = document.getElementById('detail-checkout-action-card');
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

  // Deep Link Auto-Checkout or Return Flow Trigger
  useEffect(() => {
    if (book) {
      const query = new URLSearchParams(window.location.search);
      const action = query.get('action');
      const status = getResolvedStatus();
      
      if (action === 'checkout' && status === 'available') {
        resetRatingAndCheckoutId();
        setNfcActionType('checkout');
        setNfcError('');
        setNfcSuccess(false);
        setFallbackSuccess(false);
        
        const defaultTab = 'NDEFReader' in window ? 'nfc' : 'barcode';
        setActiveTab(defaultTab);
        setNfcModalOpen(true);

        if (defaultTab === 'nfc') {
          startNfcAction('checkout');
        } else {
          startDetailBarcodeScanner();
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (action === 'return' && status === 'checked-out') {
        resetRatingAndCheckoutId();
        setNfcActionType('return');
        setNfcError('');
        setNfcSuccess(false);
        setFallbackSuccess(false);
        
        const defaultTab = 'NDEFReader' in window ? 'nfc' : 'barcode';
        setActiveTab(defaultTab);
        setNfcModalOpen(true);

        if (defaultTab === 'nfc') {
          startNfcAction('return');
        } else {
          startDetailBarcodeScanner();
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [book, memberCheckouts]);

  const handleCheckoutClick = async () => {
    const passes = await checkGatingPasses('checkout');
    if (!passes) return;

    resetRatingAndCheckoutId();
    setNfcActionType('checkout');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);

    const defaultTab = 'NDEFReader' in window ? 'nfc' : 'barcode';
    setActiveTab(defaultTab);
    setNfcModalOpen(true);

    if (defaultTab === 'nfc') {
      startNfcAction('checkout');
    } else {
      startDetailBarcodeScanner();
    }
  };

  const handleReturnClick = async () => {
    const passes = await checkGatingPasses('return');
    if (!passes) return;

    resetRatingAndCheckoutId();
    setNfcActionType('return');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);

    const defaultTab = 'NDEFReader' in window ? 'nfc' : 'barcode';
    setActiveTab(defaultTab);
    setNfcModalOpen(true);

    if (defaultTab === 'nfc') {
      startNfcAction('return');
    } else {
      startDetailBarcodeScanner();
    }
  };
  useEffect(() => {
    return () => {
      detailScannerActiveRef.current = false;
      if (detailScannerTimeoutRef.current) {
        clearTimeout(detailScannerTimeoutRef.current);
      }
      if (detailHtml5QrCodeRef.current) {
        const currentScanner = detailHtml5QrCodeRef.current;
        detailHtml5QrCodeRef.current = null;
        if (currentScanner.isScanning) {
          currentScanner.stop().catch(err => console.warn("Failed cleanup stop", err));
        }
      }
    };
  }, []);

  useEffect(() => {
    if (nfcModalOpen) {
      const timer = setTimeout(() => {
        const cameraView = document.getElementById("detail-barcode-reader");
        const modalContent = cameraView || document.querySelector(".inline-action-panel") || document.querySelector(".nfc-modal-overlay");
        if (modalContent) {
          modalContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [nfcModalOpen, activeTab]);

  const startDetailBarcodeScanner = () => {
    setDetailScannerError('');
    setDetailScannerOpen(true);
    
    if (detailScannerTimeoutRef.current) {
      clearTimeout(detailScannerTimeoutRef.current);
    }
    
    detailScannerActiveRef.current = true;

    detailScannerTimeoutRef.current = setTimeout(() => {
      if (!detailScannerActiveRef.current) {
        return;
      }

      try {
        const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const html5QrCode = new SafeHtml5Qrcode("detail-barcode-reader", {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: !isIOS
          }
        });
        detailHtml5QrCodeRef.current = html5QrCode;
        html5QrCode.start(
          { facingMode: "environment" },
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
            console.log("Detail barcode scanned successfully:", decodedText);
            handleDetailBarcodeScanned(decodedText);
          },
          (errorMessage) => {
            // silent scan progression
          }
        ).then(() => {
          try {
            const videoElem = document.querySelector("#detail-barcode-reader video");
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
                  console.log('[detail-barcode-reader] Applied optimal iOS WebRTC zoom:', advancedConstraints.zoom);
                }

                if (Object.keys(advancedConstraints).length > 0) {
                  track.applyConstraints({ advanced: [advancedConstraints] })
                    .then(() => console.log('[detail-barcode-reader] Track constraints applied successfully:', advancedConstraints))
                    .catch(err => {
                      console.warn('[detail-barcode-reader] Failed to apply advanced zoom/focus constraints. Retrying with focus only.', err);
                      if (advancedConstraints.focusMode) {
                        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
                          .then(() => console.log('[detail-barcode-reader] Continuous focus-only applied successfully'))
                          .catch(e => console.warn('[detail-barcode-reader] Focus-only failed too', e));
                      }
                    });
                }
              }
            }
          } catch (e) {
            console.warn('[detail-barcode-reader] Unable to configure autofocus:', e);
          }

          if (detailHtml5QrCodeRef.current !== html5QrCode || !detailScannerActiveRef.current) {
            console.log("Detail scanner cancelled or replaced during boot. Stopping now.");
            html5QrCode.stop().catch(err => console.warn("Failed late stop inside start promise", err));
          }
        }).catch(err => {
          console.error("Failed to start detail scanner:", err);
          if (detailScannerActiveRef.current) {
            setDetailScannerError("Camera initialization failed. Please ensure camera permissions are granted.");
          }
        });
      } catch (err) {
        console.error("Detail scanner exception:", err);
        if (detailScannerActiveRef.current) {
          setDetailScannerError("Could not initialize scanner: " + err.message);
        }
      }
    }, 150);
  };

  const stopDetailBarcodeScanner = async () => {
    detailScannerActiveRef.current = false;
    
    if (detailScannerTimeoutRef.current) {
      clearTimeout(detailScannerTimeoutRef.current);
      detailScannerTimeoutRef.current = null;
    }

    if (detailHtml5QrCodeRef.current) {
      const currentScanner = detailHtml5QrCodeRef.current;
      detailHtml5QrCodeRef.current = null;
      try {
        if (currentScanner.isScanning) {
          await currentScanner.stop();
        }
      } catch (err) {
        console.error("Failed to stop detail scanner:", err);
      }
    }

    try {
      const videos = document.querySelectorAll('#detail-barcode-reader video');
      videos.forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject;
          if (typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => {
              track.stop();
              console.log("Detail video track stopped manually:", track.label);
            });
          }
          video.srcObject = null;
        }
      });
    } catch (err) {
      console.warn("Failed to manually stop detail track fallback", err);
    }

    setDetailScannerOpen(false);
  };

  const handleDetailBarcodeScanned = async (decodedText) => {
    await stopDetailBarcodeScanner();
    if (!user) {
      window.alert(t('catalog.signInToCompleteTx'));
      return;
    }
    const scannedCode = (decodedText || '').trim().replace(/[-\s]/g, '');
    const cleanBookIsbn = (book.isbn || '').trim().replace(/[-\s]/g, '');

    if (scannedCode === cleanBookIsbn) {
      try {
        resetRatingAndCheckoutId();
        const targetUid = book.ntagUid || '04:A3:B2:C1:D0:E9:80';
        let txRes;
        if (nfcActionType === 'checkout') {
          txRes = await verifiedCheckout({ bookId: book.isbn, memberId: user.uid || user.id, ntagUid: targetUid, memberName: user?.displayName, memberEmail: user?.email });
        } else {
          const coords = await getCoordinates();
          txRes = await verifiedReturn({
            bookId: book.isbn,
            memberId: user.uid || user.id,
            ntagUid: targetUid,
            memberName: user?.displayName,
            memberEmail: user?.email,
            returnLatitude: coords.latitude,
            returnLongitude: coords.longitude,
            nfcOrBarcode: 'BARCODE'
          });
        }
        
        if (txRes && txRes.id) {
          setCreatedCheckoutId(txRes.id);
        } else if (txRes && txRes.data && txRes.data.id) {
          setCreatedCheckoutId(txRes.data.id);
        }
        
        setNfcSuccess(true);
        await refreshState();
      } catch (txError) {
        console.error('Verified barcode database error:', txError);
        setNfcError(t('catalog.unableToSubmitRequest') + (txError.response?.data?.message || txError.message));
      }
    } else {
      setNfcError(t('catalog.securityMismatch') + decodedText + ".");
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (tabName !== 'barcode') {
      stopDetailBarcodeScanner();
    }
    if (tabName === 'nfc') {
      startNfcAction(nfcActionType);
    } else if (tabName === 'barcode') {
      startDetailBarcodeScanner();
    }
  };

  const handleCloseNfcModal = () => {
    stopDetailBarcodeScanner();
    setNfcModalOpen(false);
  };

  const startNfcAction = async (actionType) => {
    setNfcReading(true);
    setNfcError('');
    setNfcSuccess(false);

    if (!('NDEFReader' in window)) {
      setNfcError(t('catalog.nfcNotSupported'));
      setNfcReading(false);
      return;
    }

    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();

      ndef.addEventListener("readingerror", () => {
        setNfcError(t('catalog.nfcReadingError'));
      });

      ndef.addEventListener("reading", async ({ serialNumber }) => {
        console.log(`NFC tag scanned: ${serialNumber}`);
        
        // Clean serial number and compare to book's ntagUid
        const cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
        const cleanBookTag = (book.ntagUid || '').toLowerCase().replace(/:/g, '');

        if (cleanScanned === cleanBookTag) {
          try {
            resetRatingAndCheckoutId();
            let txRes;
            if (actionType === 'checkout') {
              txRes = await verifiedCheckout({ bookId: book.isbn, memberId: user.uid || user.id, ntagUid: cleanScanned });
            } else {
              const coords = await getCoordinates();
              txRes = await verifiedReturn({
                bookId: book.isbn,
                memberId: user.uid || user.id,
                ntagUid: cleanScanned,
                returnLatitude: coords.latitude,
                returnLongitude: coords.longitude,
                nfcOrBarcode: 'NFC'
              });
            }
            
            if (txRes && txRes.id) {
              setCreatedCheckoutId(txRes.id);
            } else if (txRes && txRes.data && txRes.data.id) {
              setCreatedCheckoutId(txRes.data.id);
            }
            
            setNfcSuccess(true);
            setNfcReading(false);
            await refreshState();
          } catch (txError) {
            console.error('NFC verified transaction database error:', txError);
            setNfcError(t('catalog.unableToSubmitRequest') + (txError.response?.data?.message || txError.message));
          }
        } else {
          setNfcError(t('catalog.nfcSecurityMismatch') + serialNumber + ".");
        }
      });
    } catch (err) {
      console.error('NFC scanning error:', err);
      setNfcError(t('catalog.nfcScanFailed') + (err.message || err));
      setNfcReading(false);
    }
  };

  const handleSubmitFallbackRequest = async () => {
    setFallbackLoading(true);
    try {
      if (nfcActionType === 'checkout') {
        const res = await requestCheckout({ bookId: book.isbn, memberId: user.uid || user.id, memberName: user?.displayName, memberEmail: user?.email });
        if (res) {
          setCreatedCheckoutId(res.id || res.data?.id);
        }
      } else {
        const coords = await getCoordinates();
        const res = await requestReturn({
          bookId: book.isbn,
          memberId: user.uid || user.id,
          memberName: user?.displayName,
          memberEmail: user?.email,
          returnLatitude: coords.latitude,
          returnLongitude: coords.longitude,
          nfcOrBarcode: 'NONE'
        });
        if (res) {
          setCreatedCheckoutId(res.id || res.data?.id);
        }
      }
      setFallbackSuccess(true);
      setFallbackLoading(false);
      await refreshState();
    } catch (err) {
      console.error('Fallback request failed:', err);
      window.alert(t('catalog.unableToSubmitRequest') + (err.response?.data?.message || err.message));
      setFallbackLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    try {
      const res = await submitBookReview(id, {
        rating: userRating,
        content: reviewText,
      });

      if (res?.success && res?.data) {
        setReviews([res.data, ...reviews]);
      } else {
        // Refresh feed
        const refreshed = await fetchBookReviews(id);
        if (refreshed?.success && Array.isArray(refreshed.data)) {
          setReviews(refreshed.data);
        }
      }
      setReviewText('');
    } catch (err) {
      console.error('Failed to publish dissertation', err);
      window.alert(t('catalog.unableToSubmitRequest') + (err.message || ''));
    }
  };

  const handleStartEditReview = (reviewId, text, rating) => {
    setEditingReviewId(reviewId);
    setEditingReviewText(text);
    setEditingReviewRating(rating || 5);
  };

  const handleCancelEditReview = () => {
    setEditingReviewId(null);
    setEditingReviewText('');
    setEditingReviewRating(5);
  };

  const handleUpdateReviewSubmit = async (reviewId) => {
    if (!editingReviewText.trim()) return;
    try {
      const res = await updateBookReview(id, reviewId, {
        rating: editingReviewRating,
        content: editingReviewText.trim()
      });
      if (res && res.success) {
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, content: res.data.content, rating: res.data.rating } : r));
        handleCancelEditReview();
      }
    } catch (err) {
      console.error('Failed to update book review:', err);
    }
  };

  const handleDeleteReviewClick = async (reviewId) => {
    if (!window.confirm(t('catalog.deleteReviewConfirm'))) return;
    try {
      const res = await deleteBookReview(id, reviewId);
      if (res && res.success) {
        setReviews(prev => prev.filter(r => r.id !== reviewId));
      }
    } catch (err) {
      console.error('Failed to delete book review:', err);
    }
  };

  if (loading) {
    return (
      <div className="book-detail-container animate-fade-in">
        <div className="royal-card no-results-card">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="book-detail-container animate-fade-in">
        <div className="royal-card no-results-card">
          <p>{error || t('catalog.bookNotFound')}</p>
          <Link to="/catalog" className="royal-btn">
            {t('catalog.returnArchives')}
          </Link>
        </div>
      </div>
    );
  }

  const authors = Array.isArray(book.authors) ? book.authors.join(', ') : book.author || 'Unknown Author';
  const coverUrl = book.coverUrl || book.thumbnail || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80';

  return (
    <>
      <div className="book-detail-container animate-fade-in">
        <Link to="/catalog" className="back-link">
        <ArrowLeft size={16} /> {t('catalog.returnArchives')}
      </Link>

      <div className="book-detail-grid">
        <div className="book-cover-panel">
          <div className="cover-frame royal-card">
            <img src={coverUrl} alt={book.title} className="detail-cover-img" />
            <div className="gold-bookmark-spine"></div>
          </div>
          {book.subtitle && (
            <blockquote className="detail-citation-blockquote">
              {book.subtitle}
            </blockquote>
          )}
        </div>

        <div className="book-info-panel royal-card">
          <div className="detail-checkout-action-box" id="detail-checkout-action-card" style={{ marginBottom: '24px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '20px' }}>
            {nfcSession && (
              nfcSession.verificationStatus === 'VALID' ? (
                <div className="nfc-instant-checkout-container" style={{ margin: '0 0 16px 0', padding: '16px', border: '1px dashed var(--accent)', borderRadius: '8px', background: 'rgba(141, 18, 34, 0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} className="gold-glow" style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>NFC Physical Sync Active</span>
                    <div className="nfc-countdown-clock" style={{ marginLeft: 'auto', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} className="animate-pulse" />
                      <span>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-secondary)' }}>You are holding the physical volume. Bypassing standard scans.</p>
                  {checkoutStatus === 'available' ? (
                    <button 
                      onClick={() => handleInstantNfcAction('checkout')} 
                      className="royal-btn checkout-cta-btn pulse-button"
                      style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}
                    >
                      <Smartphone size={16} /> Instant NFC Checkout
                    </button>
                  ) : checkoutStatus === 'checked-out' ? (
                    <button 
                      onClick={() => handleInstantNfcAction('return')} 
                      className="royal-btn checkout-cta-btn pulse-button"
                      style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}
                    >
                      <Smartphone size={16} /> Instant NFC Return
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="nfc-instant-checkout-container" style={{ margin: '0 0 16px 0', padding: '16px', border: '1px dashed #d97706', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} style={{ color: '#d97706' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#d97706' }}>NFC Verification Warning</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {nfcSession.verificationStatus === 'REUSED' 
                      ? "This physical NFC sequence has been used previously. Instant checkout is disabled to prevent reuse."
                      : "The security token for this physical tap has expired. Instant checkout is disabled."
                    }
                  </p>
                  <p style={{ fontSize: '0.78rem', margin: 0, color: 'var(--text-secondary)' }}>
                    Please proceed with <strong>Regular Manual Checkout</strong> below.
                  </p>
                </div>
              )
            )}
            {checkoutStatus === 'available' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={handleCheckoutClick} className="royal-btn checkout-cta-btn" id="book-detail-checkout-btn">
                  <ShoppingBag size={16} /> {t('catalog.secureSovereignCheckout')}
                </button>
              </div>
            ) : checkoutStatus === 'checked-out' ? (
              <div className="success-checkout-badge-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="success-checkout-badge">
                  <CheckCircle size={20} className="success-icon" />
                  <div>
                    <h4>{t('catalog.digitalCheckoutAuthorized')}</h4>
                    <p>{t('catalog.currentlyInPossession')}</p>
                  </div>
                </div>
                <button onClick={handleReturnClick} className="royal-btn checkout-cta-btn return-btn-action" id="book-detail-return-btn">
                  <RefreshCw size={16} /> {t('catalog.returnVolume')}
                </button>
              </div>
            ) : checkoutStatus === 'requested-checkout' ? (
              <div className="pending-checkout-badge royal-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid rgba(212, 165, 116, 0.3)', background: 'rgba(212, 165, 116, 0.05)' }}>
                <Clock size={20} style={{ color: 'var(--accent)' }} className="spin-icon" />
                <div>
                  <h4 style={{ color: 'var(--accent)', fontSize: '0.95rem', fontWeight: '600' }}>{t('catalog.checkoutRequestPending')}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{t('catalog.awaitingCuratorApproval')}</p>
                </div>
              </div>
            ) : checkoutStatus === 'requested-return' ? (
              <div className="pending-checkout-badge royal-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid rgba(212, 165, 116, 0.3)', background: 'rgba(212, 165, 116, 0.05)' }}>
                <Clock size={20} style={{ color: 'var(--accent)' }} className="spin-icon" />
                <div>
                  <h4 style={{ color: 'var(--accent)', fontSize: '0.95rem', fontWeight: '600' }}>{t('catalog.returnRequestPending')}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{t('catalog.awaitingReturnReview')}</p>
                </div>
              </div>
            ) : (
              <div className="in-circulation-badge royal-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)' }}>
                <Clock size={20} style={{ color: '#ff7b72' }} />
                <div>
                  <h4 style={{ color: '#ff7b72', fontSize: '0.95rem', fontWeight: '600' }}>{t('catalog.inCirculation')}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{t('catalog.checkedOutByOtherScholar')}</p>
                </div>
              </div>
            )}

            {getActiveCheckoutInstance() && (
              <Link 
                to={`/gatepass/${getActiveCheckoutInstance().id}`} 
                className="royal-btn-secondary view-gatepass-btn"
                style={{ 
                  marginTop: '15px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  textDecoration: 'none',
                  padding: '12px 16px',
                  width: '100%',
                  fontWeight: '700',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontSize: '0.8rem',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  background: 'transparent',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <Shield size={14} /> View Security Gatepass
              </Link>
            )}
          </div>

          <div className="genre-rating-row">
            <span className="detail-genre-tag">{book.genre || book.publishDate || 'Library Edition'}</span>
            <div className="detail-stars">
              <Star size={16} fill="var(--accent)" stroke="var(--accent)" />
              <span className="rating-num">{book.rating || '—'} / 5.0</span>
            </div>
          </div>

          <h1 className="detail-book-title glow-text">{book.title}</h1>
          <h2 className="detail-book-author">{t('common.by')} <span className="gold-gradient-text">{authors}</span></h2>

          <div className="metadata-spec-grid">
            <div className="spec-item">
              <span className="spec-label">{t('catalog.isbn')}</span>
              <span className="spec-value">{book.isbn}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">{t('catalog.publisher')}</span>
              <span className="spec-value">{book.publisher || 'N/A'}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">{t('catalog.publishDate')}</span>
              <span className="spec-value">{book.publishDate || 'N/A'}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">{t('catalog.availability')}</span>
              <span className="spec-value">
                {checkoutStatus === 'available' ? (
                  <span className="text-success"><BadgeCheck size={14} className="inline-icon" /> {t('catalog.inSalon')}</span>
                ) : (
                  <span className="text-warning"><Clock size={14} className="inline-icon" /> {t('catalog.inCirculation')}</span>
                )}
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">{t('catalog.languageField')}</span>
              <span className="spec-value">
                {t('common.' + (book.language === 'kn' ? 'kannada' : book.language === 'hi' ? 'hindi' : 'english'))}
              </span>
            </div>
          </div>

          <div className="detail-description-section">
            <h3>{t('catalog.literaryOverview')}</h3>
            <p>{book.description || 'A refined volume from the Royal archives.'}</p>
            {book.details && <p className="extended-desc">{book.details}</p>}
          </div>

          {book.tags && Array.isArray(book.tags) && book.tags.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{t('catalog.acquisitionLabels')}</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {book.tags.map((tag, idx) => (
                  <span key={idx} style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.15)', color: 'var(--accent)', borderRadius: '4px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: '500' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="detail-reviews-section royal-card">
        <h3 className="section-title">{t('catalog.reviewsTitle')}</h3>
        {user ? (
          <form onSubmit={handleSubmitReview} className="write-review-form">
            <div className="review-rating-select">
              <span>{t('catalog.ratingLabel')}</span>
              <div className="star-rating-inputs">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setUserRating(star)}
                    className="star-input-btn"
                  >
                    <Star size={20} fill={star <= userRating ? 'var(--accent)' : 'none'} stroke="var(--accent)" />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="royal-textarea review-textarea"
              placeholder={t('catalog.critiquePlaceholder')}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              required
            />
            <button type="submit" className="royal-btn submit-review-btn">
              {t('catalog.publishDissertation')}
            </button>
          </form>
        ) : (
          <div className="review-prompt-card">
            <p>{t('catalog.loginToReview')}</p>
          </div>
        )}

        <div className="reviews-feed">
          {reviews.length > 0 ? (
            reviews.map((rev) => {
              const isAuthor = user && (user.uid === rev.userId || user.id === rev.userId);
              const isAdmin = user && user.role === 'ADMIN';
              const isEditing = editingReviewId === rev.id;

              return (
                <div key={rev.id} className="review-item">
                  <div className="review-item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="review-author">{rev.author}</span>
                      <span className="review-date">
                        {rev.createdAt
                          ? new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Recently'}
                      </span>
                    </div>
                    {!isEditing && (isAuthor || isAdmin) && (
                      <div className="review-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isAuthor && (
                          <button 
                            onClick={() => handleStartEditReview(rev.id, rev.content, rev.rating)} 
                            className="review-action-btn edit-btn" 
                            title="Edit Dissertation"
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteReviewClick(rev.id)} 
                          className="review-action-btn delete-btn" 
                          title="Purge Dissertation"
                          style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="review-edit-form" style={{ marginTop: '0.5rem' }}>
                      <div className="review-rating-select" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>Rating:</span>
                        <div className="star-rating-inputs" style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setEditingReviewRating(star)}
                              className="star-input-btn"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              <Star size={16} fill={star <= editingReviewRating ? 'var(--accent)' : 'none'} stroke="var(--accent)" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        className="royal-textarea review-textarea edit-mode"
                        value={editingReviewText}
                        onChange={(e) => setEditingReviewText(e.target.value)}
                        rows={3}
                        style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff' }}
                      />
                      <div className="review-edit-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleUpdateReviewSubmit(rev.id)} className="royal-btn small-btn save-btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                          {t('common.update')}
                        </button>
                        <button onClick={handleCancelEditReview} className="royal-btn small-btn cancel-btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#ccc' }}>
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="review-stars-row">
                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                          <Star key={i} size={14} fill="var(--accent)" stroke="var(--accent)" />
                        ))}
                      </div>
                      <p className="review-content">"{rev.content}"</p>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {t('catalog.noReviewsDetail')}
            </div>
          )}
        </div>
      </section>
    </div>

    {/* Sovereign Checkout/Return Verification Modal Overlay (rendered at root level to guarantee absolute viewport centering) */}
    {nfcModalOpen && (
      <div className="nfc-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
        <div className="royal-card nfc-modal-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'rgba(26, 21, 16, 0.95)', border: '1px solid var(--accent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderRadius: '8px' }}>
          <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '10px' }}>
            <h4 style={{ color: 'var(--accent)', fontSize: '1rem', fontWeight: '600', margin: 0, letterSpacing: '0.05em' }}>
              {nfcActionType === 'checkout' ? t('catalog.sovereignCheckoutVerif') : t('catalog.sovereignReturnVerif')}
            </h4>
            <button onClick={handleCloseNfcModal} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>

          <div className="verification-tabs-header">
            <button
              className={`verification-tab-btn ${activeTab === 'nfc' ? 'active' : ''}`}
              onClick={() => handleTabChange('nfc')}
              disabled={nfcSuccess || fallbackSuccess}
            >
              <Smartphone size={14} />
              <span>{t('catalog.nfcTap')}</span>
            </button>
            <button
              className={`verification-tab-btn ${activeTab === 'barcode' ? 'active' : ''}`}
              onClick={() => handleTabChange('barcode')}
              disabled={nfcSuccess || fallbackSuccess}
            >
              <ShoppingBag size={14} />
              <span>{t('catalog.barcodeScan')}</span>
            </button>
            <button
              className={`verification-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => handleTabChange('manual')}
              disabled={nfcSuccess || fallbackSuccess}
            >
              <Clock size={14} />
              <span>{t('catalog.manualRequest')}</span>
            </button>
          </div>

          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '16px' }}>
            {nfcSuccess ? (
              <div className="nfc-success-animation animate-fade-in" style={{ padding: '10px 0', width: '100%' }}>
                <CheckCircle size={48} className="text-success gold-glow-icon" style={{ marginBottom: '12px' }} />
                <h4 style={{ color: 'rgba(255, 255, 255, 0.95)', margin: '0 0 4px 0', fontSize: '1rem' }}>{t('catalog.verifConfirmed')}</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.8rem', margin: 0 }}>{t('catalog.ledgerUpdated')}</p>

                {/* Interactive Rating Control */}
                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(212, 175, 55, 0.04)', border: '1px solid rgba(212, 175, 55, 0.15)', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                    {ratingSubmitted ? "Thank you for your feedback!" : "How was your experience today?"}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map((starValue) => (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => handleRateExperience(starValue)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <Star
                          size={24}
                          fill={starValue <= checkoutRating ? "var(--accent)" : "none"}
                          stroke={starValue <= checkoutRating ? "var(--accent)" : "rgba(255,255,255,0.3)"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                  {createdCheckoutId && (
                    <Link
                      to={`/gatepass/${createdCheckoutId}`}
                      className="royal-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                      }}
                    >
                      <Shield size={14} /> View Gatepass
                    </Link>
                  )}
                  <button
                    onClick={() => handleCloseNfcModal()}
                    className="royal-btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      borderRadius: '4px',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : fallbackSuccess ? (
              <div className="nfc-success-animation animate-fade-in" style={{ padding: '10px 0', width: '100%' }}>
                <CheckCircle size={48} className="gold-glow-icon" style={{ color: 'var(--accent)', marginBottom: '12px' }} />
                <h4 style={{ color: 'rgba(255, 255, 255, 0.95)', margin: '0 0 4px 0', fontSize: '1rem' }}>{t('catalog.scribeRequestSaved')}</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.8rem', margin: 0 }}>{t('catalog.requestSubmittedDesc')}</p>
                
                {/* Interactive Rating Control */}
                {createdCheckoutId && (
                  <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(212, 175, 55, 0.04)', border: '1px solid rgba(212, 175, 55, 0.15)', borderRadius: '6px' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                      {ratingSubmitted ? "Thank you for your feedback!" : "How was your experience today?"}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {[1, 2, 3, 4, 5].map((starValue) => (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => handleRateExperience(starValue)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            transition: 'transform 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <Star
                            size={24}
                            fill={starValue <= checkoutRating ? "var(--accent)" : "none"}
                            stroke={starValue <= checkoutRating ? "var(--accent)" : "rgba(255,255,255,0.3)"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <button
                    onClick={() => handleCloseNfcModal()}
                    className="royal-btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      borderRadius: '4px',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'nfc' && (
                  <div className="tab-pane nfc-tab-pane animate-fade-in" style={{ width: '100%' }}>
                    <div className="nfc-scanner-pulse" style={{ margin: '15px 0' }}>
                      <Smartphone size={40} className="gold-glow-icon animate-pulse" />
                      <div className="pulse-ring"></div>
                    </div>
                    
                    <p className="nfc-prompt-desc" style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                      {t('catalog.holdNfcTagDesc')}
                    </p>

                    <div className="nfc-meta-box" style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '8px 12px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{t('catalog.targetVolumeId')}</span>
                      <code style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 'bold' }}>{book.ntagUid}</code>
                    </div>

                    {nfcError && (
                      <div className="nfc-error-message royal-card" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)', color: '#ff7b72', marginBottom: '16px', fontSize: '0.75rem', textAlign: 'left', width: '100%' }}>
                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{nfcError}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCloseNfcModal}
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
                      <div id="detail-barcode-reader" style={{ width: '100%', height: '100%' }}></div>
                      <div className="scanner-laser-line"></div>
                    </div>

                    <p className="scanner-iphone-tip" style={{ fontSize: '0.78rem', color: 'var(--accent)', background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.2)', padding: '6px 10px', borderRadius: '4px', margin: '0 auto 12px auto', maxWidth: '320px', textAlign: 'center', lineHeight: '1.4' }}>
                      {t('catalog.iphoneAutofocusTip')}
                    </p>

                    <p className="barcode-prompt-desc" style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.5', margin: '0 0 10px 0' }}>
                      {t('catalog.alignBarcodePrompt')}
                    </p>

                    <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0', marginBottom: '16px' }}>
                      {t('catalog.cantScanBarcode')}{' '}
                      <button type="button" onClick={() => handleTabChange('manual')} style={{ background: 'none', border: 'none', color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                        {t('catalog.submitManualRequest')}
                      </button>
                    </p>

                    {detailScannerError && (
                      <div className="nfc-error-message royal-card" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)', color: '#ff7b72', marginBottom: '16px', fontSize: '0.75rem', textAlign: 'left', width: '100%' }}>
                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{detailScannerError}</span>
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
                      onClick={handleCloseNfcModal}
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
                      <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>{book.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', margin: '2px 0 0 0' }}>ISBN: {book.isbn}</p>
                    </div>

                    <div className="fallback-actions-row" style={{ display: 'flex', gap: '12px', width: '100%' }}>
                      <button
                        type="button"
                        onClick={handleCloseNfcModal}
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
                        {fallbackLoading ? <RefreshCw className="spin-icon" size={12} /> : <CheckCircle size={12} />}
                        {fallbackLoading ? t('profile.submitting') : t('catalog.submitManualRequest')}
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

    {instantConfirmOpen && (
      <div className="nfc-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
        <div className="inline-action-panel royal-card border-gold animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'rgba(26, 21, 16, 0.95)', border: '1px solid var(--accent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderRadius: '8px' }}>
          <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '10px' }}>
            <h4 style={{ color: 'var(--accent)', fontSize: '1rem', fontWeight: '600', margin: 0, letterSpacing: '0.05em' }}>
              {instantActionType === 'checkout' ? t('catalog.sovereignCheckoutVerif') : t('catalog.sovereignReturnVerif')}
            </h4>
            <button onClick={() => setInstantConfirmOpen(false)} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>

          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '16px' }}>
            {instantSuccess ? (
              <div className="nfc-success-animation animate-fade-in" style={{ padding: '10px 0', width: '100%' }}>
                <CheckCircle size={48} className="text-success gold-glow-icon" style={{ marginBottom: '12px' }} />
                <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1rem' }}>{instantActionType === 'checkout' ? 'Sovereign Checkout Confirmed' : 'Sovereign Return Confirmed'}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>The digital transaction ledger has been updated successfully.</p>

                {/* Interactive Rating Control */}
                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(212, 175, 55, 0.04)', border: '1px solid rgba(212, 175, 55, 0.15)', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                    {ratingSubmitted ? "Thank you for your feedback!" : "How was your experience today?"}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map((starValue) => (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => handleRateExperience(starValue)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <Star
                          size={24}
                          fill={starValue <= checkoutRating ? "var(--accent)" : "none"}
                          stroke={starValue <= checkoutRating ? "var(--accent)" : "rgba(255,255,255,0.3)"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                  {createdCheckoutId && (
                    <Link
                      to={`/gatepass/${createdCheckoutId}`}
                      className="royal-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                      }}
                    >
                      <Shield size={14} /> View Gatepass
                    </Link>
                  )}
                  <button
                    onClick={() => setInstantConfirmOpen(false)}
                    className="royal-btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      borderRadius: '4px',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : instantError ? (
              <div className="nfc-error-state animate-fade-in" style={{ padding: '10px 0', width: '100%' }}>
                <AlertTriangle size={48} style={{ color: 'var(--error, #ff7b72)', marginBottom: '12px' }} />
                <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1rem' }}>Transaction Failed</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>{instantError}</p>
                <button onClick={handleConfirmInstantAction} className="royal-btn" style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Try Again
                </button>
              </div>
            ) : (
              <div className="instant-confirm-prompt animate-fade-in" style={{ width: '100%' }}>
                {/* Book Mini Card */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(212,175,55,0.1)', marginBottom: '20px', textAlign: 'left' }}>
                  <img src={coverUrl} alt={book?.title} style={{ width: '45px', height: '65px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.2)' }} />
                  <div>
                    <h5 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem', fontWeight: '600', lineBreak: 'anywhere' }}>{book?.title}</h5>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.75rem' }}>{authors}</p>
                  </div>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: '0 0 24px 0' }}>
                  Do you wish to instantly {instantActionType === 'checkout' ? 'check out' : 'return'} this sovereign volume via your active physical NFC session?
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
                  <button onClick={() => setInstantConfirmOpen(false)} className="royal-btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)', padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    Cancel
                  </button>
                  <button onClick={handleConfirmInstantAction} disabled={loading} className="royal-btn" style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {instantActionType === 'checkout' ? 'Confirm Checkout' : 'Confirm Return'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default BookDetailPage;
