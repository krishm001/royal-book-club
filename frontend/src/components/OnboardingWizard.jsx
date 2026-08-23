import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, TwitterAuthProvider, OAuthProvider, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../api/apiClient';
import { X, ChevronRight, ChevronLeft, ShieldAlert, Check, Loader2, Sparkles, Mail, Phone, Home, MapPin, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import '../pages/member/ProfilePage.css'; // Load the exact profile ledger styles directly
import './OnboardingWizard.css';
import CovenantViewerModal from './CovenantViewerModal';
const googleProvider = new GoogleAuthProvider();

// Helper to parse location details from OpenStreetMap Nominatim address
const parseOsmAddress = data => {
  if (!data) return {
    houseNo: '',
    street: '',
    city: '',
    pinCode: ''
  };
  const addr = data.address || {};
  const displayName = data.display_name || '';
  const houseNoVal = addr.house_number || addr.building || addr.amenity || addr.tourism || addr.shop || addr.office || addr.house_name || '';
  let cityVal = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.county || addr.city_district || addr.state_district || addr.state || '';
  const streetComponents = [addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.cycleway, addr.neighbourhood || addr.quarter || addr.hamlet || addr.square || addr.croft || addr.place || addr.residential || addr.commercial].filter(Boolean);
  let streetVal = streetComponents.join(', ');
  const postcodeVal = addr.postcode || '';
  if (displayName) {
    const parts = displayName.split(',').map(p => p.trim());
    if (!cityVal && parts.length > 2) {
      const candidateIndex = parts.length - 3;
      if (candidateIndex >= 0) {
        cityVal = parts[candidateIndex];
      }
    }
    if (!streetVal && parts.length > 1) {
      streetVal = parts.slice(0, Math.min(2, parts.length - 2)).join(', ');
    }
  }
  return {
    houseNo: houseNoVal.trim(),
    street: streetVal.trim(),
    city: cityVal.trim(),
    pinCode: postcodeVal.trim()
  };
};
export default function OnboardingWizard({
  onClose,
  onResume,
  targetState,
  user: initialUser,
  setUser
}) {
  const {
    t
  } = useLanguage();
  const [step, setStep] = useState(1);
  const [authMode, setAuthFormMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Profile Form Fields
  const [phone, setPhone] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');

  // Geolocation and lookup states matching ProfilePage
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [osmSuggestions, setOsmSuggestions] = useState([]);
  const [showOsmSuggestions, setShowOsmSuggestions] = useState(false);
  const [loadingOsmSuggestions, setLoadingOsmSuggestions] = useState(false);

  // Active library gating rules and profile load tracks
  const [gatingSettings, setGatingSettings] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Covenant Consent Checkbox
  const [covenantAccepted, setCovenantAccepted] = useState(false);
  const [covenantViewer, setCovenantViewer] = useState(null); // null, 'terms', or 'privacy'
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  useEffect(() => {
    if (hasAcceptedTerms && hasAcceptedPrivacy) {
      setCovenantAccepted(true);
    }
  }, [hasAcceptedTerms, hasAcceptedPrivacy]);

  // Verify Email Status State
  const [emailVerifySent, setEmailVerifySent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(auth.currentUser?.emailVerified || false);
  const [verificationResendCooldown, setVerificationResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const suggestionsContainerRef = React.useRef(null);
  const debounceTimeoutRef = React.useRef(null);

  // Advance steps
  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // Fetch active gating settings on mount
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

  // Determine gating status matching ProfilePage
  const checkIfProfileMeetsGating = (u, gating) => {
    if (!gating) return false;

    // Check email verification if enforced and user is a password user
    const currentUser = auth.currentUser;
    if (gating.enforceEmailVerification && currentUser) {
      const isPasswordUser = currentUser.providerData?.some(p => p.providerId === 'password');
      if (isPasswordUser && !currentUser.emailVerified) {
        return false;
      }
    }
    if (gating.phoneMandatory && !u?.phone) return false;
    if (gating.houseNoMandatory && !u?.houseNo) return false;
    if (gating.streetMandatory && !u?.street) return false;
    if (gating.cityMandatory && !u?.city) return false;
    if (gating.pinCodeMandatory && !u?.pinCode) return false;
    return true;
  };

  // Poll Firebase auth state every 1 second to see if email becomes verified
  useEffect(() => {
    let intervalId = null;
    const currentUser = auth.currentUser;
    const isPasswordUser = currentUser?.providerData?.some(p => p.providerId === 'password');
    if (currentUser && isPasswordUser && !emailVerified && gatingSettings?.enforceEmailVerification) {
      intervalId = setInterval(async () => {
        try {
          await currentUser.reload();
          if (currentUser.emailVerified) {
            setEmailVerified(true);
            const res = await api.get('/api/v1/auth/me');
            if (res?.data?.success && res?.data?.data) {
              const d = res.data.data;
              const meetsGating = checkIfProfileMeetsGating(d, gatingSettings);
              if (meetsGating) {
                if (onResume) {
                  onResume(targetState);
                }
                onClose();
              }
            }
          }
        } catch (err) {
          console.error("Error reloading auth user in verification polling", err);
        }
      }, 1000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [emailVerified, gatingSettings]);

  // Handle email verification resending
  const handleResendVerification = async () => {
    if (resending || verificationResendCooldown > 0) return;
    setResending(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setVerificationResendCooldown(60);
      }
    } catch (err) {
      console.error("Failed to resend verification email:", err);
    } finally {
      setResending(false);
    }
  };

  // Cooldown countdown timer
  useEffect(() => {
    if (verificationResendCooldown > 0) {
      const timer = setTimeout(() => {
        setVerificationResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [verificationResendCooldown]);
  const forceVerifyCheck = async () => {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setEmailVerified(true);
        const res = await api.get('/api/v1/auth/me');
        if (res?.data?.success && res?.data?.data) {
          const d = res.data.data;
          const meetsGating = checkIfProfileMeetsGating(d, gatingSettings);
          if (meetsGating) {
            if (onResume) {
              onResume(targetState);
            }
            onClose();
          }
        }
      }
    } catch (err) {
      console.error("Manual verification check failed:", err);
    }
  };

  // Load the detailed backend profile and perform auto-skip evaluation
  useEffect(() => {
    const fetchFullProfileAndEvaluate = async () => {
      if (initialUser) {
        setProfileLoading(true);
        try {
          const res = await api.get('/api/v1/auth/me');
          if (res?.data?.success && res?.data?.data) {
            const d = res.data.data;
            setPhone(d.phone || '');
            setHouseNo(d.houseNo || '');
            setStreet(d.street || '');
            setCity(d.city || '');
            setPinCode(d.pinCode || '');
            if (d.firstName) setFirstName(d.firstName);
            if (d.lastName) setLastName(d.lastName);
            if (gatingSettings) {
              const hasConsent = !!d.consentAcceptedAt;
              if (hasConsent) {
                setCovenantAccepted(true);
                const meetsGating = checkIfProfileMeetsGating(d, gatingSettings);
                if (meetsGating) {
                  // Profile is fully complete and complies with all gating: skip and resume target action instantly
                  if (onResume) {
                    onResume(targetState);
                  }
                  onClose();
                  return;
                } else {
                  // Direct to Profile Setup
                  setStep(3);
                }
              } else {
                setStep(2);
              }
            }
          }
        } catch (err) {
          console.error("Failed to load detailed profile in OnboardingWizard:", err);
        } finally {
          setProfileLoading(false);
        }
      }
    };
    fetchFullProfileAndEvaluate();
  }, [initialUser, gatingSettings]);

  // Handle click outside of suggestions to close dropdown
  useEffect(() => {
    const handleClickOutside = event => {
      if (suggestionsContainerRef.current && !suggestionsContainerRef.current.contains(event.target)) {
        setShowOsmSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Geolocation methods identical to ProfilePage
  const detectLocation = () => {
    setDetectingLocation(true);
    setError(null);
    if (!navigator.geolocation) {
      console.warn('HTML5 Geolocation not supported. Falling back to IP Geolocation.');
      detectLocationViaIp();
      return;
    }
    let resolved = false;
    const highAccuracyTimeout = setTimeout(() => {
      if (!resolved) {
        console.warn('High-precision GPS timed out. Retrying with low-precision/cached Wi-Fi Geolocation...');
        tryLowAccuracyGeolocation();
      }
    }, 3500);
    navigator.geolocation.getCurrentPosition(position => {
      if (resolved) return;
      resolved = true;
      clearTimeout(highAccuracyTimeout);
      const {
        latitude,
        longitude
      } = position.coords;
      reverseGeocode(latitude, longitude);
    }, error => {
      if (resolved) return;
      clearTimeout(highAccuracyTimeout);
      console.warn('High-precision GPS failed:', error.message, '. Retrying with low-precision/cached Wi-Fi Geolocation...');
      tryLowAccuracyGeolocation();
    }, {
      enableHighAccuracy: true,
      timeout: 3000,
      maximumAge: 0
    });
    const tryLowAccuracyGeolocation = () => {
      const lowAccuracyTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('Low-precision Geolocation timed out. Falling back to IP-based location lookup.');
          detectLocationViaIp();
        }
      }, 3500);
      navigator.geolocation.getCurrentPosition(position => {
        if (resolved) return;
        resolved = true;
        clearTimeout(lowAccuracyTimeout);
        const {
          latitude,
          longitude
        } = position.coords;
        reverseGeocode(latitude, longitude);
      }, error => {
        if (resolved) return;
        resolved = true;
        clearTimeout(lowAccuracyTimeout);
        console.warn('Low-precision Geolocation failed:', error.message, '. Falling back to IP location.');
        detectLocationViaIp();
      }, {
        enableHighAccuracy: false,
        timeout: 3000,
        maximumAge: 300000
      });
    };
  };
  const reverseGeocode = async (latitude, longitude, ipDataFallback = null) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
      if (!response.ok) throw new Error('OSM Nominatim reverse geocode failed');
      const data = await response.json();
      if (data) {
        const parsed = parseOsmAddress(data);
        setHouseNo(parsed.houseNo || '');
        setStreet(parsed.street || '');
        setCity(parsed.city || '');
        setPinCode(parsed.pinCode || '');
        setSearchQuery(data.display_name);
        setDetectingLocation(false);
      } else {
        throw new Error('Invalid Nominatim response format');
      }
    } catch (err) {
      console.error('Nominatim reverse geocode failed:', err);
      if (ipDataFallback) {
        populateAddressFromIp(ipDataFallback);
      } else {
        await detectLocationViaIp();
      }
    }
  };
  const detectLocationViaIp = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('IP coordinates fetch failed');
      const data = await response.json();
      if (data && data.latitude && data.longitude) {
        await reverseGeocode(data.latitude, data.longitude, data);
      } else {
        throw new Error('Invalid IP data format');
      }
    } catch (err) {
      console.error('IP location extraction failed:', err);
      setError('Failed to extract physical coordinates via GPS or IP. Please enter address manually.');
      setDetectingLocation(false);
    }
  };
  const populateAddressFromIp = data => {
    setCity(data.city || '');
    setPinCode(data.postal || '');
    setStreet(data.region || '');
    setSearchQuery(`${data.city || ''}, ${data.region || ''} ${data.postal || ''}, ${data.country_name || ''}`.trim().replace(/^,\s*/, ''));
    setDetectingLocation(false);
  };

  // Suggestions search handlers
  const fetchOsmSuggestions = async query => {
    if (!query || query.length < 3) {
      setOsmSuggestions([]);
      return;
    }
    setLoadingOsmSuggestions(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`);
      if (!response.ok) throw new Error('OSM Nominatim search failed');
      const data = await response.json();
      setOsmSuggestions(data || []);
    } catch (err) {
      console.error('OSM Nominatim autocomplete query failed:', err);
    } finally {
      setLoadingOsmSuggestions(false);
    }
  };
  const handleSearchQueryChange = e => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowOsmSuggestions(true);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (!value.trim() || value.length < 3) {
      setOsmSuggestions([]);
      return;
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchOsmSuggestions(value);
    }, 1000);
  };
  const handleSelectOsmSuggestion = suggestion => {
    if (suggestion) {
      const parsed = parseOsmAddress(suggestion);
      setHouseNo(parsed.houseNo || '');
      setStreet(parsed.street || '');
      setCity(parsed.city || '');
      setPinCode(parsed.pinCode || '');
    }
    setSearchQuery(suggestion.display_name);
    setShowOsmSuggestions(false);
    setOsmSuggestions([]);
  };

  // Submit Sign In
  const handleEmailSignIn = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Submit Sign Up
  const handleEmailSignUp = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      if (userCred.user) {
        await sendEmailVerification(userCred.user);
        setEmailVerifySent(true);
      }
      await api.post('/api/v1/auth/register', {
        uid: userCred.user.uid,
        email: email,
        displayName: `${firstName || ''} ${lastName || ''}`.trim()
      });
    } catch (err) {
      let errorMsg = err.message || 'Registration failed';
      if (err.code === 'auth/email-already-in-use' || (err.message && err.message.includes('email-already-in-use'))) {
          errorMsg = "Sorry. This email is already in use.";
      } else {
          errorMsg = "Sorry for the glitch, Please contact Admin.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  const handleSocialSignIn = async provider => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Social login failed:", err);
      let errorMsg = err.message || 'Authentication failed';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          errorMsg = "Invalid email or password.";
      } else {
          errorMsg = "Sorry for the glitch, Please contact Admin.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  const handleLinkedInSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      // Save current full URL including hash router parameters for post-login seamless routing
      sessionStorage.setItem('linkedin_redirect_target', window.location.href);
      if (targetState) {
        sessionStorage.setItem('pending_onboarding_target', JSON.stringify(targetState));
      }
      const redirectUri = window.location.origin;
      const res = await api.get(`/api/v1/auth/linkedin/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      if (res.data) {
        window.location.href = res.data;
      }
    } catch (err) {
      console.error("LinkedIn login init failed:", err);
      setError("Failed to initialize LinkedIn Login");
    } finally {
      setLoading(false);
    }
  };

  // Save Terms and Covenant acceptance
  const handleAcceptCovenant = async (forceAccepted = false) => {
    if (!covenantAccepted && !forceAccepted) return;
    setError(null);
    setLoading(true);
    try {
      const consentDate = new Date();
      await api.put('/api/v1/users/profile', {
        consentAcceptedAt: consentDate
      });
      if (setUser) {
        setUser(prev => ({
          ...prev,
          consentAcceptedAt: consentDate
        }));
      }
      const updatedUser = {
        phone,
        houseNo,
        street,
        city,
        pinCode,
        consentAcceptedAt: consentDate
      };
      const meetsGating = checkIfProfileMeetsGating(updatedUser, gatingSettings);
      if (meetsGating) {
        if (onResume) {
          onResume(targetState);
        }
        onClose();
      } else {
        setStep(3); // Onward to Profile setup
      }
    } catch (err) {
      setError(err.message || 'Failed to record covenant assent');
    } finally {
      setLoading(false);
    }
  };

  // Complete profile setup and resume targets
  const handleSaveProfile = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const updatePayload = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone,
        houseNo: houseNo,
        street: street,
        city: city,
        pinCode: pinCode
      };
      await api.put('/api/v1/users/profile', updatePayload);
      if (setUser) {
        setUser(prev => ({
          ...prev,
          displayName: `${firstName || ''} ${lastName || ''}`.trim() || prev.displayName
        }));
      }
      if (onResume) {
        onResume(targetState);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save profile details');
    } finally {
      setLoading(false);
    }
  };

  // Real-time calculation of missing fields
  const missingFields = [];
  if (gatingSettings?.enforceEmailVerification && auth.currentUser?.providerData?.some(p => p.providerId === 'password') && !emailVerified) {
    missingFields.push('Email Verification');
  }
  if (gatingSettings?.phoneMandatory && !phone.trim()) missingFields.push('Phone Number');
  if (gatingSettings?.houseNoMandatory && !houseNo.trim()) missingFields.push('House/Apartment Number');
  if (gatingSettings?.streetMandatory && !street.trim()) missingFields.push('Street Address');
  if (gatingSettings?.cityMandatory && !city.trim()) missingFields.push('City');
  if (gatingSettings?.pinCodeMandatory && !pinCode.trim()) missingFields.push('Postal/PIN Code');
  const isGated = missingFields.length > 0;
  return <div className="onboarding-overlay">
      <div className="onboarding-container" style={{
      maxWidth: step === 3 ? '1000px' : '580px',
      transition: 'max-width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      flexDirection: 'column'
    }}>
        
        {/* Header */}
        <div className="onboarding-header">
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
            <Sparkles className="gold-glow" size={22} style={{
            color: 'var(--accent)'
          }} />
            <h3 className="onboarding-title">{t('auto_3080', 'Royal Archway')}</h3>
          </div>
          <button onClick={onClose} className="onboarding-btn-secondary" style={{
          padding: '6px',
          borderRadius: '50%',
          display: 'flex'
        }}>
            <X size={18} />
          </button>
        </div>

        {/* Progress Fill */}
        <div className="onboarding-progress-bar">
          <div className="onboarding-progress-fill" style={{
          width: `${step / 3 * 100}%`
        }}></div>
        </div>

        {/* Wizard Body */}
        <div className="onboarding-body" style={{
        overflowY: 'auto',
        flex: 1
      }}>
          
          {/* Step Indicator dots */}
          <div className="onboarding-step-indicator">
            <div className={`onboarding-step-dot ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="onboarding-step-circle">{step > 1 ? <Check size={14} /> : '1'}</div>
              <span className="onboarding-step-label">{t('auto_3081', 'Gatekeeper')}</span>
            </div>
            <div className={`onboarding-step-dot ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="onboarding-step-circle">{step > 2 ? <Check size={14} /> : '2'}</div>
              <span className="onboarding-step-label">{t('auto_3082', 'Terms Consent')}</span>
            </div>
            <div className={`onboarding-step-dot ${step === 3 ? 'active' : ''}`}>
              <div className="onboarding-step-circle">3</div>
              <span className="onboarding-step-label">{t('auto_3083', 'Profile Setup')}</span>
            </div>
          </div>

          {/* Profile Loader */}
          {profileLoading ? <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '50px 20px',
          gap: '12px'
        }}>
              <Loader2 className="animate-spin gold-glow-icon" size={32} />
              <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }}>{t('auto_3084', 'Retrieving personal archive coordinates...')}</p>
            </div> : <>
              {step === 1 && <div className="onboarding-step-panel animate-fade-in">
                  <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
                    {t('auto_3085', 'Create or verify your elite credentials to unlock catalog search, scans, and checkout mechanisms.')}
                  </p>

                  {/* Social Login buttons */}
                  <div className="social-grid">
                    <button type="button" className="onboarding-social-btn" onClick={() => handleSocialSignIn(googleProvider)}>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt={t("str_5039", "Google")} style={{
                  width: '16px',
                  height: '16px'
                }} />
                      {t('auto_3086', 'Google')}
                    </button>
                    <button type="button" className="onboarding-social-btn" onClick={handleLinkedInSignIn}>
                      <span style={{
                  color: '#0077b5',
                  fontWeight: 'bold'
                }}>{t("str_5040", "in")}</span> {t('auto_3087', 'LinkedIn')}
                    </button>
                    
                  </div>

                  <div className="onboarding-divider">{t('auto_3088', 'or use professional email')}</div>

                  {authMode === 'signin' ? <form onSubmit={handleEmailSignIn}>
                      <div className="onboarding-form-group">
                        <label>{t('auto_3089', 'Email Address')}</label>
                        <input type="email" required className="onboarding-input" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("str_5045", "name@domain.com")} />
                      </div>
                      <div className="onboarding-form-group">
                        <label>{t('auto_3090', 'Passphrase')}</label>
                        <input type="password" required className="onboarding-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                      </div>
                      {error && <div style={{
                color: 'var(--error)',
                fontSize: '0.85rem',
                marginBottom: '12px'
              }}><ShieldAlert size={14} style={{
                  display: 'inline',
                  marginRight: '4px',
                  verticalAlign: 'text-bottom'
                }} /> {error}</div>}
                      <button type="submit" disabled={loading} className="onboarding-btn onboarding-btn-primary" style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: '10px'
              }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Enter Archway'}
                      </button>
                      <p style={{
                textAlign: 'center',
                fontSize: '0.82rem',
                marginTop: '16px',
                color: 'var(--text-secondary)'
              }}> {t("str_5046", "New reader?")} <button type="button" onClick={() => setAuthFormMode('signup')} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}>{t('auto_3091', 'Create Account')}</button>
                      </p>
                    </form> : <form onSubmit={handleEmailSignUp}>
                      <div className="name-fields-row" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        <div className="onboarding-form-group">
                          <label>{t('auto_3092', 'First Name')}</label>
                          <input type="text" required className="onboarding-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t("str_5047", "Royal")} />
                        </div>
                        <div className="onboarding-form-group">
                          <label>{t('auto_3093', 'Last Name')}</label>
                          <input type="text" required className="onboarding-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t("str_5048", "Reader")} />
                        </div>
                      </div>
                      <div className="onboarding-form-group">
                        <label>{t('auto_3094', 'Email Address')}</label>
                        <input type="email" required className="onboarding-input" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("str_5049", "name@domain.com")} />
                      </div>
                      <div className="onboarding-form-group">
                        <label>{t('auto_3095', 'Create Passphrase')}</label>
                        <input type="password" required className="onboarding-input" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("str_5050", "Minimum 6 characters")} />
                      </div>
                      {error && <div style={{
                color: 'var(--error)',
                fontSize: '0.85rem',
                marginBottom: '12px'
              }}><ShieldAlert size={14} style={{
                  display: 'inline',
                  marginRight: '4px',
                  verticalAlign: 'text-bottom'
                }} /> {error}</div>}
                      {emailVerifySent && <div style={{
                background: 'rgba(46, 125, 50, 0.1)',
                border: '1px solid var(--success)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: 'var(--success)',
                fontSize: '0.85rem',
                marginBottom: '12px'
              }}>
                          {t('auto_3096', 'Verification link dispatched! Please check your email inbox to verify.')}
                        </div>}
                      <button type="submit" disabled={loading} className="onboarding-btn onboarding-btn-primary" style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: '10px'
              }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Register & Send Verification Link'}
                      </button>
                      <p style={{
                textAlign: 'center',
                fontSize: '0.82rem',
                marginTop: '16px',
                color: 'var(--text-secondary)'
              }}> {t("str_5051", "Have account?")} <button type="button" onClick={() => setAuthFormMode('signin')} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}>{t('auto_3097', 'Sign In')}</button>
                      </p>
                    </form>}
                </div>}

              {step === 2 && <div className="onboarding-step-panel animate-fade-in">
                  <p style={{
              fontSize: '1rem',
              color: 'var(--text-primary)',
              fontWeight: 600,
              marginBottom: '16px',
              textAlign: 'center'
            }}>
                    {t('auto_3098', 'Terms & Privacy Consent')}
                  </p>

                  <div className="onboarding-disclaimer-wrapper" style={{
              margin: '20px 0',
              padding: '16px',
              background: 'rgba(212, 165, 116, 0.03)',
              border: '1px solid rgba(212, 165, 116, 0.15)',
              borderRadius: '8px',
              fontSize: '0.88rem',
              lineHeight: '1.5',
              color: 'var(--text-primary)',
              textAlign: 'left'
            }}>
                    <span>
                      {t('auth.consentPart1', 'I hereby acknowledge that I have read and agree to the')}
                      {' '}<a href="#/terms" onClick={e => {
                  e.preventDefault();
                  setCovenantViewer('terms');
                }} style={{
                  color: 'var(--accent)',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}>{t('common.termsAndConditions', 'Terms and Conditions')}</a>{' '}
                      {t('auth.consentPart2', 'and')}
                      {' '}<a href="#/privacy" onClick={e => {
                  e.preventDefault();
                  setCovenantViewer('privacy');
                }} style={{
                  color: 'var(--accent)',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}>{t('common.privacyNotice', 'Privacy Notice')}</a>{' '}
                      {t('auth.consentPart3', 'governing the usage of the Royal Library circulation platform.')}
                    </span>
                  </div>

                  <label className="covenant-checkbox-label" style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              cursor: 'pointer',
              margin: '20px 0'
            }}>
                    <input type="checkbox" checked={covenantAccepted} onChange={e => setCovenantAccepted(e.target.checked)} style={{
                marginTop: '3px',
                minWidth: '18px',
                minHeight: '18px'
              }} />
                    <span style={{
                fontSize: '0.88rem',
                lineHeight: '1.4',
                color: 'var(--text-primary)'
              }}> {t("str_5052", "I solemnly consent and covenant to abide by the Scribe's deadlines, respect physical book custody, and preserve original works.")} </span>
                  </label>

                  {error && <div style={{
              color: 'var(--error)',
              fontSize: '0.85rem',
              marginTop: '12px'
            }}><ShieldAlert size={14} style={{
                display: 'inline',
                marginRight: '4px'
              }} /> {error}</div>}

                  <div className="onboarding-footer" style={{
              padding: '20px 0 0 0',
              marginTop: '20px'
            }}>
                    <button type="button" onClick={prevStep} className="onboarding-btn onboarding-btn-secondary">
                      <ChevronLeft size={16} /> {t('auto_3099', 'Back')}
                    </button>
                    <button type="button" onClick={handleAcceptCovenant} disabled={!covenantAccepted || loading} className="onboarding-btn onboarding-btn-primary">
                      {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Covenant'} <ChevronRight size={16} />
                    </button>
                  </div>
                </div>}

              {step === 3 && <div className="onboarding-step-panel animate-fade-in" style={{
            width: '100%'
          }}>
                  
                  {/* Status Banner */}
                  <section className="profile-status-banner" style={{
              marginBottom: '20px'
            }}>
                    {isGated ? <div className="royal-card status-card gated animate-pulse-border" style={{
                padding: '12px 16px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center'
              }}>
                        <div className="status-icon-wrapper gated" style={{
                  width: '32px',
                  height: '32px'
                }}>
                          <AlertTriangle size={18} />
                        </div>
                        <div className="status-text-content">
                          <h3 className="gated-title" style={{
                    fontSize: '0.95rem',
                    margin: 0,
                    fontWeight: 700
                  }}>{t('auto_3100', 'Self-Checkout Locked')}</h3>
                          <p className="gated-desc" style={{
                    fontSize: '0.8rem',
                    margin: '2px 0 0 0',
                    color: 'var(--text-secondary)'
                  }}> {t("str_5053", "Missing required gating fields:")} <strong style={{
                      color: 'var(--accent)'
                    }}>{missingFields.join(', ')}</strong>.
                          </p>
                        </div>
                      </div> : <div className="royal-card status-card unlocked" style={{
                padding: '12px 16px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center'
              }}>
                        <div className="status-icon-wrapper unlocked" style={{
                  width: '32px',
                  height: '32px'
                }}>
                          <CheckCircle size={18} />
                        </div>
                        <div className="status-text-content">
                          <h3 className="unlocked-title" style={{
                    fontSize: '0.95rem',
                    margin: 0,
                    fontWeight: 700
                  }}>{t('auto_3101', 'Self-Checkout Unlocked')}</h3>
                          <p className="unlocked-desc" style={{
                    fontSize: '0.8rem',
                    margin: '2px 0 0 0',
                    color: 'var(--text-secondary)'
                  }}>
                            {t('auto_3102', 'All administrative gating rules are fully satisfied. You can use instant self-checkout!')}
                          </p>
                        </div>
                      </div>}
                  </section>

                  {gatingSettings?.enforceEmailVerification && auth.currentUser?.providerData?.some(p => p.providerId === 'password') && !emailVerified ? <div className="email-verification-blocking-panel animate-fade-in royal-card" style={{
              padding: '24px',
              margin: '20px 0',
              border: '1px solid rgba(212,165,116,0.3)',
              background: 'rgba(212,165,116,0.02)'
            }}>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                        <div className="pulsing-mail-icon" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(212,165,116,0.1)',
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  marginBottom: '10px',
                  boxShadow: '0 0 20px rgba(212,165,116,0.2)'
                }}>
                          <Mail size={40} className="gold-glow-icon animate-pulse" style={{
                    color: 'var(--accent)'
                  }} />
                        </div>
                        <h3 className="section-title-royal" style={{
                  color: 'var(--accent)',
                  marginTop: '0',
                  fontSize: '1.2rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>{t('auto_3103', 'Royal Verification Gating')}</h3>
                        <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  margin: '12px 0 24px 0',
                  maxWidth: '440px',
                  lineHeight: '1.6'
                }}> {t("str_5054", "An administrator has enforced mandatory email verification for secure self-checkout. Please check your inbox (")}<strong>{auth.currentUser?.email}</strong>{t("str_5055", ") and click the verification link to unblock checkout.")} </p>
                        <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}>
                          <button type="button" onClick={handleResendVerification} disabled={verificationResendCooldown > 0 || resending} className="royal-btn-secondary" style={{
                    padding: '10px 20px',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                            {resending ? <Loader2 className="animate-spin" size={14} /> : verificationResendCooldown > 0 ? `Resend link in ${verificationResendCooldown}s` : 'Resend Verification Email'}
                          </button>
                          <button type="button" onClick={forceVerifyCheck} className="royal-btn" style={{
                    padding: '10px 20px',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                            {t('auto_3104', 'Check Verification Now')}
                          </button>
                        </div>
                      </div>
                    </div> : <div className="profile-form-grid" style={{
              gap: '20px'
            }}>
                    
                    {/* Left Form Column */}
                    <div className="royal-card form-card-glass" style={{
                padding: '0',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none'
              }}>
                      <form onSubmit={handleSaveProfile} className="profile-form">
                        <h3 className="section-title-royal" style={{
                    fontSize: '0.9rem',
                    marginBottom: '15px'
                  }}>{t('auto_3105', 'Personal Coordinates')}</h3>
                        
                        <div className="form-row">
                          <div className="form-group flex-1">
                            <label htmlFor="firstName" style={{
                        fontSize: '0.75rem'
                      }}>{t('auto_3106', 'First Name')}</label>
                            <input type="text" id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t("str_5056", "e.g. Immanuel")} className="royal-input" />
                          </div>
                          <div className="form-group flex-1">
                            <label htmlFor="lastName" style={{
                        fontSize: '0.75rem'
                      }}>{t('auto_3107', 'Last Name')}</label>
                            <input type="text" id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t("str_5057", "e.g. Kant")} className="royal-input" />
                          </div>
                        </div>

                        <div className="form-group" style={{
                    marginTop: '10px'
                  }}>
                          <label htmlFor="phone" className="required-marker-label" style={{
                      fontSize: '0.75rem'
                    }}> {t("str_5058", "Phone Number")} {gatingSettings?.phoneMandatory && <span className="gold-text-req">*</span>}
                          </label>
                          <div className="input-with-icon-wrapper">
                            <Phone className="input-field-icon" size={14} style={{
                        left: '12px'
                      }} />
                            <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} required={gatingSettings?.phoneMandatory} placeholder={t("str_5059", "e.g. +1 (555) 019-2831")} className="royal-input input-padded-left" />
                          </div>
                        </div>

                        <hr className="royal-divider" />

                        <div className="address-section-header">
                          <h3 className="section-title-royal" style={{
                      fontSize: '0.9rem',
                      marginBottom: '5px'
                    }}>{t('auto_3108', 'Address Registry')}</h3>
                          <p className="address-section-sub" style={{
                      fontSize: '0.78rem'
                    }}>{t('auto_3109', 'Verify physical billing address to fulfill checkout regulations.')}</p>
                        </div>

                        {/* Geolocation Address Extraction Button */}
                        <div className="form-group location-detection-group" style={{
                    marginBottom: '10px'
                  }}>
                          <button type="button" onClick={detectLocation} disabled={detectingLocation} className="royal-btn detect-location-btn" style={{
                      display: 'inline-flex',
                      width: 'auto',
                      alignSelf: 'flex-start',
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      gap: '6px'
                    }}>
                            {detectingLocation ? <>
                                <Loader2 className="animate-spin mr-2" size={14} /> {t('auto_3110', 'Locating...')}
                              </> : <>
                                <MapPin size={14} className="gold-glow-icon mr-2" /> {t('auto_3111', 'Detect My Location')}
                              </>}
                          </button>
                        </div>

                        {/* Autocomplete Search Field */}
                        <div className="form-group" ref={suggestionsContainerRef} style={{
                    position: 'relative'
                  }}>
                          <label htmlFor="googleAddressSearch" style={{
                      fontSize: '0.75rem'
                    }}>{t('auto_3112', 'Address Lookup')}</label>
                          <div className="input-with-icon-wrapper">
                            <Search className="input-field-icon" size={14} style={{
                        left: '12px'
                      }} />
                            <input type="text" id="googleAddressSearch" value={searchQuery} onChange={handleSearchQueryChange} placeholder={t("str_5060", "Type address to auto-fill...")} className="royal-input input-padded-left" onKeyDown={e => {
                        if (e.key === 'Enter') e.preventDefault();
                      }} />
                            {loadingOsmSuggestions && <Loader2 className="animate-spin input-spinner-icon" size={14} />}
                          </div>

                          {showOsmSuggestions && osmSuggestions.length > 0 && <ul className="osm-suggestions-dropdown" style={{
                      zIndex: 1050,
                      position: 'absolute',
                      width: '100%'
                    }}>
                              {osmSuggestions.map(suggestion => <li key={suggestion.place_id} onClick={() => handleSelectOsmSuggestion(suggestion)} className="osm-suggestion-item">
                                  <MapPin size={12} className="suggestion-pin-icon" />
                                  <span className="suggestion-text" style={{
                          fontSize: '0.8rem'
                        }}>{suggestion.display_name}</span>
                                </li>)}
                            </ul>}
                        </div>

                        <div className="form-row" style={{
                    marginTop: '10px'
                  }}>
                          <div className="form-group flex-1">
                            <label htmlFor="houseNo" style={{
                        fontSize: '0.75rem'
                      }}> {t("str_5061", "House/Suite #")} {gatingSettings?.houseNoMandatory && <span className="gold-text-req">*</span>}
                            </label>
                            <input type="text" id="houseNo" value={houseNo} onChange={e => setHouseNo(e.target.value)} required={gatingSettings?.houseNoMandatory} placeholder={t("str_5062", "e.g. Suite 404")} className="royal-input" />
                          </div>
                          <div className="form-group flex-2">
                            <label htmlFor="street" style={{
                        fontSize: '0.75rem'
                      }}> {t("str_5063", "Street Address")} {gatingSettings?.streetMandatory && <span className="gold-text-req">*</span>}
                            </label>
                            <input type="text" id="street" value={street} onChange={e => setStreet(e.target.value)} required={gatingSettings?.streetMandatory} placeholder={t("str_5064", "e.g. Boulevard of Philosophy")} className="royal-input" />
                          </div>
                        </div>

                        <div className="form-row" style={{
                    marginTop: '10px'
                  }}>
                          <div className="form-group flex-1">
                            <label htmlFor="city" style={{
                        fontSize: '0.75rem'
                      }}> {t("str_5065", "Municipal City")} {gatingSettings?.cityMandatory && <span className="gold-text-req">*</span>}
                            </label>
                            <input type="text" id="city" value={city} onChange={e => setCity(e.target.value)} required={gatingSettings?.cityMandatory} placeholder={t("str_5066", "e.g. K\xF6nigsberg")} className="royal-input" />
                          </div>
                          <div className="form-group flex-1">
                            <label htmlFor="pinCode" style={{
                        fontSize: '0.75rem'
                      }}> {t("str_5067", "Postal/PIN Code")} {gatingSettings?.pinCodeMandatory && <span className="gold-text-req">*</span>}
                            </label>
                            <input type="text" id="pinCode" value={pinCode} onChange={e => setPinCode(e.target.value)} required={gatingSettings?.pinCodeMandatory} placeholder={t("str_5068", "e.g. 10928")} className="royal-input" />
                          </div>
                        </div>

                        {error && <div style={{
                    color: 'var(--error)',
                    fontSize: '0.85rem',
                    marginTop: '12px'
                  }}><ShieldAlert size={14} style={{
                      display: 'inline',
                      marginRight: '4px'
                    }} /> {error}</div>}

                        <div className="onboarding-footer" style={{
                    padding: '20px 0 0 0',
                    marginTop: '20px',
                    borderTop: '1px solid var(--glass-border)',
                    background: 'transparent'
                  }}>
                          <button type="button" onClick={prevStep} className="onboarding-btn onboarding-btn-secondary">
                            <ChevronLeft size={16} /> {t('auto_3113', 'Back')}
                          </button>
                          <button type="submit" disabled={loading} className="onboarding-btn onboarding-btn-primary">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Complete Setup'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Right Checklist Column */}
                    <div className="right-column-container" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                      <div className="royal-card checklist-card-glass" style={{
                  padding: '20px',
                  background: 'var(--surface-elevated)'
                }}>
                        <h3 className="section-title-royal" style={{
                    fontSize: '0.9rem',
                    marginBottom: '10px'
                  }}>{t('auto_3114', 'Gating Diagnostics')}</h3>
                        <p className="checklist-subtitle" style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '15px'
                  }}>
                          {t('auto_3115', 'Verify remaining credential checkmarks to unlock direct-tap self checkout features.')}
                        </p>

                        <div className="checklist-items" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                          {gatingSettings?.enforceEmailVerification && auth.currentUser?.providerData?.some(p => p.providerId === 'password') && <div className="checklist-item" style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}>
                              <div className={`status-indicator ${emailVerified ? 'completed' : 'missing'}`}>
                                {emailVerified ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                              </div>
                              <div className="checklist-text">
                                <span className="checklist-label" style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'block'
                        }}>{t('auto_3116', 'Email Verification')}</span>
                                <span className="checklist-requirement" style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)'
                        }}>
                                  {t('auto_3117', 'Mandatory Field')}
                                </span>
                              </div>
                            </div>}

                          <div className="checklist-item" style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}>
                            <div className={`status-indicator ${phone.trim() ? 'completed' : gatingSettings?.phoneMandatory ? 'missing' : 'optional'}`}>
                              {phone.trim() ? <CheckCircle size={14} /> : gatingSettings?.phoneMandatory ? <AlertTriangle size={14} /> : <CheckCircle size={14} style={{
                          opacity: 0.3
                        }} />}
                            </div>
                            <div className="checklist-text">
                              <span className="checklist-label" style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'block'
                        }}>{t('auto_3118', 'Phone Number')}</span>
                              <span className="checklist-requirement" style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)'
                        }}>
                                {gatingSettings?.phoneMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                              </span>
                            </div>
                          </div>

                          <div className="checklist-item" style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}>
                            <div className={`status-indicator ${houseNo.trim() ? 'completed' : gatingSettings?.houseNoMandatory ? 'missing' : 'optional'}`}>
                              {houseNo.trim() ? <CheckCircle size={14} /> : gatingSettings?.houseNoMandatory ? <AlertTriangle size={14} /> : <CheckCircle size={14} style={{
                          opacity: 0.3
                        }} />}
                            </div>
                            <div className="checklist-text">
                              <span className="checklist-label" style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'block'
                        }}>{t('auto_3119', 'House/Suite #')}</span>
                              <span className="checklist-requirement" style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)'
                        }}>
                                {gatingSettings?.houseNoMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                              </span>
                            </div>
                          </div>

                          <div className="checklist-item" style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}>
                            <div className={`status-indicator ${street.trim() ? 'completed' : gatingSettings?.streetMandatory ? 'missing' : 'optional'}`}>
                              {street.trim() ? <CheckCircle size={14} /> : gatingSettings?.streetMandatory ? <AlertTriangle size={14} /> : <CheckCircle size={14} style={{
                          opacity: 0.3
                        }} />}
                            </div>
                            <div className="checklist-text">
                              <span className="checklist-label" style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'block'
                        }}>{t('auto_3120', 'Street Address')}</span>
                              <span className="checklist-requirement" style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)'
                        }}>
                                {gatingSettings?.streetMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                              </span>
                            </div>
                          </div>

                          <div className="checklist-item" style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}>
                            <div className={`status-indicator ${city.trim() ? 'completed' : gatingSettings?.cityMandatory ? 'missing' : 'optional'}`}>
                              {city.trim() ? <CheckCircle size={14} /> : gatingSettings?.cityMandatory ? <AlertTriangle size={14} /> : <CheckCircle size={14} style={{
                          opacity: 0.3
                        }} />}
                            </div>
                            <div className="checklist-text">
                              <span className="checklist-label" style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'block'
                        }}>{t('auto_3121', 'Municipal City')}</span>
                              <span className="checklist-requirement" style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)'
                        }}>
                                {gatingSettings?.cityMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                              </span>
                            </div>
                          </div>

                          <div className="checklist-item" style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}>
                            <div className={`status-indicator ${pinCode.trim() ? 'completed' : gatingSettings?.pinCodeMandatory ? 'missing' : 'optional'}`}>
                              {pinCode.trim() ? <CheckCircle size={14} /> : gatingSettings?.pinCodeMandatory ? <AlertTriangle size={14} /> : <CheckCircle size={14} style={{
                          opacity: 0.3
                        }} />}
                            </div>
                            <div className="checklist-text">
                              <span className="checklist-label" style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'block'
                        }}>{t('auto_3122', 'PIN Code')}</span>
                              <span className="checklist-requirement" style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)'
                        }}>
                                {gatingSettings?.pinCodeMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>}

                </div>}
            </>}

        </div>
      </div>
      {covenantViewer && <CovenantViewerModal type={covenantViewer} onAccept={() => {
      if (covenantViewer === 'terms') {
        setHasAcceptedTerms(true);
      } else if (covenantViewer === 'privacy') {
        setHasAcceptedPrivacy(true);
      }
      setCovenantViewer(null);
    }} onDecline={async () => {
      setCovenantViewer(null);
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Sign out failed on decline:", err);
      }
      onClose();
    }} onClose={() => setCovenantViewer(null)} />}
    </div>;
}