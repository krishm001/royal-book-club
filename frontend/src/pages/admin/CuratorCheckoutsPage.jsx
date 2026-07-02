import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Check, X, Clock, BookOpen, User, RefreshCw, Search, Filter, AlertCircle, CheckCircle, Smartphone, ArrowLeft, Phone, MapPin } from 'lucide-react';
import { fetchCheckouts, approveCheckout, rejectCheckout, approveReturn, fetchBooks, clearCheckout } from '../../services/libraryApi';
import { getAllUsers } from '../../services/userApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './CuratorCheckoutsPage.css';

export default function CuratorCheckoutsPage({ user }) {
  const { t } = useLanguage();
  const [checkouts, setCheckouts] = useState([]);
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PENDING', 'ACTIVE', 'RETURNED'
  const [showContactDetails, setShowContactDetails] = useState(false);

  // Access check
  const isAdmin = user && user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    try {
      const [checkoutsRes, booksData, usersRes] = await Promise.all([
        fetchCheckouts(),
        fetchBooks(),
        getAllUsers()
      ]);

      setCheckouts(checkoutsRes || []);
      setBooks(booksData || []);
      
      if (usersRes?.success && Array.isArray(usersRes.data)) {
        setUsers(usersRes.data);
      } else if (Array.isArray(usersRes)) {
        setUsers(usersRes);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to load circulation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Helper maps
  const bookMap = React.useMemo(() => {
    const map = {};
    books.forEach(b => {
      map[b.isbn] = b;
    });
    return map;
  }, [books]);

  const userMap = React.useMemo(() => {
    const map = {};
    users.forEach(u => {
      const key = u.id || u.uid;
      if (key) map[key] = u;
    });
    return map;
  }, [users]);

  // Handle actions
  const handleApproveCheckout = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'approve' }));
    const adminId = user?.uid || user?.id || '';
    try {
      await approveCheckout(id, adminId);
      await loadData();
    } catch (err) {
      console.error('Approval failed:', err);
      window.alert(`Approval failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleRejectCheckout = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'reject' }));
    const adminId = user?.uid || user?.id || '';
    try {
      await rejectCheckout(id, adminId);
      await loadData();
    } catch (err) {
      console.error('Rejection failed:', err);
      window.alert(`Rejection failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleApproveReturn = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'return' }));
    const adminId = user?.uid || user?.id || '';
    try {
      await approveReturn(id, adminId);
      await loadData();
    } catch (err) {
      console.error('Return approval failed:', err);
      window.alert(`Return approval failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleClearCheckout = async (id) => {
    if (!window.confirm(t('admin.confirmClearCheckout', 'Are you sure you want to forcibly clear this checkout? The book copies in catalog will be incremented.'))) {
      return;
    }
    setActionLoading(prev => ({ ...prev, [id]: 'clear' }));
    const adminId = user?.uid || user?.id || '';
    try {
      await clearCheckout(id, adminId);
      await loadData();
    } catch (err) {
      console.error('Failed to clear checkout:', err);
      window.alert(`Failed to clear checkout: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-access-denied-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <Shield size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">{t('admin.privilegedSanctuary', 'Privileged Sanctuary')}</h2>
          <p className="denied-message">
            {t('admin.circulationDeniedMsg', 'Your current credentials do not grant access to the Curator Requests Ledger. Curation of library circulation is reserved for assigned Curators.')}
          </p>
          <div className="denied-actions">
            <Link to="/" className="royal-btn return-home-btn">
              {t('admin.returnEntrance', 'Return to Entrance Hall')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Segmenting transactions
  const checkoutRequests = checkouts.filter(c => c.status === 'REQUESTED_CHECKOUT');
  const returnRequests = checkouts.filter(c => c.status === 'REQUESTED_RETURN');
  const activeCheckouts = checkouts.filter(c => c.status === 'CHECKED_OUT');
  const historyTransactions = checkouts.filter(c => c.status === 'RETURNED' || c.status === 'REJECTED');

  // Filtered transactions for the search and filter UI
  const getFilteredList = () => {
    let list = [...checkouts];
    
    // Status Filter
    if (statusFilter === 'PENDING') {
      list = list.filter(c => c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN');
    } else if (statusFilter === 'ACTIVE') {
      list = list.filter(c => c.status === 'CHECKED_OUT');
    } else if (statusFilter === 'RETURNED') {
      list = list.filter(c => c.status === 'RETURNED');
    }

    // Search Term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => {
        const book = bookMap[c.bookId] || {};
        const member = userMap[c.memberId] || {};
        const title = (book.title || '').toLowerCase();
        const isbn = (c.bookId || '').toLowerCase();
        const mId = (c.memberId || '').toLowerCase();
        const mEmail = (member.email || '').toLowerCase();
        const mName = (`${member.firstName || ''} ${member.lastName || ''}`).toLowerCase();
        
        return title.includes(q) || isbn.includes(q) || mId.includes(q) || mEmail.includes(q) || mName.includes(q);
      });
    }

    return list.sort((a, b) => {
      const aTime = a.requestedAt || a.checkedOutAt || '';
      const bTime = b.requestedAt || b.checkedOutAt || '';
      return bTime.localeCompare(aTime);
    });
  };

  const renderBookCell = (bookId) => {
    const book = bookMap[bookId];
    if (!book) {
      return (
        <div className="ledger-book-cell">
          <BookOpen className="cell-icon text-muted" size={16} />
          <div>
            <div className="cell-primary-title">{t('admin.unknownVolume', 'Unknown volume')}</div>
            <div className="cell-sub-detail text-muted">ISBN: {bookId}</div>
          </div>
        </div>
      );
    }
    return (
      <div className="ledger-book-cell">
        <img src={book.coverUrl || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=80&q=80'} alt={book.title} className="ledger-book-thumbnail" />
        <div>
          <div className="cell-primary-title truncate">{book.title}</div>
          <div className="cell-sub-detail truncate-author">{t('common.by', 'by')} {Array.isArray(book.authors) ? book.authors.join(', ') : book.author || t('admin.unknownAuthor', 'Unknown')}</div>
          <div className="cell-sub-detail text-accent">ISBN: {bookId}</div>
        </div>
      </div>
    );
  };

  const isContactIncomplete = (memberId) => {
    const member = userMap[memberId];
    if (!member) return true;
    const phoneVal = (member.phone || member.phoneNumber || '').trim();
    const addressParts = [
      member.houseNo,
      member.street,
      member.city,
      member.pinCode
    ].filter(Boolean).map(v => String(v).trim()).filter(v => v !== 'null' && v !== '');
    const hasPhone = !!phoneVal;
    const hasAddress = addressParts.length > 0;
    return !hasPhone && !hasAddress;
  };

  const renderMemberCell = (memberId, tx) => {
    const member = userMap[memberId];
    let name = '';
    if (member) {
      const first = member.firstName && member.firstName !== 'null' ? member.firstName.trim() : '';
      const last = member.lastName && member.lastName !== 'null' ? member.lastName.trim() : '';
      name = `${first} ${last}`.trim();
      if (!name && member.email) {
        name = member.email.split('@')[0];
      }
    }
    if (!name && tx) {
      name = tx.memberName || '';
    }
    if (!name) {
      name = t('admin.unknownPatron', 'Unknown Patron');
    }
    const email = member?.email || tx?.memberEmail || t('admin.noEmail', 'No email');
    
    // Contact Info formatting for toggle view
    const phoneVal = member ? (member.phone || member.phoneNumber || '') : '';
    const addressParts = member ? [
      member.houseNo,
      member.street,
      member.city,
      member.pinCode
    ] : [];
    const addressVal = addressParts
      .filter(Boolean)
      .map(v => String(v).trim())
      .filter(v => v !== 'null' && v !== '')
      .join(', ');

    return (
      <div className="ledger-member-cell">
        <div className="avatar-mini-circle">
          {name ? name.charAt(0).toUpperCase() : <User size={12} />}
        </div>
        <div>
          <div className="cell-primary-title">{name}</div>
          <div className="cell-sub-detail text-muted truncate">{email}</div>
          <div className="cell-sub-detail text-muted font-mono" style={{ fontSize: '0.65rem' }}>UID: {memberId ? `${memberId.slice(0, 8)}...` : '—'}</div>
          
          {showContactDetails && (
            <div className="member-contact-details animate-slide-down">
              {phoneVal ? (
                <div className="contact-detail-item">
                  <Phone size={10} className="contact-icon text-accent" />
                  <span className="contact-text font-mono">{phoneVal}</span>
                </div>
              ) : (
                <div className="contact-detail-item empty-detail">
                  <Phone size={10} className="contact-icon text-muted" />
                  <span className="contact-text text-muted italic">{t('admin.noPhone', 'No phone')}</span>
                </div>
              )}
              {addressVal ? (
                <div className="contact-detail-item">
                  <MapPin size={10} className="contact-icon text-accent" />
                  <span className="contact-text">{addressVal}</span>
                </div>
              ) : (
                <div className="contact-detail-item empty-detail">
                  <MapPin size={10} className="contact-icon text-muted" />
                  <span className="contact-text text-muted italic">{t('admin.noAddress', 'No address')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStatusBadge = (status, ntagUid) => {
    switch (status) {
      case 'REQUESTED_CHECKOUT':
        return (
          <span className="ledger-status-badge badge-checkout-req animate-pulse">
            <Clock size={12} /> {t('admin.checkoutReqBadge', 'Checkout Req')}
          </span>
        );
      case 'REQUESTED_RETURN':
        return (
          <span className="ledger-status-badge badge-return-req animate-pulse">
            <Clock size={12} /> {t('admin.returnReqBadge', 'Return Req')}
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="ledger-status-badge badge-checkedout">
            <Smartphone size={12} /> {t('admin.checkedOutBadge', 'Checked Out')} {ntagUid && <span className="nfc-dot" title={`Verified via NTAG213: ${ntagUid}`}>NFC</span>}
          </span>
        );
      case 'RETURNED':
        return (
          <span className="ledger-status-badge badge-returned">
            <CheckCircle size={12} /> {t('admin.returnedBadge', 'Returned')}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="ledger-status-badge badge-rejected">
            <X size={12} /> {t('admin.rejectedBadge', 'Rejected')}
          </span>
        );
      default:
        return <span className="ledger-status-badge">{status}</span>;
    }
  };

  return (
    <div className="curator-checkouts-container animate-fade-in">
      {/* Page Header */}
      <header className="curator-checkouts-header">
        <Link to="/admin" className="back-link">
          <ArrowLeft size={16} /> {t('common.curatorConsole', 'Curator Console')}
        </Link>
        <div className="header-badge-curator">
          <Shield size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('admin.circulationLedger', 'Sovereign Circulation Ledger')}</span>
        </div>
        <h1 className="curator-checkouts-title glow-text">{t('admin.patronCirculationDesk', 'Patron Circulation Desk')}</h1>
        <p className="curator-checkouts-subtitle">
          {t('admin.circulationDesc', 'Process physical/digital checkout bookings, verify smart card return requests, and audit the active Royal library ledger.')}
        </p>
      </header>

      {/* Overview Analytics Summary */}
      <section className="circulation-analytics-grid">
        <div className="royal-card analytic-summary-card">
          <span className="count-large gold-gradient-text">{checkoutRequests.length}</span>
          <span className="label">{t('admin.checkoutRequests', 'Checkout Requests')}</span>
        </div>
        <div className="royal-card analytic-summary-card">
          <span className="count-large text-warning">{returnRequests.length}</span>
          <span className="label">{t('admin.returnRequests', 'Return Requests')}</span>
        </div>
        <div className="royal-card analytic-summary-card">
          <span className="count-large text-success">{activeCheckouts.length}</span>
          <span className="label">{t('admin.activeCheckouts', 'Active Checkouts')}</span>
        </div>
        <div className="royal-card analytic-summary-card">
          <button onClick={loadData} className="ledger-refresh-btn" disabled={loading}>
            <RefreshCw size={20} className={loading ? 'spin-icon' : ''} />
            <span>{t('admin.syncLedger', 'Sync Ledger')}</span>
          </button>
        </div>
      </section>

      {/* Main Ledger Split for Quick Actions */}
      <div className="ledger-splits-row">
        {/* Checkout Requests Card */}
        <div className="royal-card split-panel-card border-gold">
          <div className="panel-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} className="gold-glow-icon" />
              <h3>{t('admin.pendingCheckoutBookings', 'Pending Checkout Bookings')}</h3>
            </div>
            <span className="count-badge bg-gold">{checkoutRequests.length}</span>
          </div>

          {checkoutRequests.length === 0 ? (
            <div className="ledger-empty-state">
              <CheckCircle size={32} className="text-success" />
              <p>{t('admin.noPendingCheckouts', 'No pending checkout requests from patrons.')}</p>
            </div>
          ) : (
            <div className="requests-compact-list">
              {checkoutRequests.map(r => (
                <div key={r.id} className="compact-request-row animate-fade-in">
                  <div className="compact-row-meta">
                    {renderBookCell(r.bookId)}
                    {renderMemberCell(r.memberId, r)}
                    <div className="request-time">
                      <Clock size={12} className="inline-icon" />
                      <span>{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : t('admin.today', 'Today')}</span>
                    </div>
                  </div>
                  <div className="compact-row-actions">
                    <button
                      onClick={() => handleApproveCheckout(r.id)}
                      className="action-btn-circle btn-approve"
                      disabled={actionLoading[r.id]}
                      title={t('admin.approveCheckout', 'Approve Loan')}
                    >
                      {actionLoading[r.id] === 'approve' ? <RefreshCw className="spin-icon" size={14} /> : <Check size={14} />}
                    </button>
                    <button
                      onClick={() => handleRejectCheckout(r.id)}
                      className="action-btn-circle btn-reject"
                      disabled={actionLoading[r.id]}
                      title={t('admin.rejectCheckout', 'Reject Loan')}
                    >
                      {actionLoading[r.id] === 'reject' ? <RefreshCw className="spin-icon" size={14} /> : <X size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Return Requests Card */}
        <div className="royal-card split-panel-card border-warning">
          <div className="panel-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={20} className="text-warning" />
              <h3>{t('admin.pendingReturnVerifications', 'Pending Return Verifications')}</h3>
            </div>
            <span className="count-badge bg-warning">{returnRequests.length}</span>
          </div>

          {returnRequests.length === 0 ? (
            <div className="ledger-empty-state">
              <CheckCircle size={32} className="text-success" />
              <p>{t('admin.noPendingReturns', 'No pending return requests from patrons.')}</p>
            </div>
          ) : (
            <div className="requests-compact-list">
              {returnRequests.map(r => (
                <div key={r.id} className="compact-request-row animate-fade-in">
                  <div className="compact-row-meta">
                    {renderBookCell(r.bookId)}
                    {renderMemberCell(r.memberId, r)}
                    <div className="request-time">
                      <Clock size={12} className="inline-icon" />
                      <span>{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : t('admin.today', 'Today')}</span>
                    </div>
                  </div>
                  <div className="compact-row-actions">
                    <button
                      onClick={() => handleApproveReturn(r.id)}
                      className="action-btn-circle btn-approve-return"
                      disabled={actionLoading[r.id]}
                      title={t('admin.approveReturn', 'Approve Return')}
                    >
                      {actionLoading[r.id] === 'return' ? <RefreshCw className="spin-icon" size={14} /> : <Check size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Master Ledger Audit Table */}
      <section className="master-ledger-section royal-card">
        <div className="ledger-table-header-row">
          <h3 className="section-title">{t('admin.masterCirculationRegistry', 'Master Circulation Registry')}</h3>
          
          <div className="ledger-search-filters">
            {/* Search */}
            <div className="search-bar-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={t('admin.searchCirculationPlaceholder', 'Search volume, ISBN, user, email...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ledger-search-input"
              />
            </div>

            {/* Patron Contacts Toggle Switch */}
            <div className="contact-toggle-wrapper">
              <span className="toggle-label">{t('admin.showPatronContacts', 'Show Patron Contacts')}</span>
              <button
                type="button"
                className={`luxury-toggle-btn ${showContactDetails ? 'active' : ''}`}
                onClick={() => setShowContactDetails(!showContactDetails)}
                title={t('admin.showPatronContacts', 'Show Patron Contacts')}
              >
                <span className="luxury-toggle-slider" />
              </button>
            </div>

            {/* Filter */}
            <div className="status-filter-wrapper">
              <Filter size={14} className="filter-icon" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="ledger-filter-select"
              >
                <option value="ALL">{t('admin.allEntries', 'All Entries')}</option>
                <option value="PENDING">{t('admin.pendingRequestsOnly', 'Pending Requests Only')}</option>
                <option value="ACTIVE">{t('admin.activeCheckoutsOnly', 'Active Checkouts')}</option>
                <option value="RETURNED">{t('admin.successfullyReturnedOnly', 'Successfully Returned')}</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="ledger-table-loading">
            <RefreshCw className="spin-icon text-accent" size={32} />
            <p>{t('admin.loadingLedger', 'Retrieving master transactions registry...')}</p>
          </div>
        ) : getFilteredList().length === 0 ? (
          <div className="ledger-table-empty">
            <AlertCircle size={40} className="text-muted" />
            <p>{t('admin.noMatchingTransactions', 'No matching transactions found in database matching criteria.')}</p>
          </div>
        ) : (
          <div className="ledger-table-wrapper">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>{t('admin.book', 'Volume')}</th>
                  <th>{t('admin.patron', 'Patron')}</th>
                  <th>{t('admin.loanDate', 'Loan Date')}</th>
                  <th>{t('admin.dueDate', 'Due Date')}</th>
                  <th>{t('admin.status', 'Status')}</th>
                  <th>{t('admin.verificationCard', 'Verification Card')}</th>
                  <th>{t('admin.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredList().map(entry => (
                  <tr 
                    key={entry.id} 
                    className={`ledger-tr animate-fade-in ${isContactIncomplete(entry.memberId) ? 'contact-incomplete-warning' : ''}`}
                  >
                    <td>{renderBookCell(entry.bookId)}</td>
                    <td>{renderMemberCell(entry.memberId, entry)}</td>
                    <td>
                      <div className="date-cell">
                        <span className="primary-date">
                          {entry.checkedOutAt 
                            ? new Date(entry.checkedOutAt).toLocaleDateString()
                            : entry.requestedAt 
                              ? new Date(entry.requestedAt).toLocaleDateString() 
                              : '—'
                          }
                        </span>
                        <span className="secondary-time">
                          {entry.checkedOutAt 
                            ? new Date(entry.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : entry.requestedAt 
                              ? new Date(entry.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                              : ''
                          }
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <span className="primary-date">
                          {entry.returnedAt 
                            ? new Date(entry.returnedAt).toLocaleDateString() 
                            : entry.dueDate 
                              ? new Date(entry.dueDate).toLocaleDateString() 
                              : '—'
                          }
                        </span>
                        {entry.status === 'CHECKED_OUT' && entry.dueDate && (
                          <span className={`due-badge ${new Date(entry.dueDate) < new Date() ? 'overdue' : 'pending'}`}>
                            {new Date(entry.dueDate) < new Date() ? t('admin.overdue', 'Overdue') : t('admin.outstanding', 'Outstanding')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{renderStatusBadge(entry.status, entry.ntagUid)}</td>
                    <td>
                      {entry.ntagUid ? (
                        <div className="ntag-badge">
                          <Smartphone size={12} className="text-accent" />
                          <span className="ntag-font font-mono">{entry.ntagUid}</span>
                        </div>
                      ) : (
                        <span className="ntag-none">—</span>
                      )}
                    </td>
                    <td>
                      {(entry.status === 'CHECKED_OUT' || entry.status === 'REQUESTED_RETURN') ? (
                        <button
                          onClick={() => handleClearCheckout(entry.id)}
                          className="clear-checkout-btn"
                          disabled={actionLoading[entry.id] === 'clear'}
                          title={t('admin.clearCheckout', 'Forcibly Clear Checkout')}
                        >
                          {actionLoading[entry.id] === 'clear' ? (
                            <RefreshCw className="spin-icon" size={13} />
                          ) : (
                            <>
                              <X size={12} />
                              <span>{t('admin.clear', 'Clear')}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="action-none">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
