import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, CheckCircle, Calendar, User, Bookmark, Sparkles, Shield, ArrowLeft } from 'lucide-react';
import { fetchCheckoutById, fetchBookByIsbn } from '../../services/libraryApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './GatepassPage.css';

const GatepassPage = () => {
  const { checkoutId } = useParams();
  const { t } = useLanguage();
  const [checkout, setCheckout] = useState(null);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGatepassData = async () => {
      try {
        setLoading(true);
        const checkoutData = await fetchCheckoutById(checkoutId);
        setCheckout(checkoutData);

        if (checkoutData && checkoutData.bookId) {
          const bookData = await fetchBookByIsbn(checkoutData.bookId);
          setBook(bookData);
        }
      } catch (err) {
        console.error("Error loading gatepass:", err);
        setError("Unable to retrieve security gatepass ledger details.");
      } finally {
        setLoading(false);
      }
    };

    if (checkoutId) {
      loadGatepassData();
    }
  }, [checkoutId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="gatepass-loading-container">
        <div className="royal-spinner"></div>
        <p>Retrieving secure digital ledger gatepass...</p>
      </div>
    );
  }

  if (error || !checkout) {
    return (
      <div className="gatepass-error-container">
        <div className="error-card">
          <h2>Access Denied</h2>
          <p>{error || "Secure record not found."}</p>
          <Link to="/catalog" className="royal-btn">
            <ArrowLeft size={16} /> Return to Study
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = (inst) => {
    if (!inst) return "N/A";
    return new Date(inst).toLocaleString();
  };

  const isReturned = checkout.status === 'RETURNED' || checkout.status === 'REQUESTED_RETURN';

  return (
    <div className="gatepass-outer-wrapper">
      <div className="gatepass-actions-header no-print">
        <Link to="/profile" className="back-link">
          <ArrowLeft size={16} /> Back to Profile Ledger
        </Link>
        <button onClick={handlePrint} className="royal-btn print-action-btn">
          <Printer size={16} /> Print Gatepass
        </button>
      </div>

      <div className="gatepass-card-container printable-gatepass">
        {/* Holographic header decorative element */}
        <div className="gatepass-hologram-seal">
          <Sparkles className="seal-icon" />
          <span>VERIFIED SECURE</span>
        </div>

        <div className="gatepass-card-inner">
          <div className="gatepass-header">
            <Shield className="header-badge" />
            <div className="header-titles">
              <h1>The Royal Book Club</h1>
              <h2>OFFICIAL DIGITAL GATEPASS</h2>
              <span className="serial-num">TXN ID: {checkout.id}</span>
            </div>
          </div>

          <div className="gatepass-divider"></div>

          <div className="gatepass-content">
            {book && (
              <div className="gatepass-book-preview">
                <img 
                  src={book.coverImage || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400"} 
                  alt={book.title} 
                  className="gatepass-book-cover" 
                />
                <div className="gatepass-book-details">
                  <h3>{book.title}</h3>
                  <p className="author-line">by {book.authors}</p>
                  <p className="isbn-line">ISBN: {book.isbn}</p>
                  {checkout.ntagUid && (
                    <span className="ntag-badge">NTAG213 SECURED: {checkout.ntagUid}</span>
                  )}
                </div>
              </div>
            )}

            <div className="gatepass-divider"></div>

            <div className="gatepass-transaction-details">
              <div className="detail-item">
                <User size={16} className="detail-icon" />
                <div className="detail-info">
                  <span className="detail-label">Scholar Name</span>
                  <span className="detail-value">{checkout.memberName || "Verified Member"}</span>
                </div>
              </div>

              <div className="detail-item">
                <Bookmark size={16} className="detail-icon" />
                <div className="detail-info">
                  <span className="detail-label">Scholar Email</span>
                  <span className="detail-value">{checkout.memberEmail || "N/A"}</span>
                </div>
              </div>

              <div className="detail-item">
                <Calendar size={16} className="detail-icon" />
                <div className="detail-info">
                  <span className="detail-label">Checkout Date</span>
                  <span className="detail-value">{formattedDate(checkout.checkedOutAt)}</span>
                </div>
              </div>

              <div className="detail-item">
                <Calendar size={16} className="detail-icon" />
                <div className="detail-info">
                  <span className="detail-label">{isReturned ? "Returned Date" : "Due Date"}</span>
                  <span className={`detail-value ${!isReturned ? 'due-alert' : ''}`}>
                    {isReturned ? formattedDate(checkout.returnedAt) : formattedDate(checkout.dueDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="gatepass-divider"></div>

            <div className="gatepass-security-status">
              <div className={`status-stamp ${isReturned ? 'returned-stamp' : 'approved-stamp'}`}>
                <CheckCircle size={20} />
                <span>{checkout.status === 'RETURNED' ? "RETURNED & CLOSED" : checkout.status === 'REQUESTED_RETURN' ? "PENDING RETURN VERIFICATION" : "APPROVED LEAVE REALM"}</span>
              </div>
            </div>

            <div className="gatepass-barcode-container">
              <div className="barcode-bars">
                {Array.from({ length: 35 }).map((_, idx) => (
                  <div 
                    key={idx} 
                    className="barcode-bar" 
                    style={{ 
                      width: `${(idx % 3 === 0 ? 3 : idx % 2 === 0 ? 1 : 2)}px`,
                      marginRight: `${(idx % 4 === 0 ? 2 : 1)}px` 
                    }}
                  />
                ))}
              </div>
              <span className="barcode-text">*{checkoutId}*</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatepassPage;
