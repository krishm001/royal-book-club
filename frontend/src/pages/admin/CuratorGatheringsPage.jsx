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
  ChevronRight,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchEvents, createOrUpdateEvent, deleteEvent } from '../../services/eventApi';
import { uploadBookImage } from '../../services/storageApi';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateFields } from '../../services/translationApi';
import './CuratorGatheringsPage.css';

const CuratorGatheringsPage = ({ user }) => {
  const { t } = useLanguage();
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
  const [imageUrls, setImageUrls] = useState([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Dynamic dynamic translations
  const [titleHi, setTitleHi] = useState('');
  const [descriptionHi, setDescriptionHi] = useState('');
  const [extendedDescriptionHi, setExtendedDescriptionHi] = useState('');
  const [locationHi, setLocationHi] = useState('');
  const [typeHi, setTypeHi] = useState('');

  const [titleKn, setTitleKn] = useState('');
  const [descriptionKn, setDescriptionKn] = useState('');
  const [extendedDescriptionKn, setExtendedDescriptionKn] = useState('');
  const [locationKn, setLocationKn] = useState('');
  const [typeKn, setTypeKn] = useState('');

  const isAdmin = user && user.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    loadEvents();
  }, [isAdmin]);

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
    setImageUrls([]);
    
    // Clear translations
    setTitleHi('');
    setDescriptionHi('');
    setExtendedDescriptionHi('');
    setLocationHi('');
    setTypeHi('');
    setTitleKn('');
    setDescriptionKn('');
    setExtendedDescriptionKn('');
    setLocationKn('');
    setTypeKn('');

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
    setImageUrls(event.imageUrls || []);

    // Load translations
    const translations = event.translations || {};
    setTitleHi(translations.hi?.title || '');
    setDescriptionHi(translations.hi?.description || '');
    setExtendedDescriptionHi(translations.hi?.extendedDescription || '');
    setLocationHi(translations.hi?.location || '');
    setTypeHi(translations.hi?.type || '');

    setTitleKn(translations.kn?.title || '');
    setDescriptionKn(translations.kn?.description || '');
    setExtendedDescriptionKn(translations.kn?.extendedDescription || '');
    setLocationKn(translations.kn?.location || '');
    setTypeKn(translations.kn?.type || '');

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

  const handleGalleryFilesChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploadingGallery(true);
    const uploadedUrls = [];
    for (const file of files) {
      try {
        const url = await uploadBookImage(file);
        uploadedUrls.push(url);
      } catch (err) {
        console.error('Error uploading gallery image:', err);
        alert(`Failed to upload gallery image: ${err.message}`);
      }
    }
    setImageUrls(prev => [...prev, ...uploadedUrls]);
    setIsUploadingGallery(false);
  };

  const handleRemoveGalleryImage = (indexToRemove) => {
    setImageUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleTranslateWithGoogle = async () => {
    if (!title && !type && !location && !description && !extendedDescription) {
      alert("Please fill in some English fields first to translate.");
      return;
    }
    try {
      setIsTranslating(true);
      const fields = {};
      if (title) fields.title = title;
      if (type) fields.type = type;
      if (location) fields.location = location;
      if (description) fields.description = description;
      if (extendedDescription) fields.extendedDescription = extendedDescription;

      const res = await translateFields(fields, ['hi', 'kn']);
      if (res && res.success && res.data) {
        if (res.data.hi) {
          if (res.data.hi.title) setTitleHi(res.data.hi.title);
          if (res.data.hi.type) setTypeHi(res.data.hi.type);
          if (res.data.hi.location) setLocationHi(res.data.hi.location);
          if (res.data.hi.description) setDescriptionHi(res.data.hi.description);
          if (res.data.hi.extendedDescription) setExtendedDescriptionHi(res.data.hi.extendedDescription);
        }
        if (res.data.kn) {
          if (res.data.kn.title) setTitleKn(res.data.kn.title);
          if (res.data.kn.type) setTypeKn(res.data.kn.type);
          if (res.data.kn.location) setLocationKn(res.data.kn.location);
          if (res.data.kn.description) setDescriptionKn(res.data.kn.description);
          if (res.data.kn.extendedDescription) setExtendedDescriptionKn(res.data.kn.extendedDescription);
        }
      } else {
        alert("Translation api returned failure state. Using default local fallback.");
      }
    } catch (err) {
      console.error("Translation failed:", err);
      alert("Error invoking Google Translation. Continuing offline.");
    } finally {
      setIsTranslating(false);
    }
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
        imageUrls: imageUrls,
        rsvps: currentEvent?.rsvps || [],
        translations: {
          hi: {
            title: titleHi.trim(),
            description: descriptionHi.trim(),
            extendedDescription: extendedDescriptionHi.trim(),
            location: locationHi.trim(),
            type: typeHi.trim()
          },
          kn: {
            title: titleKn.trim(),
            description: descriptionKn.trim(),
            extendedDescription: extendedDescriptionKn.trim(),
            location: locationKn.trim(),
            type: typeKn.trim()
          }
        }
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

  if (!isAdmin) {
    return (
      <div className="admin-access-denied-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <Shield size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">Privileged Sanctuary</h2>
          <p className="denied-message">
            Your current credentials do not grant access to the Curator Curation registry. Curation of the Royal Library is reserved for assigned Curators.
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
    <div className="curator-gatherings-container animate-fade-in">
      <header className="curator-gatherings-header">
        <Link to="/admin" className="back-link">
          <ArrowLeft size={16} /> {t('admin.backToConsole', 'Curator Console')}
        </Link>
        <div className="header-badge-curator">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('admin.gatheringCuration', 'GATHERING CURATION')}</span>
        </div>
        <h1 className="curator-gatherings-title glow-text">{t('admin.gatheringsRegistry', 'Sovereign Gatherings Registry')}</h1>
        <p className="curator-gatherings-subtitle">
          {t('admin.gatheringsDesc', 'Schedule upcoming meetups, literary festivals, and symposiums. Manage flyer assets and seat reservations.')}
        </p>
      </header>

      {isEditing ? (
        <section className="event-edit-section royal-card animate-fade-in">
          <div className="edit-section-header">
            <h3>{currentEvent ? t('admin.refineGathering', 'Refine Sovereign Gathering') : t('admin.establishGathering', 'Establish Gathering')}</h3>
            <button onClick={() => setIsEditing(false)} className="royal-btn-secondary mini-btn">{t('admin.cancel', 'Cancel')}</button>
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

            <div className="translation-section-divider" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', margin: '25px 0 15px' }}>
              <div>
                <h4 className="translation-header gold-gradient-text" style={{ margin: '0 0 5px', fontSize: '1.1rem', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}>
                  <Sparkles size={14} style={{ marginRight: '6px' }} /> {t('admin.hiKnLocalization', 'HI / KN LOCALIZATION OVERRIDES')}
                </h4>
                <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0 }}>
                  {t('admin.hiKnLocalizationDesc', 'Optional: Supply dynamic Rajasthani Hindi and Classical Kannada overrides for scholarly accuracy.')}
                </p>
              </div>
              <button
                type="button"
                className="royal-btn premium-btn"
                onClick={handleTranslateWithGoogle}
                disabled={isTranslating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, var(--gold), var(--accent))',
                  color: '#000',
                  fontWeight: '600',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: isTranslating ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(212,175,55,0.2)'
                }}
              >
                <Sparkles size={16} className={isTranslating ? "animate-spin" : ""} />
                {isTranslating ? t('admin.translating', 'Translating...') : t('admin.translateBtn', 'Translate with Google')}
              </button>
            </div>

            <div className="translation-panel-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px', marginBottom: '20px' }}>
              {/* Hindi Column */}
              <div className="translation-column-hi">
                <h5 style={{ color: 'var(--accent)', marginBottom: '12px', fontSize: '0.95rem' }}>Hindi (राजस्थानी राजसी शैली)</h5>
                <div className="form-group">
                  <label className="royal-label">Sovereign Title (Hindi)</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={titleHi}
                    onChange={(e) => setTitleHi(e.target.value)}
                    placeholder="e.g. विक्टोरियन सौंदर्यशास्त्र और वाइल्डियन नैतिकता"
                  />
                </div>
                <div className="form-group">
                  <label className="royal-label">Event Type (Hindi)</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={typeHi}
                    onChange={(e) => setTypeHi(e.target.value)}
                    placeholder="e.g. राजसी सभा"
                  />
                </div>
                <div className="form-group">
                  <label className="royal-label">Lounge / Hall Location (Hindi)</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={locationHi}
                    onChange={(e) => setLocationHi(e.target.value)}
                    placeholder="e.g. स्वर्णिम राजसी अध्ययन कक्ष"
                  />
                </div>
                <div className="form-group">
                  <label className="royal-label">Short Summary (Hindi)</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={descriptionHi}
                    onChange={(e) => setDescriptionHi(e.target.value)}
                    placeholder="e.g. सभा का संक्षिप्त सारांश..."
                  />
                </div>
                <div className="form-group">
                  <label className="royal-label">Detailed Description (Hindi)</label>
                  <textarea
                    className="royal-input event-textarea"
                    style={{ minHeight: '100px' }}
                    value={extendedDescriptionHi}
                    onChange={(e) => setExtendedDescriptionHi(e.target.value)}
                    placeholder="e.g. सभा की विस्तृत रूपरेखा..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Kannada Column */}
              <div className="translation-column-kn">
                <h5 style={{ color: 'var(--accent)', marginBottom: '12px', fontSize: '0.95rem' }}>Kannada (ಶಾಸ್ತ್ರೀಯ ಶೈಲಿ)</h5>
                <div className="form-group">
                  <label className="royal-label">Sovereign Title (Kannada)</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={titleKn}
                    onChange={(e) => setTitleKn(e.target.value)}
                    placeholder="e.g. ವಿಕ್ಟೋರಿಯನ್ ಸೌಂದರ್ಯಶಾಸ್ತ್ರ"
                  />
                </div>
                <div className="form-group">
                  <label className="royal-label">Event Type (Kannada)</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={typeKn}
                    onChange={(e) => setTypeKn(e.target.value)}
                    placeholder="e.g. ರಾಜಸಿ ಸಭೆ"
                  />
                </div>
                <div className="form-group">
                  <label className="royal-label">Lounge / Hall Location (Kannada)</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={locationKn}
                    onChange={(e) => setLocationKn(e.target.value)}
                    placeholder="e.g. ಸುವರ್ಣ ಗ್ರಂಥಾಲಯ ಸಭೆ"
                  />
                </div>
                <div className="form-group">
                  <label className="royal-label">Short Summary (Kannada)</label>
                  <input
                    type="text"
                    className="royal-input"
                    value={descriptionKn}
                    onChange={(e) => setDescriptionKn(e.target.value)}
                    placeholder="e.g. ಸಭೆಯ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆ..."
                  />
                </div>
                <div className="form-group">
                  <label className="royal-label">Detailed Description (Kannada)</label>
                  <textarea
                    className="royal-input event-textarea"
                    style={{ minHeight: '100px' }}
                    value={extendedDescriptionKn}
                    onChange={(e) => setExtendedDescriptionKn(e.target.value)}
                    placeholder="e.g. ಸಭೆಯ ಸಂಪೂರ್ಣ ವಿವರಣೆ..."
                    rows={3}
                  />
                </div>
              </div>
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

            <div className="form-group">
              <label className="royal-label">Assembly Gallery Images</label>
              <div className="gallery-upload-wrapper">
                <input
                  type="file"
                  id="event-gallery-files"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryFilesChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="event-gallery-files" className="flyer-upload-trigger" style={{ marginBottom: '15px' }}>
                  <Upload size={16} /> {isUploadingGallery ? 'Uploading to Archives...' : 'Choose Gallery Images (Multiple)'}
                </label>
                
                {imageUrls && imageUrls.length > 0 && (
                  <div className="gallery-previews-grid">
                    {imageUrls.map((url, idx) => (
                      <div className="gallery-preview-item" key={idx}>
                        <img src={url} alt={`Gallery Preview ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-gallery-img-btn"
                          onClick={() => handleRemoveGalleryImage(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
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
                {isSaving ? (isUploading ? t('admin.uploadingBanner', 'Uploading Banner...') : t('admin.recordingRegistry', 'Recording Registry...')) : t('admin.save', 'Commit to Registry')}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="events-registry-list-section">
          <div className="registry-actions">
            <button onClick={handleCreateNew} className="royal-btn add-gathering-btn">
              <Plus size={16} /> {t('admin.newGatheringBtn', 'New Salon Gathering')}
            </button>
          </div>

          {loading ? (
            <div className="loading-boundary">
              <div className="loader-mini"></div>
              <p>{t('admin.indexingSalon', 'Re-indexing Salon registries...')}</p>
            </div>
          ) : events.length > 0 ? (
            <div className="registry-table-wrapper royal-card">
              <table className="registry-table">
                <thead>
                  <tr>
                    <th>{t('admin.gatheringCol', 'Gathering')}</th>
                    <th>{t('admin.typeCol', 'Type')}</th>
                    <th>{t('admin.dateTimeCol', 'Date & Time')}</th>
                    <th>{t('admin.seatCapacityCol', 'Seat Capacity')}</th>
                    <th>{t('admin.rsvpsCol', 'RSVPs')}</th>
                    <th>{t('admin.actionsCol', 'Actions')}</th>
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
                      <td>{evt.capacity} {t('admin.seats', 'seats')}</td>
                      <td>
                        <span className="table-rsvp-count">
                          <Users size={12} /> {evt.rsvps?.length || 0} {t('admin.registered', 'registered')}
                        </span>
                      </td>
                      <td className="table-actions-cell">
                        <button onClick={() => handleEdit(evt)} className="table-action-btn edit-btn" title={t('admin.edit', 'Refine')}>
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(evt.id)} className="table-action-btn delete-btn" title={t('admin.delete', 'Dissolve')}>
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
              <h3>{t('admin.noGatherings', 'No Salon Gatherings Scheduled')}</h3>
              <p>{t('admin.noGatheringsDesc', 'No literary events or dinners have been recorded. Design a new gathering prospectus!')}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default CuratorGatheringsPage;
