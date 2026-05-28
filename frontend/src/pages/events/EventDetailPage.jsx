import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, MapPin, Clock, Users, Calendar, HelpCircle, CheckCircle, Info } from 'lucide-react';
import './EventDetailPage.css';

const EventDetailPage = ({ user }) => {
  const { id } = useParams();
  const [rsvpState, setRsvpState] = useState('none'); // none, rsvping, rsvped

  // Sample static events lookup
  const events = [
    {
      id: 'event-1',
      title: 'Sovereign Reader Autumn Litfest',
      description: 'An elegant evening of tea, sonnets, and philosophical debates on 19th-century gothic romance.',
      extendedDescription: 'The Annual Autumn Litfest stands as the jewel of our club gatherings. Standard program includes opening recitations of Keats and Byron, a panel critique on Mary Shelley\'s masterworks, followed by a formal discussion session on gothic elements in Victorian aesthetic prose.',
      date: '2026-10-15',
      time: '18:00 - 21:30',
      location: 'The Velvet Library Lounge',
      address: 'Suite 402, Royal Opera Crescent, Chelsea',
      type: 'Litfest',
      curator: 'Archduke of Prose',
      rsvps: 42,
      capacity: 60,
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'event-2',
      title: 'Wilde & Aestheticism Seminar',
      description: 'A deep dive discussion into the philosophical elements of the Aesthetic movement and Dorian Gray.',
      extendedDescription: 'This intense seminar explores Oscar Wilde’s philosophical relationship with decadent aestheticism. We will analyze how Dorian Gray reflects Victorian taboos, classical hellenic ideals, and Wilde’s core artistic manifesto.',
      date: '2026-11-02',
      time: '19:30 - 21:00',
      location: 'Grand Salon Hall',
      address: 'Salon Room II, Westminster Abbey Lane',
      type: 'Discussion',
      curator: 'Lady Chesterfield',
      rsvps: 18,
      capacity: 25,
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    }
  ];

  const event = events.find(e => e.id === id) || events[0];

  const handleRsvp = () => {
    if (rsvpState !== 'none') return;
    setRsvpState('rsvping');
    setTimeout(() => {
      setRsvpState('rsvped');
    }, 1200);
  };

  const handleCancelRsvp = () => {
    setRsvpState('none');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

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
            <span className="curator-info">Curated by <strong className="gold-gradient-text">{event.curator}</strong></span>
            <h1 className="event-detail-title glow-text">{event.title}</h1>
          </header>

          <section className="event-description-body">
            <h3>Gathering Prospectus</h3>
            <p className="brief-lead">{event.description}</p>
            <p className="extended-desc">{event.extendedDescription}</p>
          </section>

          <section className="venue-details-section">
            <h4 className="detail-subheading">Venue & Directions</h4>
            <p className="address-details">{event.address}</p>
            <div className="venue-simulation-map">
              <Info size={14} /> Localized within the exclusive, gated private halls of the Royal Book Club estate.
            </div>
          </section>

          {/* RSVP Status Block */}
          <footer className="event-rsvp-cta-block">
            <div className="rsvp-capacity-tracker">
              <Users size={16} className="gold-glow-icon" />
              <span>Current Registrations: <strong>{rsvpState === 'rsvped' ? event.rsvps + 1 : event.rsvps}</strong> / <strong>{event.capacity}</strong> Patrons</span>
            </div>

            <div className="rsvp-action-trigger">
              {rsvpState === 'none' ? (
                <button onClick={handleRsvp} className="royal-btn rsvp-submit-btn" id="event-detail-rsvp-btn">
                  Claim Seat Invitation
                </button>
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
