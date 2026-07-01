import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, MapPin, Clock, Users, Calendar, HelpCircle, CheckCircle, Info } from 'lucide-react';
import { fetchEventById, rsvpToEvent, cancelRsvpToEvent } from '../../services/eventApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './EventDetailPage.css';

const EventDetailPage = ({ user }) => {
  const { language, t, getLocalized } = useLanguage();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [activeImageUrl, setActiveImageUrl] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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
          setActiveImageUrl(res.data.imageUrl || '');
          setRsvpState(isUserRsvped(res.data) ? 'rsvped' : 'none');
        } else {
          setError(t('assembly.errorRetrieve', 'We could not retrieve details for this specific literary gathering.'));
        }
      } catch (err) {
        console.error('Failed to load event details', err);
        setError(t('assembly.errorLoad', 'Unable to load gathering details. This salon might have been adjourned.'));
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
      window.alert(t('assembly.signinRequired', 'Please enter the Royal Salon (sign in) before requesting an invitation.'));
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
        window.alert(res?.message || t('assembly.errorRegisterReservation', 'Failed to register reservation.'));
      }
    } catch (err) {
      console.error(err);
      setRsvpState('none');
      window.alert(err.response?.data?.message || t('assembly.errorUnableRegister', 'Unable to register reservation.'));
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
        window.alert(res?.message || t('assembly.errorCancelReservation', 'Failed to cancel reservation.'));
      }
    } catch (err) {
      console.error(err);
      setRsvpState('rsvped');
      window.alert(err.response?.data?.message || t('assembly.errorUnableCancel', 'Unable to cancel reservation.'));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const allImages = event ? [event.imageUrl, ...(event.imageUrls || [])].filter(Boolean) : [];

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setLightboxIndex(prev => (prev + 1) % allImages.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev => (prev - 1 + allImages.length) % allImages.length);
      } else if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, allImages.length]);

  if (loading) {
    return (
      <div className="event-detail-container animate-fade-in">
        <Link to="/events" className="back-link">
          <ArrowLeft size={16} /> {t('assembly.checkOthers', 'Return to Gatherings')}
        </Link>
        <div className="royal-card no-results-card" style={{ padding: '5rem 2rem' }}>
          <div className="loader-mini" style={{ marginBottom: '1rem' }}></div>
          <p>{t('assembly.consultingLedger', 'Consulting the Royal ledger for gathering details...')}</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-detail-container animate-fade-in">
        <Link to="/events" className="back-link">
          <ArrowLeft size={16} /> {t('assembly.checkOthers', 'Return to Gatherings')}
        </Link>
        <div className="royal-card no-results-card" style={{ padding: '5rem 2rem' }}>
          <HelpCircle size={48} className="no-events-icon" />
          <h3>{t('assembly.assemblyAdjourned', 'Assembly Adjourned')}</h3>
          <p>{error || t('assembly.notLocalized', 'This assembly could not be localized within our registers.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-detail-container animate-fade-in">
      {/* Back button */}
      <Link to="/events" className="back-link">
        <ArrowLeft size={16} /> {t('assembly.checkOthers', 'Return to Gatherings')}
      </Link>

      <div className="event-detail-grid">
        {/* Left Side: Cover and Basic metadata card */}
        <div className="event-detail-visual">
          <div className="royal-card event-visual-card">
            <div className="event-detail-img-container" onClick={() => {
              const currentIndex = allImages.indexOf(activeImageUrl);
              setLightboxIndex(currentIndex >= 0 ? currentIndex : 0);
              setIsLightboxOpen(true);
            }} style={{ cursor: 'pointer' }}>
              <img src={activeImageUrl || event.imageUrl} alt={getLocalized(event, 'title')} className="detail-event-img" />
              <div className="detail-event-badge">{getLocalized(event, 'type')}</div>
            </div>

            {allImages.length > 1 && (
              <div className="gallery-thumbnail-strip">
                {allImages.map((imgUrl, index) => (
                  <div 
                    key={index} 
                    className={`gallery-thumbnail-item ${activeImageUrl === imgUrl ? 'active' : ''}`}
                    onClick={() => setActiveImageUrl(imgUrl)}
                    onMouseEnter={() => setActiveImageUrl(imgUrl)}
                  >
                    <img src={imgUrl} alt={`${t('assembly.thumbnail', 'Thumbnail')} ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}

            {allImages.length > 0 && (
              <button 
                type="button" 
                className="royal-btn display-all-images-btn" 
                onClick={() => {
                  const currentIndex = allImages.indexOf(activeImageUrl);
                  setLightboxIndex(currentIndex >= 0 ? currentIndex : 0);
                  setIsLightboxOpen(true);
                }}
              >
                <Sparkles size={14} /> {t('assembly.displayAllImages')}
              </button>
            )}
            
            <div className="event-quick-specs">
              <div className="quick-spec-item">
                <Calendar size={18} className="spec-icon" />
                <div>
                  <span className="spec-title">{t('assembly.date')}</span>
                  <span className="spec-detail">{formatDate(event.date)}</span>
                </div>
              </div>
              <div className="quick-spec-item">
                <Clock size={18} className="spec-icon" />
                <div>
                  <span className="spec-title">{t('assembly.time', 'Timing')}</span>
                  <span className="spec-detail">{event.time}</span>
                </div>
              </div>
              <div className="quick-spec-item">
                <MapPin size={18} className="spec-icon" />
                <div>
                  <span className="spec-title">{t('assembly.location')}</span>
                  <span className="spec-detail">{getLocalized(event, 'location')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Informative Body */}
        <div className="event-detail-info-panel royal-card">
          <header className="event-info-header">
            <span className="curator-info">{t('assembly.curatedBy')} <strong className="gold-gradient-text">{event.curator || t('assembly.royalCurators', 'The Royal Curators')}</strong></span>
            <h1 className="event-detail-title glow-text">{getLocalized(event, 'title')}</h1>
          </header>

          <section className="event-description-body">
            <h3>{t('assembly.gatheringProspectus')}</h3>
            <p className="brief-lead">{getLocalized(event, 'description')}</p>
            <p className="extended-desc">{getLocalized(event, 'extendedDescription') || t('assembly.noDescription', 'No further description is available for this gathering.')}</p>
          </section>

          <section className="venue-details-section">
            <h4 className="detail-subheading">{t('assembly.venueDirections')}</h4>
            <p className="address-details">{getLocalized(event, 'address') || t('assembly.privateChambers', 'In the Private Library Chambers')}</p>
            <div className="venue-simulation-map">
              <Info size={14} /> {t('assembly.simulationMapDesc', 'Localized within the exclusive, gated private halls of the Royal Book Club estate.')}
            </div>
          </section>

          {/* RSVP Status Block */}
          <footer className="event-rsvp-cta-block">
            <div className="rsvp-capacity-tracker">
              <Users size={16} className="gold-glow-icon" />
              <span>{t('assembly.currentRegistrations')}: <strong>{getRsvpCount(event)}</strong> / <strong>{event.capacity || 50}</strong> {t('assembly.patronsCountLabel', 'Patrons')}</span>
            </div>

            <div className="rsvp-action-trigger">
              {rsvpState === 'none' ? (
                (getRsvpCount(event) >= (event.capacity || 50)) ? (
                  <button className="royal-btn-disabled rsvp-submit-btn" disabled>
                    {t('assembly.fullyBooked', 'Fully Booked')}
                  </button>
                ) : (
                  <button onClick={handleRsvp} className="royal-btn rsvp-submit-btn" id="event-detail-rsvp-btn">
                    {t('assembly.claimSeat', 'Claim Seat Invitation')}
                  </button>
                )
              ) : rsvpState === 'rsvping' ? (
                <button className="royal-btn-disabled rsvp-submit-btn" disabled>
                  <div className="loader-mini"></div> {t('assembly.reserving', 'Authorizing Attendance...')}
                </button>
              ) : (
                <div className="rsvp-success-banner">
                  <div className="success-header">
                    <CheckCircle size={20} className="success-icon" />
                    <div>
                      <h4>{t('assembly.invitationAuthorized')}</h4>
                      <p>{t('assembly.registeredFoyerDesc', 'Your name is registered on the salon ledger. Please present your digital token at the foyer.')}</p>
                    </div>
                  </div>
                  <button onClick={handleCancelRsvp} className="cancel-rsvp-trigger-btn" id="event-detail-cancel-rsvp-btn">
                    {t('assembly.relinquishInvitations')}
                  </button>
                </div>
              )}
            </div>
          </footer>
        </div>
      </div>

      {/* Immersive Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fullscreen-lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
          <button 
            className="lightbox-close-btn" 
            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
          >
            ✕
          </button>
          
          <button 
            className="lightbox-nav-btn prev-btn" 
            onClick={(e) => { 
              e.stopPropagation(); 
              setLightboxIndex(prev => (prev - 1 + allImages.length) % allImages.length); 
            }}
          >
            ‹
          </button>
          
          <div className="lightbox-content-wrapper" onClick={(e) => e.stopPropagation()}>
            <img 
              src={allImages[lightboxIndex]} 
              alt={`${t('assembly.galleryImage', 'Gallery Image')} ${lightboxIndex + 1}`} 
              className="lightbox-main-img animate-fade-in" 
            />
            <div className="lightbox-caption">
              {t('assembly.imageCountPrefix', 'Image')} {lightboxIndex + 1} {t('assembly.imageCountSeparator', 'of')} {allImages.length}
            </div>
          </div>
          
          <button 
            className="lightbox-nav-btn next-btn" 
            onClick={(e) => { 
              e.stopPropagation(); 
              setLightboxIndex(prev => (prev + 1) % allImages.length); 
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;
