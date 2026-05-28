import React, { useState } from 'react';
import { Calendar, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import EventCard from '../../components/shared/EventCard';
import './EventsPage.css';

const EventsPage = ({ user }) => {
  const [selectedType, setSelectedType] = useState('All');

  // Premium salon and literary gatherings
  const events = [
    {
      id: 'event-1',
      title: 'Sovereign Reader Autumn Litfest',
      description: 'An elegant evening of tea, sonnets, and philosophical debates on 19th-century gothic romance.',
      date: '2026-10-15',
      time: '18:00',
      location: 'The Velvet Library Lounge',
      type: 'Litfest',
      rsvps: 42,
      capacity: 60,
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'event-2',
      title: 'Wilde & Aestheticism Seminar',
      description: 'A deep dive discussion into the philosophical elements of the Aesthetic movement and Dorian Gray.',
      date: '2026-11-02',
      time: '19:30',
      location: 'Grand Salon Hall',
      type: 'Discussion',
      rsvps: 18,
      capacity: 25,
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'event-3',
      title: 'Poetry Under the Crimson Skylight',
      description: 'An exquisite evening reciting symbolist and romantic poetry with bespoke violin accompaniments.',
      date: '2026-11-20',
      time: '20:00',
      location: 'The Crimson Skylight Conservatory',
      type: 'Meetup',
      rsvps: 30,
      capacity: 30, // Full
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    }
  ];

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
          <span className="gold-gradient-text">LITERARY SALONS & GATHERINGS</span>
        </div>
        <h1 className="events-title glow-text">Intellectual Banquets</h1>
        <p className="events-subtitle">
          Secure your physical invitation to upcoming master-level panels, poetry recitals, and prestigious autumn litfests.
        </p>
      </header>

      {/* Filter Row */}
      <section className="events-filter-bar royal-card">
        <div className="filter-title-wrapper">
          <Filter size={16} className="gold-glow-icon" />
          <span>Select Salon Type:</span>
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
        {filteredEvents.length > 0 ? (
          <div className="events-grid">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="royal-card no-events-card">
            <Calendar size={48} className="no-events-icon" />
            <h3>No Gatherings Scheduled</h3>
            <p>There are currently no elite events scheduled under this specific category. Check back soon.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventsPage;
