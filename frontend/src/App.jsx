import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import { BookOpen, Calendar, BookText, Home, User, Compass, Sparkles, LogOut, Menu, X, Shield, Palette } from 'lucide-react';
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
import PrivacyNotice from './pages/PrivacyNotice';
import TermsAndConditions from './pages/TermsAndConditions';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ResetPassword from './pages/auth/ResetPassword';
import ProfilePage from './pages/member/ProfilePage';
import GatepassPage from './pages/catalog/GatepassPage';
import './App.css';
import { fetchHeroConfig } from './services/heroApi';
import { useLanguage } from './i18n/LanguageContext';
import OnboardingWizard from './components/OnboardingWizard';

function App() {
  const { language, setLanguage, t, getLocalized } = useLanguage();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('royal-theme') || 'academic');
  const [footerQuote, setFooterQuote] = useState("A word, deeply read, becomes conviction. A conviction becomes a life. You do not read a great book. You are slowly, quietly, being rewritten by it.");
  const [footerAuthor, setFooterAuthor] = useState("Sovereign Reader Guild");
  const [heroConfig, setHeroConfig] = useState(null);
  const [quoteIndex, setQuoteIndex] = useState(-1);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingTarget, setOnboardingTarget] = useState(null);
  const [deepLinkResolving, setDeepLinkResolving] = useState(false);

  const triggerOnboarding = (target) => {
    setOnboardingTarget(target);
    setOnboardingOpen(true);
  };

  const handleOnboardingResume = (target) => {
    if (!target) return;
    if (target.actionType === 'nfc') {
      sessionStorage.setItem('nfc_session_uid', target.ntagUid);
      sessionStorage.setItem('nfc_session_isbn', target.isbn);
      sessionStorage.setItem('nfc_session_time', Date.now().toString());
    }
    const event = new CustomEvent('onboarding_complete', { detail: target });
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

  const [nfcExpiryError, setNfcExpiryError] = useState('');

  useEffect(() => {
    const handleUrlDeepLink = async () => {
      const href = window.location.href;
      
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
        console.info("Intercepted NFC deep link UID:", u, "Counter:", c);
        
        // Clean the address bar IMMEDIATELY to prevent the browser from caching/remembering parameters
        try {
          let cleanUrl = window.location.origin + '/' + window.location.hash.replace(/[?&]u=[^&]+/, '').replace(/[?&]c=[^&]+/, '');
          cleanUrl = cleanUrl.replace(/[?&]+$/, ''); // Strip trailing empty separators
          window.history.replaceState(null, '', cleanUrl);
        } catch (historyErr) {
          console.warn("Failed to clean address bar history:", historyErr);
        }

        // Local Storage Offline / Temporal Check
        if (c) {
          const parseCounterToNumber = (rawCounter) => {
            if (!rawCounter || !rawCounter.trim()) return null;
            let clean = rawCounter.trim().toLowerCase();
            if (clean.startsWith("0x")) {
              clean = clean.substring(2);
            }
            clean = clean.replace(/^0+/, "");
            if (!clean) return 0;
            if (/[a-f]/.test(clean) || rawCounter.trim().toLowerCase().startsWith("0x")) {
              return parseInt(clean, 16);
            } else {
              return parseInt(clean, 10);
            }
          };

          const incomingCounter = parseCounterToNumber(c);
          if (incomingCounter !== null && !isNaN(incomingCounter)) {
            const storageKey = `nfc_latest_counter_${u}`;
            const storedVal = localStorage.getItem(storageKey);
            if (storedVal) {
              try {
                const latest = JSON.parse(storedVal);
                const storedCounter = Number(latest.counter);
                
                if (incomingCounter > storedCounter) {
                  // Newer counter supersedes the old one - update local storage
                  localStorage.setItem(storageKey, JSON.stringify({
                    counter: incomingCounter,
                    firstSeenAt: Date.now()
                  }));
                } else if (incomingCounter === storedCounter) {
                  // Same counter, check elapsed age
                  const age = Date.now() - Number(latest.firstSeenAt);
                  if (age > 300000) { // 5 minutes
                    console.warn("Local NFC tap has expired (> 5 minutes elapsed).");
                    setNfcExpiryError("NFC Tap session has expired (5-minute security limit exceeded). Please re-tap the physical book.");
                    return;
                  }
                } else {
                  // Older counter, reject immediately
                  console.warn(`Local NFC counter reuse attempt blocked. Incoming: ${incomingCounter}, Latest stored: ${storedCounter}`);
                  setNfcExpiryError("This NFC counter is outdated and has been superseded by a more recent tap. Re-use of previous taps is strictly prohibited.");
                  return;
                }
              } catch (e) {
                console.error("Failed to parse stored NFC counter JSON, overwriting:", e);
                localStorage.setItem(storageKey, JSON.stringify({
                  counter: incomingCounter,
                  firstSeenAt: Date.now()
                }));
              }
            } else {
              // Fresh counter, write initial value
              localStorage.setItem(storageKey, JSON.stringify({
                counter: incomingCounter,
                firstSeenAt: Date.now()
              }));
            }
          }
        }

        try {
          setDeepLinkResolving(true);
          const response = await api.get(`/api/v1/books/ntag/${u}${c ? `?c=${c}` : ''}`);
          const book = response?.data;
          
          if (book && book.isbn) {
            console.info("Found book from NFC UID:", book.title);
            
            // Mask the address bar by replacing history state with clean book details route
            const cleanUrl = `${window.location.origin}/#/catalog/${book.isbn}`;
            window.history.replaceState(null, '', cleanUrl);
            
            // Save NFC session state in sessionStorage with 5-minute timeout
            const sessionData = {
              ntagUid: u,
              isbn: book.isbn,
              timestamp: Date.now()
            };
            sessionStorage.setItem('nfc_session', JSON.stringify(sessionData));
            
            // Route internally to Book Details page with window.location.replace to prevent loops
            window.location.replace(`${window.location.origin}/#/catalog/${book.isbn}`);
            
            // Dispatch custom event for real-time reactivity
            window.dispatchEvent(new CustomEvent('nfc_tap_detected', { detail: sessionData }));
          } else {
            // Strip parameter if invalid
            window.location.replace(`${window.location.origin}/#/`);
          }
        } catch (error) {
          console.error("Failed to resolve book from NFC deep link:", error);
          const errorMsg = error?.response?.data?.message || "The physical NFC tap has expired or is invalid. Please re-tap the physical book to obtain a fresh security token.";
          setNfcExpiryError(errorMsg);
        } finally {
          setDeepLinkResolving(false);
        }
      }
    };

    handleUrlDeepLink();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'academic' : 'dark'));
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
      let author = "Sovereign Reader Guild";
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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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
              tier: backendUser?.role === 'ADMIN' ? 'Curator' : 'Sovereign Reader',
              role: backendUser?.role || 'MEMBER',
              consentAcceptedAt: backendUser?.consentAcceptedAt || null,
              isAnonymous: firebaseUser.isAnonymous
            });
          } catch (err) {
            console.error('Failed to fetch backend profile', err);
            const fallbackName = firebaseUser.displayName && firebaseUser.displayName !== 'null' && firebaseUser.displayName !== 'null null'
              ? firebaseUser.displayName
              : (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Royal Patron');
            setUser({
              uid: firebaseUser.uid,
              displayName: fallbackName,
              email: firebaseUser.email || 'patron@royalbook.club',
              photoURL: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=150&q=80',
              tier: 'Sovereign Reader',
              consentAcceptedAt: null,
              isAnonymous: firebaseUser.isAnonymous
            });
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
    return (
      <div className="gatepass-loading-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-gradient, #0f0c08)', color: 'var(--text-primary, #ffffff)', padding: '24px', textAlign: 'center' }}>
        <div className="nfc-expired-card royal-card" style={{ maxWidth: '500px', width: '100%', padding: '32px', border: '1px solid var(--glass-border, rgba(212, 175, 55, 0.2))', borderRadius: '12px', background: 'var(--surface-elevated, rgba(15, 12, 8, 0.8))', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="shield-warning-icon" style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(214, 40, 40, 0.1)', border: '1px solid rgba(214, 40, 40, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '2.5rem', color: '#d62828' }}>🛡️</span>
          </div>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--accent, #d4af37)', letterSpacing: '0.05em', marginBottom: '16px', fontSize: '1.5rem' }}>NFC Security Alert</h2>
          <p style={{ color: 'var(--text-primary, #ffffff)', fontSize: '1rem', lineHeight: '1.6', margin: '0 0 24px 0' }}>
            {nfcExpiryError}
          </p>
          <button 
            onClick={() => {
              setNfcExpiryError('');
              window.location.replace(`${window.location.origin}/#/`);
            }}
            className="royal-btn" 
            style={{ padding: '10px 24px', fontSize: '0.9rem', minWidth: '160px' }}
          >
            Acknowledge & Continue
          </button>
        </div>
      </div>
    );
  }

  if (deepLinkResolving) {
    return (
      <div className="gatepass-loading-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-gradient, #0f0c08)', color: 'var(--text-primary, #ffffff)' }}>
        <div className="royal-spinner" style={{ width: '50px', height: '50px', marginBottom: '20px' }}></div>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--accent, #d4af37)', letterSpacing: '0.05em', margin: 0 }}>Verifying Sovereign Volume...</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '12px' }}>Retrieving digital ledger credentials from NFC physical hotspots.</p>
      </div>
    );
  }

  return (
    <Router>
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
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                <Home size={16} /> {t('common.pavilion')}
              </NavLink>
              <NavLink to="/catalog" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BookOpen size={16} /> {t('common.study')}
              </NavLink>
              <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Calendar size={16} /> {t('common.assembly')}
              </NavLink>
              <NavLink to="/discourses" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BookText size={16} /> {t('common.discourses')}
              </NavLink>
              <NavLink to="/gatepass" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Shield size={16} /> {t('common.gatepass')}
              </NavLink>
              {user?.role === 'ADMIN' && (
                <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Shield size={16} /> {t('common.curatorConsole')}
                </NavLink>
              )}
            </nav>

            {/* Language Switcher Dropdown */}
            <div className="language-selector-container desktop-nav" style={{ marginRight: '10px' }}>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value, user)}
                className="royal-language-select"
                title="Select Language Preference"
                id="language-selector-dropdown"
              >
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="kn">KN</option>
              </select>
            </div>

            {/* Theme Toggle & Profile / Auth Section */}
            <div className="theme-toggle-btn-container desktop-nav">
              <button 
                onClick={toggleTheme} 
                className="theme-toggle-btn icon-only"
                title={`Switch to ${theme === 'dark' ? 'Academic Theme (Beige & Maroon)' : 'Salon Theme (Gold & Blue)'}`}
                id="theme-switcher-btn"
              >
                <Palette size={16} />
              </button>
            </div>

            <div className="auth-section">
              {loading ? (
                <div className="loader-mini"></div>
              ) : user ? (
                <div className="user-profile-widget">
                  <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                  <div className="user-info-dropdown">
                    <div className="user-name">{user.displayName}</div>
                    <div className="user-tier">{user.tier}</div>
                    <Link to="/profile" className="admin-portal-link" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                      <User size={12} /> {t('common.profileLedger')}
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <Link to="/admin" className="admin-portal-link" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                        <Shield size={12} /> {t('common.curatorConsole')}
                      </Link>
                    )}
                    <button onClick={handleSignOut} className="sign-out-btn" id="logout-btn">
                      <LogOut size={14} /> {t('common.leaveRealm')}
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/auth/signin" className="royal-btn header-btn" id="login-btn">
                  <User size={14} /> {t('common.enterArchway')}
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button className="mobile-toggle-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

</header>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="mobile-nav-overlay animate-fade-in" role="dialog" aria-modal="true" onClick={closeMobileMenu}>
              <nav className="mobile-nav" onClick={(e) => e.stopPropagation()}>
                <NavLink to="/" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu} end>
                  <Home size={20} /> {t('common.pavilion')}
                </NavLink>
                <NavLink to="/catalog" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <BookOpen size={20} /> {t('common.study')}
                </NavLink>
                <NavLink to="/events" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <Calendar size={20} /> {t('common.assembly')}
                </NavLink>
                <NavLink to="/discourses" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <BookText size={20} /> {t('common.discourses')}
                </NavLink>
                <NavLink to="/gatepass" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <Shield size={20} /> {t('common.gatepass')}
                </NavLink>

                <div className="mobile-language-section" style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Language:</span>
                    <select
                      value={language}
                      onChange={(e) => { setLanguage(e.target.value, user); closeMobileMenu(); }}
                      className="royal-language-select"
                      style={{ width: '120px' }}
                      id="mobile-language-selector"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी</option>
                      <option value="kn">ಕನ್ನಡ</option>
                    </select>
                  </div>
                </div>

                <div className="mobile-theme-section">
                  <button 
                    onClick={toggleTheme} 
                    className="theme-toggle-btn"
                    style={{ width: '100%', justifyContent: 'center' }}
                    id="mobile-theme-switcher-btn"
                  >
                    <Palette size={16} />
                    <span>Theme: {theme === 'dark' ? 'Salon (Gold)' : 'Academic (Maroon)'}</span>
                  </button>
                </div>

                <div className="mobile-auth">
                  {user ? (
                    <div className="mobile-user-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src={user.photoURL} alt={user.displayName} className="mobile-user-avatar" />
                        <div>
                          <div className="mobile-user-name">{user.displayName}</div>
                          <div className="mobile-user-tier">{user.tier}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', width: '100%' }}>
                        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                          <Link to="/profile" onClick={closeMobileMenu} className="royal-btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {t('common.profileLedger')}
                          </Link>
                          {user?.role === 'ADMIN' && (
                            <Link to="/admin" onClick={closeMobileMenu} className="royal-btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {t('common.curatorConsole')}
                            </Link>
                          )}
                        </div>
                        <button onClick={() => { handleSignOut(); closeMobileMenu(); }} className="sign-out-btn" style={{ width: '100%', padding: '6px 12px' }}>
                          {t('common.leaveRealm')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Link to="/auth/signin" onClick={closeMobileMenu} className="royal-btn mobile-login-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t('common.enterArchway')}
                    </Link>
                  )}
                </div>
              </nav>
            </div>
          )}

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage user={user} onSignIn={handleSignIn} theme={theme} />} />
            <Route path="/catalog" element={<CatalogPage user={user} triggerOnboarding={triggerOnboarding} />} />
            <Route path="/catalog/:id" element={<BookDetailPage user={user} triggerOnboarding={triggerOnboarding} />} />
            <Route path="/events" element={<EventsPage user={user} />} />
            <Route path="/events/:id" element={<EventDetailPage user={user} />} />
            <Route path="/discourses" element={<DiscoursesPage user={user} />} />
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
            <Route path="/profile" element={<ProfilePage user={user} />} />
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
                <span className="gold-gradient-text">The Royal Book Club</span>
              </div>
              <p>Constantly surpassing our bad faith towards absolute freedom by cultivating intellectual community since 2026.</p>
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
            <p>&copy; {new Date().getFullYear()} The Royal Book Club. All rights reserved. Created for premium aesthetic readers.</p>
          </div>
        </footer>

        {/* Premium Google Sign up Consent Overlay */}
        {user && !user.isAnonymous && !user.consentAcceptedAt && (
          <div className="consent-overlay">
            <div className="consent-modal animate-scale-up">
              <div className="consent-modal-header">
                <Sparkles className="gold-glow" size={32} />
                <h2 className="gold-gradient-text">Activate Your Sovereign Portal</h2>
              </div>
              <div className="consent-modal-body">
                <p className="consent-intro">
                  Welcome, seeker of wisdom. Before stepping into the <strong>Royal Book Club</strong>, we require you to accept our covenant of privacy and terms.
                </p>
                <div className="consent-scroll-box">
                  <h4>Covenant Highlights</h4>
                  <ul>
                    <li><strong>Your Personal Sanctuary:</strong> We never sell, rent, or trade your personal data. Your email is used solely for secure access and club communications.</li>
                    <li><strong>Address Registry & Borrowing:</strong> Members may optionally supply a phone number and postal address (including house number) on their profile. This registry is required for active book checkouts.</li>
                    <li><strong>Overdue Outreach:</strong> In the rare event that a checked-out volume is overdue, we reserve the right to contact you directly using your registered email or phone.</li>
                    <li><strong>Future Upgrades:</strong> A member profile photo is a future requirement, currently not active.</li>
                  </ul>
                  <p className="consent-links-text">
                    Please read our full, detailed <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link> and <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms & Conditions</Link>.
                  </p>
                </div>
                <div className="consent-checkbox-field">
                  <label className="consent-checkbox-label">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                    />
                    <span>
                      I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms & Conditions</Link> and have read the <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link>. I provide my explicit consent to royalbookclub.com to process my email and account information for book club activities.
                    </span>
                  </label>
                </div>
              </div>
              <div className="consent-modal-actions">
                <button 
                  onClick={handleSignOut} 
                  className="royal-btn-secondary leave-sanctuary-btn"
                >
                  Leave Sanctuary
                </button>
                <button 
                  onClick={handleAcceptGoogleConsent} 
                  disabled={!consentChecked || consentLoading} 
                  className="royal-btn activate-btn"
                >
                  {consentLoading ? 'Activating...' : 'Agree & Enter'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Onboarding Wizard Overlay */}
        {onboardingOpen && (
          <OnboardingWizard
            user={user}
            targetState={onboardingTarget}
            onClose={() => {
              setOnboardingOpen(false);
              window.dispatchEvent(new CustomEvent('onboarding_closed', { detail: onboardingTarget }));
            }}
            onResume={handleOnboardingResume}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
