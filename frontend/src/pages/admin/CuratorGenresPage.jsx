import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  BookOpen, 
  Layers, 
  FileText,
  BadgeAlert,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  fetchBookHouses, 
  fetchBlogHouses, 
  createBookHouse, 
  deleteBookHouse, 
  createBlogHouse, 
  deleteBlogHouse 
} from '../../services/genreApi';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateFields } from '../../services/translationApi';
import './CuratorGenresPage.css';

const CuratorGenresPage = ({ user }) => {
  const { t } = useLanguage();
  const [bookHouses, setBookHouses] = useState([]);
  const [blogHouses, setBlogHouses] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(true);

  // Form states
  const [newBookHouse, setNewBookHouse] = useState('');
  const [newBlogHouse, setNewBlogHouse] = useState('');
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [isSubmittingBlog, setIsSubmittingBlog] = useState(false);

  // Localization overrides
  const [bookHouseHi, setBookHouseHi] = useState('');
  const [bookHouseKn, setBookHouseKn] = useState('');
  
  const [blogHouseHi, setBlogHouseHi] = useState('');
  const [blogHouseKn, setBlogHouseKn] = useState('');

  const isAdmin = user && user.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    loadBookHousesData();
    loadBlogHousesData();
  }, [isAdmin]);

  const loadBookHousesData = async () => {
    try {
      setLoadingBooks(true);
      const res = await fetchBookHouses();
      if (res && res.success) {
        setBookHouses(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching book houses:', err);
    } finally {
      setLoadingBooks(false);
    }
  };

  const loadBlogHousesData = async () => {
    try {
      setLoadingBlogs(true);
      const res = await fetchBlogHouses();
      if (res && res.success) {
        setBlogHouses(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching blog houses:', err);
    } finally {
      setLoadingBlogs(false);
    }
  };

  const handleTranslateBookHouseName = async () => {
    if (!newBookHouse.trim()) {
      alert("Please enter a Book House name first.");
      return;
    }
    try {
      const res = await translateFields({ name: newBookHouse.trim() }, ['hi', 'kn']);
      if (res && res.success && res.data) {
        if (res.data.hi?.name) setBookHouseHi(res.data.hi.name);
        if (res.data.kn?.name) setBookHouseKn(res.data.kn.name);
      }
    } catch (err) {
      console.error("Book house translation failed:", err);
    }
  };

  const handleTranslateBlogHouseName = async () => {
    if (!newBlogHouse.trim()) {
      alert("Please enter a Discourse House name first.");
      return;
    }
    try {
      const res = await translateFields({ name: newBlogHouse.trim() }, ['hi', 'kn']);
      if (res && res.success && res.data) {
        if (res.data.hi?.name) setBlogHouseHi(res.data.hi.name);
        if (res.data.kn?.name) setBlogHouseKn(res.data.kn.name);
      }
    } catch (err) {
      console.error("Blog house translation failed:", err);
    }
  };

  const handleTranslateExistingBookHouse = async (house) => {
    try {
      const res = await translateFields({ name: house.name }, ['hi', 'kn']);
      if (res && res.success && res.data) {
        const payload = {
          id: house.id,
          name: house.name,
          translations: {
            hi: { name: res.data.hi?.name || '' },
            kn: { name: res.data.kn?.name || '' }
          }
        };
        const updateRes = await createBookHouse(payload);
        if (updateRes && updateRes.success) {
          setBookHouses(bookHouses.map(h => h.id === house.id ? updateRes.data : h));
          alert(`Successfully translated Book House "${house.name}"!`);
        }
      }
    } catch (err) {
      console.error("Failed to translate existing Book House", err);
      alert("Translation failed.");
    }
  };

  const handleTranslateExistingBlogHouse = async (house) => {
    try {
      const res = await translateFields({ name: house.name }, ['hi', 'kn']);
      if (res && res.success && res.data) {
        const payload = {
          id: house.id,
          name: house.name,
          translations: {
            hi: { name: res.data.hi?.name || '' },
            kn: { name: res.data.kn?.name || '' }
          }
        };
        const updateRes = await createBlogHouse(payload);
        if (updateRes && updateRes.success) {
          setBlogHouses(blogHouses.map(h => h.id === house.id ? updateRes.data : h));
          alert(`Successfully translated Discourse House "${house.name}"!`);
        }
      }
    } catch (err) {
      console.error("Failed to translate existing Blog House", err);
      alert("Translation failed.");
    }
  };

  const handleAddBookHouse = async (e) => {
    e.preventDefault();
    const name = newBookHouse.trim();
    if (!name || isSubmittingBook) return;

    try {
      setIsSubmittingBook(true);
      const payload = { 
        id: name.toLowerCase().replace(/\s+/g, '-'), 
        name,
        translations: {
          hi: { name: bookHouseHi.trim() },
          kn: { name: bookHouseKn.trim() }
        }
      };
      const res = await createBookHouse(payload);
      if (res && res.success) {
        setBookHouses([...bookHouses, res.data]);
        setNewBookHouse('');
        setBookHouseHi('');
        setBookHouseKn('');
      }
    } catch (err) {
      console.error('Failed to create book house:', err);
      alert('Failed to establish Book House. Make sure it is unique.');
    } finally {
      setIsSubmittingBook(false);
    }
  };

  const handleAddBlogHouse = async (e) => {
    e.preventDefault();
    const name = newBlogHouse.trim();
    if (!name || isSubmittingBlog) return;

    try {
      setIsSubmittingBlog(true);
      const payload = { 
        id: name.toLowerCase().replace(/\s+/g, '-'), 
        name,
        translations: {
          hi: { name: blogHouseHi.trim() },
          kn: { name: blogHouseKn.trim() }
        }
      };
      const res = await createBlogHouse(payload);
      if (res && res.success) {
        setBlogHouses([...blogHouses, res.data]);
        setNewBlogHouse('');
        setBlogHouseHi('');
        setBlogHouseKn('');
      }
    } catch (err) {
      console.error('Failed to create blog house:', err);
      alert('Failed to establish Blog House. Make sure it is unique.');
    } finally {
      setIsSubmittingBlog(false);
    }
  };

  const handleDeleteBookHouse = async (id, name) => {
    if (!window.confirm(`Are you sure you want to dissolve the Book House "${name}"? Books currently assigned to this House may lose their categorical affiliation.`)) {
      return;
    }

    try {
      const res = await deleteBookHouse(id);
      if (res && res.success) {
        setBookHouses(bookHouses.filter(h => h.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete book house:', err);
      alert('Failed to dissolve Book House.');
    }
  };

  const handleDeleteBlogHouse = async (id, name) => {
    if (!window.confirm(`Are you sure you want to dissolve the Blog House "${name}"? Essays in the Portico assigned to this category will lose association.`)) {
      return;
    }

    try {
      const res = await deleteBlogHouse(id);
      if (res && res.success) {
        setBlogHouses(blogHouses.filter(h => h.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete blog house:', err);
      alert('Failed to dissolve Blog House.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-access-denied-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <Shield size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">{t('auto_3304', 'Privileged Sanctuary')}</h2>
          <p className="denied-message">
            {t('auto_3305', 'Your current credentials do not grant access to the Curator House configuration. Curation of the Royal Library is reserved for assigned Curators.')}
          </p>
          <div className="denied-actions">
            <Link to="/" className="royal-btn return-home-btn">
              {t('auto_3306', 'Return to Entrance Hall')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="curator-genres-container animate-fade-in">
      <header className="curator-genres-header">
        <Link to="/admin" className="back-link">
          <ArrowLeft size={16} /> {t('admin.backToConsole', 'Curator Console')}
        </Link>
        <div className="header-badge-curator">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('admin.houseConfiguration', 'HOUSE CONFIGURATION')}</span>
        </div>
        <h1 className="curator-genres-title glow-text">{t('admin.housesRegistry', 'Sovereign Houses Registry')}</h1>
        <p className="curator-genres-subtitle">
          {t('admin.housesDesc', 'Define and partition sovereign literary Houses. Keep active lists condensed and refined to maintain high-society standards across the catalog and discourse porticos.')}
        </p>
      </header>

      <main className="genres-dual-columns-grid">
        
        {/* Column 1: Book Houses (Study Houses) */}
        <section className="royal-card genre-column-card">
          <div className="column-heading-wrapper">
            <div className="col-heading-icon-frame">
              <BookOpen size={20} className="gold-glow-icon" />
            </div>
            <div>
              <h3>{t('admin.bookHouses', 'Book Salon Houses')}</h3>
              <p className="column-subtext">{t('admin.partitionsBooks', 'Partitions books under "Study" catalog')}</p>
            </div>
          </div>

          <form onSubmit={handleAddBookHouse} className="add-genre-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div className="main-input-row" style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <input
                type="text"
                placeholder="e.g. Victorian Classics"
                className="royal-input"
                style={{ flex: 1 }}
                value={newBookHouse}
                onChange={(e) => setNewBookHouse(e.target.value)}
                required
              />
              <button type="submit" disabled={isSubmittingBook} className="royal-btn add-genre-submit-btn" style={{ whiteSpace: 'nowrap', padding: '10px 14px' }} title={t('admin.establishHouse', 'Establish House')}>
                <Plus size={18} />
              </button>
            </div>
            <div className="translation-row">
              <input
                type="text"
                placeholder="Hindi override"
                className="royal-input"
                style={{ fontSize: '0.85rem' }}
                value={bookHouseHi}
                onChange={(e) => setBookHouseHi(e.target.value)}
              />
              <input
                type="text"
                placeholder="Kannada override"
                className="royal-input"
                style={{ fontSize: '0.85rem' }}
                value={bookHouseKn}
                onChange={(e) => setBookHouseKn(e.target.value)}
              />
              <button
                type="button"
                className="royal-btn"
                onClick={handleTranslateBookHouseName}
                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', cursor: 'pointer' }}
                title={t('admin.translateBtn', 'Translate with Google')}
              >
                <Sparkles size={12} />
              </button>
            </div>
          </form>

          {loadingBooks ? (
            <div className="mini-loader-boundary">
              <div className="loader-mini"></div>
              <span>{t('admin.scanningArchives', 'Scanning archives...')}</span>
            </div>
          ) : bookHouses.length > 0 ? (
            <div className="genre-badges-list">
              {bookHouses.map((h) => (
                <div key={h.id} className="genre-pill-card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="genre-pill-name">
                    {h.name}
                    {h.translations?.hi?.name && <span style={{ opacity: 0.6, fontSize: '0.75rem', marginLeft: '5px', color: 'var(--accent)' }}>({h.translations.hi.name})</span>}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', alignItems: 'center' }}>
                    <button
                      onClick={() => handleTranslateExistingBookHouse(h)}
                      className="genre-pill-translate"
                      title={t('admin.translateBtn', 'Translate with Google')}
                      style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    >
                      <Sparkles size={12} />
                    </button>
                    <button 
                      onClick={() => handleDeleteBookHouse(h.id, h.name)} 
                      className="genre-pill-delete"
                      title="Dissolve House"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-genres-placeholder">
              <Layers size={36} className="placeholder-icon" />
              <p>{t('admin.noBookHouses', 'No Book Houses registered yet.')}</p>
            </div>
          )}
        </section>

        {/* Column 2: Blog Houses (Discourse Categories) */}
        <section className="royal-card genre-column-card">
          <div className="column-heading-wrapper">
            <div className="col-heading-icon-frame">
              <FileText size={20} className="gold-glow-icon" />
            </div>
            <div>
              <h3>{t('admin.discourseHouses', 'Discourse Houses')}</h3>
              <p className="column-subtext">{t('admin.partitionsChronicles', 'Partitions chronicles under "Socratic Portico"')}</p>
            </div>
          </div>

          <form onSubmit={handleAddBlogHouse} className="add-genre-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div className="main-input-row" style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <input
                type="text"
                placeholder="e.g. Symbolist Theses"
                className="royal-input"
                style={{ flex: 1 }}
                value={newBlogHouse}
                onChange={(e) => setNewBlogHouse(e.target.value)}
                required
              />
              <button type="submit" disabled={isSubmittingBlog} className="royal-btn add-genre-submit-btn" style={{ whiteSpace: 'nowrap', padding: '10px 14px' }} title={t('admin.establishHouse', 'Establish House')}>
                <Plus size={18} />
              </button>
            </div>
            <div className="translation-row">
              <input
                type="text"
                placeholder="Hindi override"
                className="royal-input"
                style={{ fontSize: '0.85rem' }}
                value={blogHouseHi}
                onChange={(e) => setBlogHouseHi(e.target.value)}
              />
              <input
                type="text"
                placeholder="Kannada override"
                className="royal-input"
                style={{ fontSize: '0.85rem' }}
                value={blogHouseKn}
                onChange={(e) => setBlogHouseKn(e.target.value)}
              />
              <button
                type="button"
                className="royal-btn"
                onClick={handleTranslateBlogHouseName}
                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', cursor: 'pointer' }}
                title={t('admin.translateBtn', 'Translate with Google')}
              >
                <Sparkles size={12} />
              </button>
            </div>
          </form>

          {loadingBlogs ? (
            <div className="mini-loader-boundary">
              <div className="loader-mini"></div>
              <span>{t('admin.scanningArchives', 'Scanning archives...')}</span>
            </div>
          ) : blogHouses.length > 0 ? (
            <div className="genre-badges-list">
              {blogHouses.map((h) => (
                <div key={h.id} className="genre-pill-card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="genre-pill-name">
                    {h.name}
                    {h.translations?.hi?.name && <span style={{ opacity: 0.6, fontSize: '0.75rem', marginLeft: '5px', color: 'var(--accent)' }}>({h.translations.hi.name})</span>}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', alignItems: 'center' }}>
                    <button
                      onClick={() => handleTranslateExistingBlogHouse(h)}
                      className="genre-pill-translate"
                      title={t('admin.translateBtn', 'Translate with Google')}
                      style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    >
                      <Sparkles size={12} />
                    </button>
                    <button 
                      onClick={() => handleDeleteBlogHouse(h.id, h.name)} 
                      className="genre-pill-delete"
                      title="Dissolve House"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-genres-placeholder">
              <Layers size={36} className="placeholder-icon" />
              <p>{t('admin.noDiscourseHouses', 'No Discourse Houses registered yet.')}</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default CuratorGenresPage;
