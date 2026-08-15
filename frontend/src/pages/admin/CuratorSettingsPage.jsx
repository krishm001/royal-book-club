import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, ArrowLeft, Loader2, Save, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCheckoutSettings, updateCheckoutSettings } from '../../services/checkoutSettingsApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './CuratorSettingsPage.css';

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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div className="gating-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>Library Latitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        name="libraryLatitude"
                        value={settings.libraryLatitude ?? ''} 
                        onChange={handleChange}
                        placeholder="e.g. 12.9716"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,165,116,0.2)', padding: '10px', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>

                    <div className="gating-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>Library Longitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        name="libraryLongitude"
                        value={settings.libraryLongitude ?? ''} 
                        onChange={handleChange}
                        placeholder="e.g. 77.5946"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,165,116,0.2)', padding: '10px', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>

                    <div className="gating-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>Geofence Radius (meters)</label>
                      <input 
                        type="number" 
                        step="any" 
                        name="validRadiusMeters"
                        value={settings.validRadiusMeters ?? ''} 
                        onChange={handleChange}
                        placeholder="e.g. 100"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,165,116,0.2)', padding: '10px', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
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
