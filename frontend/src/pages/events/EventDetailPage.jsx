import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, MapPin, Clock, Users, Calendar, HelpCircle, CheckCircle, Info } from 'lucide-react';
import { fetchEventById, rsvpToEvent, cancelRsvpToEvent } from '../../services/eventApi';
import './EventDetailPage.css';

const EventDetailPage = ({ user }) => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [rsvpState, setRsvpState] = useState('none'); // none, rsvping, rsvped
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isUserRsvped = (evt) => {
    if (!user || !evt?.rsvps || !Array.isArray(evt.rsvps)) return false;
    return evt.rsvps.includes(user.uid || user.id);
  };

  const getRsvpCount = (evt) => {
    if (!evt?.rsvps) return 0;
    return Array.isArray(evt.rsvps) ? evt.rsvps.length : (typeof evt.rsvps === 'number' ? evt.rsvps : 0);
  };

  useEffect(() => {
    const loadEventDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchEventById(id);
        if (res?.success && res?.data) {
          setEvent(res.data);
          setRsvpState(isUserRsvped(res.data) ? 'rsvped' : 'none');
        } else {
          setError('We could not retrieve details for this specific literary gathering.');
        }
      } catch (err) {
        console.error('Failed to load event details', err);
        setError('Unable to load gathering details. This salon might have been adjourned.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadEventDetails();
    }
  }, [id, user]);

  const handleRsvp = async () => {
    if (!user) {
      window.alert('Please enter the Royal Salon (sign in) before requesting an invitation.');
      return;
    }
    if (rsvpState !== 'none') return;
    setRsvpState('rsvping');
    try {
      const res = await rsvpToEvent(id);
      if (res?.success && res?.data) {
        setEvent(res.data);
        setRsvpState('rsvped');
      } else {
        setRsvpState('none');
        window.alert(res?.message || 'Failed to register reservation.');
      }
    } catch (err) {
      console.error(err);
      setRsvpState('none');
      window.alert(err.response?.data?.message || 'Unable to register reservation.');
    }
  };

  const handleCancelRsvp = async () => {
    if (rsvpState !== 'rsvped') return;
    setRsvpState('rsvping');
    try {
      const res = await cancelRsvpToEvent(id);
      if (res?.success && res?.data) {
        setEvent(res.data);
        setRsvpState('none');
      } else {
        setRsvpState('rsvped');
        window.alert(res?.message || 'Failed to cancel reservation.');
      }
    } catch (err) {
      console.error(err);
      setRsvpState('rsvped');
      window.alert(err.response?.data?.message || 'Unable to cancel reservation.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="event-detail-container animate-fade-in">
        <Link to="/events" className="back-link">
          <ArrowLeft size={16} /> Return to Gatherings
        </Link>
        <div className="royal-card no-results-card" style={{ padding: '5rem 2rem' }}>
          <div className="loader-mini" style={{ marginBottom: '1rem' }}></div>
          <p>Consulting the Royal ledger for gathering details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-detail-container animate-fade-in">
        <Link to="/events" className="back-link">
          <ArrowLeft size={16} /> Return to Gatherings
        </Link>
        <div className="royal-card no-results-card" style={{ padding: '5rem 2rem' }}>
          <HelpCircle size={48} className="no-events-icon" />
          <h3>Assembly Adjourned</h3>
          <p>{error || 'This assembly could not be localized within our registers.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-detail-container animate-fade-in">
      {/* Back button */}
      <Link to="/events" className="back-link">
        <ArrowLeft size={16} /> Return to Gatherings
      </Link>

      <div className="event-detail-grid">
        {/* Left Side: Cover and Basic metadata card */}
        <div className="event-detail-visual">
          <div className="royal-card event-visual-card">
            <div className="event-detail-img-container">
              <img src={event.imageUrl} alt={event.title} className="detail-event-img" />
              <div className="detail-event-badge">{event.type}</div>
            </div>
            
            <div className="event-quick-specs">
              <div className="quick-spec-item">
                <Calendar size={18} className="spec-icon" />
                <div>
                  <span className="spec-title">Date</span>
                  <span className="spec-detail">{formatDate(event.date)}</span>
                </div>
              </div>
              <div className="quick-spec-item">
                <Clock size={18} className="spec-icon" />
                <div>
                  <span className="spec-title">Timing</span>
                  <span className="spec-detail">{event.time}</span>
                </div>
              </div>
              <div className="quick-spec-item">
                <MapPin size={18} className="spec-icon" />
                <div>
                  <span className="spec-title">Location</span>
                  <span className="spec-detail">{event.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Informative Body */}
        <div className="event-detail-info-panel royal-card">
          <header className="event-info-header">
            <span className="curator-info">Curated by <strong className="gold-gradient-text">{event.curator || 'The Royal Curators'}</strong></span>
            <h1 className="event-detail-title glow-text">{event.title}</h1>
          </header>

          <section className="event-description-body">
            <h3>Gathering Prospectus</h3>
            <p className="brief-lead">{event.description}</p>
            <p className="extended-desc">{event.extendedDescription || 'No further description is available for this gathering.'}</p>
          </section>

          <section className="venue-details-section">
            <h4 className="detail-subheading">Venue & Directions</h4>
            <p className="address-details">{event.address || 'In the Private Library Chambers'}</p>
            <div className="venue-simulation-map">
              <Info size={14} /> Localized within the exclusive, gated private halls of the Royal Book Club estate.
            </div>
          </section>

          {/* RSVP Status Block */}
          <footer className="event-rsvp-cta-block">
            <div className="rsvp-capacity-tracker">
              <Users size={16} className="gold-glow-icon" />
              <span>Current Registrations: <strong>{getRsvpCount(event)}</strong> / <strong>{event.capacity || 50}</strong> Patrons</span>
            </div>

            <div className="rsvp-action-trigger">
              {rsvpState === 'none' ? (
                (getRsvpCount(event) >= (event.capacity || 50)) ? (
                  <button className="royal-btn-disabled rsvp-submit-btn" disabled>
                    Fully Booked
                  </button>
                ) : (
                  <button onClick={handleRsvp} className="royal-btn rsvp-submit-btn" id="event-detail-rsvp-btn">
                    Claim Seat Invitation
                  </button>
                )
              ) : rsvpState === 'rsvping' ? (
                <button className="royal-btn-disabled rsvp-submit-btn" disabled>
                  <div className="loader-mini"></div> Authorizing Attendance...
                </button>
              ) : (
                <div className="rsvp-success-banner">
                  <div className="success-header">
                    <CheckCircle size={20} className="success-icon" />
                    <div>
                      <h4>Invitation Authorized</h4>
                      <p>Your name is registered on the salon ledger. Please present your digital token at the foyer.</p>
                    </div>
                  </div>
                  <button onClick={handleCancelRsvp} className="cancel-rsvp-trigger-btn" id="event-detail-cancel-rsvp-btn">
                    Relinquish Invitation
                  </button>
                </div>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
