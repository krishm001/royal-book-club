import React, { useState, useEffect } from 'react';
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

  // Nominatim Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  // Handle Nominatim address autocomplete search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 4) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setSearching(true);
        const encodedQuery = encodeURIComponent(searchQuery);
        // Nominatim OpenStreetMap keyless API with custom User-Agent to respect usage guidelines
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=5`,
          {
            headers: {
              'User-Agent': 'RoyalBookClubAddressCompletion/1.0 (patron@royalbook.club)',
              'Accept-Language': 'en',
            },
          }
        );
        const data = await res.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Nominatim query error', err);
      } finally {
        setSearching(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectSuggestion = (place) => {
    const address = place.address || {};
    const cityVal = address.city || address.town || address.village || address.suburb || address.county || '';
    const road = address.road || address.pedestrian || address.suburb || '';
    const postcode = address.postcode || '';
    const houseNumber = address.house_number || '';

    setProfile((prev) => ({
      ...prev,
      houseNo: houseNumber || prev.houseNo,
      street: road ? `${road} ${address.neighbourhood || ''}`.trim() : prev.street,
      city: cityVal || prev.city,
      pinCode: postcode || prev.pinCode,
    }));

    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setMessage({
      type: 'success',
      text: 'Address details auto-populated from OpenStreetMap Ledger.',
    });
    setTimeout(() => setMessage(null), 4000);
  };

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
                  <p className="address-section-sub">Use OpenStreetMap search to instantly fill address coordinates.</p>
                </div>

                {/* OpenStreetMap Address Search Field */}
                <div className="form-group osm-autocomplete-group">
                  <label htmlFor="osmSearch">Sovereign Address Lookup</label>
                  <div className="input-with-icon-wrapper">
                    <Search className="input-field-icon" size={16} />
                    <input
                      type="text"
                      id="osmSearch"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Type address to search (e.g. 1600 Amphitheatre Pkwy Mountain View)..."
                      className="royal-input input-padded-left"
                    />
                    {searching && <Loader2 className="animate-spin input-spinner-icon" size={16} />}
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <div className="osm-suggestions-dropdown">
                      {suggestions.map((place) => (
                        <div
                          key={place.place_id}
                          className="osm-suggestion-item"
                          onClick={() => handleSelectSuggestion(place)}
                        >
                          <MapPin size={14} className="suggestion-marker" />
                          <span className="suggestion-text">{place.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
