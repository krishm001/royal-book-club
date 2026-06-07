import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Sparkles, 
  ArrowLeft, 
  Image,
  Upload,
  User,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchEvents, createOrUpdateEvent, deleteEvent } from '../../services/eventApi';
import { uploadBookImage } from '../../services/storageApi';
import './CuratorGatheringsPage.css';

const CuratorGatheringsPage = ({ user }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [extendedDescription, setExtendedDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('Salon Meetup');
  const [curator, setCurator] = useState('');
  const [capacity, setCapacity] = useState(50);
  const [imageUrl, setImageUrl] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await fetchEvents();
      if (res && res.success) {
        setEvents(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentEvent(null);
    setTitle('');
    setDescription('');
    setExtendedDescription('');
    setDate('');
    setTime('');
    setLocation('');
    setAddress('');
    setType('Salon Meetup');
    setCurator(user?.displayName || '');
    setCapacity(50);
    setImageUrl('');
    setCoverFile(null);
    setCoverPreview('');
    setIsEditing(true);
  };

  const handleEdit = (event) => {
    setCurrentEvent(event);
    setTitle(event.title || '');
    setDescription(event.description || '');
    setExtendedDescription(event.extendedDescription || '');
    setDate(event.date || '');
    setTime(event.time || '');
    setLocation(event.location || '');
    setAddress(event.address || '');
    setType(event.type || 'Salon Meetup');
    setCurator(event.curator || '');
    setCapacity(event.capacity || 50);
    setImageUrl(event.imageUrl || '');
    setCoverFile(null);
    setCoverPreview(event.imageUrl || '');
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you wish to delete this exquisite gathering? This action is irreversible.')) {
      return;
    }

    try {
      const res = await deleteEvent(id);
      if (res && res.success) {
        setEvents(events.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to dissolve the gathering. Check backend permissions.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      let uploadedUrl = imageUrl;

      if (coverFile) {
        setIsUploading(true);
        try {
          uploadedUrl = await uploadBookImage(coverFile);
        } catch (uploadErr) {
          alert(`Banner Image Upload Failed: ${uploadErr.message}`);
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const payload = {
        id: currentEvent?.id || null,
        title: title.trim(),
        description: description.trim(),
        extendedDescription: extendedDescription.trim(),
        date,
        time: time.trim(),
        location: location.trim(),
        address: address.trim(),
        type,
        curator: curator.trim(),
        capacity: parseInt(capacity) || 50,
        imageUrl: uploadedUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80',
        rsvps: currentEvent?.rsvps || []
      };

      const res = await createOrUpdateEvent(payload);
      if (res && res.success) {
        setIsEditing(false);
        loadEvents();
      }
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Failed to save gathering details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="curator-gatherings-container animate-fade-in">
      <header className="curator-gatherings-header">
        <Link to="/admin" className="back-link">
          <ArrowLeft size={16} /> Curator Console
        </Link>
        <div className="header-badge-curator">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">GATHERING CURATION</span>
        </div>
        <h1 className="curator-gatherings-title glow-text">Salon Gatherings Registry</h1>
        <p className="curator-gatherings-subtitle">
          Schedule upcoming meetups, literary festivals, and academic symposiums. Upload banners, assign spaces, and monitor patron rsvps.
        </p>
      </header>

      {isEditing ? (
        <section className="event-edit-section royal-card animate-fade-in">
          <div className="edit-section-header">
            <h3>{currentEvent ? 'Refine Sovereign Gathering' : 'Schedule New Salon Gathering'}</h3>
            <button onClick={() => setIsEditing(false)} className="royal-btn-secondary mini-btn">Cancel</button>
          </div>

          <form onSubmit={handleSave} className="event-edit-form">
            <div className="form-group">
              <label className="royal-label">Gathering Prospectus Title</label>
              <input
                type="text"
                className="royal-input"
                placeholder="e.g. Victorian Aesthetics and Wildean Morals"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label className="royal-label">Event Type</label>
                <select 
                  className="royal-input royal-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value="Litfest">Literary Festival</option>
                  <option value="Discussion">Discussion Panel</option>
                  <option value="Salon Meetup">Salon Meetup</option>
                  <option value="Sovereign Dinner">Sovereign Dinner</option>
                  <option value="Symposium">Academic Symposium</option>
                </select>
              </div>

              <div className="form-group">
                <label className="royal-label">Curator-in-Charge</label>
                <input
                  type="text"
                  className="royal-input"
                  placeholder="Curator Name"
                  value={curator}
                  onChange={(e) => setCurator(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label className="royal-label">Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  className="royal-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="royal-label">Time / Duration</label>
                <input
                  type="text"
                  className="royal-input"
                  placeholder="e.g. 18:00 - 20:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label className="royal-label">Sovereign Capacity (Patron seats)</label>
                <input
                  type="number"
                  className="royal-input"
                  placeholder="50"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="royal-label">Lounge / Hall Location</label>
                <input
                  type="text"
                  className="royal-input"
                  placeholder="e.g. The Gilded Library Hall"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="royal-label">Address Directions</label>
              <input
                type="text"
                className="royal-input"
                placeholder="e.g. 45 Park Lane, Mayfair, London"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="royal-label">Short Summary (Visible on card)</label>
              <input
                type="text"
                className="royal-input"
                placeholder="Brief single-sentence essence of the gathering..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="royal-label">Detailed Prospectus Description</label>
              <textarea
                className="royal-input event-textarea"
                placeholder="Outline full schedule, featured panel speakers, curated wine lists, and detailed guidelines..."
                value={extendedDescription}
                onChange={(e) => setExtendedDescription(e.target.value)}
                required
                rows={6}
              />
            </div>

            <div className="form-group">
              <label className="royal-label">Flyer Cover Banner</label>
              <div className="flyer-upload-zone-gatherings">
                <input
                  type="file"
                  id="event-flyer-file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="event-flyer-file" className="flyer-upload-trigger">
                  <Upload size={16} /> Choose Image File
                </label>
                {coverPreview && (
                  <div className="flyer-upload-preview-gatherings">
                    <img src={coverPreview} alt="Flyer Preview" />
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                disabled={isSaving}
                className="royal-btn submit-event-btn"
              >
                {isSaving ? (isUploading ? 'Uploading Banner...' : 'Recording Registry...') : 'Commit to Registry'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="events-registry-list-section">
          <div className="registry-actions">
            <button onClick={handleCreateNew} className="royal-btn add-gathering-btn">
              <Plus size={16} /> New Salon Gathering
            </button>
          </div>

          {loading ? (
            <div className="loading-boundary">
              <div className="loader-mini"></div>
              <p>Re-indexing Salon registries...</p>
            </div>
          ) : events.length > 0 ? (
            <div className="registry-table-wrapper royal-card">
              <table className="registry-table">
                <thead>
                  <tr>
                    <th>Gathering</th>
                    <th>Type</th>
                    <th>Date & Time</th>
                    <th>Seat Capacity</th>
                    <th>RSVPs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt) => (
                    <tr key={evt.id} className="registry-row">
                      <td className="table-event-cell">
                        <div className="table-event-info">
                          <img src={evt.imageUrl} alt={evt.title} className="table-event-img" />
                          <div>
                            <span className="table-event-title">{evt.title}</span>
                            <span className="table-event-location"><MapPin size={10} /> {evt.location}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="table-event-type-badge">{evt.type}</span>
                      </td>
                      <td>
                        <div className="table-event-datetime">
                          <span><Calendar size={12} /> {evt.date}</span>
                          <span><Clock size={12} /> {evt.time}</span>
                        </div>
                      </td>
                      <td>{evt.capacity} seats</td>
                      <td>
                        <span className="table-rsvp-count">
                          <Users size={12} /> {evt.rsvps?.length || 0} registered
                        </span>
                      </td>
                      <td className="table-actions-cell">
                        <button onClick={() => handleEdit(evt)} className="table-action-btn edit-btn" title="Refine">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(evt.id)} className="table-action-btn delete-btn" title="Dissolve">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="royal-card no-gatherings-fallback">
              <Calendar size={48} className="fallback-icon" />
              <h3>No Salon Gatherings Scheduled</h3>
              <p>No literary events or dinners have been recorded. Design a new gathering prospectus!</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default CuratorGatheringsPage;
