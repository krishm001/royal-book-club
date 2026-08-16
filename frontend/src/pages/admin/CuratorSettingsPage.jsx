import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, ArrowLeft, Loader2, Save, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCheckoutSettings, updateCheckoutSettings } from '../../services/checkoutSettingsApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './CuratorSettingsPage.css';

const parseOsmAddress = (data) => {
  if (!data) return { houseNo: '', street: '', city: '', pinCode: '', displayName: '' };
  
  const addr = data.address || {};
  const displayName = data.display_name || '';

  // 1. Extract apartment name / house number / building / amenity details
  const houseNoVal = addr.house_number || addr.building || addr.amenity || addr.tourism || addr.shop || addr.office || addr.house_name || addr.apartment || addr.subsubtown || '';

  // 2. Extract city / town / village / suburb / municipality
  let cityVal = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.county || addr.city_district || addr.state_district || addr.state || '';

  // 3. Extract street name
  const streetComponents = [
    addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.cycleway,
    addr.neighbourhood || addr.quarter || addr.hamlet || addr.square || addr.croft || addr.place || addr.residential || addr.commercial
  ].filter(Boolean);
  let streetVal = streetComponents.join(', ');

  // 4. Extract postcode
  const postcodeVal = addr.postcode || '';

  // 5. Fallback parsing via comma-split of display_name
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
    pinCode: postcodeVal.trim(),
    displayName: displayName
  };
};

const CuratorSettingsPage = ({ user }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [settings, setSettings] = useState({
    id: '',
    phoneMandatory: false,
    houseNoMandatory: false,
    streetMandatory: false,
    cityMandatory: false,
    pinCodeMandatory: false,
    autoModerateBlogs: false,
    libraryLatitude: null,
    libraryLongitude: null,
    validRadiusMeters: null,
    enforceEmailVerification: false,
  });

  const [currentTheme, setCurrentTheme] = useState(document.documentElement.getAttribute('data-theme') || 'salon');
  const [locationDetails, setLocationDetails] = useState(null);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  const tileLayerRef = React.useRef(null);
  const reverseGeocodeRef = React.useRef(null);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [markerInstance, setMarkerInstance] = useState(null);
  const [circleInstance, setCircleInstance] = useState(null);

  const performReverseGeocode = async (lat, lon) => {
    if (!lat || !lon) return;
    try {
      setReverseGeocoding(true);
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`);
      if (!response.ok) throw new Error('OSM Nominatim reverse geocode failed');
      const data = await response.json();
      if (data) {
        const parsed = parseOsmAddress(data);
        setLocationDetails(parsed);

        // Bind Leaflet Marker Popup & Open it!
        if (markerInstance) {
          const apartmentText = parsed.houseNo ? `<strong style="color: var(--accent, #d4af37)">🏢 ${parsed.houseNo}</strong><br/>` : '';
          const popupContent = `
            <div style="font-family: 'Outfit', sans-serif; font-size: 0.82rem; line-height: 1.4; color: var(--text-primary, #ffffff); max-width: 200px;">
              <strong style="font-size: 0.9rem; display: block; margin-bottom: 4px; border-bottom: 1px solid rgba(212, 175, 55, 0.2); padding-bottom: 2px; color: var(--accent, #d4af37);">📍 Library Boundary Pin</strong>
              ${apartmentText}
              <span>${parsed.street || 'Selected Coordinates'}</span><br/>
              <span>${parsed.city || ''} ${parsed.pinCode ? `- ${parsed.pinCode}` : ''}</span>
            </div>
          `;
          markerInstance.bindPopup(popupContent).openPopup();
        }
      }
    } catch (err) {
      console.error('Nominatim reverse geocode failed:', err);
    } finally {
      setReverseGeocoding(false);
    }
  };

  useEffect(() => {
    reverseGeocodeRef.current = performReverseGeocode;
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute('data-theme') || 'salon';
      setCurrentTheme(theme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value === '' ? null : parseFloat(value),
    }));
  };

  const isAdmin = user && user.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;

    const loadLeaflet = () => {
      if (window.L) {
        setLeafletLoaded(true);
        return;
      }

      // Avoid duplicate injections
      if (document.getElementById('leaflet-cdn-css')) {
        return;
      }

      const link = document.createElement('link');
      link.id = 'leaflet-cdn-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.id = 'leaflet-cdn-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.body.appendChild(script);
    };

    loadLeaflet();
  }, [isAdmin]);

  useEffect(() => {
    if (loading || !leafletLoaded || !window.L) return;

    const lat = settings.libraryLatitude || 12.8983;
    const lon = settings.libraryLongitude || 77.705317;
    const radius = settings.validRadiusMeters || 100;

    const activeTheme = currentTheme;
    const tileUrl = activeTheme === 'academic'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    let map = mapInstance;
    if (!map) {
      map = window.L.map('library-geofence-map').setView([lat, lon], 15);
      
      const layer = window.L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
      tileLayerRef.current = layer;

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const nextLat = parseFloat(lat.toFixed(6));
        const nextLon = parseFloat(lng.toFixed(6));
        setSettings((prev) => ({
          ...prev,
          libraryLatitude: nextLat,
          libraryLongitude: nextLon,
        }));
        if (reverseGeocodeRef.current) {
          reverseGeocodeRef.current(nextLat, nextLon);
        }
      });

      setMapInstance(map);
    }

    let marker = markerInstance;
    if (marker) {
      marker.setLatLng([lat, lon]);
    } else {
      marker = window.L.marker([lat, lon], { draggable: true }).addTo(map);
      marker.on('dragend', (e) => {
        const position = marker.getLatLng();
        const nextLat = parseFloat(position.lat.toFixed(6));
        const nextLon = parseFloat(position.lng.toFixed(6));
        setSettings((prev) => ({
          ...prev,
          libraryLatitude: nextLat,
          libraryLongitude: nextLon,
        }));
        if (reverseGeocodeRef.current) {
          reverseGeocodeRef.current(nextLat, nextLon);
        }
      });
      setMarkerInstance(marker);
    }

    let circle = circleInstance;
    if (circle) {
      circle.setLatLng([lat, lon]);
      circle.setRadius(radius);
    } else {
      circle = window.L.circle([lat, lon], {
        color: '#d4af37',
        fillColor: '#d4af37',
        fillOpacity: 0.15,
        radius: radius
      }).addTo(map);
      setCircleInstance(circle);
    }

    map.panTo([lat, lon]);

  }, [loading, leafletLoaded, settings.libraryLatitude, settings.libraryLongitude, settings.validRadiusMeters]);

  useEffect(() => {
    if (tileLayerRef.current) {
      const activeTheme = currentTheme;
      const tileUrl = activeTheme === 'academic'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      tileLayerRef.current.setUrl(tileUrl);
    }
  }, [currentTheme]);

  useEffect(() => {
    if (markerInstance && settings.libraryLatitude && settings.libraryLongitude && !locationDetails) {
      performReverseGeocode(settings.libraryLatitude, settings.libraryLongitude);
    }
  }, [markerInstance, settings.libraryLatitude, settings.libraryLongitude]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const res = await getCheckoutSettings();
        if (res?.success && res?.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error('Failed to load gating settings', err);
        setMessage({
          type: 'error',
          text: t('admin.failedRetrieveGating', 'Failed to retrieve active gating constraints from the ledger.'),
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [isAdmin, t]);

  const handleToggle = (field) => {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSelectCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lon = parseFloat(position.coords.longitude.toFixed(6));
          setSettings((prev) => ({
            ...prev,
            libraryLatitude: lat,
            libraryLongitude: lon,
          }));
          if (mapInstance) {
            mapInstance.setView([lat, lon], 15);
          }
          if (markerInstance) {
            markerInstance.setLatLng([lat, lon]);
          }
          if (circleInstance) {
            circleInstance.setLatLng([lat, lon]);
          }
          performReverseGeocode(lat, lon);
        },
        (error) => {
          console.error("Error retrieving location coordinates:", error);
          alert("Could not retrieve current location. Please verify that browser location access is enabled.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await updateCheckoutSettings(settings);
      if (res?.success && res?.data) {
        setSettings(res.data);
        setMessage({
          type: 'success',
          text: t('admin.gatingPreservedSuccess', 'Self-checkout profile requirements preserved and broadcasted successfully.'),
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || t('admin.failedArchiveGating', 'Failed to archive gating rules.'),
        });
      }
    } catch (err) {
      console.error('Failed to update gating settings', err);
      setMessage({
        type: 'error',
        text: `${t('admin.errorUpdatingSettings', 'Error updating settings')}: ${err.message}`,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-access-denied-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <Shield size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">{t('admin.privilegedSanctuary', 'Privileged Sanctuary')}</h2>
          <p className="denied-message">
            {t('admin.privilegedSanctuaryDescSettings', 'Your current credentials do not grant access to the Curator Curation Dashboard. Changing checkout requirements is reserved for assigned Curators.')}
          </p>
          <div className="denied-actions">
            <Link to="/" className="royal-btn return-home-btn">
              {t('admin.returnEntrance', 'Return to Entrance Hall')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="curator-settings-container animate-fade-in">
      <div className="curator-settings-inner">
        {/* Back Link */}
        <Link to="/admin" className="back-link-academy">
          <ArrowLeft size={16} /> {t('admin.returnCuratorConsole', 'Return to Curator Console')}
        </Link>

        {/* Header */}
        <header className="curator-settings-header">
          <div className="header-badge-settings">
            <Shield size={14} className="gold-glow-icon" />
            <span className="gold-gradient-text">{t('admin.sovereignGatingConsole', 'SOVEREIGN GATING CONSOLE')}</span>
          </div>
          <h1 className="settings-page-title glow-text">{t('admin.gatingControls', 'Self-Checkout Profile Gating')}</h1>
          <p className="settings-page-subtitle">
            {t('admin.gatingDesc', 'Configure registration requirements that members must satisfy in their Profile Ledger before using automated RFID tap-to-checkout or manual request desks.')}
          </p>
        </header>

        {loading ? (
          <div className="settings-loader-box">
            <Loader2 className="animate-spin gold-glow-icon" size={48} />
            <p className="loader-text">{t('admin.loadingGatingRules', 'Loading Checkout Gating rules from database...')}</p>
          </div>
        ) : (
          <div className="settings-layout-grid">
            <div className="royal-card settings-glass-form-card">
              {message && (
                <div className={`royal-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  <span>{message.text}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="settings-gating-form">
                <div className="gating-rules-list">
                  <h3 className="section-title-settings">{t('admin.profileRequirementToggles', 'Profile Requirement Toggles')}</h3>

                  {/* Phone Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label">{t('admin.requirePhone', 'Require Phone Number')}</span>
                      <span className="toggle-description">
                        {t('admin.requirePhoneDesc', 'Members must supply a valid contact number. Necessary for courier alignments and SMS book-return reminders.')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`toggle-action-btn ${settings.phoneMandatory ? 'active' : ''}`}
                      onClick={() => handleToggle('phoneMandatory')}
                    >
                      {settings.phoneMandatory ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>

                  {/* House No Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label">{t('admin.requireHouseNo', 'Require House / Suite / Apartment Number')}</span>
                      <span className="toggle-description">
                        {t('admin.requireHouseNoDesc', 'Members must register their specific dwelling locator within their designated Sovereign House or community.')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`toggle-action-btn ${settings.houseNoMandatory ? 'active' : ''}`}
                      onClick={() => handleToggle('houseNoMandatory')}
                    >
                      {settings.houseNoMandatory ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>

                  {/* Street Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label">{t('admin.requireStreet', 'Require Street Name alignment')}</span>
                      <span className="toggle-description">
                        {t('admin.requireStreetDesc', 'Members must complete their street alignment details, matching physical post coordinate points.')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`toggle-action-btn ${settings.streetMandatory ? 'active' : ''}`}
                      onClick={() => handleToggle('streetMandatory')}
                    >
                      {settings.streetMandatory ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>

                  {/* City Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label">{t('admin.requireCity', 'Require Municipal City registry')}</span>
                      <span className="toggle-description">
                        {t('admin.requireCityDesc', 'Members must register the city bounds of their residency to track geopolitical scholar density.')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`toggle-action-btn ${settings.cityMandatory ? 'active' : ''}`}
                      onClick={() => handleToggle('cityMandatory')}
                    >
                      {settings.cityMandatory ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>

                  {/* PIN Code Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label">{t('admin.requirePinCode', 'Require PIN / Postal Code coordinates')}</span>
                      <span className="toggle-description">
                        {t('admin.requirePinCodeDesc', 'Mandatory postal indicator. Ensures physical address verification operates smoothly during collection periods.')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`toggle-action-btn ${settings.pinCodeMandatory ? 'active' : ''}`}
                      onClick={() => handleToggle('pinCodeMandatory')}
                    >
                      {settings.pinCodeMandatory ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>

                  {/* Email Verification Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label">{t('admin.enforceEmailVerification', 'Enforce Email Verification')}</span>
                      <span className="toggle-description">
                        {t('admin.enforceEmailVerificationDesc', 'Requires users with password-based log-ins to have verified email addresses before performing checkouts.')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`toggle-action-btn ${settings.enforceEmailVerification ? 'active' : ''}`}
                      onClick={() => handleToggle('enforceEmailVerification')}
                    >
                      {settings.enforceEmailVerification ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>

                  {/* Divider and Moderation Preferences */}
                  <div className="settings-divider-custom"></div>
                  
                  <h3 className="section-title-settings">
                    <Sparkles size={16} className="gold-glow-icon inline mr-2" style={{ verticalAlign: 'text-bottom', display: 'inline-block' }} />
                    {t('admin.automatedBlogModeration', 'Automated Blog Content Moderation')}
                  </h3>

                  {/* Blog Moderation Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label text-gold-glow">{t('admin.bypassAdminReview', 'Bypass Default Admin Review (AI Auto-Moderation)')}</span>
                      <span className="toggle-description">
                        {t('admin.bypassAdminReviewDesc', 'By default, all newly submitted blog posts (text & images) always route to the manual Curator approval queue. Enable this to delegate moderation checks to Google Cloud NLP & Vision APIs, publishing immediately if no violations are flagged.')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`toggle-action-btn ${settings.autoModerateBlogs ? 'active' : ''}`}
                      onClick={() => handleToggle('autoModerateBlogs')}
                    >
                      {settings.autoModerateBlogs ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>
                  {/* Geofencing Settings */}
                  <div className="settings-divider-custom"></div>
                  
                  <h3 className="section-title-settings">
                    <MapPin size={16} className="gold-glow-icon inline mr-2" style={{ verticalAlign: 'text-bottom', display: 'inline-block' }} />
                    {t('admin.geolocationGeofencingSettings', 'Library Return Geofencing Bounds')}
                  </h3>

                  <p className="toggle-description" style={{ marginBottom: '15px' }}>
                    {t('admin.geofencingDesc', 'Configure the coordinates of your Royal Library structure and define the valid haversine radius (in meters) within which mobile return transactions are marked as Location Verified.')}
                  </p>

                  {/* Dynamic Interactive Leaflet Map Container */}
                  <div 
                    id="library-geofence-map" 
                    style={{ 
                      height: '320px', 
                      width: '100%', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(212, 175, 55, 0.3)', 
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(212, 175, 55, 0.05)',
                      marginBottom: '20px',
                      background: 'rgba(0,0,0,0.2)',
                      zIndex: 1
                    }}
                  />

                  <div className="current-location-btn-container" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={handleSelectCurrentLocation}
                      className="current-location-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: 'rgba(212, 175, 55, 0.08)',
                        color: '#d4af37',
                        transition: 'all 0.2s ease',
                        fontFamily: '"Outfit", sans-serif'
                      }}
                    >
                      <MapPin size={16} />
                      <span>Select Current Location</span>
                    </button>
                  </div>

                  {/* Dynamic Reverse Geocoded Address Details Display Card */}
                  {locationDetails && (
                    <div className="location-details-card royal-card animate-fade-in" style={{ padding: '16px 20px', background: 'rgba(212, 175, 55, 0.03)', border: '1px solid rgba(212, 175, 55, 0.15)', borderRadius: '8px', marginBottom: '20px' }}>
                      <h4 style={{ color: 'var(--accent, #d4af37)', fontFamily: '"Outfit", sans-serif', fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <MapPin size={15} style={{ filter: 'drop-shadow(0 0 3px rgba(212, 175, 55, 0.4))' }} />
                        <span>Resolved Boundary Address</span>
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
                        {locationDetails.houseNo && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ color: 'var(--text-secondary, #9a9ab0)', fontSize: '0.75rem', fontWeight: '500' }}>Building / Apartment</span>
                            <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: '600' }}>{locationDetails.houseNo}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'var(--text-secondary, #9a9ab0)', fontSize: '0.75rem', fontWeight: '500' }}>Street / Neighborhood</span>
                          <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: '600' }}>{locationDetails.street || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'var(--text-secondary, #9a9ab0)', fontSize: '0.75rem', fontWeight: '500' }}>City / Suburb</span>
                          <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: '600' }}>{locationDetails.city || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'var(--text-secondary, #9a9ab0)', fontSize: '0.75rem', fontWeight: '500' }}>Pincode / Postcode</span>
                          <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: '600' }}>{locationDetails.pinCode || 'N/A'}</span>
                        </div>
                      </div>
                      {locationDetails.displayName && (
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: '12px', paddingTop: '10px', fontSize: '0.78rem', color: 'var(--text-secondary, #9a9ab0)', lineHeight: '1.4' }}>
                          <strong>Full Display Address:</strong> {locationDetails.displayName}
                        </div>
                      )}
                    </div>
                  )}

                  {reverseGeocoding && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.05)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
                      <span>Reverse geocoding coordinates via OpenStreetMap...</span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div className="gating-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="gating-field-label" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Library Latitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        name="libraryLatitude"
                        value={settings.libraryLatitude ?? ''} 
                        onChange={handleChange}
                        onBlur={() => {
                          if (settings.libraryLatitude && settings.libraryLongitude) {
                            performReverseGeocode(settings.libraryLatitude, settings.libraryLongitude);
                            if (mapInstance) {
                              mapInstance.setView([settings.libraryLatitude, settings.libraryLongitude], 15);
                            }
                            if (markerInstance) {
                              markerInstance.setLatLng([settings.libraryLatitude, settings.libraryLongitude]);
                            }
                            if (circleInstance) {
                              circleInstance.setLatLng([settings.libraryLatitude, settings.libraryLongitude]);
                            }
                          }
                        }}
                        placeholder="e.g. 12.9716"
                        className="gating-input"
                      />
                    </div>

                    <div className="gating-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="gating-field-label" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Library Longitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        name="libraryLongitude"
                        value={settings.libraryLongitude ?? ''} 
                        onChange={handleChange}
                        onBlur={() => {
                          if (settings.libraryLatitude && settings.libraryLongitude) {
                            performReverseGeocode(settings.libraryLatitude, settings.libraryLongitude);
                            if (mapInstance) {
                              mapInstance.setView([settings.libraryLatitude, settings.libraryLongitude], 15);
                            }
                            if (markerInstance) {
                              markerInstance.setLatLng([settings.libraryLatitude, settings.libraryLongitude]);
                            }
                            if (circleInstance) {
                              circleInstance.setLatLng([settings.libraryLatitude, settings.libraryLongitude]);
                            }
                          }
                        }}
                        placeholder="e.g. 77.5946"
                        className="gating-input"
                      />
                    </div>

                    <div className="gating-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="gating-field-label" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Geofence Radius (meters)</label>
                      <input 
                        type="number" 
                        step="any" 
                        name="validRadiusMeters"
                        value={settings.validRadiusMeters ?? ''} 
                        onChange={handleChange}
                        placeholder="e.g. 100"
                        className="gating-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-form-actions">
                  <button type="submit" disabled={saving} className="royal-btn settings-save-btn">
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} /> {t('admin.savingLedger', 'Broadcast-saving Ledger...')}
                      </>
                    ) : (
                      <>
                        <Save size={16} /> {t('admin.saveGatingRules', 'Broadcast Gating Guidelines')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Informational sidebar panel */}
            <div className="royal-card settings-info-sidebar">
              <h3 className="section-title-settings">{t('admin.administrativeImpact', 'Administrative Impact')}</h3>
              <p className="sidebar-info-p">
                {t('admin.gatingImpactDesc', "Once a requirement is toggled Active, the backend's Checkout Gating controller will immediately refuse all subsequent checkout processes for members who lack those coordinates.")}
              </p>

              <div className="impact-check-box">
                <h4 className="impact-box-title">{t('admin.gatedCheckoutGateways', 'Gated Checkout Gateways')}</h4>
                <ul className="impact-list">
                  <li>{t('admin.gatedCheckoutNfc', 'Automated NFC verified card checkouts')}</li>
                  <li>{t('admin.gatedCheckoutTablet', 'In-library terminal tablet self-checkout requests')}</li>
                  <li>{t('admin.gatedCheckoutManual', 'Manual queue circulation desk requests')}</li>
                </ul>
              </div>

              <div className="alert-box-warning-settings">
                <AlertTriangle size={18} className="warn-icon" />
                <p>
                  <strong>{t('admin.precautionNote', 'Precaution Note:')}</strong> {t('admin.precautionDesc', 'Checkouts in progress will not be aborted retrospectively. To allow older members to borrow immediately, consider toggling fields progressively.')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CuratorSettingsPage;
