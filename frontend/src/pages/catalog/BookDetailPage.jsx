import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Star, ArrowLeft, BadgeCheck, ShoppingBag, CheckCircle, Clock } from 'lucide-react';
import { fetchBookByIsbn, checkoutBook, fetchBookReviews, submitBookReview } from '../../services/libraryApi';
import './BookDetailPage.css';

const BookDetailPage = ({ user }) => {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [checkoutStatus, setCheckoutStatus] = useState('available');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState(5);

  useEffect(() => {
    const loadBookAndReviews = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetched = await fetchBookByIsbn(id);
        setBook(fetched);
        setCheckoutStatus(fetched.availableCopies > 0 ? 'available' : 'checked-out');
        
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
    if (book) {
      setCheckoutStatus(book.availableCopies > 0 ? 'available' : 'checked-out');
    }
  }, [book]);

  const handleCheckout = async () => {
    if (!user) {
      window.alert('Please sign in before checking out books.');
      return;
    }
    if (checkoutStatus !== 'available') return;

    setCheckoutStatus('checking-out');
    try {
      await checkoutBook(book.isbn, user.uid);
      setBook((current) => ({
        ...current,
        availableCopies: current.availableCopies > 0 ? current.availableCopies - 1 : 0,
      }));
      setCheckoutStatus('checked-out');
    } catch (err) {
      console.error(err);
      setCheckoutStatus(book.availableCopies > 0 ? 'available' : 'checked-out');
      setError('Unable to complete checkout at this time.');
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
              <button onClick={handleCheckout} className="royal-btn checkout-cta-btn" id="book-detail-checkout-btn">
                <ShoppingBag size={16} /> Secure Sovereign Checkout
              </button>
            ) : checkoutStatus === 'checking-out' ? (
              <button className="royal-btn-disabled checkout-cta-btn" disabled>
                <div className="loader-mini"></div> Confirming Royal Ledger...
              </button>
            ) : (
              <div className="success-checkout-badge">
                <CheckCircle size={20} className="success-icon" />
                <div>
                  <h4>Digital Checkout Authorized</h4>
                  <p>Your checkout has been recorded in the Firestore ledger.</p>
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
