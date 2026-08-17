import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Check, X, Clock, BookOpen, User, RefreshCw, Search, Filter, AlertCircle, CheckCircle, Smartphone, ArrowLeft, Phone, MapPin, QrCode } from 'lucide-react';
import { fetchCheckouts, approveCheckout, rejectCheckout, approveReturn, fetchBooks, clearCheckout, verifiedReturn } from '../../services/libraryApi';
import { getCheckoutSettings } from '../../services/checkoutSettingsApi';
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
  const [librarySettings, setLibrarySettings] = useState(null);
  const [showSandbox, setShowSandbox] = useState(false);
  const [simBookId, setSimBookId] = useState('');
  const [simLat, setSimLat] = useState(12.9716);
  const [simLon, setSimLon] = useState(77.5946);
  const [simNfc, setSimNfc] = useState('04:A3:B2:C1:D0:E9:80');
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');

  // Access check
  const isAdmin = user && user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    try {
      const [checkoutsRes, booksData, usersRes, settingsRes] = await Promise.all([
        fetchCheckouts(),
        fetchBooks(),
        getAllUsers(),
        getCheckoutSettings()
      ]);

      setCheckouts(checkoutsRes || []);
      setBooks(booksData || []);
      if (settingsRes?.success && settingsRes?.data) {
        setLibrarySettings(settingsRes.data);
        if (settingsRes.data.libraryLatitude) setSimLat(settingsRes.data.libraryLatitude);
        if (settingsRes.data.libraryLongitude) setSimLon(settingsRes.data.libraryLongitude);
      }
      
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

  const canvasRef = useRef(null);

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const centerLat = librarySettings?.libraryLatitude || 12.9716;
    const centerLon = librarySettings?.libraryLongitude || 77.5946;
    const radiusMeters = librarySettings?.validRadiusMeters || 100;
    const scale = 80 / radiusMeters;

    const diffLon = (clickX - centerX) / (111320 * Math.cos(centerLat * Math.PI / 180) * scale);
    const diffLat = (centerY - clickY) / (111320 * scale);

    setSimLat(parseFloat((centerLat + diffLat).toFixed(6)));
    setSimLon(parseFloat((centerLon + diffLon).toFixed(6)));
  };

  useEffect(() => {
    if (!showSandbox || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Geofence info
    const centerLat = librarySettings?.libraryLatitude || 12.9716;
    const centerLon = librarySettings?.libraryLongitude || 77.5946;
    const radiusMeters = librarySettings?.validRadiusMeters || 100;

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 80 / radiusMeters; // 80 pixels represents the radius

    // Draw geofence circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusMeters * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(212, 165, 116, 0.05)';
    ctx.fill();
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Library Center
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#d4a574';
    ctx.fill();
    ctx.strokeStyle = '#121212';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw simulated return position pin
    const simDiffLat = simLat - centerLat;
    const simDiffLon = simLon - centerLon;
    const simX = centerX + simDiffLon * 111320 * Math.cos(centerLat * Math.PI / 180) * scale;
    const simY = centerY - simDiffLat * 111320 * scale;

    ctx.beginPath();
    ctx.arc(simX, simY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 191, 255, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw active/pending returns from patrons
    const returnRequests = checkouts.filter(c => c.status === 'REQUESTED_RETURN');
    returnRequests.forEach(r => {
      if (r.returnLatitude && r.returnLongitude) {
        const diffLat = r.returnLatitude - centerLat;
        const diffLon = r.returnLongitude - centerLon;
        const rx = centerX + diffLon * 111320 * Math.cos(centerLat * Math.PI / 180) * scale;
        const ry = centerY - diffLat * 111320 * scale;

        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, 2 * Math.PI);
        ctx.fillStyle = r.locationVerified ? '#4caf50' : '#f44336';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

  }, [showSandbox, librarySettings, simLat, simLon, checkouts]);

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

  const handleBulkApproveReturns = async () => {
    const adminId = user?.uid || user?.id || '';
    if (!adminId) return;
    const targets = checkouts
      .filter(c => c.status === 'REQUESTED_RETURN')
      .filter(c => c.locationVerified === true);

    if (targets.length === 0) return;

    if (!window.confirm(`Are you sure you want to bulk approve all ${targets.length} location-verified return requests?`)) {
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const r of targets) {
      try {
        await approveReturn(r.id, adminId);
        successCount++;
      } catch (err) {
        console.error(`Failed to approve return for checkout ${r.id}:`, err);
        failCount++;
      }
    }

    await loadData();
    window.alert(`Bulk return processing complete! Approved: ${successCount}, Failed: ${failCount}`);
  };

  const handleSimulateReturn = async () => {
    if (!simBookId) {
      window.alert("Please select a book volume to return!");
      return;
    }
    const adminId = user?.uid || user?.id || '';
    setLoading(true);
    try {
      await verifiedReturn({
        bookId: simBookId,
        memberId: adminId,
        ntagUid: simNfc || '04:A3:B2:C1:D0:E9:80',
        memberName: `${user?.firstName || 'Curator'} ${user?.lastName || 'Tester'}`,
        memberEmail: user?.email || 'curator@royalbookclub.com',
        returnLatitude: simLat,
        returnLongitude: simLon,
        nfcOrBarcode: 'NFC_SIMULATOR'
      });
      window.alert("Successfully injected simulated NFC return request into the royal ledger!");
      await loadData();
    } catch (err) {
      console.error("Simulation return request failed:", err);
      window.alert(`Simulation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
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
  const preVerifiedReturns = returnRequests.filter(c => c.locationVerified === true);
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

  const renderBookCell = (bookId, copyNo = null) => {
    const book = bookMap[bookId];
    if (!book) {
      return (
        <div className="ledger-book-cell">
          <BookOpen className="cell-icon text-muted" size={16} />
          <div>
            <div className="cell-primary-title">{t('admin.unknownVolume', 'Unknown volume')}</div>
            <div className="cell-sub-detail text-muted">ISBN: {bookId}</div>
            {copyNo && (
              <span className="gold-copy-badge" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.65rem',
                background: 'rgba(212, 165, 116, 0.15)',
                border: '1px solid #d4a574',
                color: '#d4a574',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: '700',
                marginTop: '4px',
                width: 'fit-content',
                boxShadow: '0 0 8px rgba(212, 165, 116, 0.15)'
              }}>
                Copy #{copyNo}
              </span>
            )}
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
          <div className="cell-sub-detail text-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>ISBN: {bookId}</span>
            {copyNo && (
              <span className="gold-copy-badge" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.65rem',
                background: 'rgba(212, 165, 116, 0.15)',
                border: '1px solid #d4a574',
                color: '#d4a574',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: '700',
                boxShadow: '0 0 8px rgba(212, 165, 116, 0.15)'
              }}>
                Copy #{copyNo}
              </span>
            )}
          </div>
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
        <div className="royal-card analytic-summary-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
          <button onClick={loadData} className="ledger-refresh-btn" disabled={loading} style={{ width: '100%', padding: '6px 12px' }}>
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            <span>{t('admin.syncLedger', 'Sync Ledger')}</span>
          </button>
          <button 
            onClick={() => setShowSandbox(prev => !prev)} 
            className="royal-btn" 
            style={{ 
              width: '100%', 
              fontSize: '0.8rem', 
              padding: '6px 12px', 
              background: showSandbox ? 'rgba(244,67,54,0.15)' : 'rgba(212,165,116,0.15)',
              border: showSandbox ? '1px solid #f44336' : '1px solid #d4a574',
              color: showSandbox ? '#ff5252' : '#d4a574',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
          >
            {showSandbox ? "Close Simulator" : "Open Simulator"}
          </button>
        </div>
      </section>

      {showSandbox && (
        <section className="royal-card curator-sandbox-card animate-fade-in" style={{ border: '1px solid rgba(212, 165, 116, 0.4)', padding: '24px', marginBottom: '30px', background: 'rgba(18, 18, 18, 0.95)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212, 165, 116, 0.2)', paddingBottom: '12px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#d4a574', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span>🛰️</span> Sovereign Geofencing & NFC Simulator Console
            </h2>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', background: 'rgba(212, 165, 116, 0.1)', color: '#d4a574', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>Active Sandbox</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Simulation controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', margin: 0 }}>Simulate Patron Return</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Select Book Volume</label>
                <select 
                  value={simBookId} 
                  onChange={(e) => setSimBookId(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,165,116,0.2)', padding: '10px', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                >
                  <option value="" style={{ background: '#121212' }}>-- Select a Book --</option>
                  {books.map(b => (
                    <option key={b.isbn} value={b.isbn} style={{ background: '#121212' }}>{b.title} ({b.isbn})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>NFC Chip UID</label>
                <input 
                  type="text" 
                  value={simNfc} 
                  onChange={(e) => setSimNfc(e.target.value)}
                  placeholder="e.g. 04:A3:B2:C1:D0:E9:80"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,165,116,0.2)', padding: '10px', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Simulated Latitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={simLat} 
                    onChange={(e) => setSimLat(parseFloat(e.target.value) || 0)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,165,116,0.2)', padding: '10px', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Simulated Longitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={simLon} 
                    onChange={(e) => setSimLon(parseFloat(e.target.value) || 0)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,165,116,0.2)', padding: '10px', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <button 
                onClick={handleSimulateReturn}
                className="royal-btn"
                style={{ 
                  background: 'linear-gradient(135deg, #d4a574 0%, #b8860b 100%)',
                  color: '#121212',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '10px',
                  boxShadow: '0 4px 15px rgba(212, 165, 116, 0.4)'
                }}
              >
                Simulate NFC return request
              </button>
            </div>

            {/* Geofence circular coverage canvas */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                <h3 style={{ fontSize: '1.05rem', color: '#fff', margin: 0 }}>Geofence Radar Live Coverage</h3>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', alignSelf: 'center' }}>Click map to relocate Pin</span>
              </div>
              <canvas 
                ref={canvasRef} 
                width={200} 
                height={200} 
                onClick={handleCanvasClick}
                style={{ 
                  background: '#0d0d0d', 
                  border: '1.5px solid #d4a574', 
                  borderRadius: '100px', 
                  cursor: 'crosshair',
                  boxShadow: 'inset 0 0 20px rgba(212, 165, 116, 0.2), 0 0 15px rgba(212, 165, 116, 0.15)'
                }}
              />
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.7rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d4a574' }}>
                  <span style={{ width: '6px', height: '6px', background: '#d4a574', borderRadius: '3px', display: 'inline-block' }}></span> Library Center
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(0,191,255,0.9)' }}>
                  <span style={{ width: '6px', height: '6px', background: 'rgba(0,191,255,0.9)', borderRadius: '3px', display: 'inline-block' }}></span> Simulated Pin
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4caf50' }}>
                  <span style={{ width: '6px', height: '6px', background: '#4caf50', borderRadius: '3px', display: 'inline-block' }}></span> Verified Return
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f44336' }}>
                  <span style={{ width: '6px', height: '6px', background: '#f44336', borderRadius: '3px', display: 'inline-block' }}></span> Unverified Return
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

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
                    {renderBookCell(r.bookId, r.copyNo)}
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
          <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={20} className="text-warning" />
              <h3>{t('admin.pendingReturnVerifications', 'Pending Return Verifications')}</h3>
              <span className="count-badge bg-warning">{returnRequests.length}</span>
            </div>
            {preVerifiedReturns.length > 0 && (
              <button 
                onClick={handleBulkApproveReturns} 
                className="royal-btn" 
                style={{ 
                  background: 'linear-gradient(135deg, #d4a574 0%, #b8860b 100%)',
                  color: '#121212',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(212, 165, 116, 0.4)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 165, 116, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(212, 165, 116, 0.4)';
                }}
              >
                <CheckCircle size={12} /> Bulk Confirm ({preVerifiedReturns.length})
              </button>
            )}
          </div>

          {returnRequests.length === 0 ? (
            <div className="ledger-empty-state">
              <CheckCircle size={32} className="text-success" />
              <p>{t('admin.noPendingReturns', 'No pending return requests from patrons.')}</p>
            </div>
          ) : (
            <div className="requests-compact-list">
              {returnRequests.map(r => (
                <div key={r.id} className="compact-request-row animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="compact-row-meta" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {renderBookCell(r.bookId, r.copyNo)}
                      {renderMemberCell(r.memberId, r)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div className="request-time" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        <Clock size={12} />
                        <span>{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : t('admin.today', 'Today')}</span>
                      </div>
                      <div className="compact-location-badge" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {r.locationVerified && (
                          <span className="location-badge verified" style={{ color: '#52c41a', border: '1px solid #52c41a', background: 'rgba(82, 196, 26, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={10} /> Location Verified
                          </span>
                        )}
                        {r.qrVerified && (
                          <span className="qr-badge verified" style={{ color: '#52c41a', border: '1px solid #52c41a', background: 'rgba(82, 196, 26, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <QrCode size={10} /> QR Verified
                          </span>
                        )}
                        {!r.locationVerified && !r.qrVerified && (
                          <span className="location-badge unverified" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={10} /> Unverified Location
                          </span>
                        )}
                      </div>
                      {r.nfcOrBarcode && (
                        <div style={{ fontSize: '0.7rem', color: 'rgba(212, 165, 116, 0.7)', border: '1px solid rgba(212, 165, 116, 0.3)', background: 'rgba(212, 165, 116, 0.05)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                          {r.nfcOrBarcode}
                        </div>
                      )}
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
                    <td>{renderBookCell(entry.bookId, entry.copyNo)}</td>
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

      {/* Physical Copy Tracking & Circulation Overrides Console */}
      <section className="physical-copy-registry-section royal-card" style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '15px', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0, color: '#d4a574' }}>
              🛡️ Physical Copy Tracking & Circulation Overrides
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Track active checkouts, copy-level smart IDs, and enforce administrative overrides for individual volumes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#d4a574', fontWeight: 'bold' }}>Select Book:</span>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(212, 165, 116, 0.3)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: '280px'
              }}
            >
              <option value="">-- Choose Book Volume --</option>
              {books.map(b => (
                <option key={b.isbn} value={b.isbn}>{b.title} ({b.isbn})</option>
              ))}
            </select>
          </div>
        </div>

        {!selectedBookId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--text-secondary)', border: '1px dashed rgba(255, 255, 255, 0.06)', borderRadius: '4px' }}>
            <BookOpen size={36} style={{ color: 'rgba(212, 165, 116, 0.4)', marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Select a book volume above to inspect and manage its physical copies independently.</p>
          </div>
        ) : (
          (() => {
            const selectedBook = bookMap[selectedBookId];
            if (!selectedBook) return null;

            // Gather the copies
            const copiesList = selectedBook.copies || [];

            if (copiesList.length === 0) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--text-secondary)', border: '1px dashed rgba(255, 255, 255, 0.06)', borderRadius: '4px' }}>
                  <AlertCircle size={36} style={{ color: '#ef4444', marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No individual copies have been registered for this volume in the database yet.</p>
                </div>
              );
            }

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {copiesList.map(copy => {
                  // Find associated transaction/checkout in checkouts array if checked out or requested
                  const activeTx = checkouts.find(c => 
                    c.bookId === selectedBookId && 
                    c.copyNo === copy.copyNo && 
                    ['CHECKED_OUT', 'REQUESTED_RETURN', 'REQUESTED_CHECKOUT'].includes(c.status)
                  );

                  let copyStatusColor = '#4caf50';
                  let copyStatusText = 'Available';
                  if (copy.status === 'CHECKED_OUT') {
                    copyStatusColor = '#ef4444';
                    copyStatusText = 'Checked Out';
                  } else if (copy.status === 'REQUESTED_CHECKOUT') {
                    copyStatusColor = '#ff9800';
                    copyStatusText = 'Pending Checkout';
                  } else if (copy.status === 'REQUESTED_RETURN') {
                    copyStatusColor = '#ff9800';
                    copyStatusText = 'Pending Return Verification';
                  }

                  return (
                    <div 
                      key={copy.copyNo} 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: `1px solid ${copy.status === 'CHECKED_OUT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 165, 116, 0.15)'}`, 
                        borderRadius: '6px', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div>
                        {/* Header: Copy # and Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>Copy #{copy.copyNo}</span>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            color: copyStatusColor, 
                            border: `1px solid ${copyStatusColor}`, 
                            background: `rgba(${copyStatusColor === '#ef4444' ? '239,68,68' : copyStatusColor === '#ff9800' ? '255,152,0' : '76,175,80'}, 0.08)`,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>
                            {copyStatusText}
                          </span>
                        </div>

                        {/* Smart Card coordinates details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>NTAG213 ID:</span>
                            <span className="font-mono" style={{ color: copy.ntagUid ? '#fff' : 'rgba(255,255,255,0.2)' }}>{copy.ntagUid || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>QR ID:</span>
                            <span className="font-mono" style={{ color: copy.qrId ? '#fff' : 'rgba(255,255,255,0.2)' }}>{copy.qrId || '—'}</span>
                          </div>
                        </div>

                        {/* Borrower Details if Loaned */}
                        {activeTx && (
                          <div style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: '4px', padding: '10px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#d4a574', fontWeight: 'bold', marginBottom: '6px' }}>Current Borrower</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{activeTx.memberName || 'Patron'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{activeTx.memberEmail}</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace' }}>Tx: {activeTx.id.slice(0, 10)}...</div>
                          </div>
                        )}
                      </div>

                      {/* Overrides / Control actions */}
                      <div>
                        {activeTx ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activeTx.status === 'REQUESTED_RETURN' && (
                              <button
                                onClick={() => handleApproveReturn(activeTx.id)}
                                className="royal-btn"
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  fontSize: '0.75rem',
                                  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                Approve Return
                              </button>
                            )}
                            {activeTx.status === 'REQUESTED_CHECKOUT' && (
                              <button
                                onClick={() => handleApproveCheckout(activeTx.id)}
                                className="royal-btn"
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  fontSize: '0.75rem',
                                  background: 'linear-gradient(135deg, #d4a574 0%, #b8860b 100%)',
                                  color: '#121212',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                Approve Checkout
                              </button>
                            )}
                            <button
                              onClick={() => handleClearCheckout(activeTx.id)}
                              className="clear-checkout-btn"
                              style={{
                                width: '100%',
                                padding: '8px',
                                fontSize: '0.72rem',
                                textAlign: 'center',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <X size={12} />
                              Forcibly Return Copy
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.35)', textAlign: 'center', padding: '10px', border: '1px dashed rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>
                            Ready on Shelf (No Overrides Needed)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </section>
    </div>
  );
}
