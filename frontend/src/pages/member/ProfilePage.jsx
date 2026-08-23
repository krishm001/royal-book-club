import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, MapPin, Search, CheckCircle, AlertTriangle, ArrowLeft, Loader2, Sparkles, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { getCurrentUserProfile, updateUserProfile } from '../../services/userApi';
import { getCheckoutSettings } from '../../services/checkoutSettingsApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './ProfilePage.css';

// Helper to parse location details from OpenStreetMap Nominatim address & display_name with advanced fallback split-parsing
const parseOsmAddress = data => {
  if (!data) return {
    houseNo: '',
    street: '',
    city: '',
    pinCode: ''
  };
  const addr = data.address || {};
  const displayName = data.display_name || '';

  // 1. Extract house number / building / amenity details
  const houseNoVal = addr.house_number || addr.building || addr.amenity || addr.tourism || addr.shop || addr.office || addr.house_name || '';

  // 2. Extract city / town / village / suburb / municipality
  let cityVal = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.county || addr.city_district || addr.state_district || addr.state || '';

  // 3. Extract street name (combining road, neighbourhood, suburb, etc. if available)
  const streetComponents = [addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.cycleway, addr.neighbourhood || addr.quarter || addr.hamlet || addr.square || addr.croft || addr.place || addr.residential || addr.commercial].filter(Boolean);
  let streetVal = streetComponents.join(', ');

  // 4. Extract postcode
  const postcodeVal = addr.postcode || '';

  // 5. Fallback Parsing via comma-split of display_name if city or street are still empty
  if (displayName) {
    const parts = displayName.split(',').map(p => p.trim());

    // If city is still empty and we have enough parts, extract from display_name
    if (!cityVal && parts.length > 2) {
      // Typically, city/town is around 3-4 elements from the end (excluding postcode/country)
      const candidateIndex = parts.length - 3;
      if (candidateIndex >= 0) {
        cityVal = parts[candidateIndex];
      }
    }

    // If street is still empty and we have enough parts
    if (!streetVal && parts.length > 1) {
      // Use the first 1-2 parts of display_name
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
const ProfilePage = ({
  user
}) => {
  const {
    language,
    setLanguage,
    t
  } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    houseNo: '',
    street: '',
    city: '',
    pinCode: '',
    language: 'en'
  });
  const [settings, setSettings] = useState({
    phoneMandatory: false,
    houseNoMandatory: false,
    streetMandatory: false,
    cityMandatory: false,
    pinCodeMandatory: false,
    enforceEmailVerification: false
  });
  const [emailVerified, setEmailVerified] = useState(auth.currentUser?.emailVerified || false);
  const [verificationResendCooldown, setVerificationResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // OpenStreetMap Autocomplete state & refs
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [osmSuggestions, setOsmSuggestions] = useState([]);
  const [showOsmSuggestions, setShowOsmSuggestions] = useState(false);
  const [loadingOsmSuggestions, setLoadingOsmSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const suggestionsContainerRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const autocompleteInputRef = useRef(null);

  // Message notifications
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => {
    const loadProfileAndSettings = async () => {
      try {
        setLoading(true);
        // Load active checkout gating settings
        const settingsRes = await getCheckoutSettings();
        if (settingsRes?.success && settingsRes?.data) {
          setSettings(settingsRes.data);
        }

        // Load profile
        const profileRes = await getCurrentUserProfile();
        if (profileRes?.success && profileRes?.data) {
          const d = profileRes.data;
          setProfile({
            firstName: d.firstName || '',
            lastName: d.lastName || '',
            phone: d.phone || '',
            houseNo: d.houseNo || '',
            street: d.street || '',
            city: d.city || '',
            pinCode: d.pinCode || '',
            language: d.language || 'en'
          });
        }
      } catch (err) {
        console.error('Failed to load profile details or settings', err);
        setMessage({
          type: 'error',
          text: 'Failed to synchronize with the Royal Archives. Please check your connection.'
        });
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      loadProfileAndSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Poll Firebase auth state every 1 second to see if email becomes verified
  useEffect(() => {
    let intervalId = null;
    const currentUser = auth.currentUser;
    const isPasswordUser = currentUser?.providerData?.some(p => p.providerId === 'password');
    if (currentUser && isPasswordUser && !emailVerified && settings?.enforceEmailVerification) {
      intervalId = setInterval(async () => {
        try {
          await currentUser.reload();
          if (currentUser.emailVerified) {
            setEmailVerified(true);
          }
        } catch (err) {
          console.error("Error reloading auth user in verification polling on ProfilePage", err);
        }
      }, 1000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [emailVerified, settings]);

  // Handle email verification resending
  const handleResendVerification = async () => {
    if (resending || verificationResendCooldown > 0) return;
    setResending(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setVerificationResendCooldown(60);
        setMessage({
          type: 'success',
          text: 'Verification link dispatched! Please check your email inbox.'
        });
      }
    } catch (err) {
      console.error("Failed to resend verification email:", err);
      setMessage({
        type: 'error',
        text: 'Failed to dispatch verification link. Please try again.'
      });
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
        setMessage({
          type: 'success',
          text: 'Sovereign email successfully verified and synchronized!'
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Email remains unverified. Please inspect your mailbox or resend the link.'
        });
      }
    } catch (err) {
      console.error("Manual verification check failed:", err);
    }
  };

  // Synchronize local form state with context language selection
  useEffect(() => {
    if (language) {
      setProfile(prev => ({
        ...prev,
        language: language
      }));
    }
  }, [language]);

  // Handle click outside of OSM suggestions list to close dropdown
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
  const detectLocation = () => {
    setDetectingLocation(true);
    setMessage({
      type: 'info',
      text: t('profile.gpsDetecting')
    });
    if (!navigator.geolocation) {
      console.warn('HTML5 Geolocation not supported. Falling back to IP Geolocation.');
      detectLocationViaIp();
      return;
    }
    let resolved = false;

    // Attempt high-accuracy GPS first with a 3.5 second timeout
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
      // Setup backup timeout of 3.5 seconds for low accuracy before falling back to IP
      const lowAccuracyTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('Low-precision Geolocation timed out. Falling back to IP-based location lookup.');
          setMessage({
            type: 'warning',
            text: 'GPS/Wi-Fi signal timed out. Please verify that Location Services are enabled in macOS System Settings and Browser permissions. Falling back to approximate IP location...'
          });
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
        setMessage({
          type: 'warning',
          text: `Location lookup failed (${error.message}). Please verify macOS and Browser location permissions. Falling back to approximate IP location...`
        });
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
        setProfile(prev => ({
          ...prev,
          houseNo: parsed.houseNo || prev.houseNo || '',
          street: parsed.street || prev.street || '',
          city: parsed.city || prev.city || '',
          pinCode: parsed.pinCode || prev.pinCode || ''
        }));
        setSearchQuery(data.display_name);
        setMessage({
          type: 'success',
          text: 'Coordinates successfully geocoded and filled via OpenStreetMap.'
        });
        setDetectingLocation(false);
        setTimeout(() => setMessage(null), 4000);
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
        console.log('IP coordinates extracted successfully:', data.latitude, data.longitude);
        await reverseGeocode(data.latitude, data.longitude, data);
      } else {
        throw new Error('Invalid IP data format');
      }
    } catch (err) {
      console.error('IP location extraction failed:', err);
      setMessage({
        type: 'error',
        text: 'Failed to extract physical coordinates via GPS or IP. Please enter address manually.'
      });
      setDetectingLocation(false);
    }
  };
  const populateAddressFromIp = data => {
    setProfile(prev => ({
      ...prev,
      city: data.city || prev.city || '',
      pinCode: data.postal || prev.pinCode || '',
      street: data.region || prev.street || ''
    }));
    setSearchQuery(`${data.city || ''}, ${data.region || ''} ${data.postal || ''}, ${data.country_name || ''}`.trim().replace(/^,\s*/, ''));
    setMessage({
      type: 'success',
      text: 'Coordinates successfully filled using backup IP Geolocation.'
    });
    setDetectingLocation(false);
    setTimeout(() => setMessage(null), 4000);
  };
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
    }, 400);
  };
  const handleSelectOsmSuggestion = suggestion => {
    if (suggestion) {
      const parsed = parseOsmAddress(suggestion);
      setProfile(prev => ({
        ...prev,
        houseNo: parsed.houseNo || prev.houseNo || '',
        street: parsed.street || prev.street || '',
        city: parsed.city || prev.city || '',
        pinCode: parsed.pinCode || prev.pinCode || ''
      }));
    }
    setSearchQuery(suggestion.display_name);
    setShowOsmSuggestions(false);
    setOsmSuggestions([]);
    setMessage({
      type: 'success',
      text: 'Address registry populated from OpenStreetMap ledger.'
    });
    setTimeout(() => setMessage(null), 4000);
  };
  const handleInputChange = e => {
    const {
      name,
      value
    } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await updateUserProfile(profile);
      if (res?.success) {
        setMessage({
          type: 'success',
          text: 'Your scholarly scroll has been securely updated in the Royal Archives.'
        });
        // Scroll to top to see success message
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || 'Archiving failed. Please try again.'
        });
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      const errorMsg = err.response?.data?.message || err.message || 'Transmission error.';
      setMessage({
        type: 'error',
        text: `Archiving Failed: ${errorMsg}`
      });
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } finally {
      setSaving(false);
    }
  };

  // Determine gating status
  const missingFields = [];
  if (settings.enforceEmailVerification && auth.currentUser?.providerData?.some(p => p.providerId === 'password') && !emailVerified) {
    missingFields.push('Email Verification');
  }
  if (settings.phoneMandatory && !profile.phone.trim()) missingFields.push('Phone Number');
  if (settings.houseNoMandatory && !profile.houseNo.trim()) missingFields.push('House/Apartment Number');
  if (settings.streetMandatory && !profile.street.trim()) missingFields.push('Street Address');
  if (settings.cityMandatory && !profile.city.trim()) missingFields.push('City');
  if (settings.pinCodeMandatory && !profile.pinCode.trim()) missingFields.push('Postal/PIN Code');
  const isGated = missingFields.length > 0;
  if (!user) {
    return <div className="profile-gated-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <User size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">{t('profile.identityRequired', 'Identity Required')}</h2>
          <p className="denied-message">
            {t('profile.mustCrossThreshold', 'You must cross the threshold and enter the book club registry to view your personal scholar profile.')}
          </p>
          <div className="denied-actions">
            <Link to="/auth/signin" className="royal-btn return-home-btn">
              {t('profile.enterArchway', 'Enter The Archway')}
            </Link>
          </div>
        </div>
      </div>;
  }
  return <div className="profile-page-container animate-fade-in">
      <div className="profile-inner-container">
        {/* Back Link */}
        <Link to="/" className="back-link-academy">
          <ArrowLeft size={16} /> {t('common.returnPavilion')}
        </Link>

        {/* Header */}
        <header className="profile-header">
          <div className="header-badge-profile">
            <Sparkles size={14} className="gold-glow-icon" />
            <span className="gold-gradient-text">{t('profile.portalHeader')}</span>
          </div>
          <h1 className="profile-title glow-text">{t('profile.title')}</h1>
          <p className="profile-subtitle">
            {t('profile.subtitle')}
          </p>
        </header>

        {/* Stats & Gating Notice Banner */}
        <section className="profile-status-banner">
          {isGated ? <div className="royal-card status-card gated animate-pulse-border">
              <div className="status-icon-wrapper gated">
                <AlertTriangle size={24} />
              </div>
              <div className="status-text-content">
                <h3 className="gated-title">{t('profile.statusRestricted')}</h3>
                <p className="gated-desc">
                  {t('profile.missingGatingFields')} <strong style={{
                color: 'var(--accent)'
              }}>{missingFields.join(', ')}</strong>.
                </p>
              </div>
            </div> : <div className="royal-card status-card unlocked">
              <div className="status-icon-wrapper unlocked">
                <CheckCircle size={24} />
              </div>
              <div className="status-text-content">
                <h3 className="unlocked-title">{t('profile.statusUnlocked')}</h3>
                <p className="unlocked-desc">
                  {t('profile.allGatingSatisfied', 'All active administrative gating rules are fully satisfied. Your tap-to-checkout and manual request features are fully active in the Study catalog.')}
                </p>
              </div>
            </div>}
        </section>

        {loading ? <div className="profile-loader-box">
            <Loader2 className="animate-spin gold-glow-icon" size={48} />
            <p className="loader-text">{t('profile.synchronizingCredentials', 'Synchronizing credentials with Firestore Ledger...')}</p>
          </div> : <div className="profile-form-grid">
            {/* Form Section */}
            <div className="royal-card form-card-glass">
              {message && <div className={`royal-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  <span>{message.text}</span>
                </div>}

              <form onSubmit={handleSubmit} className="profile-form">
                <h3 className="section-title-royal">{t('profile.personalCoordinates')}</h3>

                {/* Account Email Status (Epic 1) */}
                <div className="form-group" style={{
              marginBottom: '20px',
              padding: '12px',
              background: "var(--glass-bg)",
              borderRadius: '8px',
              border: '1px solid rgba(212,165,116,0.1)'
            }}>
                  <label style={{
                display: 'block',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                    {t('auto_3538', 'Sovereign Scholar Identity')}
                  </label>
                  <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                      <Mail size={16} style={{
                    color: 'var(--accent)'
                  }} />
                      <span style={{
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)'
                  }}>{user?.email || 'Scholar Email'}</span>
                    </div>
                    {auth.currentUser?.providerData?.some(p => p.providerId === 'password') && <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                        <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: emailVerified ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: emailVerified ? '#22c55e' : '#ef4444',
                    border: `1px solid ${emailVerified ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                  }}>
                          {emailVerified ? <>
                              <CheckCircle size={12} /> {t('auto_3539', 'Verified')}
                            </> : <>
                              <AlertTriangle size={12} /> {t('auto_3540', 'Pending Verification')}
                            </>}
                        </span>
                        {settings.enforceEmailVerification && <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: 'rgba(212,165,116,0.15)',
                    color: 'var(--accent)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                            {t('auto_3541', 'Enforced')}
                          </span>}
                      </div>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="firstName">{t('profile.firstName')}</label>
                    <input type="text" id="firstName" name="firstName" value={profile.firstName} onChange={handleInputChange} placeholder={t("str_5418", "e.g. Immanuel")} className="royal-input" />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="lastName">{t('profile.lastName')}</label>
                    <input type="text" id="lastName" name="lastName" value={profile.lastName} onChange={handleInputChange} placeholder={t("str_5419", "e.g. Kant")} className="royal-input" />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="required-marker-label">
                    {t('profile.phoneNumber')} {settings.phoneMandatory && <span className="gold-text-req">*</span>}
                  </label>
                  <div className="input-with-icon-wrapper">
                    <Phone className="input-field-icon" size={16} />
                    <input type="tel" id="phone" name="phone" value={profile.phone} onChange={handleInputChange} placeholder={t("str_5420", "e.g. +1 (555) 019-2831")} className="royal-input input-padded-left" />
                  </div>
                </div>

                <div className="form-group" style={{
              marginBottom: '20px'
            }}>
                  <label htmlFor="language">{t('profile.languagePref')}</label>
                  <select id="language" name="language" value={profile.language} onChange={e => {
                const newLang = e.target.value;
                setProfile(prev => ({
                  ...prev,
                  language: newLang
                }));
                setLanguage(newLang, user);
              }} className="royal-input">
                    <option value="en">{t('common.english')}</option>
                    <option value="hi">{t('common.hindi')}</option>
                    <option value="kn">{t('common.kannada')}</option>
                  </select>
                </div>
        <hr className="royal-divider" />

                <div className="address-section-header">
                  <h3 className="section-title-royal">{t('profile.addressRegistry')}</h3>
                  <p className="address-section-sub">{t('profile.addressSub')}</p>
                </div>

                {/* Geolocation Address Extraction Button */}
                <div className="form-group location-detection-group">
                  <button type="button" onClick={detectLocation} disabled={detectingLocation} className="royal-btn detect-location-btn">
                    {detectingLocation ? <>
                        <Loader2 className="animate-spin mr-2" size={16} /> {t('profile.gpsDetecting')}
                      </> : <>
                        <MapPin size={16} className="gold-glow-icon mr-2" /> {t('profile.gpsButton')}
                      </>}
                  </button>
                </div>

                {/* Sovereign Address Autocomplete Search Field */}
                <div className="form-group" ref={suggestionsContainerRef}>
                  <label htmlFor="googleAddressSearch">{t('profile.addressLookup')}</label>
                  <div className="input-with-icon-wrapper">
                    <Search className="input-field-icon" size={16} />
                    <input ref={autocompleteInputRef} type="text" id="googleAddressSearch" value={searchQuery} onChange={handleSearchQueryChange} placeholder={t('profile.addressPlaceholder')} className="royal-input input-padded-left" onKeyDown={e => {
                  if (e.key === 'Enter') e.preventDefault();
                }} />
                    {loadingOsmSuggestions && <Loader2 className="animate-spin input-spinner-icon" size={16} />}
                  </div>

                  {showOsmSuggestions && osmSuggestions.length > 0 && <ul className="osm-suggestions-dropdown">
                      {osmSuggestions.map(suggestion => <li key={suggestion.place_id} onClick={() => handleSelectOsmSuggestion(suggestion)} className="osm-suggestion-item">
                          <MapPin size={14} className="suggestion-pin-icon" />
                          <span className="suggestion-text">{suggestion.display_name}</span>
                        </li>)}
                    </ul>}
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="houseNo">
                      {t('profile.houseNo')} {settings.houseNoMandatory && <span className="gold-text-req">*</span>}
                    </label>
                    <input type="text" id="houseNo" name="houseNo" value={profile.houseNo} onChange={handleInputChange} placeholder={t("str_5421", "e.g. Suite 404")} className="royal-input" />
                  </div>
                  <div className="form-group flex-2">
                    <label htmlFor="street">
                      {t('profile.streetName')} {settings.streetMandatory && <span className="gold-text-req">*</span>}
                    </label>
                    <input type="text" id="street" name="street" value={profile.street} onChange={handleInputChange} placeholder={t("str_5422", "e.g. Boulevard of Philosophy")} className="royal-input" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="city">
                      {t('profile.city')} {settings.cityMandatory && <span className="gold-text-req">*</span>}
                    </label>
                    <input type="text" id="city" name="city" value={profile.city} onChange={handleInputChange} placeholder={t("str_5423", "e.g. K\xF6nigsberg")} className="royal-input" />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="pinCode">
                      {t('profile.postalCode')} {settings.pinCodeMandatory && <span className="gold-text-req">*</span>}
                    </label>
                    <input type="text" id="pinCode" name="pinCode" value={profile.pinCode} onChange={handleInputChange} placeholder={t("str_5424", "e.g. 10928")} className="royal-input" />
                  </div>
                </div>

                <div className="form-actions-profile">
                  <button type="submit" disabled={saving} className="royal-btn profile-submit-btn">
                    {saving ? <>
                        <Loader2 className="animate-spin mr-2" size={16} /> {t('profile.submitting')}
                      </> : <>
                        <Sparkles size={16} /> {t('common.save')}
                      </>}
                  </button>
                </div>
              </form>
            </div>

            {/* Right column layout containing both checklist and map */}
            <div className="right-column-container">
              {/* Verification Status Card */}
              <div className="royal-card checklist-card-glass">
                <h3 className="section-title-royal">{t('profile.gatingDiagnostics')}</h3>
                <p className="checklist-subtitle">
                  {t('profile.gatingInstructions')}
                </p>

                <div className="checklist-items">
                  {settings.enforceEmailVerification && auth.currentUser?.providerData?.some(p => p.providerId === 'password') && <div className="checklist-item email-verification-checklist-row" style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '12px',
                background: 'rgba(212,165,116,0.05)',
                borderRadius: '6px',
                border: '1px solid rgba(212,165,116,0.15)',
                marginBottom: '10px'
              }}>
                      <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  width: '100%'
                }}>
                        <div className={`status-indicator ${emailVerified ? 'completed' : 'missing'}`}>
                          {emailVerified ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        </div>
                        <div className="checklist-text">
                          <span className="checklist-label" style={{
                      fontWeight: 600
                    }}>{t('profile.emailVerification', 'Email Verification')}</span>
                          <span className="checklist-requirement">
                            {t('profile.mandatoryField', 'Mandatory Field')}
                          </span>
                        </div>
                      </div>
                      {!emailVerified && <div className="verification-actions" style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '6px',
                  width: '100%',
                  justifyContent: 'flex-start'
                }}>
                          <button type="button" onClick={handleResendVerification} disabled={verificationResendCooldown > 0 || resending} className="royal-btn-secondary" style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    height: 'auto',
                    minWidth: 'auto',
                    textTransform: 'uppercase'
                  }}>
                            {resending ? <Loader2 className="animate-spin" size={12} /> : verificationResendCooldown > 0 ? `Resend in ${verificationResendCooldown}s` : 'Resend Email'}
                          </button>
                          <button type="button" onClick={forceVerifyCheck} className="royal-btn" style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    height: 'auto',
                    minWidth: 'auto',
                    textTransform: 'uppercase'
                  }}>
                            {t('auto_3542', 'Check Now')}
                          </button>
                        </div>}
                    </div>}

                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.phone.trim() ? 'completed' : settings.phoneMandatory ? 'missing' : 'optional'}`}>
                      {profile.phone.trim() ? <CheckCircle size={16} /> : settings.phoneMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{
                    opacity: 0.3
                  }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">{t('profile.phoneNumber')}</span>
                      <span className="checklist-requirement">
                        {settings.phoneMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.houseNo.trim() ? 'completed' : settings.houseNoMandatory ? 'missing' : 'optional'}`}>
                      {profile.houseNo.trim() ? <CheckCircle size={16} /> : settings.houseNoMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{
                    opacity: 0.3
                  }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">{t('profile.houseNo')}</span>
                      <span className="checklist-requirement">
                        {settings.houseNoMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.street.trim() ? 'completed' : settings.streetMandatory ? 'missing' : 'optional'}`}>
                      {profile.street.trim() ? <CheckCircle size={16} /> : settings.streetMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{
                    opacity: 0.3
                  }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">{t('profile.streetName')}</span>
                      <span className="checklist-requirement">
                        {settings.streetMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.city.trim() ? 'completed' : settings.cityMandatory ? 'missing' : 'optional'}`}>
                      {profile.city.trim() ? <CheckCircle size={16} /> : settings.cityMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{
                    opacity: 0.3
                  }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">{t('profile.city')}</span>
                      <span className="checklist-requirement">
                        {settings.cityMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.pinCode.trim() ? 'completed' : settings.pinCodeMandatory ? 'missing' : 'optional'}`}>
                      {profile.pinCode.trim() ? <CheckCircle size={16} /> : settings.pinCodeMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{
                    opacity: 0.3
                  }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">{t('profile.postalCode')}</span>
                      <span className="checklist-requirement">
                        {settings.pinCodeMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="checklist-footer-note">
                  <p>
                    {t('profile.gatingFooter')}
                  </p>
                </div>
              </div>
              {/* Google Map Card removed */}
            </div>
          </div>}
      </div>
    </div>;
};
export default ProfilePage;