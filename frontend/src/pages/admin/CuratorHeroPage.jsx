import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Upload, Save, Image, Eye, Type, FileText, RotateCcw, Shield, BarChart3, Lock, Unlock, PlusCircle, Clock, Check, Users, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchHeroConfig, updateHeroConfig, deleteHeroConfig } from '../../services/heroApi';
import { uploadBookImage } from '../../services/storageApi';
import { createPoll, fetchPollHistory, activatePoll } from '../../services/pollApi';
import { fetchBooks } from '../../services/libraryApi';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateFields } from '../../services/translationApi';
import './CuratorHeroPage.css';
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV'];
const CuratorHeroPage = ({
  user
}) => {
  const {
    t,
    getLocalized
  } = useLanguage();
  const [activeTab, setActiveTab] = useState('hero');
  const [loading, setLoading] = useState(true);

  // Hero customizer state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [subtitleHi, setSubtitleHi] = useState('');
  const [titleKn, setTitleKn] = useState('');
  const [subtitleKn, setSubtitleKn] = useState('');
  const [backgroundImageUrlLibrary, setBackgroundImageUrlLibrary] = useState('');
  const [backgroundImageUrlAcademic, setBackgroundImageUrlAcademic] = useState('');
  const [coverFileLibrary, setCoverFileLibrary] = useState(null);
  const [coverPreviewLibrary, setCoverPreviewLibrary] = useState('');
  const [coverFileAcademic, setCoverFileAcademic] = useState(null);
  const [coverPreviewAcademic, setCoverPreviewAcademic] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activePreviewTheme, setActivePreviewTheme] = useState('academic');

  // Translating states
  const [isTranslatingHero, setIsTranslatingHero] = useState(false);
  const [isTranslatingPoll, setIsTranslatingPoll] = useState(false);
  const [isTranslatingNewQuote, setIsTranslatingNewQuote] = useState(false);

  // Featured Selections Curation state
  const [allBooks, setAllBooks] = useState([]);
  const [featuredBookIsbns, setFeaturedBookIsbns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavingFeatured, setIsSavingFeatured] = useState(false);
  const [featuredQuotes, setFeaturedQuotes] = useState([]);
  const [featuredQuotesHi, setFeaturedQuotesHi] = useState([]);
  const [featuredQuotesKn, setFeaturedQuotesKn] = useState([]);
  const [newQuote, setNewQuote] = useState('');
  const [newQuoteHi, setNewQuoteHi] = useState('');
  const [newQuoteKn, setNewQuoteKn] = useState('');

  // Poll customizer state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '', '', '']);
  const [pollQuestionHi, setPollQuestionHi] = useState('');
  const [pollOptionsHi, setPollOptionsHi] = useState(['', '', '', '']);
  const [pollQuestionKn, setPollQuestionKn] = useState('');
  const [pollOptionsKn, setPollOptionsKn] = useState(['', '', '', '']);
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
        const translations = res.data.translations || {};
        setTitleHi(translations.hi?.title || '');
        setSubtitleHi(translations.hi?.subtitle || '');
        setTitleKn(translations.kn?.title || '');
        setSubtitleKn(translations.kn?.subtitle || '');
        const libraryImg = res.data.backgroundImageUrlLibrary || res.data.backgroundImageUrl || '';
        const acadImg = res.data.backgroundImageUrlAcademic || res.data.backgroundImageUrl || '';
        setBackgroundImageUrlLibrary(libraryImg);
        setCoverPreviewLibrary(libraryImg);
        setBackgroundImageUrlAcademic(acadImg);
        setCoverPreviewAcademic(acadImg);
        setFeaturedBookIsbns(res.data.featuredBookIsbns || []);
        setFeaturedQuotes(res.data.featuredQuotes || []);
        setFeaturedQuotesHi(translations.hi?.featuredQuotes || []);
        setFeaturedQuotesKn(translations.kn?.featuredQuotes || []);
      }
      const booksData = await fetchBooks();
      if (Array.isArray(booksData)) {
        setAllBooks(booksData);
      }
    } catch (err) {
      console.error('Error fetching hero config or books:', err);
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
  const handleFileChangeLibrary = e => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFileLibrary(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreviewLibrary(reader.result);
    };
    reader.readAsDataURL(file);
  };
  const handleFileChangeAcademic = e => {
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
  const handleSave = async e => {
    e.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      let uploadedUrlLibrary = backgroundImageUrlLibrary;
      let uploadedUrlAcademic = backgroundImageUrlAcademic;
      if (coverFileLibrary || coverFileAcademic) {
        setIsUploading(true);
      }
      if (coverFileLibrary) {
        try {
          uploadedUrlLibrary = await uploadBookImage(coverFileLibrary);
          setBackgroundImageUrlLibrary(uploadedUrlLibrary);
        } catch (uploadErr) {
          alert(`Library Image Upload Failed: ${uploadErr.message}`);
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
        backgroundImageUrl: uploadedUrlAcademic || uploadedUrlLibrary || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80',
        backgroundImageUrlLibrary: uploadedUrlLibrary || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80',
        backgroundImageUrlAcademic: uploadedUrlAcademic || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80',
        featuredBookIsbns: featuredBookIsbns,
        featuredQuotes: featuredQuotes,
        translations: {
          hi: {
            title: titleHi.trim(),
            subtitle: subtitleHi.trim(),
            featuredQuotes: featuredQuotesHi
          },
          kn: {
            title: titleKn.trim(),
            subtitle: subtitleKn.trim(),
            featuredQuotes: featuredQuotesKn
          }
        }
      };
      const res = await updateHeroConfig(payload);
      if (res && res.success) {
        alert('Home Hero configurations updated successfully!');
        setCoverFileLibrary(null);
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

  // Submit Handler for Featured Curation
  const handleSaveFeatured = async e => {
    e.preventDefault();
    if (isSavingFeatured) return;
    try {
      setIsSavingFeatured(true);
      const payload = {
        id: 'homeHero',
        title: title.trim(),
        subtitle: subtitle.trim(),
        backgroundImageUrl: backgroundImageUrlAcademic || backgroundImageUrlLibrary || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80',
        backgroundImageUrlLibrary: backgroundImageUrlLibrary || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80',
        backgroundImageUrlAcademic: backgroundImageUrlAcademic || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80',
        featuredBookIsbns: featuredBookIsbns,
        featuredQuotes: featuredQuotes,
        translations: {
          hi: {
            title: titleHi.trim(),
            subtitle: subtitleHi.trim(),
            featuredQuotes: featuredQuotesHi
          },
          kn: {
            title: titleKn.trim(),
            subtitle: subtitleKn.trim(),
            featuredQuotes: featuredQuotesKn
          }
        }
      };
      const res = await updateHeroConfig(payload);
      if (res && res.success) {
        alert('Featured Selections updated successfully!');
        loadHeroConfigData();
      }
    } catch (err) {
      console.error('Failed to update featured selections:', err);
      alert('Failed to save Featured Selections.');
    } finally {
      setIsSavingFeatured(false);
    }
  };
  const handleTranslateHero = async () => {
    if (!title && !subtitle) {
      alert("Please enter a title or subtitle first to translate.");
      return;
    }
    try {
      setIsTranslatingHero(true);
      const fields = {};
      if (title) fields.title = title;
      if (subtitle) fields.subtitle = subtitle;
      const res = await translateFields(fields, ['hi', 'kn']);
      if (res && res.success && res.data) {
        if (res.data.hi) {
          if (res.data.hi.title) setTitleHi(res.data.hi.title);
          if (res.data.hi.subtitle) setSubtitleHi(res.data.hi.subtitle);
        }
        if (res.data.kn) {
          if (res.data.kn.title) setTitleKn(res.data.kn.title);
          if (res.data.kn.subtitle) setSubtitleKn(res.data.kn.subtitle);
        }
      }
    } catch (err) {
      console.error("Hero translation failed:", err);
    } finally {
      setIsTranslatingHero(false);
    }
  };
  const handleTranslatePoll = async () => {
    if (!pollQuestion && pollOptions.every(opt => !opt)) {
      alert("Please enter a question or options first to translate.");
      return;
    }
    try {
      setIsTranslatingPoll(true);
      const fields = {};
      if (pollQuestion) fields.question = pollQuestion;
      pollOptions.forEach((opt, idx) => {
        if (opt) fields[`option_${idx}`] = opt;
      });
      const res = await translateFields(fields, ['hi', 'kn']);
      if (res && res.success && res.data) {
        if (res.data.hi) {
          if (res.data.hi.question) setPollQuestionHi(res.data.hi.question);
          const updatedOptionsHi = [...pollOptionsHi];
          [0, 1, 2, 3].forEach(idx => {
            if (res.data.hi[`option_${idx}`]) {
              updatedOptionsHi[idx] = res.data.hi[`option_${idx}`];
            }
          });
          setPollOptionsHi(updatedOptionsHi);
        }
        if (res.data.kn) {
          if (res.data.kn.question) setPollQuestionKn(res.data.kn.question);
          const updatedOptionsKn = [...pollOptionsKn];
          [0, 1, 2, 3].forEach(idx => {
            if (res.data.kn[`option_${idx}`]) {
              updatedOptionsKn[idx] = res.data.kn[`option_${idx}`];
            }
          });
          setPollOptionsKn(updatedOptionsKn);
        }
      }
    } catch (err) {
      console.error("Poll translation failed:", err);
    } finally {
      setIsTranslatingPoll(false);
    }
  };
  const handleTranslateNewQuote = async () => {
    if (!newQuote.trim()) {
      alert("Please enter a quote first to translate.");
      return;
    }
    try {
      setIsTranslatingNewQuote(true);
      const res = await translateFields({
        quote: newQuote.trim()
      }, ['hi', 'kn']);
      if (res && res.success && res.data) {
        if (res.data.hi?.quote) setNewQuoteHi(res.data.hi.quote);
        if (res.data.kn?.quote) setNewQuoteKn(res.data.kn.quote);
      }
    } catch (err) {
      console.error("Quote translation failed:", err);
    } finally {
      setIsTranslatingNewQuote(false);
    }
  };
  const handleTranslateQuoteInline = async idx => {
    const targetQuote = featuredQuotes[idx];
    if (!targetQuote) return;
    try {
      const res = await translateFields({
        quote: targetQuote
      }, ['hi', 'kn']);
      if (res && res.success && res.data) {
        const updatedHi = [...featuredQuotesHi];
        const updatedKn = [...featuredQuotesKn];
        updatedHi[idx] = res.data.hi?.quote || '';
        updatedKn[idx] = res.data.kn?.quote || '';
        setFeaturedQuotesHi(updatedHi);
        setFeaturedQuotesKn(updatedKn);
        alert("Quote translated inline successfully! Click 'Apply Quotes & Selections Curation' to preserve in archives.");
      }
    } catch (err) {
      console.error("Inline quote translation failed:", err);
      alert("Failed to translate quote inline.");
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
        setTitleHi('');
        setSubtitleHi('');
        setTitleKn('');
        setSubtitleKn('');
        setBackgroundImageUrlLibrary('');
        setBackgroundImageUrlAcademic('');
        setCoverPreviewLibrary('');
        setCoverPreviewAcademic('');
        setCoverFileLibrary(null);
        setCoverFileAcademic(null);
        setFeaturedBookIsbns([]);
        setFeaturedQuotes([]);
        setFeaturedQuotesHi([]);
        setFeaturedQuotesKn([]);
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
  const handleOptionHiChange = (idx, value) => {
    const updated = [...pollOptionsHi];
    updated[idx] = value;
    setPollOptionsHi(updated);
  };
  const handleOptionKnChange = (idx, value) => {
    const updated = [...pollOptionsKn];
    updated[idx] = value;
    setPollOptionsKn(updated);
  };
  const handleCreatePollSubmit = async e => {
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
        membersOnly: pollMembersOnly,
        translations: {
          hi: {
            question: pollQuestionHi.trim(),
            options: pollOptionsHi.map(opt => opt.trim())
          },
          kn: {
            question: pollQuestionKn.trim(),
            options: pollOptionsKn.map(opt => opt.trim())
          }
        }
      };
      const res = await createPoll(payload);
      if (res && res.success) {
        alert('Plebiscite deployed and activated in the Entrance Hall!');
        setPollQuestion('');
        setPollOptions(['', '', '', '']);
        setPollQuestionHi('');
        setPollOptionsHi(['', '', '', '']);
        setPollQuestionKn('');
        setPollOptionsKn(['', '', '', '']);
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
  const handleReactivatePoll = async pollId => {
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
    return <div className="admin-access-denied-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <Shield size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">{t('auto_3307', 'Privileged Sanctuary')}</h2>
          <p className="denied-message">
            {t('auto_3308', 'Your current credentials do not grant access to the Curator Console. Curation of the Royal Library is reserved for assigned Curators.')}
          </p>
          <div className="denied-actions">
            <Link to="/" className="royal-btn return-home-btn">
              {t('auto_3309', 'Return to Entrance Hall')}
            </Link>
          </div>
        </div>
      </div>;
  }
  return <div className="curator-hero-container animate-fade-in">
      <header className="curator-hero-header">
        <Link to="/admin" className="back-link">
          <ArrowLeft size={16} /> {t('auto_3310', 'Curator Console')}
        </Link>
        <div className="header-badge-curator">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('auto_3311', 'PORTAL CURATION')}</span>
        </div>
        <h1 className="curator-hero-title glow-text">{t('auto_3312', 'Portal Theme & Plebiscites')}</h1>
        <p className="curator-hero-subtitle"> {t("str_5236", "Customize the aesthetic homepage banners, title statements, or configure real-time community book polls (Guild Plebiscites) for patrons.")} </p>
      </header>

      {/* Tab Navigation */}
      <div className="curator-tabs-container">
        <button className={`curator-tab-btn ${activeTab === 'hero' ? 'active' : ''}`} onClick={() => setActiveTab('hero')}>
          <Type size={16} /> {t('auto_3313', 'Landing Hero Editor')}
        </button>
        <button className={`curator-tab-btn ${activeTab === 'polls' ? 'active' : ''}`} onClick={() => {
        setActiveTab('polls');
        loadPollHistoryData();
      }}>
          <BarChart3 size={16} /> {t("str_5237", "Guild Plebiscites (Polls)")} </button>
        <button className={`curator-tab-btn ${activeTab === 'featured' ? 'active' : ''}`} onClick={() => setActiveTab('featured')}>
          <Sparkles size={16} /> {t('auto_3314', 'Featured Selections')}
        </button>
      </div>

      {loading ? <div className="loading-boundary">
          <div className="loader-mini"></div>
          <p>{t('auto_3315', 'Unrolling parchment settings...')}</p>
        </div> : <div className="curator-tab-content-wrapper">
          
          {/* TAB 1: HERO CONFIGURATOR */}
          {activeTab === 'hero' && <div className="hero-editor-split-layout animate-fade-in">
              {/* Form Side */}
              <section className="royal-card editor-form-card">
                <div className="form-card-header">
                  <h3><Type size={18} className="gold-glow-icon" /> {t('auto_3316', 'Aesthetic Parameters')}</h3>
                </div>

                <form onSubmit={handleSave} className="hero-edit-form">
                  <div className="form-group">
                    <label className="royal-label">{t('auto_3317', 'Royal Headline')}</label>
                    <input type="text" className="royal-input" placeholder={t("str_5238", "e.g. Where Literature Reigns Supreme")} value={title} onChange={e => setTitle(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="royal-label">{t('auto_3318', 'Royal Sub-headline')}</label>
                    <textarea className="royal-input subtitle-textarea" placeholder={t("str_5239", "e.g. Enter a world of curated academic papers, fine leather volumes, and intimate fireside symposiums with world-class authors.")} value={subtitle} onChange={e => setSubtitle(e.target.value)} required rows={4} />
                  </div>

                  <div className="theme-images-upload-grid">
                    <div className="form-group">
                      <label className="royal-label">{t("str_5240", "Library Theme Banner (Dark/Gold)")}</label>
                      <div className="banner-upload-zone">
                        <input type="file" id="hero-banner-library" accept="image/*" onChange={handleFileChangeLibrary} style={{
                    display: 'none'
                  }} />
                        <label htmlFor="hero-banner-library" className="banner-upload-trigger">
                          <Upload size={14} /> {t('auto_3319', 'Library Banner')}
                        </label>
                      </div>
                      {coverPreviewLibrary && <div className="banner-mini-preview">
                          <img src={coverPreviewLibrary} alt={t("str_5241", "Library preview")} />
                        </div>}
                    </div>

                    <div className="form-group">
                      <label className="royal-label">{t("str_5242", "Academic Theme Banner (Beige/Maroon)")}</label>
                      <div className="banner-upload-zone">
                        <input type="file" id="hero-banner-academic" accept="image/*" onChange={handleFileChangeAcademic} style={{
                    display: 'none'
                  }} />
                        <label htmlFor="hero-banner-academic" className="banner-upload-trigger">
                          <Upload size={14} /> {t('auto_3320', 'Academic Banner')}
                        </label>
                      </div>
                      {coverPreviewAcademic && <div className="banner-mini-preview">
                          <img src={coverPreviewAcademic} alt={t("str_5243", "Academic preview")} />
                        </div>}
                    </div>
                  </div>

                  <div className="translation-section-header-block" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '25px 0 15px'
            }}>
                    <div className="translation-section-divider" style={{
                margin: 0
              }}>
                      <h4 className="translation-header gold-gradient-text" style={{
                  margin: '0 0 4px',
                  fontSize: '1.1rem',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                        <Sparkles size={14} style={{
                    marginRight: '6px'
                  }} /> {t('auto_3321', 'HI / KN LOCALIZATION OVERRIDES')}
                      </h4>
                      <p style={{
                  fontSize: '0.85rem',
                  opacity: 0.7,
                  margin: 0
                }}> {t("str_5244", "Optional: Supply dynamic Rajasthani Hindi and Classical Kannada overrides for the Hero Title and Subtitle.")} </p>
                    </div>
                    <button type="button" className="royal-btn premium-btn" onClick={handleTranslateHero} disabled={isTranslatingHero} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, var(--gold), var(--accent))', color: '#ffffff',
                fontWeight: '600',
                padding: '10px 18px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                opacity: isTranslatingHero ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(212,175,55,0.2)',
                whiteSpace: 'nowrap'
              }}>
                      <Sparkles size={16} className={isTranslatingHero ? "animate-spin" : ""} />
                      {isTranslatingHero ? 'Translating...' : 'Translate with Google'}
                    </button>
                  </div>

                  <div className="translation-panel-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '15px',
              marginBottom: '25px'
            }}>
                    {/* Hindi Column */}
                    <div className="translation-column-hi">
                      <h5 style={{
                  color: 'var(--accent)',
                  marginBottom: '12px',
                  fontSize: '0.95rem'
                }}>{t("str_5245", "Hindi (\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928\u0940 \u0930\u093E\u091C\u0938\u0940 \u0936\u0948\u0932\u0940)")}</h5>
                      <div className="form-group">
                        <label className="royal-label">{t("str_5246", "Royal Headline (Hindi)")}</label>
                        <input type="text" className="royal-input" value={titleHi} onChange={e => setTitleHi(e.target.value)} placeholder={t("str_5247", "e.g. \u091C\u0939\u093E\u0901 \u0938\u093E\u0939\u093F\u0924\u094D\u092F \u0938\u0930\u094D\u0935\u094B\u091A\u094D\u091A \u0930\u093E\u091C \u0915\u0930\u0924\u093E \u0939\u0948")} />
                      </div>
                      <div className="form-group">
                        <label className="royal-label">{t("str_5248", "Royal Sub-headline (Hindi)")}</label>
                        <textarea className="royal-input subtitle-textarea" style={{
                    minHeight: '80px'
                  }} value={subtitleHi} onChange={e => setSubtitleHi(e.target.value)} placeholder={t("str_5249", "e.g. \u0909\u0924\u094D\u0915\u0943\u0937\u094D\u091F \u0905\u0915\u093E\u0926\u092E\u093F\u0915 \u0936\u094B\u0927\u092A\u0924\u094D\u0930\u094B\u0902, \u091A\u092E\u0921\u093C\u0947 \u0915\u0947 \u0938\u0941\u0930\u0941\u091A\u093F\u092A\u0942\u0930\u094D\u0923 \u0917\u094D\u0930\u0902\u0925\u094B\u0902...")} rows={3} />
                      </div>
                    </div>

                    {/* Kannada Column */}
                    <div className="translation-column-kn">
                      <h5 style={{
                  color: 'var(--accent)',
                  marginBottom: '12px',
                  fontSize: '0.95rem'
                }}>{t("str_5250", "Kannada (\u0CB6\u0CBE\u0CB8\u0CCD\u0CA4\u0CCD\u0CB0\u0CC0\u0CAF \u0CB6\u0CC8\u0CB2\u0CBF)")}</h5>
                      <div className="form-group">
                        <label className="royal-label">{t("str_5251", "Royal Headline (Kannada)")}</label>
                        <input type="text" className="royal-input" value={titleKn} onChange={e => setTitleKn(e.target.value)} placeholder={t("str_5252", "e.g. \u0CB8\u0CBE\u0CB9\u0CBF\u0CA4\u0CCD\u0CAF\u0CB5\u0CC1 \u0CB8\u0CB0\u0CCD\u0CB5\u0CCB\u0C9A\u0CCD\u0C9A\u0CB5\u0CBE\u0C97\u0CBF \u0C86\u0CB3\u0CC1\u0CB5 \u0CB8\u0CCD\u0CA5\u0CB3")} />
                      </div>
                      <div className="form-group">
                        <label className="royal-label">{t("str_5253", "Royal Sub-headline (Kannada)")}</label>
                        <textarea className="royal-input subtitle-textarea" style={{
                    minHeight: '80px'
                  }} value={subtitleKn} onChange={e => setSubtitleKn(e.target.value)} placeholder={t("str_5254", "e.g. \u0C95\u0CCD\u0CAF\u0CC1\u0CB0\u0CC7\u0C9F\u0CC6\u0CA1\u0CCD \u0CB6\u0CC8\u0C95\u0CCD\u0CB7\u0CA3\u0CBF\u0C95 \u0CAA\u0CCD\u0CB0\u0CAC\u0C82\u0CA7\u0C97\u0CB3\u0CC1...")} rows={3} />
                      </div>
                    </div>
                  </div>

                  <div className="form-actions hero-action-buttons">
                    <button type="submit" disabled={isSaving} className="royal-btn save-hero-btn">
                      <Save size={16} /> {isSaving ? isUploading ? 'Uploading Banner...' : 'Refining Hero...' : 'Apply Curation'}
                    </button>

                    <button type="button" onClick={handleReset} disabled={isSaving} className="royal-btn-secondary reset-hero-btn" title={t("str_5255", "Reset to Defaults")}>
                      <RotateCcw size={16} /> {t('auto_3322', 'Reset defaults')}
                    </button>
                  </div>
                </form>
              </section>

              {/* Live Preview Side */}
              <section className="live-preview-section">
                <div className="preview-label">
                  <div className="preview-label-text">
                    <Eye size={14} /> {t('auto_3323', 'LIVE CURATOR PREVIEW')}
                  </div>
                  <div className="preview-theme-selector">
                    <button type="button" className={`preview-toggle-tab ${activePreviewTheme === 'library' ? 'active' : ''}`} onClick={() => setActivePreviewTheme('library')}>
                      {t('auto_3324', 'Library View')}
                    </button>
                    <button type="button" className={`preview-toggle-tab ${activePreviewTheme === 'academic' ? 'active' : ''}`} onClick={() => setActivePreviewTheme('academic')}>
                      {t('auto_3325', 'Academic View')}
                    </button>
                  </div>
                </div>
                
                <div className={`live-hero-preview-frame ${activePreviewTheme}`} style={{
            backgroundImage: `url(${activePreviewTheme === 'library' ? coverPreviewLibrary || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80' : coverPreviewAcademic || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80'})`
          }}>
                  <div className="live-preview-overlay"></div>
                  <div className="live-preview-content">
                    <span className="live-badge">
                      {activePreviewTheme === 'library' ? 'EXQUISITE LITERARY SALON' : 'ROYAL ACADEMIC STUDY'}
                    </span>
                    <h1 className="live-title">{title || 'Where Literature Reigns Supreme'}</h1>
                    <p className="live-subtitle">{subtitle || 'Enter a world of curated academic papers, fine leather volumes, and intimate fireside symposiums.'}</p>
                    <button className="royal-btn mini-btn-live">{t('auto_3326', 'Enter the Study')}</button>
                  </div>
                </div>
              </section>
            </div>}

          {/* TAB 2: GUILD PLEBISCITES (POLLS) */}
          {activeTab === 'polls' && <div className="hero-editor-split-layout animate-fade-in">
              {/* Creator Form */}
              <section className="royal-card editor-form-card">
                <div className="form-card-header">
                  <h3><PlusCircle size={18} className="gold-glow-icon" /> {t('auto_3327', 'Deploy New Plebiscite')}</h3>
                </div>

                <form onSubmit={handleCreatePollSubmit} className="hero-edit-form">
                  <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              marginBottom: '8px'
            }}>
                    {t('auto_3328', 'Publish a community poll to gather patron feedback on seasonal books or discussion topics. Automatically archives the current active poll.')}
                  </p>

                  <div className="form-group">
                    <label className="royal-label">{t('auto_3329', 'Royal Question')}</label>
                    <input type="text" className="royal-input" placeholder={t("str_5256", "e.g. Which masterwork should be selected for the Summer Read?")} value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="royal-label" style={{
                marginBottom: '10px'
              }}>{t("str_5257", "Plebiscites Choice Options (Exactly Four)")}</label>
                    <div className="poll-options-grid">
                      {[0, 1, 2, 3].map(idx => <div className="poll-option-input-wrapper" key={idx}>
                          <span className="poll-option-number">{ROMAN_NUMERALS[idx]}</span>
                          <input type="text" className="royal-input" placeholder={`e.g. Choice option ${idx + 1}`} value={pollOptions[idx]} onChange={e => handleOptionChange(idx, e.target.value)} required />
                        </div>)}
                    </div>
                  </div>

                  <div className="form-group checkbox-group" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '5px'
            }}>
                    <input type="checkbox" id="members-only-toggle" checked={pollMembersOnly} onChange={e => setPollMembersOnly(e.target.checked)} style={{
                accentColor: 'var(--accent)',
                width: '18px',
                height: '18px',
                cursor: 'pointer'
              }} />
                    <label htmlFor="members-only-toggle" className="royal-label" style={{
                margin: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                      <Lock size={14} style={{
                  color: 'var(--accent)'
                }} /> {t('auto_3330', 'Restrict to authenticated Guild Members only')}
                    </label>
                  </div>

                  <div className="translation-section-header-block" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '25px 0 15px'
            }}>
                    <div className="translation-section-divider" style={{
                margin: 0
              }}>
                      <h4 className="translation-header gold-gradient-text" style={{
                  margin: '0 0 4px',
                  fontSize: '1.1rem',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                        <Sparkles size={14} style={{
                    marginRight: '6px'
                  }} /> {t('auto_3331', 'HI / KN LOCALIZATION OVERRIDES')}
                      </h4>
                      <p style={{
                  fontSize: '0.85rem',
                  opacity: 0.7,
                  margin: 0
                }}> {t("str_5258", "Optional: Supply dynamic Rajasthani Hindi and Classical Kannada overrides for the plebiscite question and options.")} </p>
                    </div>
                    <button type="button" className="royal-btn premium-btn" onClick={handleTranslatePoll} disabled={isTranslatingPoll} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, var(--gold), var(--accent))', color: '#ffffff',
                fontWeight: '600',
                padding: '10px 18px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                opacity: isTranslatingPoll ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(212,175,55,0.2)',
                whiteSpace: 'nowrap'
              }}>
                      <Sparkles size={16} className={isTranslatingPoll ? "animate-spin" : ""} />
                      {isTranslatingPoll ? 'Translating...' : 'Translate with Google'}
                    </button>
                  </div>

                  <div className="translation-panel-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '15px',
              marginBottom: '25px'
            }}>
                    {/* Hindi Column */}
                    <div className="translation-column-hi">
                      <h5 style={{
                  color: 'var(--accent)',
                  marginBottom: '12px',
                  fontSize: '0.95rem'
                }}>{t("str_5259", "Hindi (\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928\u0940 \u0930\u093E\u091C\u0938\u0940 \u0936\u0948\u0932\u0940)")}</h5>
                      <div className="form-group">
                        <label className="royal-label">{t("str_5260", "Royal Question (Hindi)")}</label>
                        <input type="text" className="royal-input" value={pollQuestionHi} onChange={e => setPollQuestionHi(e.target.value)} placeholder={t("str_5261", "e.g. \u0917\u094D\u0930\u0940\u0937\u094D\u092E\u0915\u093E\u0932\u0940\u0928 \u092A\u0920\u0928 \u0915\u0947 \u0932\u093F\u090F \u0915\u093F\u0938 \u0909\u0924\u094D\u0915\u0943\u0937\u094D\u091F \u0915\u0943\u0924\u093F \u0915\u093E \u091A\u092F\u0928 \u0915\u093F\u092F\u093E \u091C\u093E\u0928\u093E \u091A\u093E\u0939\u093F\u090F?")} />
                      </div>
                      <div className="form-group">
                        <label className="royal-label">{t("str_5262", "Choice Options (Hindi)")}</label>
                        <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                          {[0, 1, 2, 3].map(idx => <div className="poll-option-input-wrapper" key={idx} style={{
                      marginBottom: 0
                    }}>
                              <span className="poll-option-number">{ROMAN_NUMERALS[idx]}</span>
                              <input type="text" className="royal-input" placeholder={`Hindi option ${idx + 1}`} value={pollOptionsHi[idx] || ''} onChange={e => handleOptionHiChange(idx, e.target.value)} />
                            </div>)}
                        </div>
                      </div>
                    </div>

                    {/* Kannada Column */}
                    <div className="translation-column-kn">
                      <h5 style={{
                  color: 'var(--accent)',
                  marginBottom: '12px',
                  fontSize: '0.95rem'
                }}>{t("str_5263", "Kannada (\u0CB6\u0CBE\u0CB8\u0CCD\u0CA4\u0CCD\u0CB0\u0CC0\u0CAF \u0CB6\u0CC8\u0CB2\u0CBF)")}</h5>
                      <div className="form-group">
                        <label className="royal-label">{t("str_5264", "Royal Question (Kannada)")}</label>
                        <input type="text" className="royal-input" value={pollQuestionKn} onChange={e => setPollQuestionKn(e.target.value)} placeholder={t("str_5265", "e.g. \u0CAC\u0CC7\u0CB8\u0CBF\u0C97\u0CC6\u0CAF \u0C93\u0CA6\u0CBF\u0C97\u0CBE\u0C97\u0CBF \u0CAF\u0CBE\u0CB5 \u0CAE\u0CBE\u0CB8\u0CCD\u0C9F\u0CB0\u0CCD\u200C\u0CB5\u0CB0\u0CCD\u0C95\u0CCD \u0C85\u0CA8\u0CCD\u0CA8\u0CC1 \u0C86\u0CAF\u0CCD\u0C95\u0CC6 \u0CAE\u0CBE\u0CA1\u0CAC\u0CC7\u0C95\u0CC1?")} />
                      </div>
                      <div className="form-group">
                        <label className="royal-label">{t("str_5266", "Choice Options (Kannada)")}</label>
                        <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                          {[0, 1, 2, 3].map(idx => <div className="poll-option-input-wrapper" key={idx} style={{
                      marginBottom: 0
                    }}>
                              <span className="poll-option-number">{ROMAN_NUMERALS[idx]}</span>
                              <input type="text" className="royal-input" placeholder={`Kannada option ${idx + 1}`} value={pollOptionsKn[idx] || ''} onChange={e => handleOptionKnChange(idx, e.target.value)} />
                            </div>)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-actions" style={{
              marginTop: '10px'
            }}>
                    <button type="submit" disabled={isSavingPoll} className="royal-btn save-hero-btn" style={{
                width: '100%',
                justifyContent: 'center'
              }}>
                      <PlusCircle size={16} /> {isSavingPoll ? 'Deploying Plebiscite...' : 'Deploy and Activate Plebiscite'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Historical Archive */}
              <section className="live-preview-section">
                <div className="preview-label">
                  <div className="preview-label-text">
                    <Clock size={14} /> {t('auto_3332', 'HISTORICAL PLEBISCITES ARCHIVE')}
                  </div>
                </div>

                <div className="poll-history-list">
                  {loadingHistory ? <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--accent)'
            }}>
                      <RotateCcw className="animate-spin" size={24} style={{
                margin: '0 auto 10px'
              }} />
                      <p style={{
                fontSize: '0.85rem'
              }}>{t('auto_3333', 'Reading historic annals...')}</p>
                    </div> : historyError ? <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-secondary)'
            }}>
                      <p style={{
                fontSize: '0.9rem'
              }}>{historyError}</p>
                    </div> : pollHistory.length === 0 ? <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-secondary)',
              border: '1px dashed var(--glass-border)',
              borderRadius: 'var(--border-radius-sm)'
            }}>
                      <p style={{
                fontSize: '0.85rem'
              }}>{t('auto_3334', 'No historical plebiscites recorded in the Scribes ledger.')}</p>
                    </div> : pollHistory.map(item => {
              const totalVotes = item.votes.reduce((sum, v) => sum + v, 0);
              return <div key={item.id} className={`historical-poll-card ${item.active ? 'active-poll' : ''}`}>
                          <div className="poll-item-header">
                            <div className="poll-status-badges">
                              <span className={item.active ? 'badge-active' : 'badge-archived'}>
                                {item.active ? 'Active' : 'Archived'}
                              </span>
                              <span className={item.membersOnly ? 'badge-gated' : 'badge-public'}>
                                {item.membersOnly ? <>
                                    <Lock size={10} /> {t('auto_3335', 'Members')}
                                  </> : <>
                                    <Unlock size={10} /> {t('auto_3336', 'Public')}
                                  </>}
                              </span>
                            </div>
                            
                            {item.active ? <span className="live-poll-badge">
                                <Check size={14} /> {t('auto_3337', 'Currently Live')}
                              </span> : <button onClick={() => handleReactivatePoll(item.id)} className="activate-poll-btn">
                                <Clock size={12} /> {t('auto_3338', 'Reactivate')}
                              </button>}
                          </div>

                          <h4 className="poll-item-question">{item.question}</h4>

                          <div className="poll-item-tallies">
                            {item.options.map((optText, optIdx) => {
                    const optVotes = item.votes[optIdx] || 0;
                    const pct = totalVotes > 0 ? Math.round(optVotes / totalVotes * 100) : 0;
                    return <div className="tally-row" key={optIdx}>
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
                                    <div className="tally-bar-fill" style={{
                          width: `${pct}%`
                        }}></div>
                                  </div>
                                </div>;
                  })}
                          </div>

                          <div className="poll-item-footer">
                            <span className="poll-total-votes">
                              <Users size={12} /> {totalVotes.toLocaleString()} {t("str_5267", "total votes cast")} </span>
                            <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary)'
                  }}> {t("str_5268", "Deployed:")} {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Unknown'}
                            </span>
                          </div>
                        </div>;
            })}
                </div>
              </section>
            </div>}
          {/* TAB 3: FEATURED SELECTIONS */}
          {activeTab === 'featured' && <div className="featured-selections-layout animate-fade-in">
              <section className="royal-card featured-editor-card">
                <div className="form-card-header">
                  <h3><Sparkles size={18} className="gold-glow-icon" /> {t("str_5269", "Select Featured Masterpieces (Up to 5)")}</h3>
                </div>
                
                <p className="curator-hero-subtitle-hint">
                  {t('auto_3339', 'Search through the library archives and highlight up to five volumes to showcase on the homepage. They will rotate automatically to inspire our patrons.')}
                </p>

                {/* Selected List */}
                <div className="selected-books-shelf">
                  <h4 className="shelf-title">{t("str_5270", "Current Curated Selection (")}{featuredBookIsbns.length} / 5)</h4>
                  {featuredBookIsbns.length === 0 ? <div className="empty-shelf-banner">
                      <p>{t('auto_3340', 'The showcase is empty. Select books below to feature them.')}</p>
                    </div> : <div className="selected-books-grid">
                      {featuredBookIsbns.map((isbn, idx) => {
                const book = allBooks.find(b => b.isbn === isbn);
                return <div className="selected-book-card" key={isbn}>
                            <div className="selected-book-badge">{idx + 1}</div>
                            <div className="selected-book-cover-wrapper">
                              <img src={book?.coverUrl || book?.cover || 'https://via.placeholder.com/150'} alt={book?.title || 'Unknown Cover'} />
                            </div>
                            <div className="selected-book-details">
                              <h5 className="book-title-short">{book?.title || 'Unknown Volume'}</h5>
                              <p className="book-author-short">{Array.isArray(book?.authors) ? book.authors.join(', ') : book?.author || 'Unknown Scribe'}</p>
                            </div>
                            <button type="button" className="remove-featured-btn" onClick={() => {
                    setFeaturedBookIsbns(featuredBookIsbns.filter(id => id !== isbn));
                  }}>
                              ✕
                            </button>
                          </div>;
              })}
                    </div>}
                </div>

                <div className="featured-search-group">
                  <label className="royal-label">{t('auto_3341', 'Search Library Archives')}</label>
                  <input type="text" className="royal-input" placeholder={t("str_5271", "Search by title, author, or ISBN...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>

                {/* Filtered Search Results */}
                <div className="search-results-list">
                  {allBooks.filter(book => {
              const query = searchQuery.toLowerCase();
              const titleMatch = (book.title || book.name || '').toLowerCase().includes(query);
              const authorMatch = (Array.isArray(book.authors) ? book.authors.join(' ') : book.author || '').toLowerCase().includes(query);
              const isbnMatch = (book.isbn || '').toLowerCase().includes(query);
              return titleMatch || authorMatch || isbnMatch;
            }).slice(0, 5) // limit results to keep it neat
            .map(book => {
              const isFeatured = featuredBookIsbns.includes(book.isbn);
              return <div className={`search-result-book-row ${isFeatured ? 'is-featured' : ''}`} key={book.isbn || book.id}>
                          <img className="row-cover" src={book.coverUrl || book.cover || 'https://via.placeholder.com/60'} alt={book.title} />
                          <div className="row-info">
                            <span className="row-title">{book.title}</span>
                            <span className="row-author">{Array.isArray(book.authors) ? book.authors.join(', ') : book.author}</span>
                            <span className="row-isbn">{t("str_5272", "ISBN:")} {book.isbn}</span>
                          </div>
                          {isFeatured ? <button type="button" className="result-action-btn remove" onClick={() => setFeaturedBookIsbns(featuredBookIsbns.filter(id => id !== book.isbn))}>
                              {t('auto_3342', 'Remove Selection')}
                            </button> : <button type="button" className="result-action-btn add" disabled={featuredBookIsbns.length >= 5} onClick={() => {
                  if (featuredBookIsbns.length >= 5) {
                    alert('The Scribes forbid selecting more than 5 masterpieces.');
                    return;
                  }
                  setFeaturedBookIsbns([...featuredBookIsbns, book.isbn]);
                }}>
                              {t('auto_3343', 'Feature Book')}
                            </button>}
                        </div>;
            })}
                </div>

                <div className="form-actions featured-action-buttons">
                  <button type="button" onClick={handleSaveFeatured} disabled={isSavingFeatured} className="royal-btn save-hero-btn" style={{
              width: '100%',
              justifyContent: 'center'
            }}>
                    <Save size={16} /> {isSavingFeatured ? 'Applying Featured Selection...' : 'Apply Featured Curation'}
                  </button>
                </div>
              </section>

              {/* Quotes Curation Card */}
              <section className="royal-card featured-editor-card" style={{
          marginTop: '30px'
        }}>
                <div className="form-card-header">
                  <h3><FileText size={18} className="gold-glow-icon" /> {t('auto_3344', 'Curate Quote Portfolio')}</h3>
                </div>
                
                <p className="curator-hero-subtitle-hint"> {t("str_5273", "Build a portfolio of inspiring literary quotes. These quotes are randomly selected and displayed dynamically on the homepage (featured cards & footer block).")} </p>

                {/* Add new quote form */}
                <div className="form-group" style={{
            marginBottom: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            paddingBottom: '20px'
          }}>
                  <label className="royal-label" style={{
              fontWeight: '600'
            }}>{t("str_5274", "Add a Sacred Motto / Quote (English)")}</label>
                  <div style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'stretch',
              marginBottom: '15px'
            }}>
                    <textarea className="royal-input" placeholder={t("str_5275", "e.g. 'A room without books is like a body without a soul.' - Marcus Tullius Cicero")} value={newQuote} onChange={e => setNewQuote(e.target.value)} rows={2} style={{
                resize: 'vertical',
                flexGrow: 1
              }} />
                    <button type="button" className="royal-btn premium-btn" style={{
                height: 'auto',
                padding: '0 20px',
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                background: 'linear-gradient(135deg, var(--gold), var(--accent))', color: '#ffffff',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }} onClick={handleTranslateNewQuote} disabled={isTranslatingNewQuote}>
                      <Sparkles size={14} className={isTranslatingNewQuote ? "animate-spin" : ""} />
                      {t('auto_3345', 'Translate')}
                    </button>
                  </div>

                  {/* Translations for new quote */}
                  <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginTop: '10px'
            }}>
                    <div>
                      <label className="royal-label" style={{
                  fontSize: '0.8rem',
                  opacity: 0.8
                }}>{t("str_5276", "Hindi (\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928\u0940 \u0930\u093E\u091C\u0938\u0940 \u0936\u0948\u0932\u0940)")}</label>
                      <textarea className="royal-input" placeholder={t("str_5277", "Hindi translation override...")} value={newQuoteHi} onChange={e => setNewQuoteHi(e.target.value)} rows={2} style={{
                  fontSize: '0.85rem'
                }} />
                    </div>
                    <div>
                      <label className="royal-label" style={{
                  fontSize: '0.8rem',
                  opacity: 0.8
                }}>{t("str_5278", "Kannada (\u0CB6\u0CBE\u0CB8\u0CCD\u0CA4\u0CCD\u0CB0\u0CC0\u0CAF \u0CB6\u0CC8\u0CB2\u0CBF)")}</label>
                      <textarea className="royal-input" placeholder={t("str_5279", "Kannada translation override...")} value={newQuoteKn} onChange={e => setNewQuoteKn(e.target.value)} rows={2} style={{
                  fontSize: '0.85rem'
                }} />
                    </div>
                  </div>

                  <button type="button" className="royal-btn" style={{
              marginTop: '15px',
              width: '100%',
              justifyContent: 'center',
              display: 'flex',
              gap: '8px'
            }} onClick={() => {
              const trimmed = newQuote.trim();
              if (!trimmed) {
                alert('Quote cannot be empty.');
                return;
              }
              if (featuredQuotes.includes(trimmed)) {
                alert('This quote is already present in your portfolio.');
                return;
              }
              setFeaturedQuotes([...featuredQuotes, trimmed]);
              setFeaturedQuotesHi([...featuredQuotesHi, newQuoteHi.trim() || trimmed]);
              setFeaturedQuotesKn([...featuredQuotesKn, newQuoteKn.trim() || trimmed]);
              setNewQuote('');
              setNewQuoteHi('');
              setNewQuoteKn('');
            }}>
                    <Plus size={16} /> {t('auto_3346', 'Add to Curation Portfolio')}
                  </button>
                </div>

                {/* Quotes list */}
                <div className="selected-books-shelf" style={{
            background: "var(--glass-bg)"
          }}>
                  <h4 className="shelf-title">{t("str_5280", "Quote Portfolio (")}{featuredQuotes.length} {t("str_5281", "active quotes)")}</h4>
                  {featuredQuotes.length === 0 ? <div className="empty-shelf-banner">
                      <p>{t("str_5282", "No custom quotes added. Using default fallback: \"A word, deeply read, becomes conviction...\"")}</p>
                    </div> : <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
                      {featuredQuotes.map((quote, idx) => <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                background: "var(--glass-bg)",
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--border-radius-sm)',
                padding: '16px',
                gap: '12px'
              }}>
                          <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '15px'
                }}>
                            <p style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: '1.4',
                    fontStyle: 'italic',
                    fontWeight: '500'
                  }}>
                              "{quote}"
                            </p>
                            <div style={{
                    display: 'flex',
                    gap: '10px'
                  }}>
                              <button type="button" className="royal-btn premium-btn" style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(212,175,55,0.15)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      borderRadius: '4px'
                    }} onClick={() => handleTranslateQuoteInline(idx)} title={t("str_5283", "Translate this quote to Hindi & Kannada")}>
                                <Sparkles size={12} /> {t('auto_3347', 'Translate Inline')}
                              </button>
                              <button type="button" style={{
                      background: 'transparent',
                      border: 'none',
                      color: "var(--text-secondary)",
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }} onClick={() => {
                      setFeaturedQuotes(featuredQuotes.filter((_, i) => i !== idx));
                      setFeaturedQuotesHi(featuredQuotesHi.filter((_, i) => i !== idx));
                      setFeaturedQuotesKn(featuredQuotesKn.filter((_, i) => i !== idx));
                    }}>
                                <Trash2 size={16} style={{
                        color: '#ff6b6b'
                      }} />
                              </button>
                            </div>
                          </div>

                          {/* Editable translations inline */}
                          <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  paddingTop: '10px'
                }}>
                            <div>
                              <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--accent)',
                      display: 'block',
                      marginBottom: '4px'
                    }}>{t('auto_3348', 'Hindi Translation')}</span>
                              <input type="text" className="royal-input" style={{
                      fontSize: '0.8rem',
                      padding: '6px 10px'
                    }} value={featuredQuotesHi[idx] || ''} onChange={e => {
                      const updated = [...featuredQuotesHi];
                      updated[idx] = e.target.value;
                      setFeaturedQuotesHi(updated);
                    }} placeholder={t("str_5284", "Hindi translation override")} />
                            </div>
                            <div>
                              <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--accent)',
                      display: 'block',
                      marginBottom: '4px'
                    }}>{t('auto_3349', 'Kannada Translation')}</span>
                              <input type="text" className="royal-input" style={{
                      fontSize: '0.8rem',
                      padding: '6px 10px'
                    }} value={featuredQuotesKn[idx] || ''} onChange={e => {
                      const updated = [...featuredQuotesKn];
                      updated[idx] = e.target.value;
                      setFeaturedQuotesKn(updated);
                    }} placeholder={t("str_5285", "Kannada translation override")} />
                            </div>
                          </div>
                        </div>)}
                    </div>}
                </div>

                <div className="form-actions featured-action-buttons">
                  <button type="button" onClick={handleSaveFeatured} disabled={isSavingFeatured} className="royal-btn save-hero-btn" style={{
              width: '100%',
              justifyContent: 'center'
            }}>
                    <Save size={16} /> {isSavingFeatured ? 'Applying Portfolio Selections & Quotes...' : 'Apply Quotes & Selections Curation'}
                  </button>
                </div>
              </section>
            </div>}

        </div>}
    </div>;
};
export default CuratorHeroPage;