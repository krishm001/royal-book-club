import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import EventCard from '../../components/shared/EventCard';
import { fetchEvents } from '../../services/eventApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './EventsPage.css';

const EventsPage = ({ user }) => {
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = useState('All');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchEvents();
        if (res?.success && Array.isArray(res.data)) {
          setEvents(res.data);
        } else if (Array.isArray(res)) {
          setEvents(res);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error('Failed to load events', err);
        setError('Unable to load active literary gatherings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const types = ['All', 'Litfest', 'Discussion', 'Meetup'];

  const filteredEvents = selectedType === 'All' 
    ? events 
    : events.filter(e => e.type === selectedType);

  return (
    <div className="events-container animate-fade-in">
      {/* Page Header */}
      <header className="events-header">
        <div className="header-badge">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('assembly.literarySalons')}</span>
        </div>
        <h1 className="events-title glow-text">{t('assembly.intellectualBanquets')}</h1>
        <p className="events-subtitle">
          {t('assembly.tagline')}
        </p>
      </header>

      {/* Filter Row */}
      <section className="events-filter-bar royal-card">
        <div className="filter-title-wrapper">
          <Filter size={16} className="gold-glow-icon" />
          <span>{t('assembly.selectSalonType')}:</span>
        </div>
        <div className="filter-tags-group">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`filter-type-btn ${selectedType === type ? 'active' : ''}`}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      {/* Events Grid */}
      <main className="events-grid-main">
        {loading ? (
          <div className="royal-card no-events-card">
            <div className="loader-mini" style={{ marginBottom: '1rem', width: '24px', height: '24px', borderWidth: '3px' }}></div>
            <h3>{t('events.searchingRegistries', 'Searching the Royal Registries...')}</h3>
            <p>{t('events.retrievingActive', 'Retrieving active salon dates and litfests.')}</p>
          </div>
        ) : error ? (
          <div className="royal-card no-events-card">
            <h3>{t('events.registrySearchFailure', 'Registry Search Failure')}</h3>
            <p>{error}</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="events-grid">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} user={user} />
            ))}
          </div>
        ) : (
          <div className="royal-card no-events-card">
            <Calendar size={48} className="no-events-icon" />
            <h3>{t('events.noGatherings', 'No Gatherings Scheduled')}</h3>
            <p>{t('events.noEventsDesc', 'There are currently no elite events scheduled under this specific category. Check back soon.')}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventsPage;
