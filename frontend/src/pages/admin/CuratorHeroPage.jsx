import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowLeft, 
  Upload, 
  Save, 
  Image, 
  Eye, 
  Type,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchHeroConfig, updateHeroConfig } from '../../services/heroApi';
import { uploadBookImage } from '../../services/storageApi';
import './CuratorHeroPage.css';

const CuratorHeroPage = () => {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');

  // Local state for uploading image
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadHeroConfigData();
  }, []);

  const loadHeroConfigData = async () => {
    try {
      setLoading(true);
      const res = await fetchHeroConfig();
      if (res && res.success && res.data) {
        setTitle(res.data.title || '');
        setSubtitle(res.data.subtitle || '');
        setBackgroundImageUrl(res.data.backgroundImageUrl || '');
        setCoverPreview(res.data.backgroundImageUrl || '');
      }
    } catch (err) {
      console.error('Error fetching hero config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      let uploadedUrl = backgroundImageUrl;

      if (coverFile) {
        setIsUploading(true);
        try {
          uploadedUrl = await uploadBookImage(coverFile);
          setBackgroundImageUrl(uploadedUrl);
        } catch (uploadErr) {
          alert(`Hero Image Upload Failed: ${uploadErr.message}`);
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const payload = {
        id: 'homeHero',
        title: title.trim(),
        subtitle: subtitle.trim(),
        backgroundImageUrl: uploadedUrl || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80'
      };

      const res = await updateHeroConfig(payload);
      if (res && res.success) {
        alert('Home Hero configurations updated successfully!');
      }
    } catch (err) {
      console.error('Failed to update hero config:', err);
      alert('Failed to save Hero configurations. Check backend console.');
    } finally {
      setIsSaving(false);
    }
  };

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

              <div className="form-group">
                <label className="royal-label">Lounge Painting Banner</label>
                <div className="banner-upload-zone">
                  <input
                    type="file"
                    id="hero-banner-file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="hero-banner-file" className="banner-upload-trigger">
                    <Upload size={16} /> Choose Image Banner
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="royal-btn save-hero-btn"
                >
                  <Save size={16} /> {isSaving ? (isUploading ? 'Uploading Banner...' : 'Refining Hero...') : 'Apply Curation'}
                </button>
              </div>
            </form>
          </section>

          {/* Live Preview Side */}
          <section className="live-preview-section">
            <div className="preview-label">
              <Eye size={14} /> LIVE CURATOR PREVIEW
            </div>
            
            <div className="live-hero-preview-frame" style={{ backgroundImage: `url(${coverPreview || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80'})` }}>
              <div className="live-preview-overlay"></div>
              <div className="live-preview-content">
                <span className="live-badge">EXQUISITE LITERARY SALON</span>
                <h1 className="live-title">{title || 'Where Literature Reigns Supreme'}</h1>
                <p className="live-subtitle">{subtitle || 'Enter a world of curated academic papers, fine leather volumes, and intimate fireside symposiums.'}</p>
                <button className="royal-btn mini-btn-live">Enter the Salon</button>
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
};

export default CuratorHeroPage;
