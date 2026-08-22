import React, { useEffect, useState } from 'react';
import { Shield, BookOpen, Users, PlusCircle, Award, Settings, Layers, Calendar, RefreshCw, ClipboardCheck, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listAdminRequests } from '../../services/adminRequestApi';
import { fetchCheckouts } from '../../services/libraryApi';
import { fetchStatsSummary } from '../../services/statsApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const { t } = useLanguage();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingCirculationCount, setPendingCirculationCount] = useState(0);

  const [liveStats, setLiveStats] = useState({
    membersCount: 0,
    booksCount: 0,
    activeCheckoutsCount: 0,
    upcomingSalonsCount: 0
  });

  const isAdmin = user && user.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    
    const loadPendingRequests = async () => {
      try {
        const requests = await listAdminRequests('PENDING');
        setPendingRequestsCount(requests?.length || 0);
      } catch (e) {
        console.error('Failed to load pending requests', e);
      }
    };

    const loadPendingCirculation = async () => {
      try {
        const checkoutsList = await fetchCheckouts();
        const pendingCount = (checkoutsList || []).filter(
          c => c.status === 'REQUESTED_CHECKOUT' || c.status === 'REQUESTED_RETURN'
        ).length;
        setPendingCirculationCount(pendingCount);
      } catch (e) {
        console.error('Failed to load pending circulation requests', e);
      }
    };

    const loadLiveStats = async () => {
      try {
        const res = await fetchStatsSummary();
        if (res?.success && res?.data) {
          setLiveStats(res.data);
        }
      } catch (e) {
        console.error('Failed to load stats summary', e);
      }
    };

    loadPendingRequests();
    loadPendingCirculation();
    loadLiveStats();
  }, [isAdmin]);

  // Premium quick metrics
  const adminStats = [
    { label: t('admin.registeredPatrons'), count: liveStats.membersCount.toLocaleString(), change: t('admin.liveFromLedger'), icon: <Users className="stat-icon-gold" /> },
    { label: t('admin.archivedVolumes'), count: liveStats.booksCount.toLocaleString(), change: t('admin.catalogedItems'), icon: <BookOpen className="stat-icon-gold" /> },
    { label: t('admin.activeCheckouts'), count: liveStats.activeCheckoutsCount.toLocaleString(), change: t('admin.inCirculation'), icon: <Layers className="stat-icon-gold" /> },
    { label: t('admin.scheduledMeetups'), count: liveStats.upcomingSalonsCount.toLocaleString(), change: t('admin.upcomingSalons'), icon: <Calendar className="stat-icon-gold" /> }
  ];

  if (!isAdmin) {
    return (
      <div className="admin-access-denied-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <Shield size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">{t('admin.privilegedSanctuary')}</h2>
          <p className="denied-message">
            {t('admin.accessDeniedDesc')}
          </p>
          <div className="denied-actions">
            <Link to="/" className="royal-btn return-home-btn">
              {t('admin.returnEntrance')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container animate-fade-in">
      {/* Dashboard Header */}
      <header className="admin-header">
        <div className="header-badge-admin">
          <Shield size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('admin.sovereignAdministration')}</span>
        </div>
        <h1 className="admin-title glow-text">{t('admin.curatorCentralConsole')}</h1>
        <p className="admin-subtitle">
          {t('admin.tagline')}
        </p>
      </header>

      {/* Metrics Row */}
      <section className="admin-metrics-section">
        <div className="metrics-grid">
          {adminStats.map((stat, idx) => (
            <div className="royal-card metric-card" key={idx}>
              <div className="metric-header">
                <span className="metric-count gold-gradient-text">{stat.count}</span>
                {stat.icon}
              </div>
              <div className="metric-label">{stat.label}</div>
              <div className="metric-change">{stat.change}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Admin Action Panels */}
      <section className="admin-actions-grid">
        {/* Book Ingestion Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <PlusCircle size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.bookIngestionConsole')}</h3>
          <p>{t('admin.ingestionDesc')}</p>
          <Link to="/admin/books" className="royal-btn action-panel-btn">
            {t('admin.launchIngestion')}
          </Link>
        </div>

        {/* User Management Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Settings size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.userRfidRegistries')}</h3>
          <p>{t('admin.userRfidDesc')}</p>
          <Link to="/admin/users" className="royal-btn action-panel-btn">
            {t('admin.manageMembers')}
          </Link>
        </div>

        {/* Sovereign Gatherings Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Calendar size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.sovereignGatherings')}</h3>
          <p>{t('admin.gatheringsDesc')}</p>
          <Link to="/admin/gatherings" className="royal-btn action-panel-btn">
            {t('admin.manageGatherings')}
          </Link>
        </div>

        {/* Salon Houses Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Layers size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.sovereignHouses')}</h3>
          <p>{t('admin.housesDesc')}</p>
          <Link to="/admin/houses" className="royal-btn action-panel-btn">
            {t('admin.manageHouses')}
          </Link>
        </div>

        {/* Landing Hero Customizer Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Award size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.landingHeroEditor')}</h3>
          <p>{t('admin.heroDesc')}</p>
          <Link to="/admin/hero" className="royal-btn action-panel-btn">
            {t('admin.configureHero')}
          </Link>
        </div>

        {/* Patron Circulation Desk */}
        <div className="royal-card action-panel-card" style={pendingCirculationCount > 0 ? { borderColor: '#d2a574', position: 'relative' } : {}}>
          {pendingCirculationCount > 0 && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: '#d2a574',
              color: '#1a1a1a',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {pendingCirculationCount}
            </div>
          )}
          <div className="panel-icon-wrapper">
            <Layers size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.patronCirculationDesk')}</h3>
          <p>{t('admin.circulationDesc')}</p>
          <Link to="/admin/book-requests" className="royal-btn action-panel-btn">
            {t('admin.manageCirculation')}
          </Link>
        </div>

        {/* Self-Checkout Gating Settings */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Settings size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.selfCheckoutGating')}</h3>
          <p>{t('admin.gatingDesc')}</p>
          <Link to="/admin/settings" className="royal-btn action-panel-btn">
            {t('admin.configureGating')}
          </Link>
        </div>

        {/* Content Moderation Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Shield size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.contentModeration', 'Content Moderation')}</h3>
          <p>{t('admin.moderationDesc', 'Manage flagged user contributions and reviews.')}</p>
          <Link to="/admin/moderation" className="royal-btn action-panel-btn">
            {t('admin.manageModeration', 'Manage Moderation')}
          </Link>
        </div>

        {/* NFC Sequence Counter Diagnostics & Reset Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <RefreshCw size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.physicalNfcDiagnostics', 'NFC Sequence Diagnostics')}</h3>
          <p>{t('admin.nfcDiagnosticsDesc', 'Audit physical tag registers, monitor hardware sequences, and execute bulk resets.')}</p>
          <Link to="/admin/nfc" className="royal-btn action-panel-btn">
            {t('admin.launchDiagnostics', 'Launch Diagnostics')}
          </Link>
        </div>

        {/* Physical Shelf Audit Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <ClipboardCheck size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.shelfAuditTitle', 'Physical Shelf Audit')}</h3>
          <p>{t('admin.shelfAuditDesc', 'Perform volume checks, audit barcode logs, and run catalog reconciliation.')}</p>
          <Link to="/admin/audit" className="royal-btn action-panel-btn">
            {t('admin.launchAudit', 'Launch Shelf Audit')}
          </Link>
        </div>

        {/* QR Code Sticker Workshop Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <QrCode size={28} className="gold-glow-icon" />
          </div>
          <h3>{t('admin.qrStickersTitle', 'QR Sticker Generator')}</h3>
          <p>{t('admin.qrStickersDesc', 'Generate printable 65-up A4 sheets of book copy QR stickers with royal branding.')}</p>
          <Link to="/admin/qr-stickers" className="royal-btn action-panel-btn">
            {t('admin.launchStickers', 'Generate QR Stickers')}
          </Link>
        </div>

        {/* Admin Requests Panel */}
        {pendingRequestsCount > 0 && (
          <div className="royal-card action-panel-card" style={{ borderColor: '#d4af37', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: '#d4af37',
              color: '#1a1a1a',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {pendingRequestsCount}
            </div>
            <div className="panel-icon-wrapper">
              <Award size={28} className="gold-glow-icon" />
            </div>
            <h3>{t('admin.pendingAdminRequests')}</h3>
            <p>{pendingRequestsCount} {t('admin.adminRequestsDesc')}</p>
            <Link to="/admin/requests" className="royal-btn action-panel-btn">
              {t('admin.reviewRequests')}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
