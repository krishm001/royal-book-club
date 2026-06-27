import React, { useEffect, useState } from 'react';
import { Shield, BookOpen, Users, PlusCircle, Award, Settings, Layers, Calendar, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listAdminRequests } from '../../services/adminRequestApi';
import { fetchCheckouts } from '../../services/libraryApi';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingCirculationCount, setPendingCirculationCount] = useState(0);

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

    loadPendingRequests();
    loadPendingCirculation();
  }, []);

  // Premium quick metrics
  const adminStats = [
    { label: 'Registered Patrons', count: '1,420', change: '+12% this month', icon: <Users className="stat-icon-gold" /> },
    { label: 'Archived Volumes', count: '5,800', change: '6 added today', icon: <BookOpen className="stat-icon-gold" /> },
    { label: 'Active Checkouts', count: '342', change: '4 overdue', icon: <Layers className="stat-icon-gold" /> },
    { label: 'Scheduled Meetups', count: '12', change: 'Next on Oct 15', icon: <Calendar className="stat-icon-gold" /> }
  ];

  if (!isAdmin) {
    return (
      <div className="admin-access-denied-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <Shield size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">Privileged Sanctuary</h2>
          <p className="denied-message">
            Your current credentials do not grant access to the Curator Central Console. Curation of the Royal Library is reserved for assigned Curators.
          </p>
          <div className="denied-actions">
            <Link to="/" className="royal-btn return-home-btn">
              Return to Entrance Hall
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
          <span className="gold-gradient-text">SOVEREIGN ADMINISTRATION</span>
        </div>
        <h1 className="admin-title glow-text">Curator Central Console</h1>
        <p className="admin-subtitle">
          Manage member registries, ingest new literary acquisitions, track digital checkouts, and approve scholarly publications.
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
          <h3>Book Ingestion Console</h3>
          <p>Scan ISBN barcodes, fetch live metadata from Open Library, or upload bulk catalog spreadsheets asynchronously.</p>
          <Link to="/admin/books" className="royal-btn action-panel-btn">
            Launch Ingestion
          </Link>
        </div>

        {/* User Management Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Settings size={28} className="gold-glow-icon" />
          </div>
          <h3>User & RFID Registries</h3>
          <p>Toggle administrator roles, manage member access, and assign specialized RFID tags for smart-lock entries.</p>
          <Link to="/admin/users" className="royal-btn action-panel-btn">
            Manage Members
          </Link>
        </div>

        {/* Sovereign Gatherings Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Calendar size={28} className="gold-glow-icon" />
          </div>
          <h3>Sovereign Gatherings</h3>
          <p>Schedule upcoming meetups, literary festivals, and symposiums. Manage flyer assets and seat reservations.</p>
          <Link to="/admin/gatherings" className="royal-btn action-panel-btn">
            Manage Gatherings
          </Link>
        </div>

        {/* Salon Houses Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Layers size={28} className="gold-glow-icon" />
          </div>
          <h3>Sovereign Houses</h3>
          <p>Establish or dissolve categories/Houses for Books and Blog Chronicles to maintain catalog hierarchy.</p>
          <Link to="/admin/houses" className="royal-btn action-panel-btn">
            Manage Houses
          </Link>
        </div>

        {/* Landing Hero Customizer Panel */}
        <div className="royal-card action-panel-card">
          <div className="panel-icon-wrapper">
            <Award size={28} className="gold-glow-icon" />
          </div>
          <h3>Landing Hero Editor</h3>
          <p>Update high-impact header messages, subtitles, and upload cover painting backgrounds for the entrance hall.</p>
          <Link to="/admin/hero" className="royal-btn action-panel-btn">
            Configure Hero
          </Link>
        </div>

        {/* Patron Circulation Panel */}
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
          <h3>Patron Circulation Desk</h3>
          <p>Process checkout bookings, verify smart card return requests, and audit the active Royal library ledger.</p>
          <Link to="/admin/book-requests" className="royal-btn action-panel-btn">
            Manage Circulation
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
            <h3>Pending Admin Requests</h3>
            <p>{pendingRequestsCount} {pendingRequestsCount === 1 ? 'member has' : 'members have'} requested admin access.</p>
            <Link to="/admin/requests" className="royal-btn action-panel-btn">
              Review Requests
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
