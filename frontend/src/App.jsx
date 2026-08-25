import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { Loader2, BookOpen, Calendar, BookText, Home, User, Compass, Sparkles, LogOut, Menu, X, Shield, Palette } from 'lucide-react';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import api from './api/apiClient';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/catalog/CatalogPage';
import BookDetailPage from './pages/catalog/BookDetailPage';
import EventsPage from './pages/events/EventsPage';
import EventDetailPage from './pages/events/EventDetailPage';
import DiscoursesPage from './pages/articles/DiscoursesPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import BookIngestionConsole from './pages/admin/BookIngestionConsole';
import UserManagementPage from './pages/admin/UserManagementPage';
import AdminRequests from './pages/admin/AdminRequests';
import CuratorGatheringsPage from './pages/admin/CuratorGatheringsPage';
import CuratorGenresPage from './pages/admin/CuratorGenresPage';
import CuratorHeroPage from './pages/admin/CuratorHeroPage';
import CuratorCheckoutsPage from './pages/admin/CuratorCheckoutsPage';
import CuratorSettingsPage from './pages/admin/CuratorSettingsPage';
import CuratorModerationPage from './pages/admin/CuratorModerationPage';
import CuratorInventoryAuditPage from './pages/admin/CuratorInventoryAuditPage';
import NfcCounterDashboard from './pages/admin/NfcCounterDashboard';
import QrStickerGeneratorPage from './pages/admin/QrStickerGeneratorPage';
import PrivacyNotice from './pages/PrivacyNotice';
import TermsAndConditions from './pages/TermsAndConditions';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ResetPassword from './pages/auth/ResetPassword';
import ProfilePage from './pages/member/ProfilePage';
import HelpPage from './pages/member/HelpPage';
import GatepassPage from './pages/catalog/GatepassPage';
import './App.css';
import { fetchHeroConfig } from './services/heroApi';
import { useLanguage } from './i18n/LanguageContext';
import OnboardingWizard from './components/OnboardingWizard';
import CovenantViewerModal from './components/CovenantViewerModal';
import { fetchBookByQrId } from './services/libraryApi';
const ScrollToTop = () => {
  const {
    pathname
  } = useLocation();
  useEffect(() => {
    // 1. Book Ingestion
    if (pathname.includes('/admin/books/ingest') || pathname.includes('/admin/books')) {
      const element = document.getElementById('db-search-panel');
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        return;
      }
    }

    // 2. Book detail
    if (pathname.includes('/books/')) {
      // By default scroll to top
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      return;
    }

    // 3. All other pages (Home, Catalog, Assembly/Events, Discourses, Gatepass, Profile, Curator Settings, Admin Dashboard, Help, Sages)
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [pathname]);
  return null;
};
function App() {
  const {
    language,
    setLanguage,
    t,
    getLocalized
  } = useLanguage();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalScannerLoading, setGlobalScannerLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('royal-theme') || 'academic');
  const [footerQuote, setFooterQuote] = useState("A word, deeply read, becomes conviction. A conviction becomes a life. You do not read a great book. You are slowly, quietly, being rewritten by it.");
  const [footerAuthor, setFooterAuthor] = useState("Royal Reader Guild");
  const [heroConfig, setHeroConfig] = useState(null);
  const [quoteIndex, setQuoteIndex] = useState(-1);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingTarget, setOnboardingTarget] = useState(null);
  const [deepLinkResolving, setDeepLinkResolving] = useState(false);
  const [covenantViewer, setCovenantViewer] = useState(null); // null, 'terms', or 'privacy'
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (hasAcceptedTerms && hasAcceptedPrivacy) {
      setConsentChecked(true);
    }
  }, [hasAcceptedTerms, hasAcceptedPrivacy]);
  const triggerOnboarding = target => {
    setOnboardingTarget(target);
    setOnboardingOpen(true);
  };
  const handleOnboardingResume = target => {
    if (!target) return;
    if (target.actionType === 'nfc') {
      sessionStorage.setItem('nfc_session_uid', target.ntagUid);
      sessionStorage.setItem('nfc_session_isbn', target.isbn);
      sessionStorage.setItem('nfc_session_time', Date.now().toString());
    }
    const event = new CustomEvent('onboarding_complete', {
      detail: target
    });
    window.dispatchEvent(event);
  };
  const handleAcceptGoogleConsent = async () => {
    try {
      setConsentLoading(true);
      const consentDate = new Date();
      await api.put('/api/v1/users/profile', {
        consentAcceptedAt: consentDate
      });
      setUser(prev => ({
        ...prev,
        consentAcceptedAt: consentDate
      }));
      const currentHash = window.location.hash;
      const isCatalogOrDetail = currentHash.startsWith('#/catalog');
      if (!isCatalogOrDetail) {
        window.location.hash = '#/profile';
      }
    } catch (err) {
      console.error("Failed to save consent:", err);
    } finally {
      setConsentLoading(false);
    }
  };
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('royal-theme', theme);
  }, [theme]);
  useEffect(() => {
    const handleLinkedInCallback = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      if (code) {
        if (window.linkedin_callback_in_progress === code) {
          console.info("[INIT] Duplicate LinkedIn OAuth callback detected (React StrictMode). Discarding duplicate execution.");
          return;
        }
        window.linkedin_callback_in_progress = code;
        console.group("%c🔑 LinkedIn OAuth Callback Debugger", "color: #d4af37; font-weight: bold; font-size: 14px;");
        console.info("[INIT] LinkedIn auth code detected in URL query string.");
        console.info("[INIT] Auth code:", code);
        console.info("[INIT] Current full URL:", window.location.href);
        console.info("[INIT] sessionStorage redirect target:", sessionStorage.getItem('linkedin_redirect_target'));

        // Clean the URL search parameters immediately to prevent stale re-submissions on page reloads/refreshes
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        setLoading(true);
        try {
          const redirectUri = window.location.origin;
          console.info(`[EXCHANGE] Initiating POST to /api/v1/auth/linkedin/callback with redirectUri: ${redirectUri}`);
          const res = await api.post(`/api/v1/auth/linkedin/callback?code=${code}&redirectUri=${encodeURIComponent(redirectUri)}`);
          console.info("[EXCHANGE] Response status:", res.status);
          console.info("[EXCHANGE] Response payload:", res.data);
          const customToken = res.data?.customToken;
          if (customToken) {
            console.info("[EXCHANGE] Successfully retrieved custom token!");
            console.info("[FIREBASE] Importing auth modules & executing signInWithCustomToken...");
            const {
              signInWithCustomToken
            } = await import('firebase/auth');
            const userCredential = await signInWithCustomToken(auth, customToken);
            console.info("[FIREBASE] Sign-in with custom token completed successfully. Logged-in user UID:", userCredential.user.uid);
            const redirectTarget = sessionStorage.getItem('linkedin_redirect_target');
            if (redirectTarget) {
              console.info("[REDIRECT] Found pre-login redirect target in storage:", redirectTarget);
              sessionStorage.removeItem('linkedin_redirect_target');
              if (redirectTarget.includes('#/auth/signin') || redirectTarget.includes('#/auth/signup') || redirectTarget.includes('#/auth/reset')) {
                console.info("[REDIRECT] Pre-login page was auth-specific. Resetting location to root path.");
                window.location.href = window.location.origin + '/#/';
              } else {
                console.info("[REDIRECT] Redirecting window.location to original pre-login target...");
                window.location.href = redirectTarget;
              }
            } else {
              console.info("[REDIRECT] No redirect target in storage. Defaulting to root path.");
              window.location.href = window.location.origin + '/#/';
            }
          } else {
            console.error("[ERROR] Response payload did not contain customToken!", res.data);
            setLoading(false);
          }
        } catch (error) {
          console.error("[FATAL] LinkedIn OAuth code exchange failed!");
          console.error("[FATAL] Error payload:", error);
          if (error.response) {
            console.error("[FATAL] HTTP Status code:", error.response.status);
            console.error("[FATAL] HTTP Response data:", error.response.data);
          }
          setLoading(false);
        } finally {
          console.groupEnd();
        }
      }
    };
    handleLinkedInCallback();
  }, []);
  const [nfcExpiryError, setNfcExpiryError] = useState('');
  useEffect(() => {
    const handleUrlDeepLink = async () => {
      const href = window.location.href;

      // Return Validator QR direct scanner interceptor
      const pathname = window.location.pathname;
      if (pathname && pathname !== '/' && !pathname.startsWith('/api') && !pathname.startsWith('/static') && !pathname.includes('.')) {
        const pathName = pathname.substring(1).trim();
        if (pathName.length > 0) {
          setGlobalScannerLoading(true);

          if (/^\d+$/.test(pathName)) {
            console.info("[QR INTERCEPT] Detected numeric potential book copy QR ID path. Checking catalog:", pathName);
            try {
              const book = await fetchBookByQrId(pathName);
              if (book && book.isbn) {
                console.info("[QR INTERCEPT] Found matching book. Redirecting to gated book details:", book.isbn);
                window.location.href = window.location.origin + '/#/catalog/' + encodeURIComponent(book.isbn) + '?qrId=' + encodeURIComponent(pathName);
                return;
              }
            } catch (err) {
              console.warn("[QR INTERCEPT] Failed to fetch book by copy QR ID:", pathName, err);
            } finally {
              setGlobalScannerLoading(false);
            }
          }
          console.info("[QR INTERCEPT] Redirecting custom QR validator path direct scan to sages guild hub:", pathName);
          window.location.href = window.location.origin + '/#/sages?qr=' + encodeURIComponent(pathName);
          return;
        }
      }

      // Return Validator QR query parameter scan interceptor (?qr=)
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('qr')) {
        const qrCode = searchParams.get('qr').trim();
        if (qrCode.length > 0) {
          setGlobalScannerLoading(true);

          try {
            const cleanUrl = window.location.origin + '/' + window.location.hash;
            window.history.replaceState(null, '', cleanUrl);
          } catch (historyErr) {
            console.warn("Failed to clean address bar history:", historyErr);
          }
          if (/^\d+$/.test(qrCode)) {
            console.info("[QR QUERY INTERCEPT] Detected numeric potential book copy QR ID query. Checking catalog:", qrCode);
            try {
              const book = await fetchBookByQrId(qrCode);
              if (book && book.isbn) {
                console.info("[QR QUERY INTERCEPT] Found matching book. Redirecting to gated book details:", book.isbn);
                window.location.href = window.location.origin + '/#/catalog/' + encodeURIComponent(book.isbn) + '?qrId=' + encodeURIComponent(qrCode);
                return;
              }
            } catch (err) {
              console.warn("[QR QUERY INTERCEPT] Failed to fetch book by copy QR ID:", qrCode, err);
            } finally {
              setGlobalScannerLoading(false);
            }
          }
          console.info("[QR QUERY INTERCEPT] Redirecting custom QR query parameter direct scan to sages guild hub:", qrCode);
          window.location.href = window.location.origin + '/#/sages?qr=' + encodeURIComponent(qrCode);
          return;
        }
      }

      // First, try to retrieve the pre-boot intercepted parameters from sessionStorage
      let u = sessionStorage.getItem('pending_nfc_u');
      if (u) {
        sessionStorage.removeItem('pending_nfc_u');
        console.info("Extracted cached NFC UID from head interceptor:", u);
      }
      let c = sessionStorage.getItem('pending_nfc_c');
      if (c) {
        sessionStorage.removeItem('pending_nfc_c');
        console.info("Extracted cached NFC Counter from head interceptor:", c);
      }

      // Fallback: parse query params from the URL if it bypassed the HTML interceptor
      if (!u) {
        try {
          const urlObj = new URL(href.replace('#/', ''));
          u = urlObj.searchParams.get('u');
          c = urlObj.searchParams.get('c');
        } catch (e) {
          // Fallback search parsing
        }
      }
      if (!u) {
        u = new URLSearchParams(window.location.search).get('u');
        c = new URLSearchParams(window.location.search).get('c');
      }
      if (!u) {
        const matchU = href.match(/[?&]u=([^&]+)/);
        if (matchU) u = matchU[1];
        const matchC = href.match(/[?&]c=([^&]+)/);
        if (matchC) c = matchC[1];
      }
      if (u) {
        u = u.trim().toLowerCase().replace(/:/g, '');
        console.info("Intercepted NFC deep link UID:", u, "Counter:", c);

        // Clean the address bar IMMEDIATELY to prevent the browser from caching/remembering parameters
        try {
          let cleanUrl = window.location.origin + '/' + window.location.hash.replace(/[?&]u=[^&]+/, '').replace(/[?&]c=[^&]+/, '');
          cleanUrl = cleanUrl.replace(/[?&]+$/, ''); // Strip trailing empty separators
          window.history.replaceState(null, '', cleanUrl);
        } catch (historyErr) {
          console.warn("Failed to clean address bar history:", historyErr);
        }

        // Helper to parse counter formats
        const parseCounterToNumber = rawCounter => {
          if (!rawCounter || !rawCounter.trim()) return null;
          let clean = rawCounter.trim().toLowerCase();
          if (clean.startsWith("0x")) {
            clean = clean.substring(2);
          }
          clean = clean.replace(/^0+/, "");
          if (!clean) return 0;
          try {
            // ALWAYS try parsing as hexadecimal (base 16) first because NTAG mirrors are represented as hex strings
            const parsed = parseInt(clean, 16);
            if (!isNaN(parsed)) {
              return parsed;
            }
          } catch (e) {
            // ignore
          }
          return parseInt(clean, 10);
        };

        // Local Cache Safety Pre-Check (Epic 4 & 2 Demotion and Self-Healing Optimization)
        let isLocalBlock = false;
        if (c) {
          const incomingCounter = parseCounterToNumber(c);
          if (incomingCounter !== null && !isNaN(incomingCounter)) {
            const storageKey = `nfc_latest_counter_${u}`;
            const storedVal = localStorage.getItem(storageKey);
            if (storedVal) {
              try {
                const latest = JSON.parse(storedVal);
                const storedCounter = Number(latest.counter);
                if (incomingCounter === storedCounter) {
                  // Same counter - local check of 3 minutes
                  const age = Date.now() - Number(latest.firstSeenAt);
                  if (age > 180000) {
                    console.warn("Local NFC tap has expired (> 3 minutes). Redirecting to book page or homepage.");
                    const matchIsbn = href.match(/\/catalog\/([0-9Xx]+)/);
                    if (matchIsbn && matchIsbn[1]) {
                      window.location.replace(`${window.location.origin}/#/catalog/${matchIsbn[1]}`);
                    } else {
                      window.location.replace(`${window.location.origin}/#/`);
                    }
                    isLocalBlock = true;
                  }
                }
              } catch (e) {
                console.error("Failed to parse stored NFC counter:", e);
              }
            }
          }
        }
        if (isLocalBlock) {
          return;
        }
        try {
          setDeepLinkResolving(true);
          const response = await api.get(`/api/v1/books/ntag/${u}${c ? `?c=${c}` : ''}`);
          const book = response?.data;
          if (book && book.isbn) {
            console.info("Found book from NFC UID:", book.title, "Verification status:", book.nfcVerificationStatus);

            // Mask the address bar by replacing history state with clean book details route
            const cleanUrl = `${window.location.origin}/#/catalog/${book.isbn}`;
            window.history.replaceState(null, '', cleanUrl);
            if (c) {
              const storageKey = `nfc_latest_counter_${u}`;
              const incomingCounter = parseCounterToNumber(c);

              // 1. Self-Healing Synchronization Check (Epic 4):
              // If backend has a reset timestamp, and our local cache's firstSeenAt is older than that, clear local cache.
              if (book.nfcCounterResetAt) {
                const storedVal = localStorage.getItem(storageKey);
                if (storedVal) {
                  try {
                    const cached = JSON.parse(storedVal);
                    const resetTime = new Date(book.nfcCounterResetAt).getTime();
                    if (cached.firstSeenAt && cached.firstSeenAt < resetTime) {
                      console.info("Self-healing: clearing obsolete client cache matching reset timestamp:", book.nfcCounterResetAt);
                      localStorage.removeItem(storageKey);
                    }
                  } catch (err) {
                    console.warn("Failed to parse local cache during self-healing reset check:", err);
                  }
                }
              }

              // 2. Cache successful/VALID counters
              if (book.nfcVerificationStatus === "VALID" && incomingCounter !== null && !isNaN(incomingCounter)) {
                localStorage.setItem(storageKey, JSON.stringify({
                  counter: incomingCounter,
                  firstSeenAt: Date.now()
                }));
              }

              // 3. Resume Safety Countdown Timer:
              // If an active session already exists and hasn't expired, preserve the original timestamp to resume the countdown.
              const existingSessionStr = sessionStorage.getItem('nfc_session');
              let originalTimestamp = Date.now();
              if (existingSessionStr) {
                try {
                  const existing = JSON.parse(existingSessionStr);
                  if (existing.ntagUid === u && Date.now() - existing.timestamp < 180000) {
                    originalTimestamp = existing.timestamp;
                  }
                } catch (e) {
                  // ignore
                }
              }

              // Save NFC session state in sessionStorage with 5-minute timeout and verificationStatus
              const sessionData = {
                ntagUid: u,
                isbn: book.isbn,
                timestamp: originalTimestamp,
                verificationStatus: book.nfcVerificationStatus || 'VALID'
              };
              sessionStorage.setItem('nfc_session', JSON.stringify(sessionData));

              // Route internally to Book Details page with window.location.replace to prevent loops
              window.location.replace(`${window.location.origin}/#/catalog/${book.isbn}`);

              // Dispatch custom event for real-time reactivity
              window.dispatchEvent(new CustomEvent('nfc_tap_detected', {
                detail: sessionData
              }));
            } else {
              // c is not present: route internally to Book Details page as requested!
              console.info("NFC tapped without counter 'c'. Navigating scholar straight to book catalog details.");
              window.location.replace(`${window.location.origin}/#/catalog/${book.isbn}`);
            }
          } else {
            // Strip parameter if invalid
            const matchIsbn = href.match(/\/catalog\/([0-9Xx]+)/);
            if (matchIsbn && matchIsbn[1]) {
              window.location.replace(`${window.location.origin}/#/catalog/${matchIsbn[1]}`);
            } else {
              window.location.replace(`${window.location.origin}/#/`);
            }
          }
        } catch (error) {
          console.error("Failed to resolve book from NFC deep link:", error);
          const matchIsbn = href.match(/\/catalog\/([0-9Xx]+)/);
          if (matchIsbn && matchIsbn[1]) {
            window.location.replace(`${window.location.origin}/#/catalog/${matchIsbn[1]}`);
          } else {
            window.location.replace(`${window.location.origin}/#/`);
          }
        } finally {
          setDeepLinkResolving(false);
        }
      }
    };
    handleUrlDeepLink();
  }, []);
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'academic' : 'dark');
  };
  useEffect(() => {
    const loadHeroConfigData = async () => {
      try {
        const res = await fetchHeroConfig();
        if (res?.success && res.data) {
          setHeroConfig(res.data);
          const quotes = res.data.featuredQuotes || [];
          if (Array.isArray(quotes) && quotes.length > 0) {
            const randomIndex = Math.floor(Math.random() * quotes.length);
            setQuoteIndex(randomIndex);
          }
        }
      } catch (err) {
        console.warn('Unable to load hero config for footer quote.', err);
      }
    };
    loadHeroConfigData();
  }, []);
  useEffect(() => {
    if (!heroConfig || quoteIndex === -1) return;
    const quotes = getLocalized(heroConfig, 'featuredQuotes') || [];
    const randomQuote = quotes[quoteIndex];
    if (randomQuote) {
      let text = randomQuote;
      let author = "Royal Reader Guild";
      const separators = [" — ", " - ", " – "];
      for (const sep of separators) {
        if (randomQuote.includes(sep)) {
          const parts = randomQuote.split(sep);
          text = parts[0].trim();
          author = parts.slice(1).join(sep).trim();
          break;
        }
      }
      if (text.startsWith('"') && text.endsWith('"')) {
        text = text.slice(1, -1);
      }
      setFooterQuote(text);
      setFooterAuthor(author);
    }
  }, [language, heroConfig, quoteIndex]);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
      if (firebaseUser) {
        // Fetch backend profile (roles, names) using ID token via apiClient
        (async () => {
          try {
            const res = await api.get('/api/v1/auth/me');
            const backendUser = res?.data?.data;
            if (backendUser?.language) {
              setLanguage(backendUser.language);
            }
            const cleanName = (() => {
              if (firebaseUser.displayName && firebaseUser.displayName !== 'null' && firebaseUser.displayName !== 'null null') {
                return firebaseUser.displayName;
              }
              if (backendUser) {
                const first = backendUser.firstName && backendUser.firstName !== 'null' ? backendUser.firstName : '';
                const last = backendUser.lastName && backendUser.lastName !== 'null' ? backendUser.lastName : '';
                const full = `${first} ${last}`.trim();
                if (full && full !== 'null' && full !== 'null null') {
                  return full;
                }
                if (backendUser.email) {
                  return backendUser.email.split('@')[0];
                }
              }
              if (firebaseUser.email) {
                return firebaseUser.email.split('@')[0];
              }
              return 'Royal Patron';
            })();
            setUser({
              uid: firebaseUser.uid,
              displayName: cleanName,
              email: firebaseUser.email || backendUser?.email || 'patron@royalbook.club',
              photoURL: firebaseUser.photoURL || backendUser?.photoUrl || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=150&q=80',
              tier: backendUser?.role === 'ADMIN' ? 'Curator' : 'Royal Reader',
              role: backendUser?.role || 'MEMBER',
              consentAcceptedAt: backendUser?.consentAcceptedAt || null,
              isAnonymous: firebaseUser.isAnonymous
            });
          } catch (err) {
            console.error('Failed to fetch backend profile', err);
            const fallbackName = firebaseUser.displayName && firebaseUser.displayName !== 'null' && firebaseUser.displayName !== 'null null' ? firebaseUser.displayName : firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Royal Patron';
            setUser({
              uid: firebaseUser.uid,
              displayName: fallbackName,
              email: firebaseUser.email || 'patron@royalbook.club',
              photoURL: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=150&q=80',
              tier: 'Royal Reader',
              consentAcceptedAt: null,
              isAnonymous: firebaseUser.isAnonymous
            });
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setUser(null);
        // If we are currently resolving a LinkedIn callback in the URL query,
        // do not set loading to false to prevent flashing unauthenticated states.
        const hasCode = new URLSearchParams(window.location.search).has('code');
        if (!hasCode) {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-resume Onboarding Wizard after full-page social redirect authentication loops (e.g., LinkedIn)
  useEffect(() => {
    if (user && !user.isAnonymous) {
      const pendingTargetStr = sessionStorage.getItem('pending_onboarding_target');
      if (pendingTargetStr) {
        try {
          const pendingTarget = JSON.parse(pendingTargetStr);
          console.info("[AUTO-RESUME] Found pending onboarding state on auth load:", pendingTarget);
          triggerOnboarding(pendingTarget);
        } catch (e) {
          console.error("[AUTO-RESUME] Failed to parse pending onboarding target", e);
        }
        sessionStorage.removeItem('pending_onboarding_target');
      }
    }
  }, [user]);
  const handleSignIn = async () => {
    // keep anonymous fallback
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in: ", error);
      setLoading(false);
    }
  };
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  const closeMobileMenu = () => setMobileMenuOpen(false);
  if (nfcExpiryError) {
    return <div className="gatepass-loading-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--bg-gradient, #0f0c08)',
      color: 'var(--text-primary, #ffffff)',
      padding: '24px',
      textAlign: 'center'
    }}>
        <div className="nfc-expired-card royal-card" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '32px',
        border: '1px solid var(--glass-border, rgba(212, 175, 55, 0.2))',
        borderRadius: '12px',
        background: 'var(--surface-elevated, rgba(15, 12, 8, 0.8))',
        backdropFilter: 'blur(12px)',
        boxShadow: "0 8px 32px var(--card-shadow)",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
          <div className="shield-warning-icon" style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: 'rgba(214, 40, 40, 0.1)',
          border: '1px solid rgba(214, 40, 40, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
            <span style={{
            fontSize: '2.5rem',
            color: '#d62828'
          }}>🛡️</span>
          </div>
          <h2 style={{
          fontFamily: 'Cinzel, serif',
          color: 'var(--accent, #d4af37)',
          letterSpacing: '0.05em',
          marginBottom: '16px',
          fontSize: '1.5rem'
        }}>{t('nfc.securityAlert')}</h2>
          <p style={{
          color: 'var(--text-primary, #ffffff)',
          fontSize: '1rem',
          lineHeight: '1.6',
          margin: '0 0 24px 0'
        }}>
            {nfcExpiryError}
          </p>
          <button onClick={() => {
          setNfcExpiryError('');
          window.location.replace(`${window.location.origin}/#/`);
        }} className="royal-btn" style={{
          padding: '10px 24px',
          fontSize: '0.9rem',
          minWidth: '160px'
        }}>
            {t('common.acknowledgeContinue')}
          </button>
        </div>
      </div>;
  }
  if (globalScannerLoading) {
    return <div className="gatepass-loading-container" style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)"
    }}>
      <div className="loader-royal" style={{ marginBottom: "20px" }}></div>
      <h2 style={{ color: "var(--accent)", fontFamily: "var(--font-serif)" }}>Preparing the Library...</h2>
      <p style={{ color: "var(--text-secondary)", marginTop: "10px" }}>Retrieving volume coordinates from the archives.</p>
    </div>;
  }

  if (deepLinkResolving) {
    return <div className="gatepass-loading-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--bg-gradient, #0f0c08)',
      color: 'var(--text-primary, #ffffff)'
    }}>
        <div className="royal-spinner" style={{
        width: '50px',
        height: '50px',
        marginBottom: '20px'
      }}></div>
        <h2 style={{
        fontFamily: 'Cinzel, serif',
        color: 'var(--accent, #d4af37)',
        letterSpacing: '0.05em',
        margin: 0
      }}>{t('auto_3000', 'Verifying Royal Volume...')}</h2>
        <p style={{
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        marginTop: '12px'
      }}>{t('auto_3001', 'Retrieving digital ledger credentials from NFC physical hotspots.')}</p>
      </div>;
  }
  return <Router>
      <ScrollToTop />
      <div className="app-container">
        {/* Top Decorative Border */}
        <div className="royal-top-border"></div>

        {/* Header navigation */}
        <header className="royal-header">
          <div className="header-content">
            <Link to="/" className="brand-logo" onClick={closeMobileMenu}>
              <Sparkles className="brand-icon gold-glow" />
              <div className="brand-text">
                <span className="brand-title gold-gradient-text">{t('common.royalBookClub')}</span>
                <span className="brand-tagline">{t('common.tagline')}</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="desktop-nav">
              <NavLink to="/" className={({
              isActive
            }) => `nav-link ${isActive ? 'active' : ''}`} end>
                <Home size={16} /> {t('common.pavilion')}
              </NavLink>
              <NavLink to="/catalog" className={({
              isActive
            }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BookOpen size={16} /> {t('common.study')}
              </NavLink>
              <NavLink to="/events" className={({
              isActive
            }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Calendar size={16} /> {t('common.assembly')}
              </NavLink>
              <NavLink to="/discourses" className={({
              isActive
            }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BookText size={16} /> {t('common.discourses')}
              </NavLink>
              <NavLink to="/gatepass" className={({
              isActive
            }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Shield size={16} /> {t('common.gatepass')}
              </NavLink>
              <NavLink to="/sages" className={({
              isActive
            }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BookOpen size={16} /> {t('common.sagesGuild')}
              </NavLink>
              {user?.role === 'ADMIN' && <NavLink to="/admin" className={({
              isActive
            }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Shield size={16} /> {t('common.curatorConsole')}
                </NavLink>}
            </nav>

            {/* Language Switcher Dropdown */}
            <div className="language-selector-container desktop-nav" style={{
            marginRight: '10px'
          }}>
              <select value={language} onChange={e => setLanguage(e.target.value, user)} className="royal-language-select" title={t("str_5000", "Select Language Preference")} id="language-selector-dropdown">
                <option value="en">{t("str_5001", "EN")}</option>
                <option value="hi">{t("str_5002", "HI")}</option>
                <option value="kn">{t("str_5003", "KN")}</option>
              </select>
            </div>

            {/* Theme Toggle & Profile / Auth Section */}
            <div className="theme-toggle-btn-container desktop-nav">
              <button onClick={toggleTheme} className="theme-toggle-btn icon-only" title={`Switch to ${theme === 'dark' ? 'Academic Theme (Beige & Maroon)' : 'Library Theme (Gold & Blue)'}`} id="theme-switcher-btn">
                <Palette size={16} />
              </button>
            </div>

            <div className="auth-section">
              {loading ? <div className="loader-mini"></div> : user ? <div className="user-profile-widget">
                  <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                  <div className="user-info-dropdown">
                    <div className="user-name">{user.displayName}</div>
                    <div className="user-tier">{user.tier}</div>
                    <Link to="/profile" className="admin-portal-link" style={{
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '700',
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  marginBottom: '4px'
                }}>
                      <User size={12} /> {t('common.profileLedger')}
                    </Link>
                    {user?.role === 'ADMIN' && <Link to="/admin" className="admin-portal-link" style={{
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '700',
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  marginBottom: '4px'
                }}>
                        <Shield size={12} /> {t('common.curatorConsole')}
                      </Link>}
                    <button onClick={handleSignOut} className="sign-out-btn" id="logout-btn">
                      <LogOut size={14} /> {t('common.leaveRealm')}
                    </button>
                  </div>
                </div> : <Link to="/auth/signin" className="royal-btn header-btn" id="login-btn">
                  <User size={14} /> {t('common.enterArchway')}
                </Link>}
            </div>

            {/* Mobile Menu Toggle */}
            <button className="mobile-toggle-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={t("str_5004", "Toggle menu")}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

</header>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && <div className="mobile-nav-overlay animate-fade-in" role="dialog" aria-modal="true" onClick={closeMobileMenu}>
              <nav className="mobile-nav" onClick={e => e.stopPropagation()}>
                <NavLink to="/" className={({
            isActive
          }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu} end>
                  <Home size={20} /> {t('common.pavilion')}
                </NavLink>
                <NavLink to="/catalog" className={({
            isActive
          }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <BookOpen size={20} /> {t('common.study')}
                </NavLink>
                <NavLink to="/events" className={({
            isActive
          }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <Calendar size={20} /> {t('common.assembly')}
                </NavLink>
                <NavLink to="/discourses" className={({
            isActive
          }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <BookText size={20} /> {t('common.discourses')}
                </NavLink>
                <NavLink to="/gatepass" className={({
            isActive
          }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <Shield size={20} /> {t('common.gatepass')}
                </NavLink>
                <NavLink to="/sages" className={({
            isActive
          }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <BookOpen size={20} /> {t('common.sagesGuild')}
                </NavLink>

                <div className="mobile-language-section" style={{
            padding: '10px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
                  <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: 'center'
            }}>
                    <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-muted)'
              }}>{t('common.language')}:</span>
                    <select value={language} onChange={e => {
                setLanguage(e.target.value, user);
                closeMobileMenu();
              }} className="royal-language-select" style={{
                width: '120px'
              }} id="mobile-language-selector">
                      <option value="en">{t('auto_3002', 'English')}</option>
                      <option value="hi">हिन्दी</option>
                      <option value="kn">ಕನ್ನಡ</option>
                    </select>
                  </div>
                </div>

                <div className="mobile-theme-section">
                  <button onClick={toggleTheme} className="theme-toggle-btn" style={{
              width: '100%',
              justifyContent: 'center'
            }} id="mobile-theme-switcher-btn">
                    <Palette size={16} />
                    <span>{t("str_5005", "Theme:")} {theme === 'dark' ? 'Library (Gold)' : 'Academic (Maroon)'}</span>
                  </button>
                </div>

                <div className="mobile-auth">
                  {user ? <div className="mobile-user-card" style={{
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: '12px'
            }}>
                      <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                        <img src={user.photoURL} alt={user.displayName} className="mobile-user-avatar" />
                        <div>
                          <div className="mobile-user-name">{user.displayName}</div>
                          <div className="mobile-user-tier">{user.tier}</div>
                        </div>
                      </div>
                      <div style={{
                display: 'flex',
                gap: '10px',
                flexDirection: 'column',
                width: '100%'
              }}>
                        <div style={{
                  display: 'flex',
                  gap: '10px',
                  width: '100%'
                }}>
                          <Link to="/profile" onClick={closeMobileMenu} className="royal-btn-secondary" style={{
                    flex: 1,
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                            {t('common.profileLedger')}
                          </Link>
                          {user?.role === 'ADMIN' && <Link to="/admin" onClick={closeMobileMenu} className="royal-btn-secondary" style={{
                    flex: 1,
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                              {t('common.curatorConsole')}
                            </Link>}
                        </div>
                        <button onClick={() => {
                  handleSignOut();
                  closeMobileMenu();
                }} className="sign-out-btn" style={{
                  width: '100%',
                  padding: '6px 12px'
                }}>
                          {t('common.leaveRealm')}
                        </button>
                      </div>
                    </div> : <Link to="/auth/signin" onClick={closeMobileMenu} className="royal-btn mobile-login-btn" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                      {t('common.enterArchway')}
                    </Link>}
                </div>
              </nav>
            </div>}

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage user={user} onSignIn={handleSignIn} theme={theme} />} />
            <Route path="/catalog" element={<CatalogPage user={user} triggerOnboarding={triggerOnboarding} />} />
            <Route path="/catalog/:id" element={<BookDetailPage user={user} triggerOnboarding={triggerOnboarding} />} />
            <Route path="/events" element={<EventsPage user={user} />} />
            <Route path="/events/:id" element={<EventDetailPage user={user} />} />
            <Route path="/discourses" element={<DiscoursesPage user={user} />} />
            <Route path="/discourses/:id" element={<DiscoursesPage user={user} />} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
            <Route path="/admin/books" element={<BookIngestionConsole user={user} />} />
            <Route path="/admin/users" element={<UserManagementPage user={user} />} />
            <Route path="/admin/requests" element={<AdminRequests user={user} />} />
            <Route path="/admin/gatherings" element={<CuratorGatheringsPage user={user} />} />
            <Route path="/admin/houses" element={<CuratorGenresPage user={user} />} />
            <Route path="/admin/hero" element={<CuratorHeroPage user={user} />} />
            <Route path="/admin/book-requests" element={<CuratorCheckoutsPage user={user} />} />
            <Route path="/admin/settings" element={<CuratorSettingsPage user={user} />} />
            <Route path="/admin/moderation" element={<CuratorModerationPage user={user} />} />
            <Route path="/admin/audit" element={<CuratorInventoryAuditPage user={user} />} />
            <Route path="/admin/nfc" element={<NfcCounterDashboard user={user} />} />
            <Route path="/admin/qr-stickers" element={<QrStickerGeneratorPage user={user} />} />
            <Route path="/profile" element={<ProfilePage user={user} />} />
            <Route path="/sages" element={<HelpPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/gatepass" element={<GatepassPage user={user} />} />
            <Route path="/gatepass/:checkoutId" element={<GatepassPage user={user} />} />
            <Route path="/privacy" element={<PrivacyNotice />} />
            <Route path="/terms" element={<TermsAndConditions />} />

            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/reset" element={<ResetPassword />} />
            <Route path="/auth/signup" element={<SignUp />} />
          </Routes>
        </main>

        {/* Royal Footer */}
        <footer className="royal-footer">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <Sparkles className="gold-glow" size={20} />
                <span className="gold-gradient-text">{t('auto_3003', 'The Royal Book Club')}</span>
              </div>
              <p>{t('auto_3004', 'Constantly surpassing our bad faith towards absolute freedom by cultivating intellectual community since 2026.')}</p>
            </div>
            <div className="footer-links">
              <h4>{t('common.theLibrary')}</h4>
              <Link to="/catalog">{t('common.study')}</Link>
              <Link to="/events">{t('common.assembly')}</Link>
              <Link to="/discourses">{t('common.discourses')}</Link>
              <Link to="/terms">{t('common.termsAndConditions')}</Link>
              <Link to="/privacy">{t('common.privacyNotice')}</Link>
            </div>
            <div className="footer-motto">
              <blockquote>
                "{footerQuote === "A word, deeply read, becomes conviction. A conviction becomes a life. You do not read a great book. You are slowly, quietly, being rewritten by it." ? t('home.bottomQuote') : footerQuote}"
                <cite>— {footerAuthor}</cite>
              </blockquote>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} {t("str_5006", "The Royal Book Club. All rights reserved. Created for premium aesthetic readers.")}</p>
          </div>
        </footer>

        {/* Premium Google Sign up Consent Overlay */}
        {user && !user.isAnonymous && !user.consentAcceptedAt && !onboardingOpen && <div className="consent-overlay">
            <div className="consent-modal animate-scale-up">
              <div className="consent-modal-header">
                <Sparkles className="gold-glow" size={32} />
                <h2 className="gold-gradient-text">{t('auth.activatePortal')}</h2>
              </div>
              <div className="consent-modal-body">
                <p className="consent-intro">
                  {t('auto_3005', 'Welcome, seeker of wisdom. Before stepping into the')} <strong>{t('auto_3006', 'Royal Book Club')}</strong>{t('auto_3007', ', we require you to accept our covenant of privacy and terms.')}
                </p>
                <div className="consent-scroll-box">
                  <h4>{t('auto_3008', 'Covenant Highlights')}</h4>
                  <ul>
                    <li><strong>{t("str_5007", "Your Personal Sanctuary:")}</strong> {t('auto_3009', 'We never sell, rent, or trade your personal data. Your email is used solely for secure access and club communications.')}</li>
                    <li><strong>{t("str_5008", "Address Registry & Borrowing:")}</strong> {t("str_5009", "Members may optionally supply a phone number and postal address (including house number) on their profile. This registry is required for active book checkouts.")}</li>
                    <li><strong>{t("str_5010", "Overdue Outreach:")}</strong> {t('auto_3010', 'In the rare event that a checked-out volume is overdue, we reserve the right to contact you directly using your registered email or phone.')}</li>
                    <li><strong>{t("str_5011", "Future Upgrades:")}</strong> {t('auto_3011', 'A member profile photo is a future requirement, currently not active.')}</li>
                  </ul>
                  <p className="consent-links-text">
                    {t('auto_3012', 'Please read our full, detailed')} <a href="#/privacy" onClick={e => {
                  e.preventDefault();
                  setCovenantViewer('privacy');
                }} style={{
                  color: 'var(--accent)',
                  textDecoration: 'underline',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>{t('auto_3013', 'Privacy Notice')}</a> {t('auto_3014', 'and')} <a href="#/terms" onClick={e => {
                  e.preventDefault();
                  setCovenantViewer('terms');
                }} style={{
                  color: 'var(--accent)',
                  textDecoration: 'underline',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>{t('auto_3015', 'Terms & Conditions')}</a>.
                  </p>
                </div>
                <div className="consent-checkbox-field">
                  <label className="consent-checkbox-label">
                    <input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} />
                    <span>
                      {t('auto_3016', 'I agree to the')} <a href="#/terms" onClick={e => {
                    e.preventDefault();
                    setCovenantViewer('terms');
                  }} style={{
                    color: 'var(--accent)',
                    textDecoration: 'underline',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>{t('auto_3017', 'Terms & Conditions')}</a> {t('auto_3018', 'and have read the')} <a href="#/privacy" onClick={e => {
                    e.preventDefault();
                    setCovenantViewer('privacy');
                  }} style={{
                    color: 'var(--accent)',
                    textDecoration: 'underline',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>{t('auto_3019', 'Privacy Notice')}</a>{t('auto_3020', '. I provide my explicit consent to royalbookclub.com to process my email and account information for book club activities.')}
                    </span>
                  </label>
                </div>
              </div>
              <div className="consent-modal-actions">
                <button onClick={handleSignOut} className="royal-btn-secondary leave-sanctuary-btn">
                  {t('auto_3021', 'Leave Sanctuary')}
                </button>
                <button onClick={handleAcceptGoogleConsent} disabled={!consentChecked || consentLoading} className="royal-btn activate-btn">
                  {consentLoading ? 'Activating...' : 'Agree & Enter'}
                </button>
              </div>
            </div>
          </div>}
        {/* Onboarding Wizard Overlay */}
        {onboardingOpen && <OnboardingWizard user={user} setUser={setUser} targetState={onboardingTarget} onClose={() => {
        setOnboardingOpen(false);
        window.dispatchEvent(new CustomEvent('onboarding_closed', {
          detail: onboardingTarget
        }));
      }} onResume={handleOnboardingResume} />}
        {/* Full Covenant Viewer Sub-Popup Modal */}
        {covenantViewer && <CovenantViewerModal type={covenantViewer} onAccept={() => {
        if (covenantViewer === 'terms') {
          setHasAcceptedTerms(true);
        } else if (covenantViewer === 'privacy') {
          setHasAcceptedPrivacy(true);
        }
        setCovenantViewer(null);
      }} onDecline={() => {
        setCovenantViewer(null);
        handleSignOut();
      }} onClose={() => setCovenantViewer(null)} />}
      </div>
    </Router>;
}
export default App;