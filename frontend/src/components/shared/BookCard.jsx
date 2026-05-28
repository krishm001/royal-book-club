import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, Star, Bookmark, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import './BookCard.css';

const BookCard = ({ 
  book = {
    id: 'book-1',
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    genre: 'Classic Gothic',
    rating: 4.8,
    availability: 'available', // available, checked-out
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80',
    description: 'A philosophical novel that explores the themes of aestheticism, hedonism, and moral corruption.',
  },
  onCheckoutSuccess = () => {}
}) => {
  const [checkoutStatus, setCheckoutStatus] = useState(book.availability); // available, checking-out, checked-out
  const [isHovered, setIsHovered] = useState(false);

  const handleCheckout = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (checkoutStatus !== 'available') return;

    setCheckoutStatus('checking-out');

    // Simulate digital checkout API call
    setTimeout(() => {
      setCheckoutStatus('checked-out');
      onCheckoutSuccess(book);
    }, 1500);
  };

  return (
    <div 
      className={`royal-card book-card ${checkoutStatus === 'checked-out' ? 'checked-out-card' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id={`book-card-${book.id}`}
    >
      <Link to={`/catalog/${book.id}`} className="book-card-link">
        {/* Book Cover Container */}
        <div className="book-cover-container">
          <img 
            src={book.coverUrl} 
            alt={`Cover of ${book.title}`} 
            className="book-cover-img"
            loading="lazy"
          />
          <div className="book-cover-overlay">
            <span className="book-genre-tag">{book.genre}</span>
          </div>
          
          {/* Animated Gold Bookmark Spine */}
          <div className="book-spine-accent"></div>
        </div>

        {/* Book Details */}
        <div className="book-card-details">
          <div className="book-rating-row">
            <div className="book-stars">
              <Star size={14} fill="var(--accent)" stroke="var(--accent)" />
              <span className="rating-value">{book.rating}</span>
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

          <h3 className="book-title glow-text">{book.title}</h3>
          <p className="book-author">by {book.author}</p>
          <p className="book-short-description">{book.description}</p>
        </div>
      </Link>

      {/* Interactive Checkout Buttons */}
      <div className="book-card-action">
        {checkoutStatus === 'available' ? (
          <button 
            onClick={handleCheckout} 
            className="royal-btn book-checkout-btn"
            id={`checkout-btn-${book.id}`}
          >
            <ShoppingBag size={14} /> Checkout
          </button>
        ) : checkoutStatus === 'checking-out' ? (
          <button className="royal-btn-disabled book-checkout-btn" disabled>
            <div className="loader-mini"></div> Reserving...
          </button>
        ) : (
          <button className="borrowed-indicator-btn" disabled id={`borrowed-btn-${book.id}`}>
            <CheckCircle size={14} /> Digital Copy Issued
          </button>
        )}
      </div>
    </div>
  );
};

export default BookCard;
