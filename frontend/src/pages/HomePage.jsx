import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, BookText, Sparkles, ChevronRight, Award, Trophy, Users, ShieldAlert } from 'lucide-react';
import PollWidget from '../components/shared/PollWidget';
import { fetchBooks } from '../services/libraryApi';
import { fetchHeroConfig } from '../services/heroApi';
import { fetchEvents } from '../services/eventApi';
import { fetchDiscourses } from '../services/discourseApi';
import './HomePage.css';

const defaultFeaturedBook = {
  id: 'book-1',
  title: 'The Picture of Dorian Gray',
  author: 'Oscar Wilde',
  genre: 'Classic Gothic',
  rating: 4.9,
  coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
  description: 'Oscar Wilde’s only novel is the fashionable salon sensation of its age, tracing the brilliant, aesthetic descent of a young aristocrat who remains ever youthful while his portrait bears the sins of his hedonistic soul.',
  citation: '"To define is to limit." — Lord Henry Wotton'
};

const HomePage = ({ user, onSignIn }) => {
  const [featuredBook, setFeaturedBook] = useState(defaultFeaturedBook);
  const [featuredError, setFeaturedError] = useState(null);
  const [activeEvents, setActiveEvents] = useState([]);
  const [dissertations, setDissertations] = useState([]);
  const [heroConfig, setHeroConfig] = useState({
    title: 'Voices, Ideas, Community',
    subtitle: 'Enter an exclusive literary salon designed for the refined reader. Access an exquisite curated catalog of masterworks, RSVP to exclusive intellectual banquets, and publish deep literary dissertations.',
    backgroundImageUrl: ''
  });

  useEffect(() => {
    const loadHero = async () => {
      try {
        const res = await fetchHeroConfig();
        if (res?.success && res?.data) {
          setHeroConfig(res.data);
        }
      } catch (err) {
        console.warn('Unable to load hero config', err);
      }
    };
    loadHero();
  }, []);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const books = await fetchBooks();
        if (Array.isArray(books) && books.length > 0) {
          const index = Math.floor(Math.random() * books.length);
          const chosen = books[index];
          setFeaturedBook({
            id: chosen.isbn || chosen.bookId || chosen.id || 'book-1',
            title: chosen.title || chosen.name || defaultFeaturedBook.title,
            author: Array.isArray(chosen.authors) ? chosen.authors.join(', ') : chosen.author || defaultFeaturedBook.author,
            genre: chosen.genre || chosen.subtitle || 'Selected Curation',
            rating: chosen.rating || 4.8,
            coverUrl: chosen.coverUrl || chosen.cover || defaultFeaturedBook.coverUrl,
            description: chosen.description || chosen.subtitle || defaultFeaturedBook.description,
            citation: chosen.citation || defaultFeaturedBook.citation,
          });
        }
      } catch (err) {
        console.warn('Unable to load featured book from catalog', err);
        setFeaturedError('Featuring the most exquisite selection soon.');
      }
    };

    const loadFeeds = async () => {
      try {
        const eventsRes = await fetchEvents();
        if (eventsRes?.success && Array.isArray(eventsRes.data)) {
          // Display top 3 upcoming gatherings
          setActiveEvents(eventsRes.data.slice(0, 3));
        }
      } catch (err) {
        console.warn('Unable to load events for home feed', err);
      }

      try {
        const chroniclesRes = await fetchDiscourses('CHRONICLE');
        if (chroniclesRes?.success && Array.isArray(chroniclesRes.data)) {
          // Display top 3 published academic essays
          setDissertations(chroniclesRes.data.slice(0, 3));
        }
      } catch (err) {
        console.warn('Unable to load chronicles for home feed', err);
      }
    };

    loadFeatured();
    loadFeeds();
  }, []);

  const stats = [
    { label: 'Eminent Scholars', count: '1,420', icon: <Users className="stat-icon" /> },
    { label: 'Literary Tomes', count: '5,800', icon: <BookOpen className="stat-icon" /> },
    { label: 'Active Checkouts', count: '342', icon: <Sparkles className="stat-icon" /> },
    { label: 'Upcoming Salons', count: '12', icon: <Calendar className="stat-icon" /> },
  ];

  return (
    <div className="homepage-container animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section" style={heroConfig.backgroundImageUrl ? { backgroundImage: `url(${heroConfig.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        <div className="hero-content">
          <div className="hero-badge">
            <Award size={14} className="gold-glow-icon" />
            <span className="gold-gradient-text">ESTABLISHED MMXXVI</span>
          </div>
          <h1 className="hero-title glow-text" style={{ whiteSpace: 'pre-line' }}>
            {heroConfig.title}
          </h1>
          <p className="hero-subtitle">
            {heroConfig.subtitle}
          </p>
          <div className="hero-cta-group">
            <Link to="/catalog" className="royal-btn">
              Explore Library <BookOpen size={16} />
            </Link>
            {!user && (
              <button onClick={onSignIn} className="royal-btn-secondary">
                Request Invitation <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Hero Card/Visual representation */}
        <div className="hero-visual">
          <div className="royal-card featured-highlight-card">
            <div className="highlight-tag">FEATURED SELECTION</div>
            <div className="highlight-body">
              <img src={featuredBook.coverUrl} alt={featuredBook.title} className="highlight-img" />
              <div className="highlight-details">
                <h3 className="highlight-title">{featuredBook.title}</h3>
                <span className="highlight-author">by {featuredBook.author}</span>
                <p className="highlight-desc">{featuredBook.description}</p>
                {featuredError && <div className="highlight-note">{featuredError}</div>}
                <blockquote className="highlight-quote">{featuredBook.citation}</blockquote>
                <Link to={`/catalog/${featuredBook.id}`} className="highlight-action-btn">
                  Reserve This Volume <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Row */}
      <section className="stats-section">
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <div className="royal-card stat-card" key={idx}>
              <div className="stat-header">
                {stat.icon}
                <span className="stat-number gold-gradient-text">{stat.count}</span>
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Grid: Interactive Widget & Community Feed */}
      <section className="main-grid-layout">
        {/* Left Column: Poll and Community interactions */}
        <div className="left-column">
          <div className="royal-card interactive-poll-section">
            <PollWidget />
          </div>
        </div>

        {/* Right Column: Upcoming Salons and Dissertations */}
        <div className="right-column">
          <div className="royal-card feed-card">
            <div className="feed-header">
              <h3 className="feed-title">
                <Calendar size={18} className="gold-glow-icon" /> Upcoming Literary Salons
              </h3>
              <Link to="/events" className="feed-link">See All <ChevronRight size={14} /></Link>
            </div>
            <div className="feed-list">
              {activeEvents.length > 0 ? (
                activeEvents.map((evt, idx) => (
                  <Link to={`/events/${evt.id}`} className="feed-item animate-fade-in" key={evt.id || idx}>
                    <div className="feed-item-meta">
                      <span className="feed-item-tag">{evt.type}</span>
                      <span className="feed-item-date">{evt.date}</span>
                    </div>
                    <h4 className="feed-item-title">{evt.title}</h4>
                    <p className="feed-item-desc">Venue: {evt.location}</p>
                  </Link>
                ))
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
                  No upcoming assemblies are currently registered.
                </div>
              )}
            </div>
          </div>

          <div className="royal-card feed-card essay-card">
            <div className="feed-header">
              <h3 className="feed-title">
                <BookText size={18} className="gold-glow-icon" /> Exquisite Dissertations
              </h3>
              <Link to="/discourses" className="feed-link">Browse Essays <ChevronRight size={14} /></Link>
            </div>
            <div className="feed-list">
              {dissertations.length > 0 ? (
                dissertations.map((diss, idx) => (
                  <Link to="/discourses" className="feed-item animate-fade-in" key={diss.id || idx}>
                    <div className="feed-item-meta">
                      <span className="feed-item-tag font-accent">{diss.house || 'Chronicle'}</span>
                      <span className="feed-item-date">
                        {diss.createdAt ? new Date(diss.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                      </span>
                    </div>
                    <h4 className="feed-item-title">{diss.title}</h4>
                    <p className="feed-item-desc" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {diss.content ? diss.content.replace(/<[^>]*>?/gm, '') : ''}
                    </p>
                  </Link>
                ))
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
                  The Scribes are crafting the first scholarly expositions.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
