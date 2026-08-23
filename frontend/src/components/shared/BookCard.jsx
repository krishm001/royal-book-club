import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './BookCard.css';
const BookCard = ({
  book = {},
  user,
  resolvedStatus,
  onCheckoutClick,
  onReturnClick
}) => {
  const {
    t
  } = useLanguage();
  const [checkoutStatus, setCheckoutStatus] = useState(resolvedStatus || (book.availableCopies > 0 ? 'available' : 'checked-out-by-other'));
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
  return <div className={`royal-card book-card ${checkoutStatus === 'checked-out' ? 'checked-out-card' : ''}`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} id={`book-card-${bookId}`}>
      <Link to={`/catalog/${encodeURIComponent(bookId)}`} className="book-card-link">
        <div className="book-cover-container">
          {book.ntagUid && <div className="book-nfc-badge" title={`NFC Pass Assigned: ${book.ntagUid}`} style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          background: 'var(--genre-tag-bg)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--genre-tag-border)',
          color: 'var(--genre-tag-color)',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: "0 4px 10px var(--card-shadow)",
          pointerEvents: 'auto',
          transition: 'all 0.3s ease'
        }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
              </svg>
            </div>}
          <img src={coverUrl} alt={`Cover of ${book.title}`} className="book-cover-img" loading="lazy" />
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
              
              {checkoutStatus === 'available' && t('catalog.inLibrary')}
              {checkoutStatus === 'checked-out' && t('catalog.inYourStudy')}
              {checkoutStatus === 'requested-checkout' && t('catalog.pendingCheckout')}
              {checkoutStatus === 'requested-return' && t('catalog.pendingReturn')}
              {checkoutStatus === 'checked-out-by-other' && t('catalog.inCirculation')}
            </span>
          </div>

          <h3 className="book-title glow-text">{book.title || 'Untitled Volume'}</h3>
          <p className="book-author">{t('common.by')} {author}</p>
          <p className="book-short-description">{book.description || book.subtitle || 'A fine addition to the Royal Library catalog.'}</p>
        </div>
      </Link>

      <div className="book-card-action">
        {checkoutStatus === 'available' ? onCheckoutClick ? <button onClick={() => onCheckoutClick(book)} className="royal-btn book-checkout-btn" id={`checkout-btn-${bookId}`}>
              <ShoppingBag size={14} style={{
          marginRight: '6px'
        }} /> {t('catalog.checkoutBtnLabel')}
            </button> : <Link to={`/catalog/${encodeURIComponent(bookId)}`} className="royal-btn book-checkout-btn" id={`checkout-btn-${bookId}`}>
              <ShoppingBag size={14} style={{
          marginRight: '6px'
        }} /> {t('catalog.checkoutBtnLabel')}
            </Link> : checkoutStatus === 'checked-out' ? onReturnClick ? <button onClick={() => onReturnClick(book)} className="royal-btn book-checkout-btn return-action-btn" id={`return-btn-${bookId}`} style={{
        background: 'transparent',
        border: '1px solid var(--accent)',
        color: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
              {t('catalog.returnVolumeOnly')}
            </button> : <Link to={`/catalog/${encodeURIComponent(bookId)}?action=return`} className="royal-btn book-checkout-btn return-action-btn" id={`return-btn-${bookId}`} style={{
        background: 'transparent',
        border: '1px solid var(--accent)',
        color: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none'
      }}>
              {t('catalog.returnVolumeOnly')}
            </Link> : checkoutStatus === 'requested-checkout' ? <button className="royal-btn-disabled book-checkout-btn" disabled style={{
        opacity: 0.6,
        cursor: 'not-allowed'
      }}>
            {t('catalog.pendingCheckout')}
          </button> : checkoutStatus === 'requested-return' ? <button className="royal-btn-disabled book-checkout-btn" disabled style={{
        opacity: 0.6,
        cursor: 'not-allowed'
      }}>
            {t('catalog.pendingReturn')}
          </button> : <button className="borrowed-indicator-btn" disabled id={`borrowed-btn-${bookId}`}>
            {t('catalog.inCirculation')}
          </button>}
      </div>
    </div>;
};
export default BookCard;