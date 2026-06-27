import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowLeft, 
  Upload, 
  Save, 
  Image, 
  Eye, 
  Type,
  FileText,
  RotateCcw,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchHeroConfig, updateHeroConfig, deleteHeroConfig } from '../../services/heroApi';
import { uploadBookImage } from '../../services/storageApi';
import './CuratorHeroPage.css';

const CuratorHeroPage = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [backgroundImageUrlSalon, setBackgroundImageUrlSalon] = useState('');
  const [backgroundImageUrlAcademic, setBackgroundImageUrlAcademic] = useState('');

  // Local state for uploading images
  const [coverFileSalon, setCoverFileSalon] = useState(null);
  const [coverPreviewSalon, setCoverPreviewSalon] = useState('');
  const [coverFileAcademic, setCoverFileAcademic] = useState(null);
  const [coverPreviewAcademic, setCoverPreviewAcademic] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activePreviewTheme, setActivePreviewTheme] = useState('academic'); // academic is default now!

  const isAdmin = user && user.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    loadHeroConfigData();
  }, [isAdmin]);

  const loadHeroConfigData = async () => {
    try {
      setLoading(true);
      const res = await fetchHeroConfig();
      if (res && res.success && res.data) {
        setTitle(res.data.title || '');
        setSubtitle(res.data.subtitle || '');
        const salonImg = res.data.backgroundImageUrlSalon || res.data.backgroundImageUrl || '';
        const acadImg = res.data.backgroundImageUrlAcademic || res.data.backgroundImageUrl || '';
        setBackgroundImageUrlSalon(salonImg);
        setCoverPreviewSalon(salonImg);
        setBackgroundImageUrlAcademic(acadImg);
        setCoverPreviewAcademic(acadImg);
      }
    } catch (err) {
      console.error('Error fetching hero config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChangeSalon = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFileSalon(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreviewSalon(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChangeAcademic = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFileAcademic(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreviewAcademic(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      let uploadedUrlSalon = backgroundImageUrlSalon;
      let uploadedUrlAcademic = backgroundImageUrlAcademic;

      if (coverFileSalon || coverFileAcademic) {
        setIsUploading(true);
      }

      if (coverFileSalon) {
        try {
          uploadedUrlSalon = await uploadBookImage(coverFileSalon);
          setBackgroundImageUrlSalon(uploadedUrlSalon);
        } catch (uploadErr) {
          alert(`Salon Image Upload Failed: ${uploadErr.message}`);
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
      }

      if (coverFileAcademic) {
        try {
          uploadedUrlAcademic = await uploadBookImage(coverFileAcademic);
          setBackgroundImageUrlAcademic(uploadedUrlAcademic);
        } catch (uploadErr) {
          alert(`Academic Image Upload Failed: ${uploadErr.message}`);
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
      }
      
      setIsUploading(false);

      const payload = {
        id: 'homeHero',
        title: title.trim(),
        subtitle: subtitle.trim(),
        backgroundImageUrl: uploadedUrlAcademic || uploadedUrlSalon || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80',
        backgroundImageUrlSalon: uploadedUrlSalon || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80',
        backgroundImageUrlAcademic: uploadedUrlAcademic || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80'
      };

      const res = await updateHeroConfig(payload);
      if (res && res.success) {
        alert('Home Hero configurations updated successfully!');
        setCoverFileSalon(null);
        setCoverFileAcademic(null);
        loadHeroConfigData();
      }
    } catch (err) {
      console.error('Failed to update hero config:', err);
      alert('Failed to save Hero configurations. Check backend console.');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset/delete the home hero custom configuration? This will restore the default homepage details.')) {
      return;
    }

    try {
      setIsSaving(true);
      const res = await deleteHeroConfig();
      if (res && res.success) {
        alert('Home Hero configurations deleted. Fallback defaults will be loaded.');
        setTitle('');
        setSubtitle('');
        setBackgroundImageUrlSalon('');
        setBackgroundImageUrlAcademic('');
        setCoverPreviewSalon('');
        setCoverPreviewAcademic('');
        setCoverFileSalon(null);
        setCoverFileAcademic(null);
      }
    } catch (err) {
      console.error('Failed to reset hero config:', err);
      alert('Failed to reset Hero configurations.');
    } finally {
      setIsSaving(false);
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
            Your current credentials do not grant access to the Curator Hero Editor. Curation of the Royal Library is reserved for assigned Curators.
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
    <div className="curator-hero-container animate-fade-in">
      <header className="curator-hero-header">
        <Link to="/admin" className="back-link">
          <ArrowLeft size={16} /> Curator Console
        </Link>
        <div className="header-badge-curator">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">HERO CUSTOMIZER</span>
        </div>
        <h1 className="curator-hero-title glow-text">Landing Hero Editor</h1>
        <p className="curator-hero-subtitle">
          Customize the high-impact landing screen of the Royal Book Club. Set custom titles, design subtitles, and upload gorgeous cover paintings as backgrounds.
        </p>
      </header>

      {loading ? (
        <div className="loading-boundary">
          <div className="loader-mini"></div>
          <p>Unrolling parchment settings...</p>
        </div>
      ) : (
        <div className="hero-editor-split-layout">
          
          {/* Form Side */}
          <section className="royal-card editor-form-card">
            <div className="form-card-header">
              <h3><Type size={18} className="gold-glow-icon" /> Aesthetic Parameters</h3>
            </div>

            <form onSubmit={handleSave} className="hero-edit-form">
              <div className="form-group">
                <label className="royal-label">Sovereign Headline</label>
                <input
                  type="text"
                  className="royal-input"
                  placeholder="e.g. Where Literature Reigns Supreme"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="royal-label">Sovereign Sub-headline</label>
                <textarea
                  className="royal-input subtitle-textarea"
                  placeholder="e.g. Enter a world of curated academic papers, fine leather volumes, and intimate fireside symposiums with world-class authors."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <div className="theme-images-upload-grid">
                <div className="form-group">
                  <label className="royal-label">Salon Theme Banner (Dark/Gold)</label>
                  <div className="banner-upload-zone">
                    <input
                      type="file"
                      id="hero-banner-salon"
                      accept="image/*"
                      onChange={handleFileChangeSalon}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="hero-banner-salon" className="banner-upload-trigger">
                      <Upload size={14} /> Salon Banner
                    </label>
                  </div>
                  {coverPreviewSalon && (
                    <div className="banner-mini-preview">
                      <img src={coverPreviewSalon} alt="Salon preview" />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="royal-label">Academic Theme Banner (Beige/Maroon)</label>
                  <div className="banner-upload-zone">
                    <input
                      type="file"
                      id="hero-banner-academic"
                      accept="image/*"
                      onChange={handleFileChangeAcademic}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="hero-banner-academic" className="banner-upload-trigger">
                      <Upload size={14} /> Academic Banner
                    </label>
                  </div>
                  {coverPreviewAcademic && (
                    <div className="banner-mini-preview">
                      <img src={coverPreviewAcademic} alt="Academic preview" />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions hero-action-buttons">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="royal-btn save-hero-btn"
                >
                  <Save size={16} /> {isSaving ? (isUploading ? 'Uploading Banner...' : 'Refining Hero...') : 'Apply Curation'}
                </button>

                <button 
                  type="button" 
                  onClick={handleReset}
                  disabled={isSaving}
                  className="royal-btn-secondary reset-hero-btn"
                  title="Reset to Factory Defaults"
                >
                  <RotateCcw size={16} /> Reset defaults
                </button>
              </div>
            </form>
          </section>

          {/* Live Preview Side */}
          <section className="live-preview-section">
            <div className="preview-label">
              <div className="preview-label-text">
                <Eye size={14} /> LIVE CURATOR PREVIEW
              </div>
              <div className="preview-theme-selector">
                <button 
                  type="button" 
                  className={`preview-toggle-tab ${activePreviewTheme === 'salon' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTheme('salon')}
                >
                  Salon View
                </button>
                <button 
                  type="button" 
                  className={`preview-toggle-tab ${activePreviewTheme === 'academic' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTheme('academic')}
                >
                  Academic View
                </button>
              </div>
            </div>
            
            <div 
              className={`live-hero-preview-frame ${activePreviewTheme}`} 
              style={{ 
                backgroundImage: `url(${
                  activePreviewTheme === 'salon' 
                    ? (coverPreviewSalon || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80') 
                    : (coverPreviewAcademic || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80')
                })` 
              }}
            >
              <div className="live-preview-overlay"></div>
              <div className="live-preview-content">
                <span className="live-badge">
                  {activePreviewTheme === 'salon' ? 'EXQUISITE LITERARY SALON' : 'ROYAL ACADEMIC STUDY'}
                </span>
                <h1 className="live-title">{title || 'Where Literature Reigns Supreme'}</h1>
                <p className="live-subtitle">{subtitle || 'Enter a world of curated academic papers, fine leather volumes, and intimate fireside symposiums.'}</p>
                <button className="royal-btn mini-btn-live">Enter the Study</button>
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
};

export default CuratorHeroPage;
