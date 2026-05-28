import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Star, ArrowLeft, ShieldAlert, BadgeCheck, Compass, ShoppingBag, CheckCircle, Clock } from 'lucide-react';
import './BookDetailPage.css';

const BookDetailPage = ({ user }) => {
  const { id } = useParams();
  const [checkoutStatus, setCheckoutStatus] = useState('available'); // available, checking-out, checked-out
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState([
    { id: 1, author: 'Archduke of Prose', content: 'An absolute masterpiece of gothic literature. The duality of human nature is painted with haunting elegance.', rating: 5, date: 'May 10, 2026' },
    { id: 2, author: 'Lady Chesterfield', content: 'Oscar Wilde’s lyrical style remains unparalleled. A stunning addition to our Royal salon collection.', rating: 5, date: 'May 18, 2026' }
  ]);
  const [userRating, setUserRating] = useState(5);

  // Fallback book search
  const books = [
    {
      id: 'book-1',
      title: 'The Picture of Dorian Gray',
      author: 'Oscar Wilde',
      genre: 'Classic Gothic',
      rating: 4.9,
      availability: 'available',
      coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
      description: 'Oscar Wilde’s only novel is the fashionable salon sensation of its age, tracing the brilliant, aesthetic descent of a young aristocrat who remains ever youthful while his portrait bears the sins of his hedonistic soul.',
      publisher: 'Lippincott\'s Monthly Magazine',
      publishYear: 1890,
      isbn: '9780141439570',
      totalCopies: 3,
      availableCopies: 3,
      citation: '"To define is to limit." — Lord Henry Wotton',
      extendedDetails: 'This gorgeous edition is bound in dark navy leather with gold gilding, fitting for our sovereign patrons. It includes critical essays and early reviews from the 1890 publication.'
    },
    {
      id: 'book-2',
      title: 'Frankenstein',
      author: 'Mary Shelley',
      genre: 'Gothic Fiction',
      rating: 4.8,
      availability: 'available',
      coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80',
      description: 'The sublime and horrifying tale of Victor Frankenstein and the sentient creature he brings to life in his quest to conquer mortality.',
      publisher: 'Lackington, Hughes, Harding, Mavor, & Jones',
      publishYear: 1818,
      isbn: '9780141439471',
      totalCopies: 2,
      availableCopies: 2,
      citation: '"Beware; for I am fearless, and therefore powerful." — The Monster',
      extendedDetails: 'Written during a rainy summer in Switzerland, Frankenstein explores isolation, the limits of science, and what it truly means to be human.'
    },
    {
      id: 'book-3',
      title: 'The Divine Comedy',
      author: 'Dante Alighieri',
      genre: 'Epic Poetry',
      rating: 5.0,
      availability: 'checked-out',
      coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
      description: 'An architectural epic detailing the soul\'s journey through Inferno, Purgatorio, and finally into the glorious light of Paradiso.',
      publisher: 'John John',
      publishYear: 1320,
      isbn: '9780140448955',
      totalCopies: 1,
      availableCopies: 0,
      citation: '"Abandon all hope, ye who enter here." — Inferno, Canto III',
      extendedDetails: 'A beautiful three-volume bilingual translation with classic engravings that guide the reader through the depths of medieval theology and cosmology.'
    }
  ];

  const book = books.find(b => b.id === id) || books[0];

  const handleCheckout = () => {
    if (checkoutStatus !== 'available') return;
    setCheckoutStatus('checking-out');
    setTimeout(() => {
      setCheckoutStatus('checked-out');
    }, 1500);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    const newReview = {
      id: Date.now(),
      author: user?.displayName || 'Royal Patron',
      content: reviewText,
      rating: userRating,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    setReviews([newReview, ...reviews]);
    setReviewText('');
  };

  return (
    <div className="book-detail-container animate-fade-in">
      {/* Back button */}
      <Link to="/catalog" className="back-link">
        <ArrowLeft size={16} /> Return to Archives
      </Link>

      <div className="book-detail-grid">
        {/* Left Side - Visual Cover Panel */}
        <div className="book-cover-panel">
          <div className="cover-frame royal-card">
            <img src={book.coverUrl} alt={book.title} className="detail-cover-img" />
            <div className="gold-bookmark-spine"></div>
          </div>
          {book.citation && (
            <blockquote className="detail-citation-blockquote">
              {book.citation}
            </blockquote>
          )}
        </div>

        {/* Right Side - Information Panel */}
        <div className="book-info-panel royal-card">
          <div className="genre-rating-row">
            <span className="detail-genre-tag">{book.genre}</span>
            <div className="detail-stars">
              <Star size={16} fill="var(--accent)" stroke="var(--accent)" />
              <span className="rating-num">{book.rating} / 5.0</span>
            </div>
          </div>

          <h1 className="detail-book-title glow-text">{book.title}</h1>
          <h2 className="detail-book-author">by <span className="gold-gradient-text">{book.author}</span></h2>

          <div className="metadata-spec-grid">
            <div className="spec-item">
              <span className="spec-label">ISBN-13</span>
              <span className="spec-value">{book.isbn}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Chronology</span>
              <span className="spec-value">{book.publishYear}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Publisher</span>
              <span className="spec-value">{book.publisher}</span>
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
            <p>{book.description}</p>
            {book.extendedDetails && <p className="extended-desc">{book.extendedDetails}</p>}
          </div>

          {/* Checkout CTA */}
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
                  <p>A simulated hardware smart key has been emitted to your terminal. Enjoy reading.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Section */}
      <section className="detail-reviews-section royal-card">
        <h3 className="section-title">Patron Dissertations & Reviews</h3>
        
        {/* Write a review */}
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
            ></textarea>
            <button type="submit" className="royal-btn submit-review-btn">
              Publish Dissertation
            </button>
          </form>
        ) : (
          <div className="review-prompt-card">
            <p>Please enter the Royal Salon to contribute your literary critiques and reviews.</p>
          </div>
        )}

        {/* Reviews Feed */}
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
