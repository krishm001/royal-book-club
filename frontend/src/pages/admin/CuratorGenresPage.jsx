import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  BookOpen, 
  Layers, 
  FileText,
  BadgeAlert
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
import './CuratorGenresPage.css';

const CuratorGenresPage = () => {
  const [bookHouses, setBookHouses] = useState([]);
  const [blogHouses, setBlogHouses] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(true);

  // Form states
  const [newBookHouse, setNewBookHouse] = useState('');
  const [newBlogHouse, setNewBlogHouse] = useState('');
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [isSubmittingBlog, setIsSubmittingBlog] = useState(false);

  useEffect(() => {
    loadBookHousesData();
    loadBlogHousesData();
  }, []);

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

  const handleAddBookHouse = async (e) => {
    e.preventDefault();
    const name = newBookHouse.trim();
    if (!name || isSubmittingBook) return;

    try {
      setIsSubmittingBook(true);
      const payload = { id: name.toLowerCase().replace(/\s+/g, '-'), name };
      const res = await createBookHouse(payload);
      if (res && res.success) {
        setBookHouses([...bookHouses, res.data]);
        setNewBookHouse('');
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
      const payload = { id: name.toLowerCase().replace(/\s+/g, '-'), name };
      const res = await createBlogHouse(payload);
      if (res && res.success) {
        setBlogHouses([...blogHouses, res.data]);
        setNewBlogHouse('');
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

  return (
    <div className="curator-genres-container animate-fade-in">
      <header className="curator-genres-header">
        <Link to="/admin" className="back-link">
          <ArrowLeft size={16} /> Curator Console
        </Link>
        <div className="header-badge-curator">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">HOUSE CONFIGURATION</span>
        </div>
        <h1 className="curator-genres-title glow-text">Salon Houses Management</h1>
        <p className="curator-genres-subtitle">
          Define and partition sovereign literary Houses. Keep active lists condensed and refined to maintain high-society standards across the catalog and discourse porticos.
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
              <h3>Book Salon Houses</h3>
              <p className="column-subtext">Partitions books under "Study" catalog</p>
            </div>
          </div>

          <form onSubmit={handleAddBookHouse} className="add-genre-form">
            <input
              type="text"
              placeholder="e.g. Victorian Classics"
              className="royal-input"
              value={newBookHouse}
              onChange={(e) => setNewBookHouse(e.target.value)}
              required
            />
            <button type="submit" disabled={isSubmittingBook} className="royal-btn add-genre-submit-btn">
              <Plus size={16} /> Establish House
            </button>
          </form>

          {loadingBooks ? (
            <div className="mini-loader-boundary">
              <div className="loader-mini"></div>
              <span>Scanning archives...</span>
            </div>
          ) : bookHouses.length > 0 ? (
            <div className="genre-badges-list">
              {bookHouses.map((h) => (
                <div key={h.id} className="genre-pill-card animate-fade-in">
                  <span className="genre-pill-name">{h.name}</span>
                  <button 
                    onClick={() => handleDeleteBookHouse(h.id, h.name)} 
                    className="genre-pill-delete"
                    title="Dissolve House"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-genres-placeholder">
              <Layers size={36} className="placeholder-icon" />
              <p>No Book Houses registered yet.</p>
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
              <h3>Discourse Houses</h3>
              <p className="column-subtext">Partitions chronicles under "Socratic Portico"</p>
            </div>
          </div>

          <form onSubmit={handleAddBlogHouse} className="add-genre-form">
            <input
              type="text"
              placeholder="e.g. Symbolist Theses"
              className="royal-input"
              value={newBlogHouse}
              onChange={(e) => setNewBlogHouse(e.target.value)}
              required
            />
            <button type="submit" disabled={isSubmittingBlog} className="royal-btn add-genre-submit-btn">
              <Plus size={16} /> Establish House
            </button>
          </form>

          {loadingBlogs ? (
            <div className="mini-loader-boundary">
              <div className="loader-mini"></div>
              <span>Scanning archives...</span>
            </div>
          ) : blogHouses.length > 0 ? (
            <div className="genre-badges-list">
              {blogHouses.map((h) => (
                <div key={h.id} className="genre-pill-card animate-fade-in">
                  <span className="genre-pill-name">{h.name}</span>
                  <button 
                    onClick={() => handleDeleteBlogHouse(h.id, h.name)} 
                    className="genre-pill-delete"
                    title="Dissolve House"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-genres-placeholder">
              <Layers size={36} className="placeholder-icon" />
              <p>No Discourse Houses registered yet.</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default CuratorGenresPage;
