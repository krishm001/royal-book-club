import React, { useState } from 'react';
import { Search, SlidersHorizontal, BookOpen, Sparkles } from 'lucide-react';
import BookCard from '../../components/shared/BookCard';
import './CatalogPage.css';

const CatalogPage = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);

  // Mock list of books matching the royal aesthetic and literary salon theme
  const books = [
    {
      id: 'book-1',
      title: 'The Picture of Dorian Gray',
      author: 'Oscar Wilde',
      genre: 'Classic Gothic',
      rating: 4.9,
      availability: 'available',
      coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80',
      description: 'A philosophical novel tracing the moral and physical descent of a young aristocrat whose portrait bears the burden of his sins.',
      publisher: 'Lippincott\'s Monthly Magazine',
      publishYear: 1890,
      isbn: '9780141439570'
    },
    {
      id: 'book-2',
      title: 'Frankenstein',
      author: 'Mary Shelley',
      genre: 'Gothic Fiction',
      rating: 4.8,
      availability: 'available',
      coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80',
      description: 'The sublime and horrifying tale of Victor Frankenstein and the sentient creature he brings to life in his quest to conquer mortality.',
      publisher: 'Lackington, Hughes, Harding, Mavor, & Jones',
      publishYear: 1818,
      isbn: '9780141439471'
    },
    {
      id: 'book-3',
      title: 'The Divine Comedy',
      author: 'Dante Alighieri',
      genre: 'Epic Poetry',
      rating: 5.0,
      availability: 'checked-out',
      coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80',
      description: 'An architectural epic detailing the soul\'s journey through Inferno, Purgatorio, and finally into the glorious light of Paradiso.',
      publisher: 'John John',
      publishYear: 1320,
      isbn: '9780140448955'
    },
    {
      id: 'book-4',
      title: 'Beyond Good and Evil',
      author: 'Friedrich Nietzsche',
      genre: 'Philosophical Non-Fiction',
      rating: 4.7,
      availability: 'available',
      coverUrl: 'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?auto=format&fit=crop&w=300&q=80',
      description: 'A scathing, brilliant critique of traditional morality, advocating for the master-moral virtues of noble, creative free spirits.',
      publisher: 'C. G. Naumann',
      publishYear: 1886,
      isbn: '9780140449235'
    },
    {
      id: 'book-5',
      title: 'Les Fleurs du Mal',
      author: 'Charles Baudelaire',
      genre: 'Poetry',
      rating: 4.9,
      availability: 'available',
      coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=300&q=80',
      description: 'An exquisite, controversial collection of decadent poems exploring the relationship between beauty, melancholy, decay, and modernity.',
      publisher: 'Poulet-Malassis & de Broise',
      publishYear: 1857,
      isbn: '9780199535583'
    },
    {
      id: 'book-6',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      genre: 'Modern Classic',
      rating: 4.7,
      availability: 'available',
      coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=300&q=80',
      description: 'A beautifully written fable of the Jazz Age, exploring the tragedy of the American Dream and the romantic obsession of Jay Gatsby.',
      publisher: 'Charles Scribner\'s Sons',
      publishYear: 1925,
      isbn: '9780743273565'
    }
  ];

  const genres = ['All', 'Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic'];

  // Handle filtering logic
  const filteredBooks = books
    .filter(book => {
      const matchesSearch = 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn.includes(searchQuery);
      
      const matchesGenre = selectedGenre === 'All' || book.genre === selectedGenre;
      
      return matchesSearch && matchesGenre;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'year-desc') return b.publishYear - a.publishYear;
      if (sortBy === 'year-asc') return a.publishYear - b.publishYear;
      return 0; // featured/default
    });

  return (
    <div className="catalog-container animate-fade-in">
      {/* Catalog Header */}
      <header className="catalog-header">
        <div className="header-badge">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">THE ROYAL COLLECTION</span>
        </div>
        <h1 className="catalog-title glow-text">Exquisite Library Archives</h1>
        <p className="catalog-subtitle">
          Browse our highly curated selection of masterworks. Digital volumes are available for instant royal patronage checkouts.
        </p>
      </header>

      {/* Search and Filters Bar */}
      <section className="catalog-controls royal-card">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by Title, Author, or ISBN..."
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
            <SlidersHorizontal size={16} /> Filters
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

        {/* Expandable Genre Tags Grid */}
        {showFilters && (
          <div className="genre-filter-row animate-fade-in">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`genre-tag-btn ${selectedGenre === genre ? 'active' : ''}`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Books Grid */}
      <main className="catalog-grid-main">
        {filteredBooks.length > 0 ? (
          <div className="catalog-grid">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="royal-card no-results-card">
            <BookOpen size={48} className="no-results-icon" />
            <h3>No Volumes Found</h3>
            <p>We could not find any masterworks matching your specific criteria in the Royal Library archives.</p>
            <button 
              className="royal-btn"
              onClick={() => { setSearchQuery(''); setSelectedGenre('All'); }}
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
