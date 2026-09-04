import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { BookOpen, Star, ArrowLeft, BadgeCheck, ShoppingBag, CheckCircle, Clock, Smartphone, RefreshCw, X, Sparkles, AlertTriangle, Pencil, Trash2, Shield, Check, Loader2, QrCode, Camera, RotateCcw, Share2 } from 'lucide-react';
import { fetchBookByIsbn, checkoutBook, fetchBookReviews, submitBookReview, requestCheckout, requestReturn, verifiedCheckout, verifiedReturn, fetchCheckoutsByMember, updateBookReview, deleteBookReview, fetchCheckouts, validateQrReturn, cancelCheckout, cancelReturn } from '../../services/libraryApi';
import api from '../../api/apiClient';
import { fetchHeroConfig } from '../../services/heroApi';
import { auth } from '../../config/firebase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useLanguage } from '../../i18n/LanguageContext';
import { isNfcTagMatched } from './CatalogPage';
import ShareModal from '../../components/shared/ShareModal';
import ContinuousScannerAnimation from '../../components/shared/ContinuousScannerAnimation';
import ScannerModal from '../../components/shared/ScannerModal';
import { translateCheckoutError } from '../../utils/errorTranslator';
import './BookDetailPage.css';
const SafeHtml5Qrcode = Html5Qrcode;
const SafeHtml5QrcodeSupportedFormats = Html5QrcodeSupportedFormats;
const BookDetailPage = ({
  user,
  triggerOnboarding
}) => {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const deepLinkQrId = searchParams.get('qrId');
  const hasTriggeredDeepLink = useRef(false);
  const {
    t,
    getLocalized
  } = useLanguage();

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
  const [book, setBook] = useState(null);
  const [memberCheckouts, setMemberCheckouts] = useState([]);
  const [allCheckouts, setAllCheckouts] = useState([]);
  const [loadingCheckouts, setLoadingCheckouts] = useState(false);
  const [loading, setLoading] = useState(true);
  const DEFAULT_QUOTE = "A room without books is like a body without a soul. - Cicero";
  const [loadingQuote, setLoadingQuote] = useState(DEFAULT_QUOTE);

  useEffect(() => {
    fetchHeroConfig().then(res => {
      if (res && res.data) {
        const quotes = getLocalized(res.data, 'featuredQuotes') || [];
        if (quotes.length > 0) {
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            setLoadingQuote(randomQuote);
        }
      }
    }).catch(() => {});
  }, [getLocalized]);
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
  const [showAllTags, setShowAllTags] = useState(false);

  // Custom Instant Confirmation modal states
  const [instantConfirmOpen, setInstantConfirmOpen] = useState(false);
  const [instantActionType, setInstantActionType] = useState('checkout');
  const [instantSuccess, setInstantSuccess] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [instantError, setInstantError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Handle smooth scroll to reviews if hash is present and loading is complete
  useEffect(() => {
    if (!loading && window.location.hash === '#reviews-section') {
      const timer = setTimeout(() => {
        const element = document.getElementById('reviews-section');
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Monitor NFC active session with a countdown timer
  useEffect(() => {
    const checkNfcSession = () => {
      const sessionStr = sessionStorage.getItem('nfc_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          // 3-minute timeout check
          if (Date.now() - session.timestamp < 180000) {
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
    const handleNfcTap = e => {
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

  // Handle live 3-minute clock ticks
  useEffect(() => {
    if (!nfcSession) {
      setTimeLeft(0);
      return;
    }
    const calculateTimeLeft = () => {
      const elapsed = Date.now() - nfcSession.timestamp;
      const remaining = Math.max(0, Math.floor((180000 - elapsed) / 1000));
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
  const checkGatingPasses = async actionType => {
    if (!user || user.isAnonymous) {
      if (triggerOnboarding) triggerOnboarding({
        actionType: actionType,
        isbn: book?.isbn
      });
      return false;
    }
    try {
      const res = await api.get('/api/v1/auth/me');
      const backendUser = res?.data?.data;
      if (!backendUser) {
        if (triggerOnboarding) triggerOnboarding({
          actionType: actionType,
          isbn: book?.isbn
        });
        return false;
      }

      // 1. Consent Check
      if (!backendUser.consentAcceptedAt) {
        if (triggerOnboarding) triggerOnboarding({
          actionType: actionType,
          isbn: book?.isbn
        });
        return false;
      }

      // 2. Fetch absolute latest gating settings dynamically to catch mid-session administrative updates
      let gating = null;
      try {
        const response = await api.get('/api/v1/public/checkout-settings');
        if (response?.data?.success && response?.data?.data) {
          gating = response.data.data;
          setGatingSettings(gating);
        } else if (response?.data) {
          gating = response.data;
          setGatingSettings(gating);
        }
      } catch (err) {
        console.error("Failed to load gating settings dynamically in BookDetailPage", err);
        gating = gatingSettings; // fallback to loaded state
      }
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
            actionType: actionType,
            isbn: book?.isbn
          });
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error("Gating check error:", err);
      if (triggerOnboarding) triggerOnboarding({
        actionType: actionType,
        isbn: book?.isbn
      });
      return false;
    } finally {
      // do nothing
    }
  };
  const [cancellingInstant, setCancellingInstant] = useState(false);
  const handleInstantNfcAction = async actionType => {
    setIsProcessing(true);
    const passes = await checkGatingPasses(actionType);
    setIsProcessing(false);
    if (!passes) return;
    setInstantActionType(actionType);
    setNfcActionType(actionType);
    nfcActionTypeRef.current = actionType;
    setInstantConfirmOpen(true);
    setInstantSuccess(false);
    setInstantError('');
    await executeInstantAction(actionType);
  };
  const executeInstantAction = async actionType => {
    try {
      // Intentionally NOT setting loading(true) so we don't unmount the page and overlay!
      setInstantError('');
      resetRatingAndCheckoutId();
      const targetUid = nfcSession?.ntagUid || book?.ntagUid || '04:A3:B2:C1:D0:E9:80';
      let txRes;
      if (actionType === 'checkout') {
        txRes = await verifiedCheckout({
          bookId: book.isbn,
          memberId: user.uid || user.id,
          ntagUid: targetUid,
          memberName: user?.displayName,
          memberEmail: user?.email
        });
        if (txRes && (txRes.status === 'RETURNED' || txRes.data?.status === 'RETURNED')) {
          setInstantActionType('return');
        }
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
      const errMsg = txError.response?.data?.message || txError.message || '';
      const isLocationError = /geofence|location|coordinate|outside/i.test(errMsg);
      if (isLocationError && dynamicActionType === 'return') {
        setInstantConfirmOpen(false);
        setNfcActionType('return');
        nfcActionTypeRef.current = 'return';
        setNfcModalOpen(true);
        setActiveTab('validator_qr');
        setGeofenceFailed(true);
        setNfcError("Geofence location check failed. We have automatically opened Validator QR scanning for your convenience.");
        startDetailQrValidatorScanner();
      } else {
        setInstantError(translateCheckoutError(errMsg));
      }
    } finally {
      // do nothing
    }
  };
  const handleConfirmInstantAction = async () => {
    await executeInstantAction(instantActionType);
  };
  const handleCancelInstantAction = async () => {
    if (!createdCheckoutId) {
      setInstantConfirmOpen(false);
      return;
    }
    try {
      setCancellingInstant(true);
      if (instantActionType === 'checkout') {
        await cancelCheckout(createdCheckoutId, user?.uid || user?.id);
      } else {
        await cancelReturn(createdCheckoutId, user?.uid || user?.id);
      }
      setInstantConfirmOpen(false);
      setInstantSuccess(false);
      await refreshState();
    } catch (err) {
      console.error('Failed to cancel instant transaction:', err);
      setInstantError(err.response?.data?.message || err.message || 'Failed to rollback transaction.');
    } finally {
      setCancellingInstant(false);
    }
  };

  // NFC & Fallback request states
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [nfcActionType, setNfcActionType] = useState('checkout'); // 'checkout' or 'return'
  const nfcActionTypeRef = useRef('checkout');
  const detailLastErrorTimeRef = useRef(0);

  // Synchronize ref with state as a fallback
  useEffect(() => {
    nfcActionTypeRef.current = nfcActionType;
  }, [nfcActionType]);
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

  const stateRef = useRef({ book, user });
  useEffect(() => {
    stateRef.current = { book, user };
  }, [book, user]);
  const handleRateExperience = async ratingValue => {
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
  const [validatorQrPath, setValidatorQrPath] = useState('');
  const [validatorLoading, setValidatorLoading] = useState(false);
  const [validatorError, setValidatorError] = useState('');
  useEffect(() => {
    if (book) {
      const defaultTab = 'NDEFReader' in window && book.ntagUid ? 'nfc' : 'barcode';
      setActiveTab(defaultTab);
    }
  }, [book]);
  const [detailScannerOpen, setDetailScannerOpen] = useState(false);
  const [detailScannerError, setDetailScannerError] = useState('');
  const [detailScannerLoading, setDetailScannerLoading] = useState(false);
  const detailHtml5QrCodeRef = React.useRef(null);
  const detailNfcAbortControllerRef = React.useRef(null);
  const processingNfcRef = React.useRef(false);
  const detailScannerTimeoutRef = React.useRef(null);
  const detailScannerActiveRef = React.useRef(false);
  const detailQrHtml5QrCodeRef = React.useRef(null);
  const detailQrScannerTimeoutRef = React.useRef(null);
  const detailQrScannerActiveRef = React.useRef(false);
  const [detailQrScannerError, setDetailQrScannerError] = useState('');
  const [isQrCameraActive, setIsQrCameraActive] = useState(false);
  const [geofenceFailed, setGeofenceFailed] = useState(false);
  const [qrValidationFailed, setQrValidationFailed] = useState(false);
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
  const loadAllCheckouts = async () => {
    if (user && user.role === 'ADMIN') {
      setLoadingCheckouts(true);
      try {
        const checkouts = await fetchCheckouts();
        const activeForBook = checkouts.filter(c => c.bookId === id && (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN'));
        setAllCheckouts(activeForBook);
      } catch (err) {
        console.warn('Unable to load active checkouts for tracking', err);
      } finally {
        setLoadingCheckouts(false);
      }
    }
  };
  const getResolvedStatus = () => {
    if (!book) return 'available';
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
  const getActiveCheckoutInstance = () => {
    if (!book || !user) return null;
    const bookIsbn = book.isbn || '';
    const bookMatches = memberCheckouts.filter(c => c.bookId === bookIsbn && (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN' || c.status === 'RETURNED'));
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
    await loadAllCheckouts();
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
    if (user && user.role === 'ADMIN') {
      loadAllCheckouts();
    }
  }, [user, id]);
  useEffect(() => {
    const handleOnboardingFocus = (e) => {
      console.info("Onboarding closed/completed, scrolling checkout action box into viewport focus.");
      setTimeout(() => {
        const el = document.getElementById('detail-checkout-action-card');
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
        
        if (e && e.type === 'onboarding_complete' && e.detail && e.detail.actionType) {
           if (e.detail.qrId) {
             setNfcActionType(e.detail.actionType);
             nfcActionTypeRef.current = e.detail.actionType;
             setActiveTab("barcode");
             setNfcModalOpen(true);
             setTimeout(() => {
               handleDetailBarcodeScanned("qr=" + e.detail.qrId);
             }, 800);
           } else if (e.detail.actionType === "checkout") {
             if (sessionStorage.getItem("nfc_session")) handleInstantNfcAction("checkout");
             else handleCheckoutClick();
           }


           else if (e.detail.actionType === "return") {
             if (sessionStorage.getItem("nfc_session")) handleInstantNfcAction("return");
             else handleReturnClick();
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
  }, [book, user]); // Use book and user dependency to ensure functions have context

  // Center checkout action card in the viewport upon catalog details loading (Epic 1)
  useEffect(() => {
    if (!loading && book) {
      const timer = setTimeout(() => {
        const el = document.getElementById('detail-checkout-action-card');
        if (el) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 500); // 500ms delay to let layouts render
      return () => clearTimeout(timer);
    }
  }, [loading, book]);

  const handleCheckoutClick = async () => {
    setIsProcessing(true);
    const passes = await checkGatingPasses('checkout');
    setIsProcessing(false);
    if (!passes) return;
    resetRatingAndCheckoutId();
    setNfcActionType('checkout');
    nfcActionTypeRef.current = 'checkout';
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);
    setGeofenceFailed(false);
    setQrValidationFailed(false);
    const defaultTab = 'NDEFReader' in window && book?.ntagUid ? 'nfc' : 'barcode';
    setActiveTab(defaultTab);
    setNfcModalOpen(true);
    if (defaultTab === 'nfc') {
      startNfcAction('checkout');
    } else {
      startDetailBarcodeScanner();
    }
  };
  const handleReturnClick = async () => {
    setIsProcessing(true);
    const passes = await checkGatingPasses('return');
    setIsProcessing(false);
    if (!passes) return;
    resetRatingAndCheckoutId();
    setNfcActionType('return');
    nfcActionTypeRef.current = 'return';
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);
    setGeofenceFailed(false);
    setQrValidationFailed(false);
    const defaultTab = 'NDEFReader' in window && book?.ntagUid ? 'nfc' : 'barcode';
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
          modalContent.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
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
        html5QrCode.start({
          facingMode: "environment"
        }, {
          fps: 25,
          // Boosted scan rate for faster recognition
          
          qrbox: (videoWidth, videoHeight) => { const w = videoWidth || 400; const h = videoHeight || 300; return { width: Math.round(Math.min(w * 0.8, 300)), height: Math.round(Math.min(h * 0.8, 120)) }; },
          formatsToSupport: [SafeHtml5QrcodeSupportedFormats.QR_CODE, SafeHtml5QrcodeSupportedFormats.EAN_13, SafeHtml5QrcodeSupportedFormats.EAN_8, SafeHtml5QrcodeSupportedFormats.ISBN_13, SafeHtml5QrcodeSupportedFormats.UPC_A, SafeHtml5QrcodeSupportedFormats.UPC_E, SafeHtml5QrcodeSupportedFormats.CODE_128, SafeHtml5QrcodeSupportedFormats.CODE_39]
        }, decodedText => {
          console.log("Detail barcode scanned successfully:", decodedText);
          handleDetailBarcodeScanned(decodedText);
        }, errorMessage => {
          // silent scan progression
        }).then(() => {
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
                  track.applyConstraints({
                    advanced: [advancedConstraints]
                  }).then(() => console.log('[detail-barcode-reader] Track constraints applied successfully:', advancedConstraints)).catch(err => {
                    console.warn('[detail-barcode-reader] Failed to apply advanced zoom/focus constraints. Retrying with focus only.', err);
                    if (advancedConstraints.focusMode) {
                      track.applyConstraints({
                        advanced: [{
                          focusMode: 'continuous'
                        }]
                      }).then(() => console.log('[detail-barcode-reader] Continuous focus-only applied successfully')).catch(e => console.warn('[detail-barcode-reader] Focus-only failed too', e));
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
    }, 800);
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
  const extractQrPath = text => {
    if (!text) return '';
    const cleanText = text.trim();

    // Check if it's a URL query parameter like ?qr=exit-spot-alpha
    const urlMatch = cleanText.match(/[?&]qr=([^&]+)/);
    if (urlMatch) {
      return decodeURIComponent(urlMatch[1]);
    }

    // Check if it's a path pattern like /qr/exit-spot-alpha
    const pathMatch = cleanText.match(/\/qr\/([^/?#]+)/);
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }

    // Check if it's an absolute URL like http://localhost:3000/exit-spot-alpha or https://bookshelfnet.com/exit-spot-alpha
    if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
      try {
        const urlObj = new URL(cleanText);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          return decodeURIComponent(pathSegments[pathSegments.length - 1]);
        }
      } catch (e) {
        console.warn("URL parsing error in extractQrPath:", e);
      }
    }
    return cleanText;
  };
  const startDetailQrValidatorScanner = () => {
    setDetailQrScannerError('');
    setIsQrCameraActive(true);
    if (detailQrScannerTimeoutRef.current) {
      clearTimeout(detailQrScannerTimeoutRef.current);
    }
    detailQrScannerActiveRef.current = true;
    detailQrScannerTimeoutRef.current = setTimeout(() => {
      if (!detailQrScannerActiveRef.current) {
        return;
      }
      try {
        const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        let html5QrCode = new SafeHtml5Qrcode("detail-qr-validator-reader", {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: !isIOS
          }
        });
        detailQrHtml5QrCodeRef.current = html5QrCode;
        const tryStart = (constraints, fpsVal) => {
          return html5QrCode.start(constraints, {
            fps: fpsVal,
            
            formatsToSupport: [SafeHtml5QrcodeSupportedFormats.QR_CODE]
          }, decodedText => {
            console.log("Detail QR validator scanned successfully:", decodedText);
            stopDetailQrValidatorScanner();
            const pathName = extractQrPath(decodedText);
            setValidatorQrPath(pathName);
            handleValidatorQrSubmit(null, pathName);
          }, errorMessage => {
            // silent scan progression
          });
        };
        const highResConstraints = {
          facingMode: "environment",
          width: {
            min: 640,
            ideal: 1280,
            max: 1920
          },
          height: {
            min: 480,
            ideal: 720,
            max: 1080
          }
        };
        const simpleConstraints = {
          facingMode: "environment"
        };
        tryStart(highResConstraints, 30).catch(err => {
          console.warn("High-res camera constraints failed. Recreating instance with simple constraints:", err);
          // Discard scanner instance to avoid internal state machine corruption and restart cleanly
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().catch(() => {});
            }
          } catch (stopErr) {}
          html5QrCode = new SafeHtml5Qrcode("detail-qr-validator-reader", {
            verbose: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: !isIOS
            }
          });
          detailQrHtml5QrCodeRef.current = html5QrCode;
          return html5QrCode.start(simpleConstraints, {
            fps: 25,
            
            qrbox: (videoWidth, videoHeight) => { const w = videoWidth || 400; const h = videoHeight || 300; return { width: Math.round(Math.min(w * 0.8, 300)), height: Math.round(Math.min(h * 0.8, 120)) }; },
          formatsToSupport: [SafeHtml5QrcodeSupportedFormats.QR_CODE]
          }, decodedText => {
            console.log("Detail QR validator scanned successfully:", decodedText);
            stopDetailQrValidatorScanner();
            const pathName = extractQrPath(decodedText);
            setValidatorQrPath(pathName);
            handleValidatorQrSubmit(null, pathName);
          }, errorMessage => {
            // silent scan progression
          });
        }).then(() => {
          try {
            const videoElem = document.querySelector("#detail-qr-validator-reader video");
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
                  console.log('[detail-qr-validator-reader] Applied optimal iOS WebRTC zoom:', advancedConstraints.zoom);
                }
                if (Object.keys(advancedConstraints).length > 0) {
                  track.applyConstraints({
                    advanced: [advancedConstraints]
                  }).then(() => console.log('[detail-qr-validator-reader] Track constraints applied successfully:', advancedConstraints)).catch(err => {
                    console.warn('[detail-qr-validator-reader] Failed to apply advanced constraints. Retrying focus only.', err);
                    if (advancedConstraints.focusMode) {
                      track.applyConstraints({
                        advanced: [{
                          focusMode: 'continuous'
                        }]
                      }).then(() => console.log('[detail-qr-validator-reader] Focus applied successfully'));
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.warn('[detail-qr-validator-reader] Unable to configure autofocus:', e);
          }
          if (detailQrHtml5QrCodeRef.current !== html5QrCode || !detailQrScannerActiveRef.current) {
            console.log("QR Validator scanner cancelled or replaced during boot. Stopping now.");
            html5QrCode.stop().catch(err => console.warn("Failed late QR stop inside start promise", err));
          }
        }).catch(err => {
          console.error("Failed to start QR validator scanner:", err);
          if (detailQrScannerActiveRef.current) {
            setDetailQrScannerError("Camera initialization failed. Please ensure camera permissions are granted.");
          }
        });
      } catch (err) {
        console.error("QR validator scanner exception:", err);
        if (detailQrScannerActiveRef.current) {
          setDetailQrScannerError("Could not initialize QR scanner: " + err.message);
        }
      }
    }, 800);
  };
  const stopDetailQrValidatorScanner = async () => {
    detailQrScannerActiveRef.current = false;
    if (detailQrScannerTimeoutRef.current) {
      clearTimeout(detailQrScannerTimeoutRef.current);
      detailQrScannerTimeoutRef.current = null;
    }
    if (detailQrHtml5QrCodeRef.current) {
      const currentScanner = detailQrHtml5QrCodeRef.current;
      detailQrHtml5QrCodeRef.current = null;
      try {
        if (currentScanner.isScanning) {
          await currentScanner.stop();
        }
      } catch (err) {
        console.error("Failed to stop QR validator scanner:", err);
      }
    }
    try {
      const videos = document.querySelectorAll('#detail-qr-validator-reader video');
      videos.forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject;
          if (typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => {
              track.stop();
              console.log("Detail QR video track stopped manually:", track.label);
            });
          }
          video.srcObject = null;
        }
      });
    } catch (err) {
      console.warn("Failed to manually stop QR detail track fallback", err);
    }
    setIsQrCameraActive(false);
  };
  const handleDetailBarcodeScanned = async decodedText => {
    const { user: currentUser, book: latestBook } = stateRef.current;
    if (!currentUser) {
      await stopDetailBarcodeScanner();
      window.alert(t('catalog.signInToCompleteTx'));
      return;
    }
    const scannedCode = (decodedText || '').trim();
    let qrId = null;

    // Detect QR schema
    const qrMatch = scannedCode.match(/qr=(\d+)/);
    if (qrMatch) {
      qrId = parseInt(qrMatch[1], 10);
    } else if (/^\d+$/.test(scannedCode) && scannedCode.length <= 9) {
      qrId = parseInt(scannedCode, 10);
    }
    const cleanBookIsbn = (latestBook.isbn || '').trim().replace(/[-\s]/g, '');
    const cleanScannedCode = scannedCode.replace(/[-\s]/g, '');

    // Is it a match?
    let isMatch = cleanScannedCode === cleanBookIsbn;

    // Match alternative ISBNs
    if (!isMatch && Array.isArray(latestBook.alternativeIsbns)) {
      isMatch = latestBook.alternativeIsbns.some(alt => alt && alt.trim().replace(/[-\s]/g, '') === cleanScannedCode);
    }

    // Match copy-level QR IDs
    let matchedCopy = null;
    if (!isMatch && Array.isArray(latestBook.copies)) {
      matchedCopy = latestBook.copies.find(c => c.qrId === qrId || String(c.qrId) === cleanScannedCode);
      if (matchedCopy) {
        isMatch = true;
      }
    }
    if (isMatch) {
      setDetailScannerLoading(true);
      await stopDetailBarcodeScanner();
      try {
        resetRatingAndCheckoutId();
        // Use matched copy's NTAG UID if found
        const targetUid = matchedCopy && matchedCopy.ntagUid || latestBook.ntagUid || '04:A3:B2:C1:D0:E9:80';
        let txRes;
        
        let freshCheckouts = [];
        if (currentUser?.uid || currentUser?.id) {
          try {
            const { fetchCheckoutsByMember } = await import('../../services/libraryApi');
            freshCheckouts = await fetchCheckoutsByMember(currentUser.uid || currentUser.id);
          } catch (e) {}
        }
        const activeCheckout = freshCheckouts.find(c => c.bookId === latestBook.isbn && (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN'));
        const isCheckedOutByMe = activeCheckout && activeCheckout.status === 'CHECKED_OUT';
        const currentActionType = isCheckedOutByMe ? 'return' : 'checkout';

        if (currentActionType === 'checkout') {
          txRes = await verifiedCheckout({
            bookId: latestBook.isbn,
            memberId: user.uid || user.id,
            ntagUid: targetUid,
            memberName: user?.displayName,
            memberEmail: user?.email
          });
          if (txRes && (txRes.status === 'RETURNED' || txRes.data?.status === 'RETURNED')) {
            setNfcActionType('return');
            nfcActionTypeRef.current = 'return';
          }
        } else {
          const coords = await getCoordinates();
          txRes = await verifiedReturn({
            bookId: latestBook.isbn,
            memberId: user.uid || user.id,
            ntagUid: targetUid,
            memberName: user?.displayName,
            memberEmail: user?.email,
            returnLatitude: coords.latitude,
            returnLongitude: coords.longitude,
            nfcOrBarcode: matchedCopy ? 'QR' : 'BARCODE'
          });
        }
        if (txRes && txRes.id) {
          setCreatedCheckoutId(txRes.id);
        } else if (txRes && txRes.data && txRes.data.id) {
          setCreatedCheckoutId(txRes.data.id);
        }
        setDetailScannerLoading(false);
        handleCloseNfcModal();
        setInstantActionType(currentActionType);
        setInstantSuccess(true);
        setInstantConfirmOpen(true);
        await refreshState();
      } catch (txError) {
        setDetailScannerLoading(false);
        console.error('Verified barcode database error:', txError);
        const errMsg = txError.response?.data?.message || txError.message || '';
        const isLocationError = /geofence|location|coordinate|outside/i.test(errMsg);
        if (isLocationError && currentActionType === 'return') {
          setActiveTab('validator_qr');
          setGeofenceFailed(true);
          setNfcError("Geofence location check failed. We have automatically switched to the Validator QR tab for your convenience.");
          await stopDetailBarcodeScanner();
          startDetailQrValidatorScanner();
        } else {
          setDetailScannerLoading(false);
          setInstantSuccess(false);
          setInstantError(translateCheckoutError(errMsg));
          setInstantConfirmOpen(true);
          handleCloseNfcModal();
        }
      }
    } else {
      setDetailScannerLoading(false);
      setInstantSuccess(false);
      setInstantError(translateCheckoutError(`Security Mismatch: Scanned code (${decodedText}) does not match this book.`));
      setInstantConfirmOpen(true);
      handleCloseNfcModal();
    }
  };
  const handleTabChange = async tabName => {
    setActiveTab(tabName);
    if (tabName !== 'barcode') {
      await stopDetailBarcodeScanner();
    }
    if (tabName !== 'validator_qr') {
      await stopDetailQrValidatorScanner();
    }
    if (tabName === 'nfc') {
      startNfcAction(nfcActionType);
    } else if (tabName === 'barcode') {
      startDetailBarcodeScanner();
    } else if (tabName === 'validator_qr') {
      startDetailQrValidatorScanner();
    }
  };
  const handleCloseNfcModal = () => {
    setDetailScannerLoading(false);
    stopDetailBarcodeScanner();
    stopDetailQrValidatorScanner();
    if (detailNfcAbortControllerRef.current) detailNfcAbortControllerRef.current.abort();
    setNfcModalOpen(false);
    setGeofenceFailed(false);
    setQrValidationFailed(false);
  };
    const startNfcAction = async actionType => {
    if (detailNfcAbortControllerRef.current) detailNfcAbortControllerRef.current.abort();
    detailNfcAbortControllerRef.current = new AbortController();
    setDetailScannerLoading(false);
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
      await ndef.scan({ signal: detailNfcAbortControllerRef.current.signal });
      ndef.addEventListener("readingerror", () => {
        setNfcError(t('catalog.nfcReadingError'));
      });
      ndef.addEventListener("reading", async ({
        serialNumber
      }) => {
        if (processingNfcRef.current) return;
        processingNfcRef.current = true;
        try {
          console.log(`NFC tag scanned: ${serialNumber}`);
        const cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
        if (isNfcTagMatched(book, cleanScanned)) {
          setDetailScannerLoading(true);
          let freshCheckouts = memberCheckouts;
          const memberId = user?.uid || user?.id;
          if (memberId) {
            try {
              const fetchCheckoutsByMember = (await import('../../services/libraryApi')).fetchCheckoutsByMember;
              freshCheckouts = await fetchCheckoutsByMember(memberId);
              setMemberCheckouts(freshCheckouts || []);
            } catch (e) {}
          }
          const activeCheckout = freshCheckouts.find(c => c.bookId === book.isbn && (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN'));
          const isCheckedOutByMe = activeCheckout && activeCheckout.status === 'CHECKED_OUT';
          const dynamicActionType = isCheckedOutByMe ? 'return' : 'checkout';
          
          let matchedCopy = null;
          if (Array.isArray(book.copies)) {
             matchedCopy = book.copies.find(c => c.ntagUid === cleanScanned);
          }
          if (dynamicActionType === 'checkout' && matchedCopy && matchedCopy.status === 'CHECKED_OUT') {
              handleCloseNfcModal();
              setInstantSuccess(false);
              setInstantError("This copy is currently checked out by another patron.");
              setInstantConfirmOpen(true);
              return;
          }

          try {
            resetRatingAndCheckoutId();
            let txRes;
            if (dynamicActionType === 'checkout') {
              txRes = await verifiedCheckout({
                bookId: book.isbn,
                memberId: user.uid || user.id,
                ntagUid: cleanScanned
              });
              if (txRes && (txRes.status === 'RETURNED' || txRes.data?.status === 'RETURNED')) {
                setNfcActionType('return');
                nfcActionTypeRef.current = 'return';
              }
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
              if (detailNfcAbortControllerRef.current) detailNfcAbortControllerRef.current.abort();
              setCreatedCheckoutId(txRes.id);
            } else if (txRes && txRes.data && txRes.data.id) {
              if (detailNfcAbortControllerRef.current) detailNfcAbortControllerRef.current.abort();
              setCreatedCheckoutId(txRes.data.id);
            }
            handleCloseNfcModal();
            setInstantActionType(dynamicActionType);
            setNfcActionType(dynamicActionType);
            nfcActionTypeRef.current = dynamicActionType;
            setInstantSuccess(true);
            setInstantConfirmOpen(true);
            await refreshState();
          } catch (txError) {
            console.error('NFC verified transaction database error:', txError);
            const errMsg = txError.response?.data?.message || txError.message || '';
            const isLocationError = /geofence|location|coordinate|outside/i.test(errMsg);
            if (isLocationError && dynamicActionType === 'return') {
              setActiveTab('validator_qr');
              setGeofenceFailed(true);
              setNfcError("Geofence location check failed. We have automatically switched to the Validator QR tab for your convenience.");
              startDetailQrValidatorScanner();
            } else {
              setDetailScannerLoading(false);
              setInstantSuccess(false);
              setInstantError(translateCheckoutError(errMsg));
              setInstantConfirmOpen(true);
              handleCloseNfcModal();
            }
          }
        } else {
          setDetailScannerLoading(false);
          setInstantSuccess(false);
          setInstantError(translateCheckoutError(`Security Mismatch: NFC tag ${serialNumber} does not match.`));
          setInstantConfirmOpen(true);
          handleCloseNfcModal();
        }
        } finally {
          processingNfcRef.current = false;
        }
      });
    } catch (err) {
      console.error('NFC scanning error:', err);
      setNfcError(t('catalog.nfcScanFailed') + (err.message || err));
      setNfcReading(false);
    }
  };
  const isBookIdentifier = code => {
    const cleanCode = (code || '').trim().replace(/[-\s]/g, '');
    if (!cleanCode) return false;

    // Check ISBN
    if (book?.isbn && cleanCode === book.isbn.trim().replace(/[-\s]/g, '')) {
      return true;
    }

    // Check alternative ISBNs
    if (Array.isArray(book?.alternativeIsbns)) {
      const isAltMatch = book.alternativeIsbns.some(alt => alt && alt.trim().replace(/[-\s]/g, '') === cleanCode);
      if (isAltMatch) return true;
    }

    // Check copy QR IDs or copy numeric IDs
    let qrId = null;
    const qrMatch = cleanCode.match(/qr=(\d+)/);
    if (qrMatch) {
      qrId = parseInt(qrMatch[1], 10);
    } else if (/^\d+$/.test(cleanCode)) {
      qrId = parseInt(cleanCode, 10);
    }
    if (Array.isArray(book?.copies)) {
      const isCopyMatch = book.copies.some(c => {
        const copyQrClean = String(c.qrId || '').trim();
        return c.qrId === qrId || copyQrClean === cleanCode || qrId && String(c.qrId) === String(qrId);
      });
      if (isCopyMatch) return true;
    }

    // If it looks like a standard ISBN or copy QR (all digits, or qr=digits)
    if (/^\d{10,13}$/.test(cleanCode) || /^\d+$/.test(cleanCode)) {
      return true;
    }
    return false;
  };
  const handleValidatorQrSubmit = async (e, pathOverride) => {
    if (e) e.preventDefault();
    const finalPath = pathOverride || validatorQrPath;
    const cleanPath = (finalPath || '').trim();
    if (!cleanPath) {
      setValidatorError(t('catalog.pleaseScanOrEnterPath', 'Please scan or enter the validator path.'));
      return;
    }
    if (isBookIdentifier(cleanPath)) {
      const errMsg = t('catalog.scannedBookInsteadOfReturn', "This is an individual book QR/barcode, which does not match the library's active Return Validator QR code. Please check and scan the correct physical Return Validator QR placard.");
      setValidatorError(errMsg);
      setQrValidationFailed(true);
      setActiveTab('manual');
      stopDetailQrValidatorScanner();
      setNfcError(errMsg + " We have automatically transitioned you to manual request submission.");
      return;
    }

    // Check for bad scan / partial read (contains space or too short)
    if (cleanPath.length < 3 || /\s/.test(cleanPath)) {
      const errMsg = t('catalog.qrNotScannedProperly', "The QR code was not scanned properly or contains invalid characters. Please ensure the QR code is clear, well-lit, fully aligned within the square target box, and scan again.");
      setValidatorError(errMsg);
      setQrValidationFailed(true);
      setActiveTab('manual');
      stopDetailQrValidatorScanner();
      setNfcError(errMsg + " We have automatically transitioned you to manual request submission.");
      return;
    }
    const checkoutInst = getActiveCheckoutInstance();
    const checkoutId = checkoutInst?.id;
    if (!checkoutId) {
      setValidatorError(t('catalog.noActiveCheckoutToReturn', 'No active checkout instance found for this book to return.'));
      return;
    }
    setValidatorLoading(true);
    setValidatorError('');
    try {
      resetRatingAndCheckoutId();
      const txRes = await validateQrReturn({
        checkoutId: checkoutId,
        qrPathName: cleanPath,
        memberId: user.uid || user.id
      });
      if (txRes && txRes.id) {
        setCreatedCheckoutId(txRes.id);
      } else if (txRes && txRes.data && txRes.data.id) {
        setCreatedCheckoutId(txRes.data.id);
      } else {
        setCreatedCheckoutId(checkoutId);
      }
      setValidatorQrPath('');
      handleCloseNfcModal();
      setInstantActionType('return');
      setInstantSuccess(true);
      setInstantConfirmOpen(true);
      await refreshState();
    } catch (err) {
      console.error('Validator QR return failed:', err);
      const serverMsg = err.response?.data?.message || err.message || '';
      let friendlyError = '';
      if (/Invalid or inactive Return Validator|mismatch|does not match|400/i.test(serverMsg)) {
        friendlyError = t('catalog.qrMismatchError', "The scanned QR code does not match the library's active Return Validator QR. Please check and scan the correct physical Return Validator QR placard.");
      } else {
        friendlyError = t('catalog.qrScanSystemError', "QR validation failed due to an unexpected system or network error. Please try scanning again, or proceed with manual request submission.");
      }
      setValidatorError(friendlyError);
      setQrValidationFailed(true);
      setActiveTab('manual');
      stopDetailQrValidatorScanner();
      setNfcError(friendlyError + " We have automatically transitioned you to manual request submission.");
    } finally {
      setValidatorLoading(false);
    }
  };
  const handleSubmitFallbackRequest = async () => {
    setFallbackLoading(true);
    try {
      if (nfcActionType === 'checkout') {
        const res = await requestCheckout({
          bookId: book.isbn,
          memberId: user.uid || user.id,
          memberName: user?.displayName,
          memberEmail: user?.email
        });
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
  const handleSubmitReview = async e => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    try {
      const res = await submitBookReview(id, {
        rating: userRating,
        content: reviewText
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
  const handleUpdateReviewSubmit = async reviewId => {
    if (!editingReviewText.trim()) return;
    try {
      const res = await updateBookReview(id, reviewId, {
        rating: editingReviewRating,
        content: editingReviewText.trim()
      });
      if (res && res.success) {
        setReviews(prev => prev.map(r => r.id === reviewId ? {
          ...r,
          content: res.data.content,
          rating: res.data.rating
        } : r));
        handleCancelEditReview();
      }
    } catch (err) {
      console.error('Failed to update book review:', err);
    }
  };
  const handleDeleteReviewClick = async reviewId => {
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
  // Lock body scroll when any modal is open
  useEffect(() => {
    if (nfcModalOpen || fallbackModalOpen || instantConfirmOpen || shareModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [nfcModalOpen, fallbackModalOpen, instantConfirmOpen, shareModalOpen]);

  if (loading) {
    return <div className="book-detail-container animate-fade-in">
        <div className="royal-card no-results-card">
          <p>{t('common.loading')}</p>
        </div>
      </div>;
  }
  if (error || !book) {
    return <div className="book-detail-container animate-fade-in">
        <div className="royal-card no-results-card">
          <p>{error || t('catalog.bookNotFound')}</p>
          <Link to="/catalog" className="royal-btn">
            {t('catalog.returnArchives')}
          </Link>
        </div>
      </div>;
  }
  const authors = Array.isArray(book.authors) ? book.authors.join(', ') : book.author || 'Unknown Author';
  const coverUrl = book.coverUrl || book.thumbnail || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80';
  return <>
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
          {book.subtitle && <blockquote className="detail-citation-blockquote">
              {book.subtitle}
            </blockquote>}
        </div>

        <div className="book-info-panel royal-card">
          <div className="detail-checkout-action-box" id="detail-checkout-action-card" style={{
            marginBottom: '24px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
            paddingBottom: '20px'
          }}>
            {nfcSession && (nfcSession.verificationStatus === 'VALID' ? <div className="nfc-instant-checkout-container" style={{
              margin: '0 0 16px 0',
              padding: '16px',
              border: '1px dashed var(--accent)',
              borderRadius: '8px',

              background: 'rgba(141, 18, 34, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
                  <div style={{
                display: 'flex',
                alignItems: 'flex-start',

                gap: '8px'
              }}>
                    <Sparkles size={16} className="gold-glow" style={{
                  color: 'var(--accent)'
                }} />
                    <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)'
                }}>{t('auto_3468', 'NFC Physical Sync Active')}</span>
                    <div className="nfc-countdown-clock" style={{
                  marginLeft: 'auto',
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'flex-start',

                  gap: '4px'
                }}>
                      <Clock size={12} className="animate-pulse" />
                      <span>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                  <p style={{
                fontSize: '0.8rem',
                margin: 0,
                color: 'var(--text-secondary)'
              }}>{t('auto_3469', 'You are holding the physical volume. Bypassing standard scans.')}</p>
                  {checkoutStatus === 'available' ? <button onClick={() => handleInstantNfcAction('checkout')} className="royal-btn checkout-cta-btn pulse-button" style={{
                background: 'var(--accent)', color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',

                justifyContent: 'center',
                gap: '8px',
                fontWeight: 'bold'
              }}>
                      <Smartphone size={16} /> {t('auto_3470', 'Instant NFC Checkout')}
                    </button> : checkoutStatus === 'checked-out' ? <button onClick={() => handleInstantNfcAction('return')} className="royal-btn checkout-cta-btn pulse-button" style={{
                background: 'var(--accent)', color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',

                justifyContent: 'center',
                gap: '8px',
                fontWeight: 'bold'
              }}>
                      <Smartphone size={16} /> {t('auto_3471', 'Instant NFC Return')}
                    </button> : null}
                </div> : <div className="nfc-instant-checkout-container" style={{
              margin: '0 0 16px 0',
              padding: '16px',
              border: '1px dashed #d97706',
              borderRadius: '8px',

              background: 'rgba(217, 119, 6, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
                  <div style={{
                display: 'flex',
                alignItems: 'flex-start',

                gap: '8px'
              }}>
                    <AlertTriangle size={16} style={{
                  color: '#d97706'
                }} />
                    <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: '#d97706'
                }}>{t('auto_3472', 'NFC Verification Warning')}</span>
                  </div>
                  <p style={{
                fontSize: '0.82rem',
                margin: 0,
                color: 'var(--text-primary)',
                lineHeight: '1.4'
              }}>
                    {nfcSession.verificationStatus === 'REUSED' ? "This physical NFC sequence has been used previously. Instant checkout is disabled to prevent reuse." : "The security token for this physical tap has expired. Instant checkout is disabled."}
                  </p>
                  <p style={{
                fontSize: '0.78rem',
                margin: 0,
                color: 'var(--text-secondary)'
              }}>
                    {t('auto_3473', 'Please proceed with')} <strong>{t('auto_3474', 'Regular Manual Checkout')}</strong> {t('auto_3475', 'below.')}
                  </p>
                </div>)}
            {(!nfcSession || nfcSession.verificationStatus !== 'VALID') && (checkoutStatus === 'available' ? <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
                  <button onClick={handleCheckoutClick} className="royal-btn checkout-cta-btn" id="book-detail-checkout-btn" disabled={isProcessing}>
                    {isProcessing ? <RefreshCw className="spin-icon" size={16} /> : <ShoppingBag size={16} />}
                    {isProcessing ? t('catalog.verifyingProgress', 'Verification in Progress...') : t('catalog.secureRoyalCheckout')}
                  </button>
                </div> : checkoutStatus === 'checked-out' ? <div className="success-checkout-badge-row" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
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
                </div> : checkoutStatus === 'requested-checkout' ? <div className="pending-checkout-badge royal-card" style={{
              display: 'flex',
              alignItems: 'flex-start',

              gap: '12px',
              padding: '16px',
              border: '1px solid rgba(212, 165, 116, 0.3)',
              background: 'rgba(212, 165, 116, 0.05)'
            }}>
                  <Clock size={20} style={{
                color: 'var(--accent)'
              }} className="spin-icon" />
                  <div>
                    <h4 style={{
                  color: 'var(--accent)',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}>{t('catalog.checkoutRequestPending')}</h4>
                    <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: '2px'
                }}>{t('catalog.awaitingCuratorApproval')}</p>
                  </div>
                </div> : checkoutStatus === 'requested-return' ? <div className="pending-checkout-badge royal-card" style={{
              display: 'flex',
              alignItems: 'flex-start',

              gap: '12px',
              padding: '16px',
              border: '1px solid rgba(212, 165, 116, 0.3)',
              background: 'rgba(212, 165, 116, 0.05)'
            }}>
                  <Clock size={20} style={{
                color: 'var(--accent)'
              }} className="spin-icon" />
                  <div>
                    <h4 style={{
                  color: 'var(--accent)',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}>{t('catalog.returnRequestPending')}</h4>
                    <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: '2px'
                }}>{t('catalog.awaitingReturnReview')}</p>
                  </div>
                </div> : <div className="in-circulation-badge royal-card" style={{
              display: 'flex',
              alignItems: 'flex-start',

              gap: '12px',
              padding: '16px',
              border: '1px solid #ff7b72',
              background: 'rgba(255, 123, 114, 0.05)'
            }}>
                  <Clock size={20} style={{
                color: '#ff7b72'
              }} />
                  <div>
                    <h4 style={{
                  color: '#ff7b72',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}>{t('catalog.inCirculation')}</h4>
                    <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: '2px'
                }}>{t('catalog.checkedOutByOtherScholar')}</p>
                  </div>
                </div>)}

            {getActiveCheckoutInstance() && <Link to={`/gatepass/${getActiveCheckoutInstance().id}`} className="royal-btn-secondary view-gatepass-btn" style={{
              marginTop: '15px',
              display: 'flex',
              alignItems: 'flex-start',

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
            }}>
                <Shield size={14} /> {t('auto_3476', 'View Security Gatepass')}
              </Link>}
          </div>

          <div className="genre-rating-row" style={{
            display: 'flex',
            alignItems: 'flex-start',

            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',

              gap: '10px'
            }}>
              <span className="detail-genre-tag">{book.genre || book.publishDate || 'Library Edition'}</span>
              <div className="detail-stars">
                <Star size={16} fill="var(--accent)" stroke="var(--accent)" />
                <span className="rating-num">{book.rating || '—'} / 5.0</span>
              </div>
            </div>
            <button onClick={() => setShareModalOpen(true)} className="share-trigger-badge-btn" title={t('share.shareTitle', 'Share Book')} style={{
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid var(--glass-border)',
              color: 'var(--accent)',
              borderRadius: '50px',
              padding: '4px 14px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'flex-start',

              gap: '5px',
              transition: 'var(--transition-smooth)'
            }}>
              <Share2 size={13} />
              <span>{t('share.shareBtn', 'Share')}</span>
            </button>
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
                {checkoutStatus === 'available' ? <span className="text-success"><BadgeCheck size={14} className="inline-icon" /> {t('catalog.inLibrary')}</span> : <span className="text-warning"><Clock size={14} className="inline-icon" /> {t('catalog.inCirculation')}</span>}
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

          {book.tags && Array.isArray(book.tags) && book.tags.length > 0 && <div style={{
            marginTop: '1.5rem'
          }}>
              <h4 style={{
              fontSize: '0.9rem',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.5rem'
            }}>{t('catalog.acquisitionLabels')}</h4>
              <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center'
            }}>
                {(showAllTags ? book.tags : book.tags.slice(0, 10)).map((tag, idx) => <span key={idx} style={{
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                color: 'var(--accent)',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}>
                    #{tag}
                  </span>)}
                {book.tags.length > 10 && <button type="button" onClick={() => setShowAllTags(!showAllTags)} style={{
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                borderRadius: '4px',
                padding: '3px 10px',
                fontSize: '0.7rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }} onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.25)';
              }} onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
              }}>
                    {showAllTags ? t('common.showLess', 'Show Less') : `+ ${book.tags.length - 10} More`}
                  </button>}
              </div>
            </div>}
        </div>
      </div>

      {/* 🛡️ Luxury Physical Copies Inventory Tracker Grid */}
      <div className="physical-copies-tracker-section royal-card animate-fade-in" style={{
        marginTop: '30px',
        padding: '30px',
        border: '1px solid rgba(212, 175, 55, 0.15)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        boxShadow: 'var(--glow-shadow)'
      }}>
        <h3 className="gold-gradient-text" style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: '1.4rem',
          fontWeight: '700',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'flex-start',

          gap: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: 0
        }}>
          <BookOpen size={22} style={{
            filter: 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.5))'
          }} />
          <span>{t('catalog.physicalInventoryTracker', 'Physical Inventory & Copy Tracker')}</span>
        </h3>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-primary)',
          marginBottom: '24px',
          marginTop: '4px',
          lineHeight: '1.5'
        }}>
          {t('catalog.physicalInventoryDesc', 'Each physical volume of this title is separately indexed and trackable inside the Royal Book Club catalog ledger.')}
        </p>

        {user && user.role === 'ADMIN' ? (/* Detailed tracking console for Admins/Curators */
        <div className="admin-copy-grid-wrapper" style={{
          overflowX: 'auto'
        }}>
            <table className="royal-admin-table" style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            minWidth: '600px'
          }}>
              <thead>
                <tr style={{
                borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
              }}>
                  <th style={{
                  padding: '12px 16px',
                  color: 'var(--accent)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '700'
                }}>{t('admin.copyNumber', 'Copy Number')}</th>
                  <th style={{
                  padding: '12px 16px',
                  color: 'var(--accent)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '700'
                }}>{t('admin.nfcTagUid', 'NFC Tag UID')}</th>
                  <th style={{
                  padding: '12px 16px',
                  color: 'var(--accent)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '700'
                }}>{t('admin.status', 'Status')}</th>
                  <th style={{
                  padding: '12px 16px',
                  color: 'var(--accent)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '700'
                }}>{t('admin.currentHolder', 'Current Holder / Member ID')}</th>
                </tr>
              </thead>
              <tbody>
                {(book.copies || Array.from({
                length: book.totalCopies || 1
              }).map((_, idx) => {
                const tag = book.ntagUids && book.ntagUids[idx] ? book.ntagUids[idx] : idx === 0 ? book.ntagUid : null;
                return {
                  copyNo: idx + 1,
                  ntagUid: tag,
                  status: idx < book.totalCopies - book.availableCopies ? 'CHECKED_OUT' : 'AVAILABLE'
                };
              })).map(copy => {
                const matchedCheckout = allCheckouts.find(c => c.copyNo === copy.copyNo) || (copy.ntagUid ? allCheckouts.find(c => c.ntagUid?.toLowerCase().replace(/:/g, '') === copy.ntagUid?.toLowerCase().replace(/:/g, '')) : null);
                const statusColors = {
                  'AVAILABLE': {
                    text: '#4eca5c',
                    bg: 'rgba(78, 202, 92, 0.1)',
                    border: 'rgba(78, 202, 92, 0.2)'
                  },
                  'REQUESTED_CHECKOUT': {
                    text: '#ffb703',
                    bg: 'rgba(255, 183, 3, 0.1)',
                    border: 'rgba(255, 183, 3, 0.2)'
                  },
                  'CHECKED_OUT': {
                    text: '#ff5c5c',
                    bg: 'rgba(255, 92, 92, 0.1)',
                    border: 'rgba(255, 92, 92, 0.2)'
                  },
                  'REQUESTED_RETURN': {
                    text: '#a855f7',
                    bg: 'rgba(168, 85, 247, 0.1)',
                    border: 'rgba(168, 85, 247, 0.2)'
                  }
                };
                const currentStatus = matchedCheckout?.status || copy.status || 'AVAILABLE';
                const badge = statusColors[currentStatus] || statusColors['AVAILABLE'];
                return <tr key={copy.copyNo} style={{
                  borderBottom: '1px solid var(--glass-border)',
                  transition: 'background 0.2s'
                }} onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--glass-bg)';
                }} onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}>
                      <td style={{
                    padding: '16px',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}> {t("str_5382", "Copy #")}{copy.copyNo}
                      </td>
                      <td style={{
                    padding: '16px',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    color: copy.ntagUid ? 'var(--accent)' : 'var(--text-muted)'
                  }}>
                        {copy.ntagUid ? copy.ntagUid.toUpperCase() : 'Sequential Tracking (No Tag)'}
                      </td>
                      <td style={{
                    padding: '16px'
                  }}>
                        <span style={{
                      display: 'inline-flex',
                      alignItems: 'flex-start',

                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: badge.text,
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}>
                          <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: badge.text,
                        display: 'inline-block'
                      }}></span>
                          {currentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{
                    padding: '16px',
                    fontSize: '0.85rem'
                  }}>
                        {matchedCheckout ? <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                            <span style={{
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>{matchedCheckout.memberName || 'NFC Verified Patron'}</span>
                            <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)'
                      }}>{matchedCheckout.memberEmail || `ID: ${matchedCheckout.memberId}`}</span>
                          </div> : copy.status === 'CHECKED_OUT' ? <span style={{
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic'
                    }}>{t("str_5383", "In Circulation (Active record loading...)")}</span> : <span style={{
                      color: 'var(--glass-border-hover)'
                    }}>—</span>}
                      </td>
                    </tr>;
              })}
              </tbody>
            </table>
          </div>) : (/* Premium High-level summary for Patrons/Members */
        <div className="patron-copy-summary-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px'
        }}>
            {(book.copies || Array.from({
            length: book.totalCopies || 1
          }).map((_, idx) => {
            const tag = book.ntagUids && book.ntagUids[idx] ? book.ntagUids[idx] : idx === 0 ? book.ntagUid : null;
            return {
              copyNo: idx + 1,
              ntagUid: tag,
              status: idx < book.totalCopies - book.availableCopies ? 'CHECKED_OUT' : 'AVAILABLE'
            };
          })).map(copy => {
            const userCheckout = memberCheckouts.find(c => c.copyNo === copy.copyNo && (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN'));
            const isCheckedOutByMe = !!userCheckout;
            const isAvailable = copy.status === 'AVAILABLE' && !isCheckedOutByMe;
            return <div key={copy.copyNo} style={{
              padding: '16px',
              background: isAvailable ? 'rgba(78, 202, 92, 0.03)' : isCheckedOutByMe ? 'rgba(212, 175, 55, 0.05)' : 'var(--glass-bg)',
              border: isAvailable ? '1px solid rgba(78, 202, 92, 0.15)' : isCheckedOutByMe ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid var(--glass-border)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'transform 0.2s'
            }} onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }} onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
            }}>
                  <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                    <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '700'
                }}>{t("str_5384", "Copy #")}{copy.copyNo}</span>
                    {isAvailable ? <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: '#4eca5c',
                  background: 'rgba(78, 202, 92, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase'
                }}>{t('auto_3477', 'Available')}</span> : isCheckedOutByMe ? <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: '#d4af37',
                  background: 'rgba(212, 175, 55, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase'
                }}>{t('auto_3478', 'Held By You')}</span> : <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: 'var(--text-muted)',
                  background: 'var(--glass-bg)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase'
                }}>{t('auto_3479', 'In Circulation')}</span>}
                  </div>
                  <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: '1.4'
              }}>
                    {isAvailable ? 'Ready for secure checkout inside the physical library.' : isCheckedOutByMe ? `Request pending or active return via secure NFC.` : 'Currently checked out by another distinguished member.'}
                  </p>
                </div>;
          })}
          </div>)}
      </div>

      <section id="reviews-section" className="detail-reviews-section royal-card">
        <h3 className="section-title">{t('catalog.reviewsTitle')}</h3>
        {user ? <form onSubmit={handleSubmitReview} className="write-review-form">
            <div className="review-rating-select">
              <span>{t('catalog.ratingLabel')}</span>
              <div className="star-rating-inputs">
                {[1, 2, 3, 4, 5].map(star => <button type="button" key={star} onClick={() => setUserRating(star)} className="star-input-btn">
                    <Star size={20} fill={star <= userRating ? 'var(--accent)' : 'none'} stroke="var(--accent)" />
                  </button>)}
              </div>
            </div>
            <textarea className="royal-textarea review-textarea" placeholder={t('catalog.critiquePlaceholder')} value={reviewText} onChange={e => setReviewText(e.target.value)} rows={4} required />
            <button type="submit" className="royal-btn submit-review-btn">
              {t('catalog.publishDissertation')}
            </button>
          </form> : <div className="review-prompt-card">
            <p>{t('catalog.loginToReview')}</p>
          </div>}

        <div className="reviews-feed">
          {reviews.length > 0 ? reviews.map(rev => {
            const isAuthor = user && (user.uid === rev.userId || user.id === rev.userId);
            const isAdmin = user && user.role === 'ADMIN';
            const isEditing = editingReviewId === rev.id;
            return <div key={rev.id} className="review-item">
                  <div className="review-item-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                    <div style={{
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                      <span className="review-author">{rev.author}</span>
                      <span className="review-date">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Recently'}
                      </span>
                    </div>
                    {!isEditing && (isAuthor || isAdmin) && <div className="review-actions" style={{
                  display: 'flex',
                  alignItems: 'flex-start',

                  gap: '0.5rem'
                }}>
                        {isAuthor && <button onClick={() => handleStartEditReview(rev.id, rev.content, rev.rating)} className="review-action-btn edit-btn" title={t("str_5385", "Edit Dissertation")} style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                            <Pencil size={14} />
                          </button>}
                        <button onClick={() => handleDeleteReviewClick(rev.id)} className="review-action-btn delete-btn" title={t("str_5386", "Purge Dissertation")} style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff4d4d',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                          <Trash2 size={14} />
                        </button>
                      </div>}
                  </div>
                  {isEditing ? <div className="review-edit-form" style={{
                marginTop: '0.5rem'
              }}>
                      <div className="review-rating-select" style={{
                  display: 'flex',
                  alignItems: 'flex-start',

                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                        <span style={{
                    fontSize: '0.85rem'
                  }}>{t("str_5387", "Rating:")}</span>
                        <div className="star-rating-inputs" style={{
                    display: 'flex',
                    gap: '2px'
                  }}>
                          {[1, 2, 3, 4, 5].map(star => <button type="button" key={star} onClick={() => setEditingReviewRating(star)} className="star-input-btn" style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}>
                              <Star size={16} fill={star <= editingReviewRating ? 'var(--accent)' : 'none'} stroke="var(--accent)" />
                            </button>)}
                        </div>
                      </div>
                      <textarea className="royal-textarea review-textarea edit-mode" value={editingReviewText} onChange={e => setEditingReviewText(e.target.value)} rows={3} style={{
                  width: '100%',
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)'
                }} />
                      <div className="review-edit-actions" style={{
                  display: 'flex',
                  gap: '0.5rem'
                }}>
                        <button onClick={() => handleUpdateReviewSubmit(rev.id)} className="royal-btn small-btn save-btn" style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.8rem'
                  }}>
                          {t('common.update')}
                        </button>
                        <button onClick={handleCancelEditReview} className="royal-btn small-btn cancel-btn" style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.8rem',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-secondary)'
                  }}>
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div> : <>
                      <div className="review-stars-row">
                        {Array.from({
                    length: rev.rating || 5
                  }).map((_, i) => <Star key={i} size={14} fill="var(--accent)" stroke="var(--accent)" />)}
                      </div>
                      <p className="review-content">"{rev.content}"</p>
                    </>}
                </div>;
          }) : <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }}>
              {t('catalog.noReviewsDetail')}
            </div>}
        </div>
      </section>
    </div>

    {/* Royal Checkout/Return Verification Modal Overlay (rendered at root level to guarantee absolute viewport centering) */}
    
      <ScannerModal 
        key={'detail-scanner-' + (nfcModalOpen ? 'open' : 'closed')}
        isOpen={nfcModalOpen}
        loading={detailScannerLoading}
        onClose={handleCloseNfcModal} 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          if (tab === 'manual') {
            // Close scanner modal, open the manual/fallback submission form
            handleCloseNfcModal();
            setFallbackModalOpen(true);
            return;
          }
          setActiveTab(tab);
          if (tab === 'barcode' || tab === 'validator_qr') {
            startDetailBarcodeScanner();
          } else {
            stopDetailBarcodeScanner();
          }
        }} 
        book={book} 
        actionType={nfcActionType} 
        onActionChange={(type) => setNfcActionType(type)}
        isConfirmation={false}
        error={nfcError || detailScannerError}
        scannerId="detail-barcode-reader"
        onScannerClick={null}
        html5QrCodeRef={detailHtml5QrCodeRef}
        showManualTab={true}
      />

      {/* Fallback Request Ledger Submission Modal Overlay */}
      {fallbackModalOpen && book && <div className="nfc-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "var(--glass-bg)",
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'flex-start',

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

          textAlign: 'center'
        }}>
              {fallbackSuccess ? <div className="nfc-success-animation animate-fade-in">
                  <CheckCircle size={56} className="gold-glow-icon" style={{
              color: "var(--accent)",
              marginBottom: "16px"
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
              }}>{book.title}</p>
                    <p style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0'
              }}>{t('catalog.isbn')}: {book.isbn}</p>
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


    {instantConfirmOpen && <div className="nfc-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "var(--glass-bg)",
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'flex-start',

      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
        <div className="inline-action-panel royal-card border-gold animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '24px',
        background: 'var(--surface)',
        border: '1px solid var(--accent)',
        boxShadow: "0 10px 40px var(--card-shadow)",
        borderRadius: '8px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
          <div className="panel-header-row" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',

          marginBottom: '16px',
          borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
          paddingBottom: '10px'
        }}>
            <h4 style={{
            color: 'var(--accent)',
            fontSize: '1rem',
            fontWeight: '600',
            margin: 0,
            letterSpacing: '0.05em'
          }}>
              {instantActionType === 'checkout' ? t('catalog.royalCheckoutVerif') : t('catalog.royalReturnVerif')}
            </h4>
            <button onClick={() => setInstantConfirmOpen(false)} className="close-nfc-btn" style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px'
          }}>
              <X size={16} />
            </button>
          </div>

          <div className="panel-body" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',

          textAlign: 'center',
          marginTop: '16px'
        }}>
            {instantSuccess ? <div className="nfc-success-animation animate-fade-in" style={{
            padding: '10px 0',
            width: '100%'
          }}>
                <CheckCircle size={48} className="text-success gold-glow-icon" style={{
              marginBottom: '12px'
            }} />
                <h4 style={{
              color: 'var(--text-primary)',
              margin: '0 0 4px 0',
              fontSize: '1rem'
            }}>{instantActionType === 'checkout' ? 'Royal Checkout Confirmed' : 'Royal Return Confirmed'}</h4>
                <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              margin: 0
            }}>{t('auto_3484', 'The digital transaction ledger has been updated successfully.')}</p>

                {/* Interactive Rating Control */}
                <div style={{
              marginTop: '20px',
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
                </div>

                {/* Actions */}
                <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              justifyContent: 'center',
              marginTop: '20px'
            }}>
                  {createdCheckoutId && instantActionType !== 'return' && <Link to={`/gatepass/${createdCheckoutId}`} className="royal-btn" style={{
                display: 'flex',
                alignItems: 'flex-start',

                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                textDecoration: 'none',
                background: 'var(--accent)', color: '#ffffff',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                      <Shield size={14} /> {t('auto_3485', 'View Gatepass')}
                    </Link>}
                  {instantActionType === 'return' && <button onClick={() => {
                setInstantConfirmOpen(false);
                const element = document.getElementById('reviews-section');
                if (element) {
                  element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });
                }
              }} className="royal-btn" style={{
                display: 'flex',
                alignItems: 'flex-start',

                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                background: 'var(--accent)', color: '#ffffff',
                borderRadius: '4px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer'
              }}>
                      <Sparkles size={14} /> {t('auto_3486', 'Write a Book Review')}
                    </button>}

                  {/* Cancel / Undo Button */}
                  {createdCheckoutId && <button onClick={handleCancelInstantAction} disabled={cancellingInstant} className="royal-btn-secondary" style={{
                display: 'inline-flex',
                alignItems: 'flex-start',

                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: '4px',
                borderColor: 'rgba(255, 123, 114, 0.4)',
                color: '#ff7b72'
              }} title={t("str_5391", "Cancel this transaction if executed by mistake")}>
                      {cancellingInstant ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      {instantActionType === 'checkout' ? 'Cancel Checkout' : 'Cancel Return'}
                    </button>}

                  <button onClick={() => setInstantConfirmOpen(false)} className="royal-btn-secondary" style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: '4px'
              }}>
                    {t('auto_3487', 'Done')}
                  </button>
                </div>
              </div> : instantError ? <div className="nfc-error-state animate-fade-in" style={{
            padding: '10px 0',
            width: '100%'
          }}>
                <AlertTriangle size={48} style={{
              color: 'var(--error, #ff7b72)',
              marginBottom: '12px'
            }} />
                <h4 style={{
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
              fontSize: '1rem'
            }}>{t('auto_3488', 'Transaction Failed')}</h4>
                <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              margin: '0 0 16px 0'
            }}>{instantError}</p>
                <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center'
            }}>
                  <button onClick={handleConfirmInstantAction} className="royal-btn" style={{
                background: 'var(--accent)', color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold'
              }}>
                    {t('auto_3489', 'Try Again')}
                  </button>
                  <button onClick={() => setInstantConfirmOpen(false)} className="royal-btn-secondary" style={{
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}>
                    {t('auto_3490', 'Close')}
                  </button>
                </div>
              </div> : <div className="instant-processing-state animate-fade-in" style={{
            padding: '24px 0 0 0',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '300px'
          }}>
                <div className="royal-spinner" style={{
              width: '40px',
              height: '40px',
              margin: '0 auto 16px',
              borderColor: 'var(--accent) transparent var(--accent) transparent'
            }}></div>
                <h4 style={{
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}>
                  {instantActionType === 'checkout' ? 'Executing Instant Royal Checkout...' : 'Executing Instant Royal Return...'}
                </h4>
                <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              margin: '0 0 24px 0'
            }}>
                  {t('auto_3491', 'Cryptographically validating NFC physical signature and updating catalog ledger...')}
                </p>
                <div className="loading-quote-container" style={{ 
                    marginTop: 'auto', 
                    fontStyle: 'italic', 
                    color: 'var(--text-primary)', 
                    padding: '24px', 
                    background: 'var(--surface-elevated)', 
                    borderTop: '2px solid var(--accent)', 
                    width: '100%',
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    borderRadius: '0 0 12px 12px'
                }}>
                    "{loadingQuote}"
                </div>
              </div>}
          </div>
        </div>
      </div>}

    {book && <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} title={book.title} text={`Explore "${book.title}" by ${book.authors ? book.authors.join(', ') : 'Royal Book Club'} at Royal Book Club`} url={window.location.href} type="book" />}
    </>;
};
export default BookDetailPage;