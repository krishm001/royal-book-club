import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, BookOpen, Sparkles } from 'lucide-react';
import BookCard from '../../components/shared/BookCard';
import { fetchBooks, checkoutBook } from '../../services/libraryApi';
import { fetchBookHouses } from '../../services/genreApi';
import './CatalogPage.css';

const CatalogPage = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [books, setBooks] = useState([]);
  const [houses, setHouses] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBooks = async () => {
      setLoading(true);
      try {
        const data = await fetchBooks();
        setBooks(data || []);
      } catch (err) {
        setError('Unable to load the Royal study catalog at this time.');
      } finally {
        setLoading(false);
      }
    };

    const loadHouses = async () => {
      try {
        const res = await fetchBookHouses();
        if (res?.success && Array.isArray(res.data)) {
          const names = res.data.map(h => h.name);
          setHouses(['All', ...names]);
        } else {
          // fallback default houses if empty
          setHouses(['All', 'Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic']);
        }
      } catch (err) {
        console.warn('Unable to load book houses, using defaults', err);
        setHouses(['All', 'Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic']);
      }
    };

    loadBooks();
    loadHouses();
  }, []);

  const handleBookCheckout = async (book) => {
    if (!user) {
      throw new Error('Please sign in to perform a checkout.');
    }

    const bookId = book.isbn || book.bookId;
    await checkoutBook(bookId, user.uid);
    setBooks((currentBooks) =>
      currentBooks.map((item) =>
        (item.isbn === bookId || item.bookId === bookId)
          ? {
              ...item,
              availableCopies: item.availableCopies > 0 ? item.availableCopies - 1 : 0,
            }
          : item
      )
    );
  };

  const filteredBooks = books
    .filter((book) => {
      const title = book.title || '';
      const authors = Array.isArray(book.authors) ? book.authors.join(', ') : book.author || '';
      const isbn = book.isbn || '';
      const genre = book.genre || book.subtitle || 'Unknown';
      const tags = Array.isArray(book.tags) ? book.tags : [];

      const matchesSearch =
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
        isbn.includes(searchQuery) ||
        tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesHouse = selectedHouse === 'All' || genre === selectedHouse;

      return matchesSearch && matchesHouse;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'year-desc') return (b.publishYear || 0) - (a.publishYear || 0);
      if (sortBy === 'year-asc') return (a.publishYear || 0) - (b.publishYear || 0);
      return 0;
    });

  return (
    <div className="catalog-container animate-fade-in">
      <header className="catalog-header">
        <div className="header-badge">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">THE STUDY ARCHIVES</span>
        </div>
        <h1 className="catalog-title glow-text">Exquisite Study Catalog</h1>
        <p className="catalog-subtitle">
          Browse our highly curated selection of masterworks. Digital volumes are available for instant royal patronage checkouts.
        </p>
      </header>

      <section className="catalog-controls royal-card">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by Title, Author, ISBN, or Tags..."
            className="royal-input search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="controls-action-group">
          <button
            className={`royal-btn-secondary filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} /> Filter Houses
          </button>

          <div className="sort-wrapper">
            <span className="sort-label">Sort by:</span>
            <select
              className="royal-select sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Featured Curations</option>
              <option value="rating">Sovereign Rating</option>
              <option value="year-desc">Chronology (Newest First)</option>
              <option value="year-asc">Chronology (Oldest First)</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="genre-filter-row animate-fade-in">
            {houses.map((house) => (
              <button
                key={house}
                onClick={() => setSelectedHouse(house)}
                className={`genre-tag-btn ${selectedHouse === house ? 'active' : ''}`}
              >
                {house}
              </button>
            ))}
          </div>
        )}
      </section>

      <main className="catalog-grid-main">
        {loading ? (
          <div className="royal-card no-results-card">
            <p>Loading the Royal Study archives...</p>
          </div>
        ) : error ? (
          <div className="royal-card no-results-card">
            <p>{error}</p>
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="catalog-grid">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.isbn || book.title}
                book={book}
                user={user}
                onCheckout={handleBookCheckout}
              />
            ))}
          </div>
        ) : (
          <div className="royal-card no-results-card">
            <BookOpen size={48} className="no-results-icon" />
            <h3>No Volumes Found</h3>
            <p>We could not find any masterworks matching your specific criteria in the Study archives.</p>
            <button
              className="royal-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedHouse('All');
              }}
            >
              Reset Archives
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CatalogPage;
