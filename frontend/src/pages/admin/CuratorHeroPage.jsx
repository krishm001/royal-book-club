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
  Shield,
  BarChart3,
  Lock,
  Unlock,
  PlusCircle,
  Clock,
  Check,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchHeroConfig, updateHeroConfig, deleteHeroConfig } from '../../services/heroApi';
import { uploadBookImage } from '../../services/storageApi';
import { createPoll, fetchPollHistory, activatePoll } from '../../services/pollApi';
import './CuratorHeroPage.css';

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV'];

const CuratorHeroPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('hero');
  const [loading, setLoading] = useState(true);
  
  // Hero customizer state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [backgroundImageUrlSalon, setBackgroundImageUrlSalon] = useState('');
  const [backgroundImageUrlAcademic, setBackgroundImageUrlAcademic] = useState('');
  const [coverFileSalon, setCoverFileSalon] = useState(null);
  const [coverPreviewSalon, setCoverPreviewSalon] = useState('');
  const [coverFileAcademic, setCoverFileAcademic] = useState(null);
  const [coverPreviewAcademic, setCoverPreviewAcademic] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activePreviewTheme, setActivePreviewTheme] = useState('academic');

  // Poll customizer state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '', '', '']);
  const [pollMembersOnly, setPollMembersOnly] = useState(false);
  const [isSavingPoll, setIsSavingPoll] = useState(false);
  const [pollHistory, setPollHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const isAdmin = user && user.role === 'ADMIN';

  // Initial load
  useEffect(() => {
    if (!isAdmin) return;
    loadHeroConfigData();
    loadPollHistoryData();
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

  const loadPollHistoryData = async () => {
    try {
      setLoadingHistory(true);
      setHistoryError(null);
      const res = await fetchPollHistory();
      if (res && res.success) {
        setPollHistory(res.data || []);
      } else {
        setHistoryError('Unable to retrieve historical scrolls.');
      }
    } catch (err) {
      console.error('Error fetching poll history:', err);
      setHistoryError('Error contacting the history database.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // File Handlers for Hero Images
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

  // Submit Handler for Hero Edit
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
      alert('Failed to save Hero configurations.');
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

  // Poll handlers
  const handleOptionChange = (idx, value) => {
    const updated = [...pollOptions];
    updated[idx] = value;
    setPollOptions(updated);
  };

  const handleCreatePollSubmit = async (e) => {
    e.preventDefault();
    if (isSavingPoll) return;

    if (!pollQuestion.trim()) {
      alert('Plebiscite question cannot be empty.');
      return;
    }
    const trimmedOptions = pollOptions.map(opt => opt.trim());
    if (trimmedOptions.some(opt => !opt)) {
      alert('A valid plebiscite must have all 4 options filled.');
      return;
    }

    try {
      setIsSavingPoll(true);
      const payload = {
        question: pollQuestion.trim(),
        options: trimmedOptions,
        membersOnly: pollMembersOnly
      };

      const res = await createPoll(payload);
      if (res && res.success) {
        alert('Plebiscite deployed and activated in the Entrance Hall!');
        setPollQuestion('');
        setPollOptions(['', '', '', '']);
        setPollMembersOnly(false);
        loadPollHistoryData();
      }
    } catch (err) {
      console.error('Failed to deploy poll:', err);
      alert('Failed to deploy plebiscite. Enforce 4 options and valid text.');
    } finally {
      setIsSavingPoll(false);
    }
  };

  const handleReactivatePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to reactivate this archived plebiscite? This will immediately deploy it to the homepage and archive the currently active one.')) {
      return;
    }

    try {
      const res = await activatePoll(pollId);
      if (res && res.success) {
        alert('Archived plebiscite is now active in the Guild Entrance Hall!');
        loadPollHistoryData();
      }
    } catch (err) {
      console.error('Failed to reactivate poll:', err);
      alert('Failed to reactivate plebiscite.');
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
            Your current credentials do not grant access to the Curator Console. Curation of the Royal Library is reserved for assigned Curators.
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
          <span className="gold-gradient-text">PORTAL CURATION</span>
        </div>
        <h1 className="curator-hero-title glow-text">Portal Theme & Plebiscites</h1>
        <p className="curator-hero-subtitle">
          Customize the aesthetic homepage banners, title statements, or configure real-time community book polls (Guild Plebiscites) for patrons.
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="curator-tabs-container">
        <button 
          className={`curator-tab-btn ${activeTab === 'hero' ? 'active' : ''}`}
          onClick={() => setActiveTab('hero')}
        >
          <Type size={16} /> Landing Hero Editor
        </button>
        <button 
          className={`curator-tab-btn ${activeTab === 'polls' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('polls');
            loadPollHistoryData();
          }}
        >
          <BarChart3 size={16} /> Guild Plebiscites (Polls)
        </button>
      </div>

      {loading ? (
        <div className="loading-boundary">
          <div className="loader-mini"></div>
          <p>Unrolling parchment settings...</p>
        </div>
      ) : (
        <div className="curator-tab-content-wrapper">
          
          {/* TAB 1: HERO CONFIGURATOR */}
          {activeTab === 'hero' && (
            <div className="hero-editor-split-layout animate-fade-in">
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
                      title="Reset to Defaults"
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

          {/* TAB 2: GUILD PLEBISCITES (POLLS) */}
          {activeTab === 'polls' && (
            <div className="hero-editor-split-layout animate-fade-in">
              {/* Creator Form */}
              <section className="royal-card editor-form-card">
                <div className="form-card-header">
                  <h3><PlusCircle size={18} className="gold-glow-icon" /> Deploy New Plebiscite</h3>
                </div>

                <form onSubmit={handleCreatePollSubmit} className="hero-edit-form">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '8px' }}>
                    Publish a community poll to gather patron feedback on seasonal books or discussion topics. Automatically archives the current active poll.
                  </p>

                  <div className="form-group">
                    <label className="royal-label">Sovereign Question</label>
                    <input
                      type="text"
                      className="royal-input"
                      placeholder="e.g. Which masterwork should be selected for the Summer Read?"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="royal-label" style={{ marginBottom: '10px' }}>Plebiscites Choice Options (Exactly Four)</label>
                    <div className="poll-options-grid">
                      {[0, 1, 2, 3].map((idx) => (
                        <div className="poll-option-input-wrapper" key={idx}>
                          <span className="poll-option-number">{ROMAN_NUMERALS[idx]}</span>
                          <input
                            type="text"
                            className="royal-input"
                            placeholder={`e.g. Choice option ${idx + 1}`}
                            value={pollOptions[idx]}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                    <input
                      type="checkbox"
                      id="members-only-toggle"
                      checked={pollMembersOnly}
                      onChange={(e) => setPollMembersOnly(e.target.checked)}
                      style={{
                        accentColor: 'var(--accent)',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <label htmlFor="members-only-toggle" className="royal-label" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={14} style={{ color: 'var(--accent)' }} /> Restrict to authenticated Guild Members only
                    </label>
                  </div>

                  <div className="form-actions" style={{ marginTop: '10px' }}>
                    <button 
                      type="submit" 
                      disabled={isSavingPoll}
                      className="royal-btn save-hero-btn"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <PlusCircle size={16} /> {isSavingPoll ? 'Deploying Plebiscite...' : 'Deploy and Activate Plebiscite'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Historical Archive */}
              <section className="live-preview-section">
                <div className="preview-label">
                  <div className="preview-label-text">
                    <Clock size={14} /> HISTORICAL PLEBISCITES ARCHIVE
                  </div>
                </div>

                <div className="poll-history-list">
                  {loadingHistory ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent)' }}>
                      <RotateCcw className="animate-spin" size={24} style={{ margin: '0 auto 10px' }} />
                      <p style={{ fontSize: '0.85rem' }}>Reading historic annals...</p>
                    </div>
                  ) : historyError ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <p style={{ fontSize: '0.9rem' }}>{historyError}</p>
                    </div>
                  ) : pollHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '1px dashed var(--glass-border)', borderRadius: 'var(--border-radius-sm)' }}>
                      <p style={{ fontSize: '0.85rem' }}>No historical plebiscites recorded in the Scribes ledger.</p>
                    </div>
                  ) : (
                    pollHistory.map((item) => {
                      const totalVotes = item.votes.reduce((sum, v) => sum + v, 0);
                      return (
                        <div 
                          key={item.id} 
                          className={`historical-poll-card ${item.active ? 'active-poll' : ''}`}
                        >
                          <div className="poll-item-header">
                            <div className="poll-status-badges">
                              <span className={item.active ? 'badge-active' : 'badge-archived'}>
                                {item.active ? 'Active' : 'Archived'}
                              </span>
                              <span className={item.membersOnly ? 'badge-gated' : 'badge-public'}>
                                {item.membersOnly ? (
                                  <>
                                    <Lock size={10} /> Members
                                  </>
                                ) : (
                                  <>
                                    <Unlock size={10} /> Public
                                  </>
                                )}
                              </span>
                            </div>
                            
                            {item.active ? (
                              <span className="live-poll-badge">
                                <Check size={14} /> Currently Live
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleReactivatePoll(item.id)}
                                className="activate-poll-btn"
                              >
                                <Clock size={12} /> Reactivate
                              </button>
                            )}
                          </div>

                          <h4 className="poll-item-question">{item.question}</h4>

                          <div className="poll-item-tallies">
                            {item.options.map((optText, optIdx) => {
                              const optVotes = item.votes[optIdx] || 0;
                              const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                              return (
                                <div className="tally-row" key={optIdx}>
                                  <div className="tally-info">
                                    <span style={{
                                      maxWidth: '75%',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>{optText}</span>
                                    <span>{optVotes.toLocaleString()} ({pct}%)</span>
                                  </div>
                                  <div className="tally-bar-bg">
                                    <div className="tally-bar-fill" style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="poll-item-footer">
                            <span className="poll-total-votes">
                              <Users size={12} /> {totalVotes.toLocaleString()} total votes cast
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              Deployed: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default CuratorHeroPage;
