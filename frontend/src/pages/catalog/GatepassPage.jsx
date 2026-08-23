import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, CheckCircle, Calendar, User, Bookmark, Sparkles, Shield, ArrowLeft, BookOpen, Clock, Activity, FileText } from 'lucide-react';
import { fetchCheckoutById, fetchBookByIsbn, fetchCheckouts, fetchBooks, fetchCheckoutsByMember } from '../../services/libraryApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './GatepassPage.css';
const GatepassPage = ({
  user
}) => {
  const {
    checkoutId
  } = useParams();
  const {
    t
  } = useLanguage();
  const [checkout, setCheckout] = useState(null);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Consolidated ledger state
  const [isLedgerMode, setIsLedgerMode] = useState(false);
  const [ledgerCheckouts, setLedgerCheckouts] = useState([]);
  const [booksMap, setBooksMap] = useState({});
  const [ledgerTab, setLedgerTab] = useState('transits'); // 'transits' or 'sync'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  useEffect(() => {
    const loadGatepassData = async () => {
      try {
        setLoading(true);
        setError('');
        if (checkoutId) {
          setIsLedgerMode(false);
          const checkoutData = await fetchCheckoutById(checkoutId);
          if (checkoutData) {
            const isUserAdmin = user?.role === 'ADMIN';
            const isOwner = user && checkoutData.memberId === (user.uid || user.id);
            if (!isUserAdmin && !isOwner) {
              setError("Access Denied: You do not have the required security credentials to view this transit ledger record.");
              setLoading(false);
              return;
            }
          }
          setCheckout(checkoutData);
          if (checkoutData && checkoutData.bookId) {
            const bookData = await fetchBookByIsbn(checkoutData.bookId);
            setBook(bookData);
          }
        } else {
          setIsLedgerMode(true);
          if (!user) {
            setError("Please sign in to view your secure gatepass ledger.");
            setLoading(false);
            return;
          }
          const [checkoutsRes, booksData] = await Promise.all([fetchCheckoutsByMember(user.uid || user.id), fetchBooks()]);
          setLedgerCheckouts(checkoutsRes || []);
          const bMap = {};
          if (Array.isArray(booksData)) {
            booksData.forEach(b => {
              bMap[b.isbn] = b;
            });
          }
          setBooksMap(bMap);
        }
      } catch (err) {
        console.error("Error loading gatepass/ledger:", err);
        setError(checkoutId ? "Unable to retrieve security gatepass ledger details." : "Unable to retrieve consolidated gatepass ledger.");
      } finally {
        setLoading(false);
      }
    };
    loadGatepassData();
  }, [checkoutId, user]);
  const handlePrint = () => {
    window.print();
  };
  const formattedDate = inst => {
    if (!inst) return "N/A";
    return new Date(inst).toLocaleString();
  };
  if (loading) {
    return <div className="gatepass-loading-container">
        <div className="royal-spinner"></div>
        <p>{t('gatepass.retrieving', 'Retrieving secure digital ledger gatepass...')}</p>
      </div>;
  }
  if (error) {
    return <div className="gatepass-error-container">
        <div className="error-card">
          <h2>{t('gatepass.accessDenied', 'Access Denied')}</h2>
          <p>{error}</p>
          <Link to="/catalog" className="royal-btn">
            <ArrowLeft size={16} /> {t('common.returnToStudy', 'Return to Study')}
          </Link>
        </div>
      </div>;
  }

  // --- RENDERING CONSOLIDATED LEDGER ---
  if (isLedgerMode) {
    const filterByTime = itemDate => {
      if (!itemDate) return false;
      const d = new Date(itemDate);
      const now = new Date();
      if (timeFilter === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (timeFilter === 'week') {
        const diffMs = now - d;
        return diffMs <= 7 * 24 * 60 * 60 * 1000;
      }
      if (timeFilter === 'month') {
        const diffMs = now - d;
        return diffMs <= 30 * 24 * 60 * 60 * 1000;
      }
      return true; // 'all'
    };
    const activeCheckouts = ledgerCheckouts.filter(c => c.status !== 'RETURNED' && c.status !== 'REJECTED').filter(c => filterByTime(c.checkedOutAt || c.createdAt)).sort((a, b) => new Date(b.checkedOutAt || b.createdAt) - new Date(a.checkedOutAt || a.createdAt));
    const returnedCheckouts = ledgerCheckouts.filter(c => c.status === 'RETURNED').filter(c => filterByTime(c.returnedAt || c.updatedAt)).sort((a, b) => new Date(b.returnedAt || b.updatedAt) - new Date(a.returnedAt || a.updatedAt));

    // Dynamic mapping to keep both checkout and return timestamps dynamically in sync for each active book
    const bookSyncMap = {};
    ledgerCheckouts.forEach(c => {
      const bId = c.bookId;
      if (!bookSyncMap[bId]) {
        bookSyncMap[bId] = {
          bookId: bId,
          latestCheckout: null,
          latestReturn: null,
          status: 'AVAILABLE'
        };
      }
      const checkoutTime = c.checkedOutAt ? new Date(c.checkedOutAt) : new Date(c.createdAt);
      const returnTime = c.returnedAt ? new Date(c.returnedAt) : c.updatedAt ? new Date(c.updatedAt) : null;
      if (c.status === 'RETURNED') {
        if (!bookSyncMap[bId].latestReturn || returnTime > new Date(bookSyncMap[bId].latestReturn.returnedAt)) {
          bookSyncMap[bId].latestReturn = c;
        }
      } else if (c.status !== 'REJECTED') {
        if (!bookSyncMap[bId].latestCheckout || checkoutTime > new Date(bookSyncMap[bId].latestCheckout.checkedOutAt)) {
          bookSyncMap[bId].latestCheckout = c;
        }
        if (c.status === 'CHECKED_OUT' || c.status === 'REQUESTED_RETURN') {
          bookSyncMap[bId].status = c.status;
          bookSyncMap[bId].activeCheckoutId = c.id;
        }
      }
    });
    const syncedBooksList = Object.values(bookSyncMap).map(item => {
      const bDetail = booksMap[item.bookId] || {
        title: `Volume ${item.bookId}`,
        isbn: item.bookId,
        authors: 'Unknown'
      };
      return {
        ...item,
        ...bDetail
      };
    });
    return <div className="gatepass-outer-wrapper consolidated-ledger-container animate-fade-in">
        <div className="ledger-main-header">
          <div className="header-meta">
            <Shield className="header-shield" size={32} />
            <div>
              <h1>{t('gatepass.consolidatedLedger', 'Consolidated Gatepass Ledger')}</h1>
              <p className="subtitle">{t('gatepass.securityClearance', 'Security Clearance & Volume Transit Registry')}</p>
            </div>
          </div>
          <div className="ledger-tabs no-print">
            <button className={`ledger-tab-btn ${ledgerTab === 'transits' ? 'active' : ''}`} onClick={() => setLedgerTab('transits')}>
              <Activity size={14} /> {t('gatepass.dailyTransits', 'Daily Transits')}
            </button>
            <button className={`ledger-tab-btn ${ledgerTab === 'sync' ? 'active' : ''}`} onClick={() => setLedgerTab('sync')}>
              <Clock size={14} /> {t('gatepass.bookRegistrySync', 'Book Registry Sync')}
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="ledger-stats-strip">
          <div className="stat-panel active-transits">
            <span className="stat-label">{t('gatepass.activeTransits', 'Active Transits')}</span>
            <span className="stat-value">{activeCheckouts.length}</span>
          </div>
          <div className="stat-panel restored-vols">
            <span className="stat-label">{t('gatepass.restoredToStudy', 'Restored to Study')}</span>
            <span className="stat-value">{returnedCheckouts.length}</span>
          </div>
        </div>

        {/* Segmented Chronological Filter Controls */}
        {ledgerTab === 'transits' && <div className="time-filter-segmented-control no-print" style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '24px',
        gap: '8px'
      }}>
            {[{
          id: 'all',
          label: 'All Time'
        }, {
          id: 'today',
          label: 'Today'
        }, {
          id: 'week',
          label: 'Last 1 Week'
        }, {
          id: 'month',
          label: 'Last 1 Month'
        }].map(f => <button key={f.id} onClick={() => setTimeFilter(f.id)} className={`royal-btn-secondary ${timeFilter === f.id ? 'active-time-filter' : ''}`} style={{
          padding: '6px 16px',
          fontSize: '0.85rem',
          borderRadius: '20px',
          background: timeFilter === f.id ? 'var(--accent, #d4af37)' : 'transparent',
          color: timeFilter === f.id ? '#0f0c08' : 'var(--text-secondary)',
          border: `1px solid ${timeFilter === f.id ? 'var(--accent, #d4af37)' : 'var(--glass-border, rgba(212, 175, 55, 0.2))'}`,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: timeFilter === f.id ? '0 0 12px rgba(212, 175, 55, 0.4)' : 'none'
        }}>
                {f.label}
              </button>)}
          </div>}

        {ledgerTab === 'transits' ? <div className="ledger-grid-columns">
            {/* Active Checkouts Column */}
            <div className="ledger-col-pane">
              <h2 className="pane-title active-color">
                <span className="status-indicator active-dot"></span> {t("str_5392", "Active Sovereignties (")}{activeCheckouts.length})
              </h2>
              <div className="ledger-list-stack">
                {activeCheckouts.length === 0 ? <div className="empty-ledger-state">
                    <BookOpen size={24} />
                    <p>{t('auto_3502', 'No active transits recorded for this timeframe.')}</p>
                  </div> : activeCheckouts.map(c => {
              const b = booksMap[c.bookId] || {};
              return <div key={c.id} className="ledger-card-item">
                        <img src={b.coverImage || b.coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400"} alt={b.title} className="ledger-thumb" />
                        <div className="ledger-item-info">
                          <h3>{b.title || c.bookId}</h3>
                          <p className="author">{t("str_5393", "by")} {b.authors || 'Unknown'}</p>
                          <div className="txn-details">
                            <p><strong>{t("str_5394", "Scholar:")}</strong> {c.memberName || user?.displayName || 'Verified Scholar'}</p>
                            <p><strong>{t("str_5395", "Checked Out:")}</strong> {formattedDate(c.checkedOutAt)}</p>
                          </div>
                          <div className="card-actions no-print">
                            <Link to={`/gatepass/${c.id}`} className="royal-btn-secondary gatepass-mini-btn">
                              {t('auto_3503', 'View Gatepass')}
                            </Link>
                          </div>
                        </div>
                      </div>;
            })}
              </div>
            </div>

            {/* Restored Columns */}
            <div className="ledger-col-pane">
              <h2 className="pane-title restored-color">
                <span className="status-indicator restored-dot"></span> {t("str_5396", "Restored & Sealed (")}{returnedCheckouts.length})
              </h2>
              <div className="ledger-list-stack">
                {returnedCheckouts.length === 0 ? <div className="empty-ledger-state">
                    <CheckCircle size={24} />
                    <p>{t('auto_3504', 'No books restored to the Study today.')}</p>
                  </div> : returnedCheckouts.map(c => {
              const b = booksMap[c.bookId] || {};
              return <div key={c.id} className="ledger-card-item returned-item">
                        <img src={b.coverImage || b.coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400"} alt={b.title} className="ledger-thumb" />
                        <div className="ledger-item-info">
                          <h3>{b.title || c.bookId}</h3>
                          <p className="author">{t("str_5397", "by")} {b.authors || 'Unknown'}</p>
                          <div className="txn-details">
                            <p><strong>{t("str_5398", "Scholar:")}</strong> {c.memberName || user?.displayName || 'Verified Scholar'}</p>
                            <p><strong>{t("str_5399", "Restored:")}</strong> {formattedDate(c.returnedAt)}</p>
                          </div>
                          <div className="card-actions no-print">
                            <Link to={`/gatepass/${c.id}`} className="royal-btn-secondary gatepass-mini-btn">
                              {t('auto_3505', 'View Gatepass')}
                            </Link>
                          </div>
                        </div>
                      </div>;
            })}
              </div>
            </div>
          </div> : (/* Book Registry Sync View (Book-Centric Timestamps Sync) */
      <div className="ledger-sync-view">
            <h2 className="pane-title sync-header-title">
              <Sparkles size={16} /> {t('auto_3506', 'Volume Timestamp Synchronization Registry')}
            </h2>
            <div className="sync-table-container">
              <table className="sync-ledger-table">
                <thead>
                  <tr>
                    <th>{t('auto_3507', 'Volume Details')}</th>
                    <th>{t('auto_3508', 'Status')}</th>
                    <th>{t('auto_3509', 'Latest Outflow')}</th>
                    <th>{t('auto_3510', 'Latest Restoration')}</th>
                    <th className="no-print">{t('auto_3511', 'Clearance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {syncedBooksList.length === 0 ? <tr>
                      <td colSpan="5" style={{
                  textAlign: 'center',
                  padding: '30px'
                }}>
                        {t('auto_3512', 'No volume activities found in the ledger.')}
                      </td>
                    </tr> : syncedBooksList.map(item => <tr key={item.bookId}>
                        <td>
                          <div className="table-book-meta">
                            <img src={item.coverImage || item.coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400"} alt={item.title} className="table-book-thumb" />
                            <div>
                              <div className="table-title">{item.title}</div>
                              <div className="table-isbn">{t("str_5400", "ISBN:")} {item.isbn}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`sync-status-badge ${item.status === 'CHECKED_OUT' ? 'status-out' : item.status === 'REQUESTED_RETURN' ? 'status-verifying' : 'status-in'}`}>
                            {item.status === 'CHECKED_OUT' ? 'Checked Out' : item.status === 'REQUESTED_RETURN' ? 'Verifying Return' : 'In Study'}
                          </span>
                        </td>
                        <td className="time-col">
                          {item.latestCheckout ? <div className="time-cell">
                              <span className="time-val">{formattedDate(item.latestCheckout.checkedOutAt)}</span>
                              <span className="member-val">{t("str_5401", "by")} {item.latestCheckout.memberName || user?.displayName || 'Verified Scholar'}</span>
                            </div> : <span className="not-avail">-</span>}
                        </td>
                        <td className="time-col">
                          {item.latestReturn ? <div className="time-cell">
                              <span className="time-val">{formattedDate(item.latestReturn.returnedAt)}</span>
                              <span className="member-val">{t("str_5402", "by")} {item.latestReturn.memberName || user?.displayName || 'Verified Scholar'}</span>
                            </div> : <span className="not-avail">-</span>}
                        </td>
                        <td className="no-print">
                          {item.status !== 'AVAILABLE' && item.activeCheckoutId && <Link to={`/gatepass/${item.activeCheckoutId}`} className="sync-view-gatepass-link">
                              {t('auto_3513', 'View Gatepass')}
                            </Link>}
                        </td>
                      </tr>)}
                </tbody>
              </table>
            </div>
          </div>)}
      </div>;
  }

  // --- RENDERING SINGLE GATEPASS ---
  const isReturned = checkout.status === 'RETURNED' || checkout.status === 'REQUESTED_RETURN';
  const isPendingApproval = checkout.status === 'REQUESTED_CHECKOUT';
  return <div className="gatepass-outer-wrapper animate-fade-in">
      <div className="gatepass-actions-header no-print">
        <Link to="/profile" className="back-link">
          <ArrowLeft size={16} /> {t('auto_3514', 'Back to Profile Ledger')}
        </Link>
        <button onClick={handlePrint} className="royal-btn print-action-btn">
          <Printer size={16} /> {t('auto_3515', 'Print Gatepass')}
        </button>
      </div>

      <div className="gatepass-card-container printable-gatepass">
        {isPendingApproval && <div className="gatepass-pending-warning-banner animate-fade-in" style={{
        background: 'rgba(212, 175, 55, 0.12)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
            <Clock className="gold-glow-icon animate-pulse" size={24} style={{
          color: '#d4af37'
        }} />
            <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          textAlign: 'left'
        }}>
              <span style={{
            fontSize: '0.9rem',
            fontWeight: '700',
            color: '#d4af37',
            fontFamily: '"Outfit", sans-serif',
            letterSpacing: '0.5px'
          }}>
                {t('auto_3516', 'PENDING ADMINISTRATIVE APPROVAL')}
              </span>
              <span style={{
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
                {t('auto_3517', 'PROVISIONAL GATEPASS — SECURE EXIT CLEARANCE IS NOT ACTIVE')}
              </span>
            </div>
          </div>}
        {/* Holographic header decorative element */}
        <div className="gatepass-hologram-seal" style={isPendingApproval ? {
        borderColor: 'rgba(212, 175, 55, 0.4)',
        background: 'rgba(212, 175, 55, 0.05)',
        color: '#d4af37'
      } : {}}>
          {isPendingApproval ? <Clock size={12} className="seal-icon" style={{
          animation: 'spin 12s linear infinite'
        }} /> : <Sparkles className="seal-icon" />}
          <span>{isPendingApproval ? "PENDING CLEARANCE" : "VERIFIED SECURE"}</span>
        </div>

        <div className="gatepass-card-inner">
          <div className="gatepass-header">
            <Shield className="header-badge" />
            <div className="header-titles">
              <h1>{t('auto_3518', 'The Royal Book Club')}</h1>
              <h2>{t('auto_3519', 'OFFICIAL DIGITAL GATEPASS')}</h2>
              <span className="serial-num">{t("str_5403", "TXN ID:")} {checkout.id}</span>
            </div>
          </div>

          <div className="gatepass-divider"></div>

          <div className="gatepass-content">
            {book && <div className="gatepass-book-preview">
                <img src={book.coverImage || book.coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400"} alt={book.title} className="gatepass-book-cover" />
                <div className="gatepass-book-details">
                  <h3>{book.title}</h3>
                  <p className="author-line">{t("str_5404", "by")} {book.authors}</p>
                  <p className="isbn-line">{t("str_5405", "ISBN:")} {book.isbn}</p>
                  {checkout.ntagUid && <span className="ntag-badge">{t("str_5406", "NTAG213 SECURED:")} {checkout.ntagUid}</span>}
                </div>
              </div>}

            <div className="gatepass-divider"></div>

            <div className="gatepass-transaction-details">
              <div className="detail-item">
                <User size={16} className="detail-icon" />
                <div className="detail-info">
                  <span className="detail-label">{t('gatepass.scholarName', 'Scholar Name')}</span>
                  <span className="detail-value">{checkout.memberName || user?.displayName || "Verified Member"}</span>
                </div>
              </div>

              <div className="detail-item">
                <Bookmark size={16} className="detail-icon" />
                <div className="detail-info">
                  <span className="detail-label">{t('gatepass.scholarEmail', 'Scholar Email')}</span>
                  <span className="detail-value">{checkout.memberEmail || "N/A"}</span>
                </div>
              </div>

              <div className="detail-item">
                <Calendar size={16} className="detail-icon" />
                <div className="detail-info">
                  <span className="detail-label">{isPendingApproval ? t('gatepass.requestDate', 'Request Date') : t('gatepass.checkoutDate', 'Checkout Date')}</span>
                  <span className="detail-value">{formattedDate(isPendingApproval ? checkout.requestedAt : checkout.checkedOutAt)}</span>
                </div>
              </div>

              <div className="detail-item">
                <Calendar size={16} className="detail-icon" />
                <div className="detail-info">
                  <span className="detail-label">{t('gatepass.dueDate', 'Due Date')}</span>
                  <span className={`detail-value ${!isReturned && !isPendingApproval ? 'due-alert' : ''}`} style={isPendingApproval ? {
                  color: 'var(--text-muted)',
                  fontStyle: 'italic'
                } : {}}>
                    {isPendingApproval ? t('gatepass.pendingApproval', 'Pending Approval') : isReturned ? formattedDate(checkout.returnedAt) : formattedDate(checkout.dueDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="gatepass-divider"></div>

            <div className="gatepass-security-status">
              <div className={`status-stamp ${isReturned ? 'returned-stamp' : isPendingApproval ? 'pending-stamp' : 'approved-stamp'}`}>
                {isPendingApproval ? <Clock size={20} style={{
                animation: 'pulse 2s infinite'
              }} /> : <CheckCircle size={20} />}
                <span>{checkout.status === 'RETURNED' ? "RETURNED & CLOSED" : checkout.status === 'REQUESTED_RETURN' ? "PENDING RETURN VERIFICATION" : isPendingApproval ? "PENDING ADMIN APPROVAL" : "APPROVED LEAVE REALM"}</span>
              </div>
            </div>

            <div className="gatepass-barcode-container">
              <div className="barcode-bars">
                {Array.from({
                length: 35
              }).map((_, idx) => <div key={idx} className="barcode-bar" style={{
                width: `${idx % 3 === 0 ? 3 : idx % 2 === 0 ? 1 : 2}px`,
                marginRight: `${idx % 4 === 0 ? 2 : 1}px`
              }} />)}
              </div>
              <span className="barcode-text">*{checkoutId}*</span>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default GatepassPage;