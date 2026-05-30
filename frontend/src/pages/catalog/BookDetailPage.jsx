import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Star, ArrowLeft, BadgeCheck, ShoppingBag, CheckCircle, Clock } from 'lucide-react';
import { fetchBookByIsbn, checkoutBook } from '../../services/libraryApi';
import './BookDetailPage.css';

const BookDetailPage = ({ user }) => {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [checkoutStatus, setCheckoutStatus] = useState('available');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState([
    { id: 1, author: 'Archduke of Prose', content: 'An absolute masterpiece of gothic literature. The duality of human nature is painted with haunting elegance.', rating: 5, date: 'May 10, 2026' },
    { id: 2, author: 'Lady Chesterfield', content: 'Oscar Wilde’s lyrical style remains unparalleled. A stunning addition to our Royal salon collection.', rating: 5, date: 'May 18, 2026' }
  ]);
  const [userRating, setUserRating] = useState(5);

  useEffect(() => {
    const loadBook = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetched = await fetchBookByIsbn(id);
        setBook(fetched);
        setCheckoutStatus(fetched.availableCopies > 0 ? 'available' : 'checked-out');
      } catch (err) {
        setError('Unable to load book details from the Royal catalog.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadBook();
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

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    const newReview = {
      id: Date.now(),
      author: user?.displayName || 'Royal Patron',
      content: reviewText,
      rating: userRating,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    setReviews([newReview, ...reviews]);
    setReviewText('');
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
          {reviews.map((rev) => (
            <div key={rev.id} className="review-item">
              <div className="review-item-header">
                <span className="review-author">{rev.author}</span>
                <span className="review-date">{rev.date}</span>
              </div>
              <div className="review-stars-row">
                {Array.from({ length: rev.rating }).map((_, i) => (
                  <Star key={i} size={14} fill="var(--accent)" stroke="var(--accent)" />
                ))}
              </div>
              <p className="review-content">"{rev.content}"</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BookDetailPage;
