import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle, ShoppingBag } from 'lucide-react';
import './BookCard.css';

const BookCard = ({
  book = {},
  user,
  onCheckout = async () => {},
}) => {
  const [checkoutStatus, setCheckoutStatus] = useState(
    book.availableCopies > 0 ? 'available' : 'checked-out'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const author = Array.isArray(book.authors) ? book.authors.join(', ') : book.author || 'Unknown Author';
  const bookId = book.isbn || book.id || ''; 

  useEffect(() => {
    setCheckoutStatus(book.availableCopies > 0 ? 'available' : 'checked-out');
  }, [book.availableCopies]);

  const handleCheckout = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (checkoutStatus !== 'available' || isProcessing) return;

    if (!user) {
      window.alert('Please enter the Royal Salon to checkout books.');
      return;
    }

    setIsProcessing(true);
    setCheckoutStatus('checking-out');

    try {
      await onCheckout(book);
      setCheckoutStatus('checked-out');
    } catch (error) {
      console.error('Checkout failed', error);
      setCheckoutStatus(book.availableCopies > 0 ? 'available' : 'checked-out');
      window.alert(error?.message || 'Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const coverUrl = book.coverUrl || book.thumbnail || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80';

  return (
    <div
      className={`royal-card book-card ${checkoutStatus === 'checked-out' ? 'checked-out-card' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id={`book-card-${bookId}`}
    >
      <Link to={`/catalog/${encodeURIComponent(bookId)}`} className="book-card-link">
        <div className="book-cover-container">
          <img
            src={coverUrl}
            alt={`Cover of ${book.title}`}
            className="book-cover-img"
            loading="lazy"
          />
          <div className="book-cover-overlay">
            <span className="book-genre-tag">{book.genre || book.publishDate || 'Library Edition'}</span>
          </div>
          <div className="book-spine-accent"></div>
        </div>

        <div className="book-card-details">
          <div className="book-rating-row">
            <div className="book-stars">
              <Star size={14} fill="var(--accent)" stroke="var(--accent)" />
              <span className="rating-value">{book.rating || '—'}</span>
            </div>
            <span className={`availability-badge ${checkoutStatus}`}>
              {checkoutStatus === 'available' && <span className="status-dot green"></span>}
              {checkoutStatus === 'checking-out' && <span className="status-dot pulse"></span>}
              {checkoutStatus === 'checked-out' && <span className="status-dot red"></span>}
              {checkoutStatus === 'available' && 'In Salon'}
              {checkoutStatus === 'checking-out' && 'Registering...'}
              {checkoutStatus === 'checked-out' && 'Borrowed'}
            </span>
          </div>

          <h3 className="book-title glow-text">{book.title || 'Untitled Volume'}</h3>
          <p className="book-author">by {author}</p>
          <p className="book-short-description">{book.description || book.subtitle || 'A fine addition to the Royal Library catalog.'}</p>
        </div>
      </Link>

      <div className="book-card-action">
        {checkoutStatus === 'available' ? (
          <button
            onClick={handleCheckout}
            className="royal-btn book-checkout-btn"
            id={`checkout-btn-${bookId}`}
            disabled={isProcessing}
          >
            <ShoppingBag size={14} /> {isProcessing ? 'Processing...' : 'Checkout'}
          </button>
        ) : checkoutStatus === 'checking-out' ? (
          <button className="royal-btn-disabled book-checkout-btn" disabled>
            <div className="loader-mini"></div> Reserving...
          </button>
        ) : (
          <button className="borrowed-indicator-btn" disabled id={`borrowed-btn-${bookId}`}>
            <CheckCircle size={14} /> Digital Copy Issued
          </button>
        )}
      </div>
    </div>
  );
};

export default BookCard;
