import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, ArrowLeft, Loader2, Save, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCheckoutSettings, updateCheckoutSettings } from '../../services/checkoutSettingsApi';
import './CuratorSettingsPage.css';

const CuratorSettingsPage = ({ user }) => {
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
  });

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
          text: 'Failed to retrieve active gating constraints from the ledger.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [isAdmin]);

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
          text: 'Self-checkout profile requirements preserved and broadcasted successfully.',
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || 'Failed to archive gating rules.',
        });
      }
    } catch (err) {
      console.error('Failed to update gating settings', err);
      setMessage({
        type: 'error',
        text: `Error updating settings: ${err.message}`,
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
          <h2 className="denied-title gold-gradient-text">Privileged Sanctuary</h2>
          <p className="denied-message">
            Your current credentials do not grant access to the Curator Curation Dashboard. Changing checkout requirements is reserved for assigned Curators.
          </p>
          <div className="denied-actions">
            <Link to="/" className="royal-btn return-home-btn">
              Return to Entrance Hall
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
          <ArrowLeft size={16} /> Return to Curator Console
        </Link>

        {/* Header */}
        <header className="curator-settings-header">
          <div className="header-badge-settings">
            <Shield size={14} className="gold-glow-icon" />
            <span className="gold-gradient-text">SOVEREIGN GATING CONSOLE</span>
          </div>
          <h1 className="settings-page-title glow-text">Self-Checkout Profile Gating</h1>
          <p className="settings-page-subtitle">
            Configure registration requirements that members must satisfy in their Profile Ledger before using automated RFID tap-to-checkout or manual request desks.
          </p>
        </header>

        {loading ? (
          <div className="settings-loader-box">
            <Loader2 className="animate-spin gold-glow-icon" size={48} />
            <p className="loader-text">Loading Checkout Gating rules from database...</p>
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
                  <h3 className="section-title-settings">Profile Requirement Toggles</h3>

                  {/* Phone Toggle */}
                  <div className="gating-toggle-row">
                    <div className="toggle-text-info">
                      <span className="toggle-label">Require Telephone Coordinates</span>
                      <span className="toggle-description">
                        Members must supply a valid contact number. Necessary for courier alignments and SMS book-return reminders.
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
                      <span className="toggle-label">Require House / Suite / Apartment Number</span>
                      <span className="toggle-description">
                        Members must register their specific dwelling locator within their designated Sovereign House or community.
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
                      <span className="toggle-label">Require Street Name alignment</span>
                      <span className="toggle-description">
                        Members must complete their street alignment details, matching physical post coordinate points.
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
                      <span className="toggle-label">Require Municipal City registry</span>
                      <span className="toggle-description">
                        Members must register the city bounds of their residency to track geopolitical scholar density.
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
                      <span className="toggle-label">Require PIN / Postal Code coordinates</span>
                      <span className="toggle-description">
                        Mandatory postal indicator. Ensures physical address verification operates smoothly during collection periods.
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
                </div>

                <div className="settings-form-actions">
                  <button type="submit" disabled={saving} className="royal-btn settings-save-btn">
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} /> Broadcast-saving Ledger...
                      </>
                    ) : (
                      <>
                        <Save size={16} /> Broadcast Gating Guidelines
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Informational sidebar panel */}
            <div className="royal-card settings-info-sidebar">
              <h3 className="section-title-settings">Administrative Impact</h3>
              <p className="sidebar-info-p">
                Once a requirement is toggled <strong>Active</strong>, the backend's Checkout Gating controller will immediately refuse all subsequent checkout processes for members who lack those coordinates.
              </p>

              <div className="impact-check-box">
                <h4 className="impact-box-title">Gated Checkout Gateways</h4>
                <ul className="impact-list">
                  <li>Automated NFC verified card checkouts</li>
                  <li>In-library terminal tablet self-checkout requests</li>
                  <li>Manual queue circulation desk requests</li>
                </ul>
              </div>

              <div className="alert-box-warning-settings">
                <AlertTriangle size={18} className="warn-icon" />
                <p>
                  <strong>Precaution Note:</strong> Checkouts in progress will not be aborted retrospectively. To allow older members to borrow immediately, consider toggling fields progressively.
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
