import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Star, ArrowLeft, BadgeCheck, ShoppingBag, CheckCircle, Clock, Smartphone, RefreshCw, X, Sparkles, AlertTriangle } from 'lucide-react';
import { fetchBookByIsbn, checkoutBook, fetchBookReviews, submitBookReview, requestCheckout, requestReturn, verifiedCheckout, verifiedReturn, fetchCheckoutsByMember } from '../../services/libraryApi';
import './BookDetailPage.css';

const BookDetailPage = ({ user }) => {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [memberCheckouts, setMemberCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState(5);

  // NFC & Fallback request states
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [nfcActionType, setNfcActionType] = useState('checkout'); // 'checkout' or 'return'
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcError, setNfcError] = useState('');
  const [nfcSuccess, setNfcSuccess] = useState(false);

  const [fallbackModalOpen, setFallbackModalOpen] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackSuccess, setFallbackSuccess] = useState(false);

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

  const getResolvedStatus = () => {
    if (!book) return 'available';
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

  const checkoutStatus = getResolvedStatus();

  const refreshState = async () => {
    try {
      const fetched = await fetchBookByIsbn(id);
      setBook(fetched);
    } catch (err) {
      console.warn('Unable to refresh book details', err);
    }
    await loadMemberCheckouts();
  };

  useEffect(() => {
    const loadBookAndReviews = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetched = await fetchBookByIsbn(id);
        setBook(fetched);
        
        // Fetch real reviews
        const reviewsRes = await fetchBookReviews(id);
        if (reviewsRes?.success && Array.isArray(reviewsRes.data)) {
          setReviews(reviewsRes.data);
        } else if (Array.isArray(reviewsRes)) {
          setReviews(reviewsRes);
        }
      } catch (err) {
        setError('Unable to load book details from the Royal catalog.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadBookAndReviews();
    }
  }, [id]);

  useEffect(() => {
    loadMemberCheckouts();
  }, [user]);

  // Deep Link Auto-Return Flow Trigger
  useEffect(() => {
    if (book && memberCheckouts.length > 0) {
      const query = new URLSearchParams(window.location.search);
      if (query.get('action') === 'return' && getResolvedStatus() === 'checked-out') {
        setNfcActionType('return');
        setNfcError('');
        setNfcSuccess(false);
        setFallbackSuccess(false);
        setNfcModalOpen(true);
        // CRITICAL FIX: Trigger scan engine to verify device capability and show fallback options
        startNfcAction('return');
        // Strip parameters from URL without page reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [book, memberCheckouts]);

  const handleCheckoutClick = () => {
    if (!user) {
      window.alert('Please sign in before checking out books.');
      return;
    }
    setNfcActionType('checkout');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);

    // ALWAYS open NFC modal to allow scanning or simulation on macOS
    setNfcModalOpen(true);
    startNfcAction('checkout');
  };

  const handleReturnClick = () => {
    if (!user) {
      window.alert('Please sign in before returning books.');
      return;
    }
    setNfcActionType('return');
    setNfcError('');
    setNfcSuccess(false);
    setFallbackSuccess(false);

    // ALWAYS open NFC modal to allow scanning or simulation on macOS
    setNfcModalOpen(true);
    startNfcAction('return');
  };

  const startNfcAction = async (actionType) => {
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
        
        // Clean serial number and compare to book's ntagUid
        const cleanScanned = (serialNumber || '').toLowerCase().replace(/:/g, '');
        const cleanBookTag = (book.ntagUid || '').toLowerCase().replace(/:/g, '');

        if (cleanScanned === cleanBookTag) {
          try {
            if (actionType === 'checkout') {
              await verifiedCheckout({ bookId: book.isbn, memberId: user.uid || user.id, ntagUid: serialNumber });
            } else {
              await verifiedReturn({ bookId: book.isbn, memberId: user.uid || user.id, ntagUid: serialNumber });
            }
            setNfcSuccess(true);
            setNfcReading(false);
            await refreshState();
            setTimeout(() => setNfcModalOpen(false), 2000);
          } catch (txError) {
            console.error('NFC verified transaction database error:', txError);
            setNfcError(`Database rejected verification: ${txError.response?.data?.message || txError.message}`);
          }
        } else {
          setNfcError(`Security Mismatch: This NFC tag (${serialNumber || 'Unknown'}) does not match this book volume's registered ID (${book.ntagUid}).`);
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
    setNfcError('');
    setNfcSuccess(false);
    const targetUid = book.ntagUid || '04:A3:B2:C1:D0:E9:80';

    try {
      if (nfcActionType === 'checkout') {
        await verifiedCheckout({ bookId: book.isbn, memberId: user.uid || user.id, ntagUid: targetUid });
      } else {
        await verifiedReturn({ bookId: book.isbn, memberId: user.uid || user.id, ntagUid: targetUid });
      }
      setNfcSuccess(true);
      setNfcReading(false);
      await refreshState();
      setTimeout(() => setNfcModalOpen(false), 2000);
    } catch (txError) {
      console.error('Simulated verification failed:', txError);
      setNfcError(`Ledger rejected simulated verification: ${txError.response?.data?.message || txError.message}`);
    }
  };

  const handleSubmitFallbackRequest = async () => {
    setFallbackLoading(true);
    try {
      if (nfcActionType === 'checkout') {
        await requestCheckout({ bookId: book.isbn, memberId: user.uid || user.id });
      } else {
        await requestReturn({ bookId: book.isbn, memberId: user.uid || user.id });
      }
      setFallbackSuccess(true);
      setFallbackLoading(false);
      await refreshState();
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    try {
      const res = await submitBookReview(id, {
        rating: userRating,
        content: reviewText,
      });

      if (res?.success && res?.data) {
        setReviews([res.data, ...reviews]);
      } else {
        // Refresh feed
        const refreshed = await fetchBookReviews(id);
        if (refreshed?.success && Array.isArray(refreshed.data)) {
          setReviews(refreshed.data);
        }
      }
      setReviewText('');
    } catch (err) {
      console.error('Failed to publish dissertation', err);
      window.alert('Unable to publish review at this time.');
    }
  };

  if (loading) {
    return (
      <div className="book-detail-container animate-fade-in">
        <div className="royal-card no-results-card">
          <p>Loading book details...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="book-detail-container animate-fade-in">
        <div className="royal-card no-results-card">
          <p>{error || 'Book not found in the Royal catalog.'}</p>
          <Link to="/catalog" className="royal-btn">
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const authors = Array.isArray(book.authors) ? book.authors.join(', ') : book.author || 'Unknown Author';
  const coverUrl = book.coverUrl || book.thumbnail || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="book-detail-container animate-fade-in">
      <Link to="/catalog" className="back-link">
        <ArrowLeft size={16} /> Return to Archives
      </Link>

      <div className="book-detail-grid">
        <div className="book-cover-panel">
          <div className="cover-frame royal-card">
            <img src={coverUrl} alt={book.title} className="detail-cover-img" />
            <div className="gold-bookmark-spine"></div>
          </div>
          {book.subtitle && (
            <blockquote className="detail-citation-blockquote">
              {book.subtitle}
            </blockquote>
          )}
        </div>

        <div className="book-info-panel royal-card">
          <div className="genre-rating-row">
            <span className="detail-genre-tag">{book.genre || book.publishDate || 'Library Edition'}</span>
            <div className="detail-stars">
              <Star size={16} fill="var(--accent)" stroke="var(--accent)" />
              <span className="rating-num">{book.rating || '—'} / 5.0</span>
            </div>
          </div>

          <h1 className="detail-book-title glow-text">{book.title}</h1>
          <h2 className="detail-book-author">by <span className="gold-gradient-text">{authors}</span></h2>

          <div className="metadata-spec-grid">
            <div className="spec-item">
              <span className="spec-label">ISBN</span>
              <span className="spec-value">{book.isbn}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Publisher</span>
              <span className="spec-value">{book.publisher || 'N/A'}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Published</span>
              <span className="spec-value">{book.publishDate || 'N/A'}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Availability</span>
              <span className="spec-value">
                {checkoutStatus === 'available' ? (
                  <span className="text-success"><BadgeCheck size={14} className="inline-icon" /> In Salon</span>
                ) : (
                  <span className="text-warning"><Clock size={14} className="inline-icon" /> In Circulation</span>
                )}
              </span>
            </div>
          </div>

          <div className="detail-description-section">
            <h3>Literary Overview</h3>
            <p>{book.description || 'A refined volume from the Royal archives.'}</p>
            {book.details && <p className="extended-desc">{book.details}</p>}
          </div>

          {book.tags && Array.isArray(book.tags) && book.tags.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Acquisition Labels</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {book.tags.map((tag, idx) => (
                  <span key={idx} style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.15)', color: 'var(--accent)', borderRadius: '4px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: '500' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-checkout-action-box">
            {checkoutStatus === 'available' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={handleCheckoutClick} className="royal-btn checkout-cta-btn" id="book-detail-checkout-btn">
                  <ShoppingBag size={16} /> Secure Sovereign Checkout
                </button>
              </div>
            ) : checkoutStatus === 'checked-out' ? (
              <div className="success-checkout-badge-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="success-checkout-badge">
                  <CheckCircle size={20} className="success-icon" />
                  <div>
                    <h4>Digital Checkout Authorized</h4>
                    <p>This volume is currently in your physical possession.</p>
                  </div>
                </div>
                <button onClick={handleReturnClick} className="royal-btn checkout-cta-btn return-btn-action" id="book-detail-return-btn">
                  <RefreshCw size={16} /> Tap-to-Return / Return Volume
                </button>
              </div>
            ) : checkoutStatus === 'requested-checkout' ? (
              <div className="pending-checkout-badge royal-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid rgba(212, 165, 116, 0.3)', background: 'rgba(212, 165, 116, 0.05)' }}>
                <Clock size={20} style={{ color: 'var(--accent)' }} className="spin-icon" />
                <div>
                  <h4 style={{ color: 'var(--accent)', fontSize: '0.95rem', fontWeight: '600' }}>Checkout Request Pending</h4>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Awaiting administrative approval in the Curator's ledger.</p>
                </div>
              </div>
            ) : checkoutStatus === 'requested-return' ? (
              <div className="pending-checkout-badge royal-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid rgba(212, 165, 116, 0.3)', background: 'rgba(212, 165, 116, 0.05)' }}>
                <Clock size={20} style={{ color: 'var(--accent)' }} className="spin-icon" />
                <div>
                  <h4 style={{ color: 'var(--accent)', fontSize: '0.95rem', fontWeight: '600' }}>Return Request Pending</h4>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Awaiting administrative review to mark as returned inside Salon.</p>
                </div>
              </div>
            ) : (
              <div className="in-circulation-badge royal-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)' }}>
                <Clock size={20} style={{ color: '#ff7b72' }} />
                <div>
                  <h4 style={{ color: '#ff7b72', fontSize: '0.95rem', fontWeight: '600' }}>In Circulation</h4>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>This volume is currently checked out by another scholar.</p>
                </div>
              </div>
            )}

            {/* Inline NFC Reader Tap-to-Transaction Panel */}
            {nfcModalOpen && (
              <div className="inline-action-panel royal-card border-gold animate-fade-in" style={{ marginTop: '16px', padding: '20px', background: 'rgba(20, 16, 12, 0.6)', backdropFilter: 'blur(12px)' }}>
                <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '10px' }}>
                  <h4 style={{ color: 'var(--accent)', fontSize: '1rem', fontWeight: '600', margin: 0, letterSpacing: '0.05em' }}>
                    {nfcActionType === 'checkout' ? 'Sovereign Tap-to-Checkout' : 'Sovereign Tap-to-Return'}
                  </h4>
                  <button onClick={() => setNfcModalOpen(false)} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px' }}>
                    <X size={16} />
                  </button>
                </div>

                <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {nfcSuccess ? (
                    <div className="nfc-success-animation animate-fade-in" style={{ padding: '10px 0' }}>
                      <CheckCircle size={48} className="text-success gold-glow-icon" style={{ marginBottom: '12px' }} />
                      <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1rem' }}>Sovereign Verification Confirmed</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Transaction ledger updated automatically in Cloud Firestore.</p>
                    </div>
                  ) : (
                    <>
                      <div className="nfc-scanner-pulse" style={{ margin: '15px 0' }}>
                        <Smartphone size={40} className="gold-glow-icon animate-pulse" />
                        <div className="pulse-ring"></div>
                      </div>
                      
                      <p className="nfc-prompt-desc" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                        Hold this physical volume's NFC tag near the back of your Android phone...
                      </p>

                      <div className="nfc-meta-box" style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '8px 12px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Target Volume ID:</span>
                        <code style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 'bold' }}>{book.ntagUid}</code>
                      </div>

                      {nfcError && (
                        <div className="nfc-error-message royal-card" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px', border: '1px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)', color: '#ff7b72', marginBottom: '16px', fontSize: '0.75rem', textAlign: 'left', width: '100%' }}>
                          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{nfcError}</span>
                        </div>
                      )}

                      <div className="nfc-actions-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
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
            )}

            {/* Inline Fallback Request Ledger Submission Panel */}
            {fallbackModalOpen && (
              <div className="inline-action-panel royal-card border-gold animate-fade-in" style={{ marginTop: '16px', padding: '20px', background: 'rgba(20, 16, 12, 0.6)', backdropFilter: 'blur(12px)' }}>
                <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '10px' }}>
                  <h4 style={{ color: 'var(--accent)', fontSize: '1rem', fontWeight: '600', margin: 0, letterSpacing: '0.05em' }}>
                    {nfcActionType === 'checkout' ? 'Manual Checkout Request' : 'Manual Return Request'}
                  </h4>
                  <button onClick={() => setFallbackModalOpen(false)} className="close-nfc-btn" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px' }}>
                    <X size={16} />
                  </button>
                </div>

                <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {fallbackSuccess ? (
                    <div className="nfc-success-animation animate-fade-in" style={{ padding: '10px 0' }}>
                      <CheckCircle size={48} className="gold-glow-icon" style={{ color: 'var(--success)', marginBottom: '12px' }} />
                      <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1rem' }}>Scribe Request Saved</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Your circulation request has been submitted to the Curator's ledger.</p>
                    </div>
                  ) : (
                    <>
                      <p className="fallback-explanation" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0', textAlign: 'left' }}>
                        {nfcActionType === 'checkout'
                          ? "As physical NFC validation is unavailable, submit a digital checkout request. A Curator will verify copy availability and authorize your checkout manual sweep."
                          : "Submit a physical volume return record. A Curator will review your checkout status and confirm receipt of this masterwork inside the Salon."}
                      </p>

                      <div className="fallback-form-summary royal-card" style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', textAlign: 'left', width: '100%', marginBottom: '16px' }}>
                        <h5 style={{ color: 'var(--accent)', fontWeight: '600', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volume Details</h5>
                        <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{book.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>ISBN: {book.isbn}</p>
                      </div>

                      <div className="fallback-actions-row" style={{ display: 'flex', gap: '12px', width: '100%' }}>
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
                          {fallbackLoading ? <RefreshCw className="spin-icon" size={12} /> : <CheckCircle size={12} />}
                          {fallbackLoading ? 'Submitting...' : 'Submit Request'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="detail-reviews-section royal-card">
        <h3 className="section-title">Patron Dissertations & Reviews</h3>
        {user ? (
          <form onSubmit={handleSubmitReview} className="write-review-form">
            <div className="review-rating-select">
              <span>Your Sovereign Rating:</span>
              <div className="star-rating-inputs">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setUserRating(star)}
                    className="star-input-btn"
                  >
                    <Star size={20} fill={star <= userRating ? 'var(--accent)' : 'none'} stroke="var(--accent)" />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="royal-textarea review-textarea"
              placeholder="Contribute your intellectual critique to the salon..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              required
            />
            <button type="submit" className="royal-btn submit-review-btn">
              Publish Dissertation
            </button>
          </form>
        ) : (
          <div className="review-prompt-card">
            <p>Please enter the Royal Salon to contribute your literary critiques and reviews.</p>
          </div>
        )}

        <div className="reviews-feed">
          {reviews.length > 0 ? (
            reviews.map((rev) => (
              <div key={rev.id} className="review-item">
                <div className="review-item-header">
                  <span className="review-author">{rev.author}</span>
                  <span className="review-date">
                    {rev.createdAt
                      ? new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Recently'}
                  </span>
                </div>
                <div className="review-stars-row">
                  {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                    <Star key={i} size={14} fill="var(--accent)" stroke="var(--accent)" />
                  ))}
                </div>
                <p className="review-content">"{rev.content}"</p>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
              No critiques have been published on this volume yet. Scribe the very first dissertation!
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BookDetailPage;
