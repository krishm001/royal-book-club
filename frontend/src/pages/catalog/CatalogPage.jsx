import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, BookOpen, Sparkles, X, Smartphone, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import BookCard from '../../components/shared/BookCard';
import { fetchBooks, fetchCheckoutsByMember, verifiedCheckout, verifiedReturn, requestCheckout, requestReturn } from '../../services/libraryApi';
import { fetchBookHouses } from '../../services/genreApi';
import './CatalogPage.css';

const CatalogPage = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [books, setBooks] = useState([]);
  const [houses, setHouses] = useState(['All']);
  const [memberCheckouts, setMemberCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Direct Transactions States
  const [selectedBook, setSelectedBook] = useState(null);
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [nfcActionType, setNfcActionType] = useState('checkout'); // 'checkout' or 'return'
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcError, setNfcError] = useState('');
  const [nfcSuccess, setNfcSuccess] = useState(false);

  const [fallbackModalOpen, setFallbackModalOpen] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackSuccess, setFallbackSuccess] = useState(false);

  const loadBooksAndData = async () => {
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

  useEffect(() => {
    const loadHouses = async () => {
      try {
        const res = await fetchBookHouses();
        if (res?.success && Array.isArray(res.data)) {
          const names = res.data.map(h => h.name);
          setHouses(['All', ...names]);
        } else {
          setHouses(['All', 'Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic']);
        }
      } catch (err) {
        console.warn('Unable to load book houses, using defaults', err);
        setHouses(['All', 'Classic Gothic', 'Gothic Fiction', 'Epic Poetry', 'Philosophical Non-Fiction', 'Poetry', 'Modern Classic']);
      }
    };

    loadBooksAndData();
    loadHouses();
  }, []);

  const loadMemberCheckouts = async () => {
    const memberId = user?.uid || user?.id;
    if (memberId) {
      try {
        const data = await fetchCheckoutsByMember(memberId);
        setMemberCheckouts(data || []);
      } catch (err) {
        console.warn('Unable to load member checkouts', err);
      }
    } else {
      setMemberCheckouts([]);
    }
  };

  useEffect(() => {
    loadMemberCheckouts();
  }, [user]);

  const refreshCatalogState = async () => {
    try {
      const data = await fetchBooks();
      setBooks(data || []);
    } catch (err) {
      console.warn('Unable to refresh catalog books', err);
    }
    await loadMemberCheckouts();
  };

  const handleCheckoutClick = (book) => {
    if (!user) {
      window.alert('Please sign in before checking out books.');
      return;
    }
    setSelectedBook(book);
    setNfcActionType('checkout');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);
    setNfcModalOpen(true);
    startNfcAction(book, 'checkout');
  };

  const handleReturnClick = (book) => {
    if (!user) {
      window.alert('Please sign in before returning books.');
      return;
    }
    setSelectedBook(book);
    setNfcActionType('return');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);
    setNfcModalOpen(true);
    startNfcAction(book, 'return');
  };

  const startNfcAction = async (targetBook, actionType) => {
    setNfcReading(true);
    setNfcError('');
    setNfcSuccess(false);

    if (!('NDEFReader' in window)) {
      if (user && user.role === 'ADMIN') {
        setNfcError("Web NFC is not supported on this browser/device. Tap 'Simulate NTAG213 Tag Tap (Curator Override)' or use manual request fallback.");
      } else {
        setNfcError("Web NFC is not supported on this browser/device. Please use the manual request fallback to submit a request for Curator approval.");
      }
      setNfcReading(false);
      return;
    }

    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();

      ndef.addEventListener("readingerror", () => {
        setNfcError("NFC Reading Error: Unable to read tag. Place tag firmly against your device's NFC sweet spot.");
      });

      ndef.addEventListener("reading", async ({ serialNumber }) => {
        console.log(`NFC tag scanned: ${serialNumber}`);
        
        const cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
        const cleanBookTag = (targetBook.ntagUid || '').toLowerCase().replace(/:/g, '');

        if (cleanScanned === cleanBookTag) {
          try {
            if (actionType === 'checkout') {
              await verifiedCheckout({ bookId: targetBook.isbn, memberId: user.uid || user.id, ntagUid: serialNumber });
            } else {
              await verifiedReturn({ bookId: targetBook.isbn, memberId: user.uid || user.id, ntagUid: serialNumber });
            }
            setNfcSuccess(true);
            setNfcReading(false);
            await refreshCatalogState();
            setTimeout(() => setNfcModalOpen(false), 2000);
          } catch (txError) {
            console.error('NFC verified transaction database error:', txError);
            setNfcError(`Database rejected verification: ${txError.response?.data?.message || txError.message}`);
          }
        } else {
          setNfcError(`Security Mismatch: This NFC tag (${serialNumber || 'Unknown'}) does not match this book volume's registered ID (${targetBook.ntagUid}).`);
        }
      });
    } catch (err) {
      console.error('NFC scanning error:', err);
      if (user && user.role === 'ADMIN') {
        setNfcError(`NFC Scan failed: ${err.message || err}. Use simulated tap below or switch to fallback.`);
      } else {
        setNfcError(`NFC Scan failed: ${err.message || err}. Please use the manual request fallback.`);
      }
      setNfcReading(false);
    }
  };

  const handleSimulateTapSuccess = async () => {
    if (!selectedBook) return;
    setNfcError('');
    setNfcSuccess(false);
    const targetUid = selectedBook.ntagUid || '04:A3:B2:C1:D0:E9:80';

    try {
      if (nfcActionType === 'checkout') {
        await verifiedCheckout({ bookId: selectedBook.isbn, memberId: user.uid || user.id, ntagUid: targetUid });
      } else {
        await verifiedReturn({ bookId: selectedBook.isbn, memberId: user.uid || user.id, ntagUid: targetUid });
      }
      setNfcSuccess(true);
      setNfcReading(false);
      await refreshCatalogState();
      setTimeout(() => setNfcModalOpen(false), 2000);
    } catch (txError) {
      console.error('Simulated verification failed:', txError);
      setNfcError(`Ledger rejected simulated verification: ${txError.response?.data?.message || txError.message}`);
    }
  };

  const handleSubmitFallbackRequest = async () => {
    if (!selectedBook) return;
    setFallbackLoading(true);
    try {
      if (nfcActionType === 'checkout') {
        await requestCheckout({ bookId: selectedBook.isbn, memberId: user.uid || user.id });
      } else {
        await requestReturn({ bookId: selectedBook.isbn, memberId: user.uid || user.id });
      }
      setFallbackSuccess(true);
      setFallbackLoading(false);
      await refreshCatalogState();
      setTimeout(() => {
        setFallbackModalOpen(false);
        setFallbackSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Fallback request failed:', err);
      window.alert(`Unable to submit request: ${err.response?.data?.message || err.message}`);
      setFallbackLoading(false);
    }
  };

  const getResolvedStatus = (book) => {
    if (!user) {
      return book.availableCopies > 0 ? 'available' : 'checked-out-by-other';
    }

    const bookIsbn = book.isbn || '';
    const userActiveCheckout = memberCheckouts.find(
      (c) => c.bookId === bookIsbn && 
             (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN')
    );

    if (userActiveCheckout) {
      if (userActiveCheckout.status === 'CHECKED_OUT') return 'checked-out';
      if (userActiveCheckout.status === 'REQUESTED_CHECKOUT') return 'requested-checkout';
      if (userActiveCheckout.status === 'REQUESTED_RETURN') return 'requested-return';
    }

    return book.availableCopies > 0 ? 'available' : 'checked-out-by-other';
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
                resolvedStatus={getResolvedStatus(book)}
                onCheckoutClick={handleCheckoutClick}
                onReturnClick={handleReturnClick}
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

      {/* NFC Reader Tap-to-Transaction Modal Overlay */}
      {nfcModalOpen && selectedBook && (
        <div className="nfc-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="royal-card nfc-modal-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '30px', background: 'rgba(26, 21, 16, 0.95)', border: '1px solid var(--accent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div className="nfc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.05em' }}>
                {nfcActionType === 'checkout' ? 'Sovereign Tap-to-Checkout' : 'Sovereign Tap-to-Return'}
              </h3>
              <button onClick={() => setNfcModalOpen(false)} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div className="nfc-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {nfcSuccess ? (
                <div className="nfc-success-animation animate-fade-in">
                  <CheckCircle size={56} className="text-success gold-glow-icon" style={{ marginBottom: '16px' }} />
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1.1rem' }}>Sovereign Verification Confirmed</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Transaction ledger updated automatically in Cloud Firestore.</p>
                </div>
              ) : (
                <>
                  <div className="nfc-scanner-pulse" style={{ margin: '20px 0' }}>
                    <Smartphone size={48} className="gold-glow-icon animate-pulse" />
                    <div className="pulse-ring"></div>
                  </div>
                  
                  <p className="nfc-prompt-desc" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', marginBottom: '20px' }}>
                    Hold this physical volume's NFC tag near the back of your Android phone...
                  </p>

                  <div className="nfc-meta-box" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '10px 14px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Target Volume ID:</span>
                    <code style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedBook.ntagUid}</code>
                  </div>

                  {nfcError && (
                    <div className="nfc-error-message royal-card" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)', color: '#ff7b72', marginBottom: '20px', fontSize: '0.8rem', textAlign: 'left', width: '100%' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{nfcError}</span>
                    </div>
                  )}

                  <div className="nfc-actions-row" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '10px' }}>
                    {user && user.role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={handleSimulateTapSuccess}
                        className="royal-btn simulate-btn"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                      >
                        <Sparkles size={14} /> Simulate NTAG213 Tag Tap (Curator Override)
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => {
                        setNfcModalOpen(false);
                        setFallbackModalOpen(true);
                      }}
                      className="royal-btn-secondary fallback-switch-btn"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                    >
                      Use Manual Request Fallback
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fallback Request Ledger Submission Modal Overlay */}
      {fallbackModalOpen && selectedBook && (
        <div className="nfc-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="royal-card nfc-modal-card fallback-modal-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '30px', background: 'rgba(26, 21, 16, 0.95)', border: '1px solid var(--accent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div className="nfc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.05em' }}>
                {nfcActionType === 'checkout' ? 'Manual Checkout Request' : 'Manual Return Request'}
              </h3>
              <button onClick={() => setFallbackModalOpen(false)} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div className="nfc-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {fallbackSuccess ? (
                <div className="nfc-success-animation animate-fade-in">
                  <CheckCircle size={56} className="gold-glow-icon" style={{ color: 'var(--success)', marginBottom: '16px' }} />
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1.1rem' }}>Scribe Request Saved</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Your circulation request has been submitted to the Curator's ledger.</p>
                </div>
              ) : (
                <>
                  <p className="fallback-explanation" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 20px 0', textAlign: 'left' }}>
                    {nfcActionType === 'checkout'
                      ? "As physical NFC validation is unavailable, submit a digital checkout request. A Curator will verify copy availability and authorize your checkout manual sweep."
                      : "Submit a physical volume return record. A Curator will review your checkout status and confirm receipt of this masterwork inside the Salon."}
                  </p>

                  <div className="fallback-form-summary royal-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', textAlign: 'left', width: '100%', marginBottom: '24px' }}>
                    <h5 style={{ color: 'var(--accent)', fontWeight: '600', marginBottom: '6px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volume Details</h5>
                    <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{selectedBook.title}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>ISBN: {selectedBook.isbn}</p>
                  </div>

                  <div className="fallback-actions-row" style={{ display: 'flex', gap: '14px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setFallbackModalOpen(false)}
                      className="royal-btn-secondary"
                      style={{ flex: 1, padding: '10px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitFallbackRequest}
                      className="royal-btn"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                      disabled={fallbackLoading}
                    >
                      {fallbackLoading ? <RefreshCw className="spin-icon" size={14} /> : <CheckCircle size={14} />}
                      {fallbackLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
