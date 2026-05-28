import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Users, CheckCircle2, Award, Clock } from 'lucide-react';
import './EventCard.css';

const EventCard = ({
  event = {
    id: 'event-1',
    title: 'Sovereign Reader Autumn Litfest',
    description: 'An elegant evening of tea, sonnets, and philosophical debates on 19th-century gothic romance.',
    date: '2026-10-15',
    time: '18:00',
    location: 'The Velvet Library Lounge',
    type: 'Litfest', // Litfest, Meetup, Discussion
    rsvps: 42,
    capacity: 60,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80',
  },
  onRsvpSuccess = () => {}
}) => {
  const [rsvpState, setRsvpState] = useState('none'); // none, rsvping, rsvped
  const [rsvpCount, setRsvpCount] = useState(event.rsvps);

  // Format date helper: "Oct 15, 2026"
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDay = (dateStr) => {
    const d = new Date(dateStr);
    return d.getDate();
  };

  const getMonth = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  };

  const handleRsvp = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (rsvpState !== 'none') return;

    setRsvpState('rsvping');
    setTimeout(() => {
      setRsvpState('rsvped');
      setRsvpCount(prev => prev + 1);
      onRsvpSuccess(event);
    }, 1200);
  };

  const handleCancelRsvp = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (rsvpState !== 'rsvped') return;

    setRsvpState('none');
    setRsvpCount(prev => Math.max(0, prev - 1));
  };

  const isFull = rsvpCount >= event.capacity;

  return (
    <div className={`royal-card event-card ${rsvpState === 'rsvped' ? 'rsvped-card' : ''}`} id={`event-card-${event.id}`}>
      <Link to={`/events/${event.id}`} className="event-card-link">
        {/* Cover & Type Tag */}
        <div className="event-img-container">
          <img src={event.imageUrl} alt={event.title} className="event-card-img" loading="lazy" />
          <div className="event-type-badge">
            <Award size={12} />
            <span>{event.type}</span>
          </div>
          
          {/* Custom Date Badge */}
          <div className="event-date-badge">
            <span className="date-month">{getMonth(event.date)}</span>
            <span className="date-day">{getDay(event.date)}</span>
          </div>
        </div>

        {/* Info Area */}
        <div className="event-info-area">
          <h3 className="event-title glow-text">{event.title}</h3>
          <p className="event-short-desc">{event.description}</p>
          
          <div className="event-details-grid">
            <div className="event-detail-item">
              <MapPin size={14} className="detail-icon" />
              <span>{event.location}</span>
            </div>
            <div className="event-detail-item">
              <Clock size={14} className="detail-icon" />
              <span>{event.time}</span>
            </div>
            <div className="event-detail-item">
              <Users size={14} className="detail-icon" />
              <span>{rsvpCount} / {event.capacity} Attendees</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Action Footer */}
      <div className="event-action-footer">
        {rsvpState === 'none' ? (
          isFull ? (
            <button className="royal-btn-disabled rsvp-btn" disabled>
              Fully Booked
            </button>
          ) : (
            <button onClick={handleRsvp} className="royal-btn rsvp-btn" id={`rsvp-btn-${event.id}`}>
              Request Invitation
            </button>
          )
        ) : rsvpState === 'rsvping' ? (
          <button className="royal-btn-disabled rsvp-btn" disabled>
            <div className="loader-mini"></div> Reserving...
          </button>
        ) : (
          <div className="rsvped-actions">
            <span className="rsvp-confirmed-tag">
              <CheckCircle2 size={14} /> RSVP Confirmed
            </span>
            <button onClick={handleCancelRsvp} className="rsvp-cancel-link" id={`cancel-rsvp-${event.id}`}>
              Cancel RSVP
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
