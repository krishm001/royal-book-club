import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, ArrowLeft, Loader2, Save, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight, MapPin, QrCode, Printer, Clock, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCheckoutSettings, updateCheckoutSettings } from '../../services/checkoutSettingsApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './CuratorSettingsPage.css';
const parseOsmAddress = data => {
  if (!data) return {
    houseNo: '',
    street: '',
    city: '',
    pinCode: '',
    displayName: ''
  };
  const addr = data.address || {};
  const displayName = data.display_name || '';

  // 1. Extract apartment name / house number / building / amenity details
  const houseNoVal = addr.house_number || addr.building || addr.amenity || addr.tourism || addr.shop || addr.office || addr.house_name || addr.apartment || addr.subsubtown || '';

  // 2. Extract city / town / village / suburb / municipality
  let cityVal = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.county || addr.city_district || addr.state_district || addr.state || '';

  // 3. Extract street name
  const streetComponents = [addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.cycleway, addr.neighbourhood || addr.quarter || addr.hamlet || addr.square || addr.croft || addr.place || addr.residential || addr.commercial].filter(Boolean);
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
const CuratorSettingsPage = ({
  user
}) => {
  const {
    t
  } = useLanguage();
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
    enforceReturnGeofencing: true,
    enforceReturnQr: true,
    latestQrPathName: '',
    previousQrPathName: '',
    previousQrActive: false,
    qrHistory: []
  });
  const [newQrPathName, setNewQrPathName] = useState('');
  const [showPrintPlacard, setShowPrintPlacard] = useState(false);
  const [selectedPlacardPath, setSelectedPlacardPath] = useState('');
  const [qrSectionMessage, setQrSectionMessage] = useState(null);
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
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  }, []);
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value === '' ? null : parseFloat(value)
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

      // Avoid duplicate injections, but poll if script is already injecting
      if (document.getElementById('leaflet-cdn-css')) {
        const checkL = setInterval(() => {
          if (window.L) {
            setLeafletLoaded(true);
            clearInterval(checkL);
          }
        }, 100);
        // Safety timeout of 10 seconds
        setTimeout(() => clearInterval(checkL), 10000);
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
    const tileUrl = activeTheme === 'academic' ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let map = mapInstance;
    if (!map) {
      map = window.L.map('library-geofence-map').setView([lat, lon], 15);
      const layer = window.L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
      tileLayerRef.current = layer;
      map.on('click', e => {
        const {
          lat,
          lng
        } = e.latlng;
        const nextLat = parseFloat(lat.toFixed(6));
        const nextLon = parseFloat(lng.toFixed(6));
        setSettings(prev => ({
          ...prev,
          libraryLatitude: nextLat,
          libraryLongitude: nextLon
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
      marker = window.L.marker([lat, lon], {
        draggable: true
      }).addTo(map);
      marker.on('dragend', e => {
        const position = marker.getLatLng();
        const nextLat = parseFloat(position.lat.toFixed(6));
        const nextLon = parseFloat(position.lng.toFixed(6));
        setSettings(prev => ({
          ...prev,
          libraryLatitude: nextLat,
          libraryLongitude: nextLon
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

    // Force Leaflet map layout recalculation on mobile viewports
    const resizeTimeout = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(resizeTimeout);
  }, [loading, leafletLoaded, settings.libraryLatitude, settings.libraryLongitude, settings.validRadiusMeters]);
  useEffect(() => {
    if (tileLayerRef.current) {
      const activeTheme = currentTheme;
      const tileUrl = activeTheme === 'academic' ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
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
          setSettings({
            ...res.data,
            enforceReturnGeofencing: res.data.enforceReturnGeofencing !== false,
            enforceReturnQr: res.data.enforceReturnQr !== false
          });
        }
      } catch (err) {
        console.error('Failed to load gating settings', err);
        setMessage({
          type: 'error',
          text: t('admin.failedRetrieveGating', 'Failed to retrieve active gating constraints from the ledger.')
        });
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [isAdmin, t]);
  const handleToggle = field => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  const handleSelectCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lon = parseFloat(position.coords.longitude.toFixed(6));
        setSettings(prev => ({
          ...prev,
          libraryLatitude: lat,
          libraryLongitude: lon
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
      }, error => {
        console.error("Error retrieving location coordinates:", error);
        alert("Could not retrieve current location. Please verify that browser location access is enabled.");
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };
  const handleSave = async e => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await updateCheckoutSettings(settings);
      if (res?.success && res?.data) {
        setSettings(res.data);
        setMessage({
          type: 'success',
          text: t('admin.gatingPreservedSuccess', 'Self-checkout profile requirements preserved and broadcasted successfully.')
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || t('admin.failedArchiveGating', 'Failed to archive gating rules.')
        });
      }
    } catch (err) {
      console.error('Failed to update gating settings', err);
      setMessage({
        type: 'error',
        text: `${t('admin.errorUpdatingSettings', 'Error updating settings')}: ${err.message}`
      });
    } finally {
      setSaving(false);
    }
  };
  const handleMintQr = async e => {
    e.preventDefault();
    setQrSectionMessage(null);
    if (!newQrPathName || !newQrPathName.trim()) {
      setQrSectionMessage({
        type: 'error',
        text: t('admin.pleaseSupplyValidPath', 'Please supply a valid path name first.')
      });
      return;
    }
    const cleanPath = newQrPathName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!cleanPath) {
      setQrSectionMessage({
        type: 'error',
        text: t('admin.invalidPathFormat', 'Invalid path name format.')
      });
      return;
    }
    try {
      setSaving(true);
      setQrSectionMessage(null);

      // Build updated history
      const nowStr = new Date().toISOString();
      const newHistoryEntry = {
        pathName: cleanPath,
        active: true,
        createdAt: nowStr
      };

      // Deactivate older entries (only latest and previous remain active)
      const updatedHistory = [newHistoryEntry, ...(settings.qrHistory || []).map(item => ({
        ...item,
        active: item.pathName === settings.latestQrPathName ? true : false
      }))];
      const updatedSettings = {
        ...settings,
        previousQrPathName: settings.latestQrPathName || '',
        previousQrActive: settings.latestQrPathName ? true : false,
        latestQrPathName: cleanPath,
        qrHistory: updatedHistory
      };
      const res = await updateCheckoutSettings(updatedSettings);
      if (res?.success && res?.data) {
        setSettings(res.data);
        setNewQrPathName('');
        setQrSectionMessage({
          type: 'success',
          text: t('admin.qrMintedSuccess', 'New Return Validator QR code minted and broadcasted successfully.')
        });
        setSelectedPlacardPath(cleanPath);
        setShowPrintPlacard(true);
      } else {
        setQrSectionMessage({
          type: 'error',
          text: res?.message || t('admin.failedMintQr', 'Failed to save minted QR code.')
        });
      }
    } catch (err) {
      console.error('Failed to mint QR settings', err);
      setQrSectionMessage({
        type: 'error',
        text: t('admin.failedMintQr', 'An unexpected error occurred during QR code minting.')
      });
    } finally {
      setSaving(false);
    }
  };
  const handleDeactivatePreviousQr = async () => {
    try {
      setSaving(true);
      const updatedSettings = {
        ...settings,
        previousQrActive: false,
        qrHistory: (settings.qrHistory || []).map(item => ({
          ...item,
          active: item.pathName === settings.latestQrPathName ? true : false
        }))
      };
      const res = await updateCheckoutSettings(updatedSettings);
      if (res?.success && res?.data) {
        setSettings(res.data);
        setMessage({
          type: 'success',
          text: t('admin.deactivatedQrSuccess', 'Previous Return Validator QR successfully deactivated.')
        });
      }
    } catch (err) {
      console.error('Failed to deactivate QR settings', err);
    } finally {
      setSaving(false);
    }
  };
  if (!isAdmin) {
    return <div className="admin-access-denied-container animate-fade-in">
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
      </div>;
  }
  return <div className="curator-settings-container animate-fade-in">
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

        {loading ? <div className="settings-loader-box">
            <Loader2 className="animate-spin gold-glow-icon" size={48} />
            <p className="loader-text">{t('admin.loadingGatingRules', 'Loading Checkout Gating rules from database...')}</p>
          </div> : <div className="settings-layout-grid">
            <div className="royal-card settings-glass-form-card">
              {message && <div className={`royal-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  <span>{message.text}</span>
                </div>}

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
                    <button type="button" className={`toggle-action-btn ${settings.phoneMandatory ? 'active' : ''}`} onClick={() => handleToggle('phoneMandatory')}>
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
                    <button type="button" className={`toggle-action-btn ${settings.houseNoMandatory ? 'active' : ''}`} onClick={() => handleToggle('houseNoMandatory')}>
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
                    <button type="button" className={`toggle-action-btn ${settings.streetMandatory ? 'active' : ''}`} onClick={() => handleToggle('streetMandatory')}>
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
                    <button type="button" className={`toggle-action-btn ${settings.cityMandatory ? 'active' : ''}`} onClick={() => handleToggle('cityMandatory')}>
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
                    <button type="button" className={`toggle-action-btn ${settings.pinCodeMandatory ? 'active' : ''}`} onClick={() => handleToggle('pinCodeMandatory')}>
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
                    <button type="button" className={`toggle-action-btn ${settings.enforceEmailVerification ? 'active' : ''}`} onClick={() => handleToggle('enforceEmailVerification')}>
                      {settings.enforceEmailVerification ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>

                  {/* Return Geofencing Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label">{t('admin.enforceReturnGeofencing', 'Enforce Location Geofencing on Self-Returns')}</span>
                      <span className="toggle-description">
                        {t('admin.enforceReturnGeofencingDesc', 'Requires scholars to be physically present within the configured library geofence perimeter to perform instant direct self-returns.')}
                      </span>
                    </div>
                    <button type="button" className={`toggle-action-btn ${settings.enforceReturnGeofencing ? 'active' : ''}`} onClick={() => handleToggle('enforceReturnGeofencing')}>
                      {settings.enforceReturnGeofencing ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>

                  {/* Return QR Gating Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label">{t('admin.enforceReturnQr', 'Enforce Validator QR Verification on Fallback')}</span>
                      <span className="toggle-description">
                        {t('admin.enforceReturnQrDesc', 'Forces scanning of physical library QR plaques to verify return validity when GPS checks are failing or blocked.')}
                      </span>
                    </div>
                    <button type="button" className={`toggle-action-btn ${settings.enforceReturnQr ? 'active' : ''}`} onClick={() => handleToggle('enforceReturnQr')}>
                      {settings.enforceReturnQr ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>

                  {/* Divider and Moderation Preferences */}
                  <div className="settings-divider-custom"></div>
                  
                  <h3 className="section-title-settings">
                    <Sparkles size={16} className="gold-glow-icon inline mr-2" style={{
                  verticalAlign: 'text-bottom',
                  display: 'inline-block'
                }} />
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
                    <button type="button" className={`toggle-action-btn ${settings.autoModerateBlogs ? 'active' : ''}`} onClick={() => handleToggle('autoModerateBlogs')}>
                      {settings.autoModerateBlogs ? <ToggleRight size={38} className="gold-toggle" /> : <ToggleLeft size={38} className="muted-toggle" />}
                    </button>
                  </div>
                  {/* Geofencing Settings */}
                  <div className="settings-divider-custom"></div>
                  
                  <h3 className="section-title-settings">
                    <MapPin size={16} className="gold-glow-icon inline mr-2" style={{
                  verticalAlign: 'text-bottom',
                  display: 'inline-block'
                }} />
                    {t('admin.geolocationGeofencingSettings', 'Library Return Geofencing Bounds')}
                  </h3>

                  <p className="toggle-description" style={{
                marginBottom: '15px'
              }}>
                    {t('admin.geofencingDesc', 'Configure the coordinates of your Royal Library structure and define the valid haversine radius (in meters) within which mobile return transactions are marked as Location Verified.')}
                  </p>

                  {/* Dynamic Interactive Leaflet Map Container */}
                  <div id="library-geofence-map" style={{
                height: '320px',
                width: '100%',
                borderRadius: '8px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(212, 175, 55, 0.05)',
                marginBottom: '20px',
                background: 'rgba(0,0,0,0.2)',
                zIndex: 1
              }} />

                  <div className="current-location-btn-container" style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '16px'
              }}>
                    <button type="button" onClick={handleSelectCurrentLocation} className="current-location-btn" style={{
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
                }}>
                      <MapPin size={16} />
                      <span>{t("str_5321", "Select Current Location")}</span>
                    </button>
                  </div>

                  {/* Dynamic Reverse Geocoded Address Details Display Card */}
                  {locationDetails && <div className="location-details-card royal-card animate-fade-in" style={{
                padding: '16px 20px',
                background: 'rgba(212, 175, 55, 0.03)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                      <h4 style={{
                  color: 'var(--accent, #d4af37)',
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                        <MapPin size={15} style={{
                    filter: 'drop-shadow(0 0 3px rgba(212, 175, 55, 0.4))'
                  }} />
                        <span>{t("str_5322", "Resolved Boundary Address")}</span>
                      </h4>
                      <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  fontSize: '0.85rem'
                }}>
                        {locationDetails.houseNo && <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                            <span style={{
                      color: 'var(--text-secondary, #9a9ab0)',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>{t("str_5323", "Building / Apartment")}</span>
                            <span style={{
                      color: 'var(--text-primary, #ffffff)',
                      fontWeight: '600'
                    }}>{locationDetails.houseNo}</span>
                          </div>}
                        <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                          <span style={{
                      color: 'var(--text-secondary, #9a9ab0)',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>{t("str_5324", "Street / Neighborhood")}</span>
                          <span style={{
                      color: 'var(--text-primary, #ffffff)',
                      fontWeight: '600'
                    }}>{locationDetails.street || 'N/A'}</span>
                        </div>
                        <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                          <span style={{
                      color: 'var(--text-secondary, #9a9ab0)',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>{t("str_5325", "City / Suburb")}</span>
                          <span style={{
                      color: 'var(--text-primary, #ffffff)',
                      fontWeight: '600'
                    }}>{locationDetails.city || 'N/A'}</span>
                        </div>
                        <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                          <span style={{
                      color: 'var(--text-secondary, #9a9ab0)',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>{t("str_5326", "Pincode / Postcode")}</span>
                          <span style={{
                      color: 'var(--text-primary, #ffffff)',
                      fontWeight: '600'
                    }}>{locationDetails.pinCode || 'N/A'}</span>
                        </div>
                      </div>
                      {locationDetails.displayName && <div style={{
                  borderTop: '1px solid var(--glass-border)',
                  marginTop: '12px',
                  paddingTop: '10px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary, #9a9ab0)',
                  lineHeight: '1.4'
                }}>
                          <strong>{t("str_5327", "Full Display Address:")}</strong> {locationDetails.displayName}
                        </div>}
                    </div>}

                  {reverseGeocoding && <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
                padding: '10px 14px',
                background: 'var(--glass-bg)',
                borderRadius: '6px',
                border: '1px dashed var(--glass-border)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                      <Loader2 size={14} className="animate-spin" style={{
                  color: 'var(--accent)'
                }} />
                      <span>{t("str_5328", "Reverse geocoding coordinates via OpenStreetMap...")}</span>
                    </div>}

                  <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginBottom: '20px'
              }}>
                    <div className="gating-field-group" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                      <label className="gating-field-label" style={{
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>{t("str_5329", "Library Latitude")}</label>
                      <input type="number" step="any" name="libraryLatitude" value={settings.libraryLatitude ?? ''} onChange={handleChange} onBlur={() => {
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
                  }} placeholder={t("str_5330", "e.g. 12.9716")} className="gating-input" />
                    </div>

                    <div className="gating-field-group" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                      <label className="gating-field-label" style={{
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>{t("str_5331", "Library Longitude")}</label>
                      <input type="number" step="any" name="libraryLongitude" value={settings.libraryLongitude ?? ''} onChange={handleChange} onBlur={() => {
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
                  }} placeholder={t("str_5332", "e.g. 77.5946")} className="gating-input" />
                    </div>

                    <div className="gating-field-group" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                      <label className="gating-field-label" style={{
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>{t("str_5333", "Geofence Radius (meters)")}</label>
                      <input type="number" step="any" name="validRadiusMeters" value={settings.validRadiusMeters ?? ''} onChange={handleChange} placeholder={t("str_5334", "e.g. 100")} className="gating-input" />
                    </div>
                  </div>
                </div>

                <div className="settings-form-actions">
                  <button type="submit" disabled={saving} className="royal-btn settings-save-btn">
                    {saving ? <>
                        <Loader2 className="animate-spin mr-2" size={16} /> {t('admin.savingLedger', 'Broadcast-saving Ledger...')}
                      </> : <>
                        <Save size={16} /> {t('admin.saveGatingRules', 'Broadcast Gating Guidelines')}
                      </>}
                  </button>
                </div>
              </form>

              {/* Return Validator QR Code Section */}
              <div className="royal-card qr-validator-card" style={{
            marginTop: '2.5rem'
          }}>
                <div className="settings-section-header" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
                  <QrCode className="sparkle-icon" size={24} />
                  <h3 className="section-title-settings" style={{
                margin: 0
              }}>
                    {t('admin.qrValidatorTitle', 'Return Validator QR Generator')}
                  </h3>
                </div>
                
                <p className="section-desc" style={{
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              marginBottom: '2rem'
            }}>
                  {t('admin.qrValidatorDesc', 'Provision deep-linked validator QR codes for physical library return locations. Scanning these validation codes will instantly authorize patron returns.')}
                </p>

                {/* Minting form */}
                <form onSubmit={handleMintQr} className="qr-mint-form" style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
                  <div style={{
                flex: 1
              }}>
                    <input type="text" value={newQrPathName} onChange={e => setNewQrPathName(e.target.value)} placeholder={t('admin.qrPlaceholder', 'e.g. exit-spot-alpha')} className="gating-input" style={{
                  width: '100%',
                  padding: '0.8rem 1.2rem',
                  borderRadius: '10px'
                }} />
                  </div>
                  <button type="submit" disabled={saving} className="royal-btn" style={{
                padding: '0.8rem 1.8rem',
                whiteSpace: 'nowrap'
              }}>
                    <Sparkles size={16} style={{
                  marginRight: '6px'
                }} />
                    {t('admin.mintQrBtn', 'Mint QR Code')}
                  </button>
                </form>

                {qrSectionMessage && <div className={`royal-alert ${qrSectionMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{
              marginBottom: '2rem'
            }}>
                    {qrSectionMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    <span>{qrSectionMessage.text}</span>
                  </div>}


                {/* Active codes info */}
                <div className="active-codes-container" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              marginBottom: '2.5rem'
            }}>
                  <div className="qr-active-box latest" style={{
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '1.5rem',
                background: 'rgba(var(--accent-glow), 0.02)'
              }}>
                    <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                      <span className="badge active" style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                        {t('admin.latestActive', 'LATEST ACTIVE')}
                      </span>
                      {settings.latestQrPathName && <button type="button" className="print-action-btn" onClick={() => {
                    setSelectedPlacardPath(settings.latestQrPathName);
                    setShowPrintPlacard(true);
                  }} style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                          <Printer size={14} /> {t('admin.printPlacard', 'Print Placard')}
                        </button>}
                    </div>
                    <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.1rem'
                }}>{settings.latestQrPathName || t('admin.noActiveQr', 'No active code')}</h4>
                    <p style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)'
                }}>{t("str_5335", "https://bookshelfnet.com/")}{settings.latestQrPathName || '...'}</p>
                  </div>

                  <div className="qr-active-box previous" style={{
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '1.5rem',
                position: 'relative'
              }}>
                    <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                      <span className={`badge ${settings.previousQrActive ? 'active' : 'inactive'}`} style={{
                    background: settings.previousQrActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    color: settings.previousQrActive ? '#3b82f6' : '#888888',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                        {settings.previousQrActive ? t('admin.prevActive', 'PREVIOUS ACTIVE') : t('admin.deactivated', 'DEACTIVATED')}
                      </span>
                      {settings.previousQrActive && <div style={{
                    display: 'flex',
                    gap: '10px'
                  }}>
                          <button type="button" className="deactivate-action-btn" onClick={handleDeactivatePreviousQr} style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                            <Trash2 size={14} /> {t('admin.deactivate', 'Deactivate')}
                          </button>
                          <button type="button" className="print-action-btn" onClick={() => {
                      setSelectedPlacardPath(settings.previousQrPathName);
                      setShowPrintPlacard(true);
                    }} style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--gold-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                            <Printer size={14} /> {t('admin.printPlacard', 'Print Placard')}
                          </button>
                        </div>}
                    </div>
                    <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.1rem'
                }}>{settings.previousQrPathName || t('admin.noPreviousQr', 'No previous code')}</h4>
                    <p style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)'
                }}>{t("str_5336", "https://bookshelfnet.com/")}{settings.previousQrPathName || '...'}</p>
                  </div>
                </div>

                {/* History table */}
                <h4 style={{
              fontSize: '1.1rem',
              marginBottom: '1rem',
              fontWeight: 700
            }}>{t('admin.qrHistoryTitle', 'QR Code Registry & Lineage')}</h4>
                <div className="qr-history-table-wrapper" style={{
              overflowX: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '12px'
            }}>
                  <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem',
                textAlign: 'left'
              }}>
                    <thead>
                      <tr style={{
                    background: 'var(--border-color)',
                    opacity: 0.8
                  }}>
                        <th style={{
                      padding: '0.8rem 1.2rem',
                      fontWeight: 700
                    }}>{t('admin.pathName', 'PATH NAME')}</th>
                        <th style={{
                      padding: '0.8rem 1.2rem',
                      fontWeight: 700
                    }}>{t('admin.status', 'STATUS')}</th>
                        <th style={{
                      padding: '0.8rem 1.2rem',
                      fontWeight: 700
                    }}>{t('admin.dateMinted', 'DATE MINTED')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.qrHistory && settings.qrHistory.length > 0 ? settings.qrHistory.map((item, idx) => {
                    const isActive = item.pathName === settings.latestQrPathName || item.pathName === settings.previousQrPathName && settings.previousQrActive;
                    return <tr key={idx} style={{
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                              <td style={{
                        padding: '0.8rem 1.2rem',
                        fontFamily: 'monospace',
                        fontWeight: 600
                      }}>{item.pathName}</td>
                              <td style={{
                        padding: '0.8rem 1.2rem'
                      }}>
                                <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          color: isActive ? '#10b981' : '#888888'
                        }}>
                                  {isActive ? t('admin.active', 'Active') : t('admin.inactive', 'Inactive')}
                                </span>
                              </td>
                              <td style={{
                        padding: '0.8rem 1.2rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem'
                      }}>
                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>;
                  }) : <tr>
                          <td colSpan="3" style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)'
                    }}>
                            {t('admin.noQrHistory', 'No QR validator codes currently provisioned.')}
                          </td>
                        </tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Printable Placard Modal overlay */}
              {showPrintPlacard && <div className="placard-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '2rem'
          }}>
                  <div className="printable-placard" style={{
              background: '#ffffff',
              color: '#000000',
              width: '100%',
              maxWidth: '600px',
              padding: '3.5rem',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
                    
                    {/* Action buttons */}
                    <div className="no-print" style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                display: 'flex',
                gap: '10px'
              }}>
                      <button onClick={() => window.print()} className="royal-btn" style={{
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                        <Printer size={16} /> {t('admin.printPlacard', 'Print Placard')}
                      </button>
                      <button onClick={() => setShowPrintPlacard(false)} className="royal-btn-secondary" style={{
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  color: '#333',
                  background: '#f5f5f5',
                  border: '1px solid #ccc'
                }}>
                        {t('common.close', 'Close')}
                      </button>
                    </div>

                    <div style={{
                textAlign: 'center',
                borderBottom: '2px solid #d4af37',
                width: '100%',
                paddingBottom: '1.5rem',
                marginBottom: '2.5rem'
              }}>
                      <h2 style={{
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  margin: '0 0 0.5rem 0',
                  letterSpacing: '0.05em',
                  color: '#111111'
                }}>{t("str_5337", "ROYAL BOOK CLUB")}</h2>
                      <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: '#d4af37'
                }}>{t("str_5338", "Official Physical Validation Point")}</span>
                    </div>

                    <div style={{
                background: '#ffffff',
                border: '3px solid #d4af37',
                padding: '1.5rem',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                marginBottom: '2.5rem'
              }}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://bookshelfnet.com/${selectedPlacardPath}`} alt={t("str_5339", "Return Validation QR Code")} style={{
                  display: 'block',
                  width: '250px',
                  height: '250px'
                }} />
                    </div>

                    <div style={{
                textAlign: 'center',
                maxWidth: '420px'
              }}>
                      <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  margin: '0 0 1rem 0',
                  color: '#222222'
                }}>{t("str_5340", "How to complete your return:")}</h3>
                      <ol style={{
                  paddingLeft: '1.5rem',
                  textAlign: 'left',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  color: '#555555'
                }}>
                        <li style={{
                    marginBottom: '0.5rem'
                  }}>{t("str_5341", "Initiate return on your device using NFC tap, barcode scan, or manual request.")}</li>
                        <li style={{
                    marginBottom: '0.5rem'
                  }}>{t("str_5342", "When prompted, point your device camera at this QR code to validate your physical location.")}</li>
                        <li style={{
                    marginBottom: '0.5rem'
                  }}>{t("str_5343", "Your ledger status will instantly transition to")} <strong>{t("str_5344", "RETURNED")}</strong>.</li>
                      </ol>
                    </div>

                    <div style={{
                marginTop: '3rem',
                fontSize: '0.8rem',
                color: '#888888',
                borderTop: '1px dashed #ccc',
                width: '100%',
                paddingTop: '1.5rem',
                textAlign: 'center'
              }}> {t("str_5345", "Validator Path:")} <strong>{selectedPlacardPath}</strong> {t("str_5346", "\u2022 Secure Sovereign Ledger")} </div>
                  </div>
                </div>}
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
          </div>}
      </div>
    </div>;
};
export default CuratorSettingsPage;