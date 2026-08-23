import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Users, CheckCircle2, Award, Clock } from 'lucide-react';
import './EventCard.css';
import { rsvpToEvent, cancelRsvpToEvent } from '../../services/eventApi';
import { useLanguage } from '../../i18n/LanguageContext';
const EventCard = ({
  event = {
    id: 'event-1',
    title: 'Sovereign Reader Autumn Litfest',
    description: 'An elegant evening of tea, sonnets, and philosophical debates on 19th-century gothic romance.',
    date: '2026-10-15',
    time: '18:00',
    location: 'The Velvet Library Lounge',
    type: 'Litfest',
    // Litfest, Meetup, Discussion
    rsvps: [],
    capacity: 60,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80'
  },
  user,
  onRsvpSuccess = () => {}
}) => {
  const {
    t
  } = useLanguage();
  const isUserRsvped = () => {
    if (!user || !event?.rsvps || !Array.isArray(event.rsvps)) return false;
    return event.rsvps.includes(user.uid || user.id);
  };
  const getInitialRsvpCount = () => {
    if (!event?.rsvps) return 0;
    return Array.isArray(event.rsvps) ? event.rsvps.length : typeof event.rsvps === 'number' ? event.rsvps : 0;
  };
  const [rsvpState, setRsvpState] = useState(isUserRsvped() ? 'rsvped' : 'none');
  const [rsvpCount, setRsvpCount] = useState(getInitialRsvpCount());

  // Keep state sync'd with prop changes
  useEffect(() => {
    setRsvpState(isUserRsvped() ? 'rsvped' : 'none');
    setRsvpCount(getInitialRsvpCount());
  }, [event, user]);

  // Format date helper: "Oct 15, 2026"
  const formatDate = dateStr => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const getDay = dateStr => {
    const d = new Date(dateStr);
    return d.getDate();
  };
  const getMonth = dateStr => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short'
    }).toUpperCase();
  };
  const handleRsvp = async e => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.alert('Please enter the Royal Salon (sign in) before requesting an invitation.');
      return;
    }
    if (rsvpState !== 'none') return;
    setRsvpState('rsvping');
    try {
      const res = await rsvpToEvent(event.id);
      if (res?.success) {
        setRsvpState('rsvped');
        setRsvpCount(prev => prev + 1);
        onRsvpSuccess(res.data || event);
      } else {
        setRsvpState('none');
        window.alert(res?.message || 'Failed to request invitation.');
      }
    } catch (err) {
      console.error(err);
      setRsvpState('none');
      window.alert(err.response?.data?.message || 'An error occurred while reserving your seat.');
    }
  };
  const handleCancelRsvp = async e => {
    e.preventDefault();
    e.stopPropagation();
    if (rsvpState !== 'rsvped') return;
    setRsvpState('rsvping');
    try {
      const res = await cancelRsvpToEvent(event.id);
      if (res?.success) {
        setRsvpState('none');
        setRsvpCount(prev => Math.max(0, prev - 1));
      } else {
        setRsvpState('rsvped');
        window.alert(res?.message || 'Failed to cancel RSVP.');
      }
    } catch (err) {
      console.error(err);
      setRsvpState('rsvped');
      window.alert(err.response?.data?.message || 'An error occurred while canceling your RSVP.');
    }
  };
  const isFull = rsvpCount >= event.capacity;
  return <div className={`royal-card event-card ${rsvpState === 'rsvped' ? 'rsvped-card' : ''}`} id={`event-card-${event.id}`}>
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
              <span>{rsvpCount} / {event.capacity} {t("str_5069", "Attendees")}</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="event-action-footer">
        {rsvpState === 'none' ? isFull ? <button className="royal-btn-disabled rsvp-btn" disabled>
              {t('assembly.fullyBooked')}
            </button> : <button onClick={handleRsvp} className="royal-btn rsvp-btn" id={`rsvp-btn-${event.id}`}>
              {t('home.requestInvitation')}
            </button> : rsvpState === 'rsvping' ? <button className="royal-btn-disabled rsvp-btn" disabled>
            <div className="loader-mini"></div> {t('assembly.reserving')}
          </button> : <div className="rsvped-actions">
            <span className="rsvp-confirmed-tag">
              <CheckCircle2 size={14} /> {t('assembly.rsvpConfirmed')}
            </span>
            <button onClick={handleCancelRsvp} className="rsvp-cancel-link" id={`cancel-rsvp-${event.id}`}>
              {t('assembly.cancelRsvp')}
            </button>
          </div>}
      </div>
    </div>;
};
export default EventCard;