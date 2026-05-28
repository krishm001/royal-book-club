import React from 'react';
import { Shield, BookOpen, Users, PlusCircle, Award, Settings, Layers, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  // Premium quick metrics
  const adminStats = [
    { label: 'Registered Patrons', count: '1,420', change: '+12% this month', icon: <Users className="stat-icon-gold" /> },
    { label: 'Archived Volumes', count: '5,800', change: '6 added today', icon: <BookOpen className="stat-icon-gold" /> },
    { label: 'Active Checkouts', count: '342', change: '4 overdue', icon: <Layers className="stat-icon-gold" /> },
    { label: 'Scheduled Meetups', count: '12', change: 'Next on Oct 15', icon: <Calendar className="stat-icon-gold" /> }
  ];

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
      </section>
    </div>
  );
};

export default AdminDashboard;
