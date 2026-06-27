import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle, ShoppingBag } from 'lucide-react';
import './BookCard.css';

const BookCard = ({
  book = {},
  user,
  resolvedStatus,
  onCheckoutClick,
  onReturnClick,
}) => {
  const [checkoutStatus, setCheckoutStatus] = useState(
    resolvedStatus || (book.availableCopies > 0 ? 'available' : 'checked-out-by-other')
  );
  const [isHovered, setIsHovered] = useState(false);
  const author = Array.isArray(book.authors) ? book.authors.join(', ') : book.author || 'Unknown Author';
  const bookId = book.isbn || book.id || ''; 

  useEffect(() => {
    if (resolvedStatus) {
      setCheckoutStatus(resolvedStatus);
    } else {
      setCheckoutStatus(book.availableCopies > 0 ? 'available' : 'checked-out-by-other');
    }
  }, [resolvedStatus, book.availableCopies]);

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
              {checkoutStatus === 'checked-out' && <span className="status-dot green"></span>}
              {checkoutStatus === 'requested-checkout' && <span className="status-dot pulse"></span>}
              {checkoutStatus === 'requested-return' && <span className="status-dot pulse"></span>}
              {checkoutStatus === 'checked-out-by-other' && <span className="status-dot red"></span>}
              
              {checkoutStatus === 'available' && 'In Salon'}
              {checkoutStatus === 'checked-out' && 'In Your Study'}
              {checkoutStatus === 'requested-checkout' && 'Pending Checkout'}
              {checkoutStatus === 'requested-return' && 'Pending Return'}
              {checkoutStatus === 'checked-out-by-other' && 'In Circulation'}
            </span>
          </div>

          <h3 className="book-title glow-text">{book.title || 'Untitled Volume'}</h3>
          <p className="book-author">by {author}</p>
          <p className="book-short-description">{book.description || book.subtitle || 'A fine addition to the Royal Library catalog.'}</p>
        </div>
      </Link>

      <div className="book-card-action">
        {checkoutStatus === 'available' ? (
          onCheckoutClick ? (
            <button
              onClick={() => onCheckoutClick(book)}
              className="royal-btn book-checkout-btn"
              id={`checkout-btn-${bookId}`}
            >
              <ShoppingBag size={14} style={{ marginRight: '6px' }} /> Checkout
            </button>
          ) : (
            <Link
              to={`/catalog/${encodeURIComponent(bookId)}`}
              className="royal-btn book-checkout-btn"
              id={`checkout-btn-${bookId}`}
            >
              <ShoppingBag size={14} style={{ marginRight: '6px' }} /> Checkout
            </Link>
          )
        ) : checkoutStatus === 'checked-out' ? (
          onReturnClick ? (
            <button
              onClick={() => onReturnClick(book)}
              className="royal-btn book-checkout-btn return-action-btn"
              id={`return-btn-${bookId}`}
              style={{ 
                background: 'transparent', 
                border: '1px solid var(--accent)', 
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Return Volume
            </button>
          ) : (
            <Link
              to={`/catalog/${encodeURIComponent(bookId)}?action=return`}
              className="royal-btn book-checkout-btn return-action-btn"
              id={`return-btn-${bookId}`}
              style={{ 
                background: 'transparent', 
                border: '1px solid var(--accent)', 
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none'
              }}
            >
              Return Volume
            </Link>
          )
        ) : checkoutStatus === 'requested-checkout' ? (
          <button className="royal-btn-disabled book-checkout-btn" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            Pending Checkout
          </button>
        ) : checkoutStatus === 'requested-return' ? (
          <button className="royal-btn-disabled book-checkout-btn" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            Pending Return
          </button>
        ) : (
          <button className="borrowed-indicator-btn" disabled id={`borrowed-btn-${bookId}`}>
            In Circulation
          </button>
        )}
      </div>
    </div>
  );
};

export default BookCard;
