import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, MapPin, Search, CheckCircle, AlertTriangle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUserProfile, updateUserProfile } from '../../services/userApi';
import { getCheckoutSettings } from '../../services/checkoutSettingsApi';
import './ProfilePage.css';

const ProfilePage = ({ user }) => {
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
  });

  const [settings, setSettings] = useState({
    phoneMandatory: false,
    houseNoMandatory: false,
    streetMandatory: false,
    cityMandatory: false,
    pinCodeMandatory: false,
  });

  // Google Places state and refs
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

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
          });
        }
      } catch (err) {
        console.error('Failed to load profile details or settings', err);
        setMessage({
          type: 'error',
          text: 'Failed to synchronize with the Royal Archives. Please check your connection.',
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

  // Load Google Maps API Script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || '';
    if (!apiKey) {
      console.warn("Google Maps API key is missing from environments.");
      setMapError(true);
      return;
    }

    if (window.google && window.google.maps) {
      setMapsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-api-script');
    if (existingScript) {
      const handleScriptLoad = () => setMapsLoaded(true);
      const handleScriptError = () => setMapError(true);

      existingScript.addEventListener('load', handleScriptLoad);
      existingScript.addEventListener('error', handleScriptError);

      return () => {
        existingScript.removeEventListener('load', handleScriptLoad);
        existingScript.removeEventListener('error', handleScriptError);
      };
    }

    const script = document.createElement('script');
    script.id = 'google-maps-api-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setMapsLoaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script.');
      setMapError(true);
    };

    document.head.appendChild(script);
  }, []);

  const detectLocation = () => {
    setDetectingLocation(true);
    setMessage({
      type: 'info',
      text: 'Extricating physical coordinates...',
    });

    if (!navigator.geolocation) {
      console.warn('HTML5 Geolocation not supported. Falling back to IP Geolocation.');
      detectLocationViaIp();
      return;
    }

    let resolved = false;

    // Start a 4-second timeout to fall back to IP if GPS hangs
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('Browser GPS location extraction timed out. Falling back to IP-based coordinates.');
        detectLocationViaIp();
      }
    }, 4000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);

        const { latitude, longitude } = position.coords;
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);

        console.warn('Browser GPS location failed. Falling back to IP-based coordinates. Error:', error);
        detectLocationViaIp();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const reverseGeocode = (latitude, longitude, ipDataFallback = null) => {
    if (!window.google || !window.google.maps) {
      if (ipDataFallback) {
        populateAddressFromIp(ipDataFallback);
      } else {
        setMessage({
          type: 'error',
          text: 'Google Maps Library is not loaded yet.',
        });
        setDetectingLocation(false);
      }
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    const latlng = { lat: latitude, lng: longitude };

    geocoder.geocode({ location: latlng }, (results, status) => {
      setDetectingLocation(false);
      if (status === 'OK' && results[0]) {
        const place = results[0];
        const addressComponents = place.address_components;

        let streetNumber = '';
        let route = '';
        let neighborhood = '';
        let cityVal = '';
        let postcode = '';

        for (const component of addressComponents) {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          } else if (types.includes('route')) {
            route = component.long_name;
          } else if (types.includes('neighborhood') || types.includes('sublocality') || types.includes('sublocality_level_1')) {
            neighborhood = component.long_name;
          } else if (types.includes('locality')) {
            cityVal = component.long_name;
          } else if (types.includes('administrative_area_level_2') && !cityVal) {
            cityVal = component.long_name;
          } else if (types.includes('postal_code')) {
            postcode = component.long_name;
          }
        }

        const streetVal = [route, neighborhood].filter(Boolean).join(', ');

        setProfile((prev) => ({
          ...prev,
          houseNo: streetNumber || prev.houseNo || '',
          street: streetVal || prev.street || '',
          city: cityVal || prev.city || '',
          pinCode: postcode || prev.pinCode || '',
        }));

        if (autocompleteInputRef.current) {
          autocompleteInputRef.current.value = place.formatted_address;
        }

        setMessage({
          type: 'success',
          text: 'Sovereign coordinates successfully geocoded and filled.',
        });
        setTimeout(() => setMessage(null), 4000);
      } else {
        console.error('Geocoder failed due to: ' + status);
        if (ipDataFallback) {
          populateAddressFromIp(ipDataFallback);
        } else {
          setMessage({
            type: 'error',
            text: `Reverse geocoding failed: ${status}. Please enter address manually.`,
          });
        }
      }
    });
  };

  const detectLocationViaIp = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('IP coordinates fetch failed');
      const data = await response.json();
      if (data && data.latitude && data.longitude) {
        console.log('IP coordinates extracted successfully:', data.latitude, data.longitude);
        reverseGeocode(data.latitude, data.longitude, data);
      } else {
        throw new Error('Invalid IP data format');
      }
    } catch (err) {
      console.error('IP location extraction failed:', err);
      setMessage({
        type: 'error',
        text: 'Failed to extract physical coordinates via GPS or IP. Please enter address manually.',
      });
      setDetectingLocation(false);
    }
  };

  const populateAddressFromIp = (data) => {
    setProfile((prev) => ({
      ...prev,
      city: data.city || prev.city || '',
      pinCode: data.postal || prev.pinCode || '',
      street: data.region || prev.street || '',
    }));
    if (autocompleteInputRef.current) {
      autocompleteInputRef.current.value = `${data.city || ''}, ${data.region || ''} ${data.postal || ''}, ${data.country_name || ''}`.trim().replace(/^,\s*/, '');
    }
    setMessage({
      type: 'success',
      text: 'Coordinates successfully filled using secure IP Geolocation Ledger.',
    });
    setDetectingLocation(false);
    setTimeout(() => setMessage(null), 4000);
  };

  // Set up Google Places Autocomplete
  useEffect(() => {
    if (!mapsLoaded || !autocompleteInputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
      types: ['address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place || !place.address_components) {
        console.warn("No autocomplete address components found.");
        return;
      }

      // Parse address components
      const addressComponents = place.address_components;
      let streetNumber = '';
      let route = '';
      let neighborhood = '';
      let cityVal = '';
      let postcode = '';

      for (const component of addressComponents) {
        const types = component.types;
        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        } else if (types.includes('route')) {
          route = component.long_name;
        } else if (types.includes('neighborhood') || types.includes('sublocality')) {
          neighborhood = component.long_name;
        } else if (types.includes('locality')) {
          cityVal = component.long_name;
        } else if (types.includes('administrative_area_level_2') && !cityVal) {
          cityVal = component.long_name;
        } else if (types.includes('postal_code')) {
          postcode = component.long_name;
        }
      }

      const streetVal = [route, neighborhood].filter(Boolean).join(', ');

      setProfile((prev) => ({
        ...prev,
        houseNo: streetNumber || prev.houseNo || '',
        street: streetVal || prev.street || '',
        city: cityVal || prev.city || '',
        pinCode: postcode || prev.pinCode || '',
      }));

      setMessage({
        type: 'success',
        text: 'Address coordinates synchronized with Google Places Ledger.',
      });
      setTimeout(() => setMessage(null), 4000);
    });
  }, [mapsLoaded]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await updateUserProfile(profile);
      if (res?.success) {
        setMessage({
          type: 'success',
          text: 'Your scholarly scroll has been securely updated in the Royal Archives.',
        });
        // Scroll to top to see success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || 'Archiving failed. Please try again.',
        });
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      const errorMsg = err.response?.data?.message || err.message || 'Transmission error.';
      setMessage({
        type: 'error',
        text: `Archiving Failed: ${errorMsg}`,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  // Determine gating status
  const missingFields = [];
  if (settings.phoneMandatory && !profile.phone.trim()) missingFields.push('Phone Number');
  if (settings.houseNoMandatory && !profile.houseNo.trim()) missingFields.push('House/Apartment Number');
  if (settings.streetMandatory && !profile.street.trim()) missingFields.push('Street Address');
  if (settings.cityMandatory && !profile.city.trim()) missingFields.push('City');
  if (settings.pinCodeMandatory && !profile.pinCode.trim()) missingFields.push('Postal/PIN Code');

  const isGated = missingFields.length > 0;

  if (!user) {
    return (
      <div className="profile-gated-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <User size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">Identity Required</h2>
          <p className="denied-message">
            You must cross the threshold and enter the book club registry to view your personal scholar profile.
          </p>
          <div className="denied-actions">
            <Link to="/auth/signin" className="royal-btn return-home-btn">
              Enter The Archway
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-container animate-fade-in">
      <div className="profile-inner-container">
        {/* Back Link */}
        <Link to="/" className="back-link-academy">
          <ArrowLeft size={16} /> Return to Pavilion
        </Link>

        {/* Header */}
        <header className="profile-header">
          <div className="header-badge-profile">
            <Sparkles size={14} className="gold-glow-icon" />
            <span className="gold-gradient-text">PATRON IDENTITY PORTAL</span>
          </div>
          <h1 className="profile-title glow-text">Scholar Profile Ledger</h1>
          <p className="profile-subtitle">
            Update your credentials and address registration to ensure uninterrupted self-checkout privileges in the study.
          </p>
        </header>

        {/* Stats & Gating Notice Banner */}
        <section className="profile-status-banner">
          {isGated ? (
            <div className="royal-card status-card gated animate-pulse-border">
              <div className="status-icon-wrapper gated">
                <AlertTriangle size={24} />
              </div>
              <div className="status-text-content">
                <h3 className="gated-title">Self-Checkout Restricted (Gated)</h3>
                <p className="gated-desc">
                  To utilize smart tap-to-checkout and manual requests, you must supplement your profile with the following mandatory fields: <strong style={{ color: 'var(--accent)' }}>{missingFields.join(', ')}</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="royal-card status-card unlocked">
              <div className="status-icon-wrapper unlocked">
                <CheckCircle size={24} />
              </div>
              <div className="status-text-content">
                <h3 className="unlocked-title">Self-Checkout Unlocked</h3>
                <p className="unlocked-desc">
                  All active administrative gating rules are fully satisfied. Your tap-to-checkout and manual request features are fully active in the Study catalog.
                </p>
              </div>
            </div>
          )}
        </section>

        {loading ? (
          <div className="profile-loader-box">
            <Loader2 className="animate-spin gold-glow-icon" size={48} />
            <p className="loader-text">Synchronizing credentials with Firestore Ledger...</p>
          </div>
        ) : (
          <div className="profile-form-grid">
            {/* Form Section */}
            <div className="royal-card form-card-glass">
              {message && (
                <div className={`royal-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  <span>{message.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="profile-form">
                <h3 className="section-title-royal">Personal Coordinates</h3>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={profile.firstName}
                      onChange={handleInputChange}
                      placeholder="e.g. Immanuel"
                      className="royal-input"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={profile.lastName}
                      onChange={handleInputChange}
                      placeholder="e.g. Kant"
                      className="royal-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="required-marker-label">
                    Phone Number {settings.phoneMandatory && <span className="gold-text-req">*</span>}
                  </label>
                  <div className="input-with-icon-wrapper">
                    <Phone className="input-field-icon" size={16} />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profile.phone}
                      onChange={handleInputChange}
                      required={settings.phoneMandatory}
                      placeholder="e.g. +1 (555) 019-2831"
                      className="royal-input input-padded-left"
                    />
                  </div>
                </div>
        <hr className="royal-divider" />

                <div className="address-section-header">
                  <h3 className="section-title-royal">Address Registry</h3>
                  <p className="address-section-sub">Search and auto-complete address registry coordinates with Google Places ledger.</p>
                </div>

                {/* Geolocation Address Extraction Button */}
                <div className="form-group location-detection-group">
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={detectingLocation}
                    className="royal-btn detect-location-btn"
                  >
                    {detectingLocation ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} /> Extricating Coordinates...
                      </>
                    ) : (
                      <>
                        <MapPin size={16} className="gold-glow-icon mr-2" /> Detect My Location (GPS)
                      </>
                    )}
                  </button>
                </div>

                {/* Google Places Address Search Field */}
                <div className="form-group">
                  <label htmlFor="googleAddressSearch">Sovereign Address Lookup</label>
                  <div className="input-with-icon-wrapper">
                    <Search className="input-field-icon" size={16} />
                    <input
                      ref={autocompleteInputRef}
                      type="text"
                      id="googleAddressSearch"
                      placeholder="Type address to autocomplete with Google Places..."
                      className="royal-input input-padded-left"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="houseNo">
                      House / Apt No {settings.houseNoMandatory && <span className="gold-text-req">*</span>}
                    </label>
                    <input
                      type="text"
                      id="houseNo"
                      name="houseNo"
                      value={profile.houseNo}
                      onChange={handleInputChange}
                      required={settings.houseNoMandatory}
                      placeholder="e.g. Suite 404"
                      className="royal-input"
                    />
                  </div>
                  <div className="form-group flex-2">
                    <label htmlFor="street">
                      Street Name {settings.streetMandatory && <span className="gold-text-req">*</span>}
                    </label>
                    <input
                      type="text"
                      id="street"
                      name="street"
                      value={profile.street}
                      onChange={handleInputChange}
                      required={settings.streetMandatory}
                      placeholder="e.g. Boulevard of Philosophy"
                      className="royal-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="city">
                      City {settings.cityMandatory && <span className="gold-text-req">*</span>}
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={profile.city}
                      onChange={handleInputChange}
                      required={settings.cityMandatory}
                      placeholder="e.g. Königsberg"
                      className="royal-input"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="pinCode">
                      Postal / PIN Code {settings.pinCodeMandatory && <span className="gold-text-req">*</span>}
                    </label>
                    <input
                      type="text"
                      id="pinCode"
                      name="pinCode"
                      value={profile.pinCode}
                      onChange={handleInputChange}
                      required={settings.pinCodeMandatory}
                      placeholder="e.g. 10928"
                      className="royal-input"
                    />
                  </div>
                </div>

                <div className="form-actions-profile">
                  <button
                    type="submit"
                    disabled={saving}
                    className="royal-btn profile-submit-btn"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} /> Preserving Scroll...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Update Ledger coordinates
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right column layout containing both checklist and map */}
            <div className="right-column-container">
              {/* Verification Status Card */}
              <div className="royal-card checklist-card-glass">
                <h3 className="section-title-royal">gating diagnostics</h3>
                <p className="checklist-subtitle">
                  Current requirement checkpoints configured by library Curators. Satisfy all marked coordinates to unlock mobile self checkouts.
                </p>

                <div className="checklist-items">
                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.phone.trim() ? 'completed' : settings.phoneMandatory ? 'missing' : 'optional'}`}>
                      {profile.phone.trim() ? <CheckCircle size={16} /> : settings.phoneMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{ opacity: 0.3 }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">Phone Number Coordinates</span>
                      <span className="checklist-requirement">
                        {settings.phoneMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.houseNo.trim() ? 'completed' : settings.houseNoMandatory ? 'missing' : 'optional'}`}>
                      {profile.houseNo.trim() ? <CheckCircle size={16} /> : settings.houseNoMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{ opacity: 0.3 }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">House / Apartment Number</span>
                      <span className="checklist-requirement">
                        {settings.houseNoMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.street.trim() ? 'completed' : settings.streetMandatory ? 'missing' : 'optional'}`}>
                      {profile.street.trim() ? <CheckCircle size={16} /> : settings.streetMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{ opacity: 0.3 }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">Street Address Alignment</span>
                      <span className="checklist-requirement">
                        {settings.streetMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.city.trim() ? 'completed' : settings.cityMandatory ? 'missing' : 'optional'}`}>
                      {profile.city.trim() ? <CheckCircle size={16} /> : settings.cityMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{ opacity: 0.3 }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">Registered City</span>
                      <span className="checklist-requirement">
                        {settings.cityMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <div className={`status-indicator ${profile.pinCode.trim() ? 'completed' : settings.pinCodeMandatory ? 'missing' : 'optional'}`}>
                      {profile.pinCode.trim() ? <CheckCircle size={16} /> : settings.pinCodeMandatory ? <AlertTriangle size={16} /> : <CheckCircle size={16} style={{ opacity: 0.3 }} />}
                    </div>
                    <div className="checklist-text">
                      <span className="checklist-label">PIN / Postal Code</span>
                      <span className="checklist-requirement">
                        {settings.pinCodeMandatory ? 'Mandatory Field' : 'Optional Coordinate'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="checklist-footer-note">
                  <p>
                    Any update to mandatory settings by Curators is applied in real-time. Contact admin in the Pavilion if card RFID locks encounter alignment issues.
                  </p>
                </div>
              </div>
              {/* Google Map Card removed */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
