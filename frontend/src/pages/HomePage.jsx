import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, BookText, Sparkles, ChevronRight, Award, Trophy, Users, ShieldAlert, Clock, MapPin, CheckCircle2, Star, MessageSquare, Send, Quote, ChevronLeft } from 'lucide-react';
import PollWidget from '../components/shared/PollWidget';
import { fetchBooks, fetchApprovedSiteReviews, submitSiteReview } from '../services/libraryApi';
import { fetchHeroConfig } from '../services/heroApi';
import { fetchEvents, rsvpToEvent } from '../services/eventApi';
import { fetchDiscourses } from '../services/discourseApi';
import { fetchStatsSummary } from '../services/statsApi';
import { useLanguage } from '../i18n/LanguageContext';
import './HomePage.css';

const defaultFeaturedBook = {
  id: '9781786330895',
  title: 'Ikigai: The Japanese Secret to a Long and Happy Life',
  author: 'Héctor García; Francesc Miralles',
  genre: 'Self-Help',
  rating: 4.9,
  coverUrl: 'https://firebasestorage.googleapis.com/v0/b/royal-book-club.firebasestorage.app/o/books%2F1780737939254_Screenshot_2026-06-06_at_2.49.57_PM.png?alt=media&token=b14ac641-494a-4b9e-aa7f-3b98b42e69e7',
  description: "The Japanese secret to a long and happy life. We all have an ikigai. It's the Japanese word for 'a reason to live' or 'a reason to jump out of bed in the morning'.It's the place where your needs, desires, ambitions, and satisfaction meet. A place of balance. Small wonder that finding your ikigai is closely linked to living longer. Finding your ikigai is easier than you might think. This book will help you work out what your own ikigai really is, and equip you to change your life. You have a purpose in this world: your skills, your interests, your desires and your history have made you the perfect candidate for something. All you have to do is find it. Do that, and you can make every single day of your life joyful and meaningful.",
  citation: '"To define is to limit." — Lord Henry Wotton'
};

const HomePage = ({ user, onSignIn, theme }) => {
  const { t, getLocalized } = useLanguage();

  const getShowcaseCitation = () => {
    if (!currentShowcaseItem) return '';
    if (currentShowcaseItem.citationIndex !== undefined && currentShowcaseItem.citationIndex !== -1 && heroConfig) {
      const langQuotes = getLocalized(heroConfig, 'featuredQuotes') || [];
      return langQuotes[currentShowcaseItem.citationIndex] || currentShowcaseItem.citation;
    }
    return getLocalized(currentShowcaseItem, 'citation') || currentShowcaseItem.citation;
  };
  const [currentShowcaseItem, setCurrentShowcaseItem] = useState(defaultFeaturedBook);
  const [currentShowcaseType, setCurrentShowcaseType] = useState('book'); // 'book' or 'assembly'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [allBooksList, setAllBooksList] = useState([]);
  const [featuredError, setFeaturedError] = useState(null);
  const [activeEvents, setActiveEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [dissertations, setDissertations] = useState([]);
  const [isRsvpingShowcase, setIsRsvpingShowcase] = useState(false);
  const [heroConfig, setHeroConfig] = useState({
    title: 'Words, Wisdom, Will.',
    subtitle: 'The wisest humans were not the most connected. They were the most read. They had no feed, no followers, no notifications. They had books. And they shaped the world.',
    backgroundImageUrl: '',
    backgroundImageUrlSalon: '',
    backgroundImageUrlAcademic: '',
    featuredBookIsbns: [],
    featuredQuotes: []
  });
  const [liveStats, setLiveStats] = useState({
    membersCount: 0,
    booksCount: 0,
    activeCheckoutsCount: 0,
    upcomingSalonsCount: 0
  });
  const [currentAssemblyImageIndex, setCurrentAssemblyImageIndex] = useState(0);

  // Site Review states
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [reviewErrorMsg, setReviewErrorMsg] = useState('');
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  // Auto-rotate testimonials every 6 seconds if there are multiple
  useEffect(() => {
    if (approvedReviews.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentReviewIndex(prev => (prev + 1) % approvedReviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [approvedReviews]);

  useEffect(() => {
    const loadAllData = async () => {
      let books = [];
      let events = [];
      let currentHeroConfig = heroConfig;

      try {
        const res = await fetchHeroConfig();
        if (res?.success && res?.data) {
          setHeroConfig(res.data);
          currentHeroConfig = res.data;
        }
      } catch (err) {
        console.warn('Unable to load hero config', err);
      }

      try {
        const res = await fetchStatsSummary();
        if (res?.success && res?.data) {
          setLiveStats(res.data);
        }
      } catch (err) {
        console.warn('Unable to load stats summary', err);
      }

      try {
        const booksRes = await fetchBooks();
        if (Array.isArray(booksRes) && booksRes.length > 0) {
          setAllBooksList(booksRes);
          books = booksRes;
        }
      } catch (err) {
        console.warn('Unable to load books', err);
      }

      try {
        const eventsRes = await fetchEvents();
        if (eventsRes?.success && Array.isArray(eventsRes.data)) {
          const eventsData = eventsRes.data;
          setAllEvents(eventsData);
          setActiveEvents(eventsData.slice(0, 3));
          events = eventsData;
        }
      } catch (err) {
        console.warn('Unable to load events for home feed', err);
      }

      try {
        const chroniclesRes = await fetchDiscourses('CHRONICLE');
        if (chroniclesRes?.success && Array.isArray(chroniclesRes.data)) {
          setDissertations(chroniclesRes.data.slice(0, 3));
        }
      } catch (err) {
        console.warn('Unable to load chronicles for home feed', err);
      }

      try {
        const reviewsRes = await fetchApprovedSiteReviews();
        if (reviewsRes?.success && Array.isArray(reviewsRes.data)) {
          // Shuffle published testimonials and select any random 5 at a time
          const shuffled = [...reviewsRes.data].sort(() => 0.5 - Math.random());
          setApprovedReviews(shuffled.slice(0, 5));
        }
      } catch (err) {
        console.warn('Unable to load approved site reviews', err);
      }

      // Initialize the showcase item
      if (books.length > 0) {
        let pool = books.filter(b => currentHeroConfig.featuredBookIsbns?.includes(b.isbn || b.id));
        if (pool.length === 0) {
          pool = books;
        }
        const index = Math.floor(Math.random() * pool.length);
        const chosen = pool[index];
        const quotesPool = currentHeroConfig.featuredQuotes || [];
        const quoteIdx = quotesPool.length > 0 ? Math.floor(Math.random() * quotesPool.length) : -1;
        const randomQuote = quoteIdx !== -1 ? quotesPool[quoteIdx] : (chosen.citation || defaultFeaturedBook.citation);

        setCurrentShowcaseItem({
          id: chosen.isbn || chosen.bookId || chosen.id || 'book-1',
          title: chosen.title || chosen.name || defaultFeaturedBook.title,
          author: Array.isArray(chosen.authors) ? chosen.authors.join(', ') : chosen.author || defaultFeaturedBook.author,
          genre: chosen.genre || chosen.subtitle || 'Selected Curation',
          rating: chosen.rating || 4.8,
          coverUrl: chosen.coverUrl || chosen.cover || defaultFeaturedBook.coverUrl,
          description: chosen.description || chosen.subtitle || defaultFeaturedBook.description,
          citation: randomQuote,
          citationIndex: quoteIdx,
          translations: chosen.translations || null,
        });
        setCurrentShowcaseType('book');
      } else if (events.length > 0) {
        const index = Math.floor(Math.random() * events.length);
        setCurrentShowcaseItem(events[index]);
        setCurrentShowcaseType('assembly');
      }
    };

    loadAllData();
  }, []);

  // Interval timer for rotating showcase (every 10 seconds)
  useEffect(() => {
    if (allBooksList.length === 0 && allEvents.length === 0) return;

    const interval = setInterval(() => {
      // Start transition fade-out
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentShowcaseType(prevType => {
          const nextType = (prevType === 'book' && allEvents.length > 0) ? 'assembly' : 'book';

          if (nextType === 'assembly') {
            const randomIndex = Math.floor(Math.random() * allEvents.length);
            setCurrentShowcaseItem(allEvents[randomIndex]);
          } else {
            let pool = allBooksList.filter(b => heroConfig.featuredBookIsbns?.includes(b.isbn || b.id));
            if (pool.length === 0) {
              pool = allBooksList;
            }
            if (pool.length > 0) {
              const randomIndex = Math.floor(Math.random() * pool.length);
              const chosen = pool[randomIndex];
              const quotesPool = heroConfig.featuredQuotes || [];
              const quoteIdx = quotesPool.length > 0 ? Math.floor(Math.random() * quotesPool.length) : -1;
              const randomQuote = quoteIdx !== -1 ? quotesPool[quoteIdx] : (chosen.citation || defaultFeaturedBook.citation);

              setCurrentShowcaseItem({
                id: chosen.isbn || chosen.bookId || chosen.id || 'book-1',
                title: chosen.title || chosen.name || defaultFeaturedBook.title,
                author: Array.isArray(chosen.authors) ? chosen.authors.join(', ') : chosen.author || defaultFeaturedBook.author,
                genre: chosen.genre || chosen.subtitle || 'Selected Curation',
                rating: chosen.rating || 4.8,
                coverUrl: chosen.coverUrl || chosen.cover || defaultFeaturedBook.coverUrl,
                description: chosen.description || chosen.subtitle || defaultFeaturedBook.description,
                citation: randomQuote,
                citationIndex: quoteIdx,
                translations: chosen.translations || null,
              });
            }
          }
          return nextType;
        });

        // End transition fade-in
        setIsTransitioning(false);
      }, 500); // Wait for transition fadeout (0.5s)
    }, 10000);

    return () => clearInterval(interval);
  }, [allBooksList, allEvents, heroConfig.featuredBookIsbns, heroConfig.featuredQuotes]);

  // Reset assembly image index when showcase item or type changes
  useEffect(() => {
    setCurrentAssemblyImageIndex(0);
  }, [currentShowcaseItem, currentShowcaseType]);

  // Keep changing images from assemblies under "Upcoming Sovereign Assembly" (every 2.5 seconds)
  useEffect(() => {
    if (currentShowcaseType !== 'assembly' || !currentShowcaseItem) return;

    const assemblyImages = [
      currentShowcaseItem.imageUrl,
      ...(currentShowcaseItem.imageUrls || [])
    ].filter(Boolean);

    if (assemblyImages.length <= 1) return;

    const imageTimer = setInterval(() => {
      setCurrentAssemblyImageIndex(prev => (prev + 1) % assemblyImages.length);
    }, 2500);

    return () => clearInterval(imageTimer);
  }, [currentShowcaseType, currentShowcaseItem]);

  const isUserRsvped = (item) => {
    if (!user || !item?.rsvps || !Array.isArray(item.rsvps)) return false;
    return item.rsvps.includes(user.uid || user.id);
  };

  const handleShowcaseRsvp = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      onSignIn();
      return;
    }

    if (isRsvpingShowcase) return;

    setIsRsvpingShowcase(true);
    try {
      const res = await rsvpToEvent(currentShowcaseItem.id);
      if (res?.success) {
        const updatedRsvps = [...(currentShowcaseItem.rsvps || []), user.uid || user.id];
        setCurrentShowcaseItem(prev => ({
          ...prev,
          rsvps: updatedRsvps
        }));

        setAllEvents(prevEvents => prevEvents.map(evt => {
          if (evt.id === currentShowcaseItem.id) {
            return { ...evt, rsvps: updatedRsvps };
          }
          return evt;
        }));

        alert("✓ Invitation Authorized! You have successfully RSVPed to this Assembly.");
      } else {
        alert(res?.message || 'Failed to request invitation.');
      }
    } catch (err) {
      console.error('Failed to RSVP from showcase card:', err);
      alert(err.response?.data?.message || 'An error occurred while requesting invitation.');
    } finally {
      setIsRsvpingShowcase(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      setReviewErrorMsg("Please enter your comments.");
      return;
    }
    setSubmittingReview(true);
    setReviewSuccessMsg('');
    setReviewErrorMsg('');
    try {
      const payload = {
        rating: reviewRating,
        comment: reviewComment,
        memberName: user?.displayName || user?.name || 'Sovereign Member',
        memberEmail: user?.email || '',
        memberId: user?.uid || user?.id || ''
      };
      const res = await submitSiteReview(payload);
      if (res?.success) {
        setReviewSuccessMsg("Your site review has been submitted. By default, submissions are queued for admin approval before showing on the home page. Thank you!");
        setReviewComment('');
        setReviewRating(5);
      } else {
        setReviewErrorMsg(res?.message || "Failed to submit review.");
      }
    } catch (err) {
      console.error('Site review submission error:', err);
      setReviewErrorMsg(err.response?.data?.message || err.message || "Unable to process request.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getHeroBackgroundStyle = () => {
    const activeImage = (theme === 'dark' || theme === 'salon')
      ? (heroConfig.backgroundImageUrlSalon || heroConfig.backgroundImageUrl)
      : (heroConfig.backgroundImageUrlAcademic || heroConfig.backgroundImageUrl);

    if (activeImage) {
      const gradient = (theme === 'dark' || theme === 'salon')
        ? 'linear-gradient(to right, rgba(12, 15, 29, 0.9) 0%, rgba(12, 15, 29, 0.45) 100%)'
        : 'linear-gradient(to right, rgba(250, 245, 235, 0.95) 0%, rgba(250, 245, 235, 0.5) 100%)';
      return {
        backgroundImage: `${gradient}, url(${activeImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '40px 30px',
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
        marginBottom: '20px'
      };
    }
    return {};
  };

  const stats = [
    { label: t('home.memberRegistry'), count: liveStats.membersCount.toLocaleString(), icon: <Users className="stat-icon" /> },
    { label: t('home.royalVolumes'), count: liveStats.booksCount.toLocaleString(), icon: <BookOpen className="stat-icon" /> },
    { label: t('home.activeCheckouts'), count: liveStats.activeCheckoutsCount.toLocaleString(), icon: <Sparkles className="stat-icon" /> },
    { label: t('home.upcomingSalons'), count: liveStats.upcomingSalonsCount.toLocaleString(), icon: <Calendar className="stat-icon" /> },
  ];

  return (
    <div className="homepage-container animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section" style={getHeroBackgroundStyle()}>
        <div className="hero-content">
          <div className="hero-badge">
            <Award size={14} className="gold-glow-icon" />
            <span className="gold-gradient-text">{t('home.established')} MMXXVI</span>
          </div>
          <h1 className="hero-title glow-text" style={{ whiteSpace: 'pre-line' }}>
            {getLocalized(heroConfig, 'title') || t('home.heroTitle')}
          </h1>
          <p className="hero-subtitle">
            {getLocalized(heroConfig, 'subtitle') || t('home.heroSubtitle')}
          </p>
          <div className="hero-cta-group">
            <Link to="/catalog" className="royal-btn">
              {t('home.studyCta')} <BookOpen size={16} />
            </Link>
          </div>
        </div>

        {/* Hero Card/Visual representation */}
        <div className={`hero-visual ${isTransitioning ? 'showcase-fade-out' : 'showcase-fade-in'}`}>
          {currentShowcaseType === 'book' ? (
            <div className="royal-card featured-highlight-card">
              <div className="highlight-tag gold-gradient-text">★ {t('home.featuredSelection')} ★</div>
              <div className="highlight-body">
                <img src={currentShowcaseItem.coverUrl} alt={getLocalized(currentShowcaseItem, 'title')} className="highlight-img" />
                <div className="highlight-details">
                  <h3 className="highlight-title">{getLocalized(currentShowcaseItem, 'title')}</h3>
                  <span className="highlight-author">{t('common.by')} {currentShowcaseItem.author}</span>
                  <p className="highlight-desc">{getLocalized(currentShowcaseItem, 'description')}</p>
                  {featuredError && <div className="highlight-note">{featuredError}</div>}
                  {getShowcaseCitation() && (
                    <blockquote className="highlight-quote">{getShowcaseCitation()}</blockquote>
                  )}
                  <Link to={`/catalog/${currentShowcaseItem.id}`} className="highlight-action-btn">
                    {t('catalog.checkout')} <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (() => {
            const assemblyImages = currentShowcaseItem
              ? [currentShowcaseItem.imageUrl, ...(currentShowcaseItem.imageUrls || [])].filter(Boolean)
              : [];
            const currentAssemblyImage = assemblyImages[currentAssemblyImageIndex] || currentShowcaseItem?.imageUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80';

            return (
              <div className="royal-card featured-highlight-card assembly-highlight-card animate-fade-in">
                <div className="highlight-tag gold-gradient-text">⚜ {t('home.upcomingAssembly')} ⚜</div>
                <div className="highlight-body assembly-body">
                  <div className="assembly-img-container">
                    <img
                      key={currentAssemblyImage}
                      src={currentAssemblyImage}
                      alt={getLocalized(currentShowcaseItem, 'title')}
                      className="highlight-img assembly-img assembly-img-fade-in"
                    />
                  </div>
                  <div className="highlight-details">
                    <span className="assembly-type-tag">{getLocalized(currentShowcaseItem, 'type')}</span>
                    <h3 className="highlight-title">{getLocalized(currentShowcaseItem, 'title')}</h3>
                    <p className="highlight-desc">{getLocalized(currentShowcaseItem, 'description')}</p>

                    <div className="assembly-specs">
                      <span className="assembly-spec-item">
                        <Calendar size={12} className="gold-glow-icon" /> {currentShowcaseItem.date}
                      </span>
                      <span className="assembly-spec-item">
                        <Clock size={12} className="gold-glow-icon" /> {currentShowcaseItem.time}
                      </span>
                      <span className="assembly-spec-item">
                        <MapPin size={12} className="gold-glow-icon" /> {getLocalized(currentShowcaseItem, 'location')}
                      </span>
                    </div>

                    <div className="showcase-actions" style={{ display: 'flex', gap: '12px', marginTop: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <Link to={`/events/${currentShowcaseItem.id}`} className="royal-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.75rem', textDecoration: 'none' }}>
                        {t('common.details')} <ChevronRight size={12} />
                      </Link>
                      {isUserRsvped(currentShowcaseItem) ? (
                        <button className="royal-btn-disabled" disabled style={{ padding: '8px 16px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} style={{ color: 'var(--success)' }} /> {t('home.invitationAuthorized')}
                        </button>
                      ) : isRsvpingShowcase ? (
                        <button className="royal-btn-disabled" disabled style={{ padding: '8px 16px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <div className="loader-mini" style={{ width: '12px', height: '12px' }}></div> {t('home.authorizing')}
                        </button>
                      ) : (currentShowcaseItem.rsvps?.length >= (currentShowcaseItem.capacity || 60)) ? (
                        <button className="royal-btn-disabled" disabled style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
                          {t('home.assemblyFull')}
                        </button>
                      ) : (
                        <button onClick={handleShowcaseRsvp} className="royal-btn" style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
                          {t('home.requestInvitation')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
            <PollWidget user={user} onSignIn={onSignIn} />
          </div>
        </div>

        {/* Right Column: Upcoming Salons and Dissertations */}
        <div className="right-column">
          <div className="royal-card feed-card">
            <div className="feed-header">
              <h3 className="feed-title">
                <Calendar size={18} className="gold-glow-icon" /> {t('home.upcomingSalons')}
              </h3>
              <Link to="/events" className="feed-link">See All <ChevronRight size={14} /></Link>
            </div>
            <div className="feed-list">
              {activeEvents.length > 0 ? (
                activeEvents.map((evt, idx) => (
                  <Link to={`/events/${evt.id}`} className="feed-item animate-fade-in" key={evt.id || idx}>
                    <div className="feed-item-meta">
                      <span className="feed-item-tag">{getLocalized(evt, 'type')}</span>
                      <span className="feed-item-date">{evt.date}</span>
                    </div>
                    <h4 className="feed-item-title">{getLocalized(evt, 'title')}</h4>
                    <p className="feed-item-desc">Venue: {getLocalized(evt, 'location')}</p>
                  </Link>
                ))
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
                  {t('common.noEvents')}
                </div>
              )}
            </div>
          </div>

          <div className="royal-card feed-card essay-card">
            <div className="feed-header">
              <h3 className="feed-title">
                <BookText size={18} className="gold-glow-icon" /> {t('home.recentDiscourses')}
              </h3>
              <Link to="/discourses" className="feed-link">{t('home.browseEssays')} <ChevronRight size={14} /></Link>
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
                  {t('common.noDiscourses')}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials and Site Reviews */}
      <section className="site-reviews-section" style={{ marginTop: '40px', padding: '20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <MessageSquare size={22} className="gold-glow-icon" />
          <h2 className="glow-text" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.05em' }}>
            Sovereign Testimonials
          </h2>
        </div>

        <div className="site-reviews-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
            
            {/* Carousel Box */}
            <div className="royal-card review-carousel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px', position: 'relative', background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
              <div>
                <Quote size={40} style={{ color: 'var(--accent)', opacity: 0.12, position: 'absolute', top: '24px', left: '24px' }} />
                <h3 style={{ margin: '0 0 20px 0', fontFamily: 'var(--font-display)', color: 'var(--accent)', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.02em', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                  Curated Perspectives
                </h3>

                {approvedReviews.length > 0 ? (
                  <div className="testimonial-slide animate-fade-in" key={currentReviewIndex} style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          fill={s <= approvedReviews[currentReviewIndex].rating ? "var(--accent)" : "none"}
                          stroke={s <= approvedReviews[currentReviewIndex].rating ? "var(--accent)" : (theme === 'academic' ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)")}
                        />
                      ))}
                    </div>
                    <blockquote style={{ margin: '0 0 16px 0', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                      "{approvedReviews[currentReviewIndex].comment}"
                    </blockquote>
                    <cite style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      — {approvedReviews[currentReviewIndex].memberName}
                    </cite>
                  </div>
                ) : (
                  <div style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>No curations have been certified yet.</p>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>Be the first to leave a testimonial using the form!</p>
                  </div>
                )}
              </div>

              {approvedReviews.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', alignSelf: 'flex-end' }}>
                  <button
                    onClick={() => setCurrentReviewIndex(prev => (prev - 1 + approvedReviews.length) % approvedReviews.length)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--glass-border-hover)', color: 'var(--accent)', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentReviewIndex(prev => (prev + 1) % approvedReviews.length)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--glass-border-hover)', color: 'var(--accent)', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Testimonial Form Box */}
            <div className="royal-card review-form-card" style={{ padding: '30px', background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontFamily: 'var(--font-display)', color: 'var(--accent)', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.02em', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                Inscribe Your Testimonial
              </h3>

              {user ? (
                <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Rating
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setReviewRating(starVal)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', transition: 'transform 0.1s ease' }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Star
                            size={22}
                            fill={starVal <= reviewRating ? "var(--accent)" : "none"}
                            stroke={starVal <= reviewRating ? "var(--accent)" : (theme === 'academic' ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)")}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Commentary
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience of the Royal Book Club..."
                      rows={3}
                      maxLength={500}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'var(--surface)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        lineHeight: '1.5',
                        resize: 'none',
                        outline: 'none',
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', opacity: 0.8 }}>
                      {reviewComment.length}/500
                    </div>
                  </div>

                  {reviewSuccessMsg && (
                    <div style={{ padding: '10px 12px', background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.25)', color: '#4ade80', borderRadius: '4px', fontSize: '0.8rem', lineHeight: '1.4' }}>
                      {reviewSuccessMsg}
                    </div>
                  )}

                  {reviewErrorMsg && (
                    <div style={{ padding: '10px 12px', background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.25)', color: '#f87171', borderRadius: '4px', fontSize: '0.8rem', lineHeight: '1.4' }}>
                      {reviewErrorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="royal-btn"
                    disabled={submittingReview}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      fontSize: '0.85rem',
                      alignSelf: 'flex-start',
                      minWidth: '150px',
                    }}
                  >
                    <Send size={14} /> {submittingReview ? "Submitting..." : "Submit Testimonial"}
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '180px', textAlign: 'center', padding: '20px', background: 'var(--surface)', border: '1px dashed var(--glass-border-hover)', borderRadius: '6px' }}>
                  <Sparkles size={28} className="gold-glow-icon" style={{ marginBottom: '12px' }} />
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Only registered members can submit testimonies. Sign in to contribute your evaluation to the chronicle.
                  </p>
                  <button onClick={onSignIn} className="royal-btn" style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
                    Sign In
                  </button>
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
