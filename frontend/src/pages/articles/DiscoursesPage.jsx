import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Send, 
  Calendar, 
  Clock, 
  Award, 
  PenTool, 
  Search, 
  ChevronRight, 
  BookText, 
  HelpCircle, 
  User, 
  Image, 
  MessageCircle, 
  Plus, 
  X, 
  ArrowLeft,
  BookOpen,
  Trash2
} from 'lucide-react';
import { 
  fetchDiscourses, 
  fetchDiscourseById, 
  publishDiscourse, 
  commentOnChronicle, 
  replyToDebate,
  updateDiscourse,
  deleteDiscourse
} from '../../services/discourseApi';
import { fetchBlogHouses } from '../../services/genreApi';
import { uploadBookImage } from '../../services/storageApi';
import RichTextEditor from '../../components/shared/RichTextEditor';
import './DiscoursesPage.css';

const DiscoursesPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('CHRONICLE'); // 'CHRONICLE' or 'DEBATE'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [houses, setHouses] = useState([]);
  const [discourses, setDiscourses] = useState([]);
  const [selectedChronicle, setSelectedChronicle] = useState(null);
  const [chronicleDetail, setChronicleDetail] = useState(null);
  const [chronicleComments, setChronicleComments] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [editingDiscourse, setEditingDiscourse] = useState(null);
  const [formType, setFormType] = useState('CHRONICLE'); // 'CHRONICLE' or 'DEBATE'
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Debate expanded and nested reply states
  const [expandedDebate, setExpandedDebate] = useState(null);
  const [debateReplies, setDebateReplies] = useState([]);
  const [replyInputId, setReplyInputId] = useState(null); // ID of reply/debate being replied to
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Load basic data
  useEffect(() => {
    loadDiscourses();
    loadHouses();
  }, [activeTab]);

  const loadDiscourses = async () => {
    try {
      setLoading(true);
      const res = await fetchDiscourses(activeTab);
      if (res && res.success) {
        setDiscourses(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching discourses:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHouses = async () => {
    try {
      const res = await fetchBlogHouses();
      if (res && res.success) {
        setHouses(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedHouse(res.data[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching blog houses:', err);
    }
  };

  const handleOpenChronicle = async (chronicle) => {
    setSelectedChronicle(chronicle);
    setLoadingDetail(true);
    try {
      const res = await fetchDiscourseById(chronicle.id);
      if (res && res.success) {
        setChronicleDetail(res.data.discourse);
        setChronicleComments(res.data.responses || []);
      }
    } catch (err) {
      console.error('Error loading chronicle details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseChronicle = () => {
    setSelectedChronicle(null);
    setChronicleDetail(null);
    setChronicleComments([]);
    setCommentText('');
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      const res = await commentOnChronicle(selectedChronicle.id, {
        content: commentText.trim()
      });
      if (res && res.success) {
        setChronicleComments([res.data, ...chronicleComments]);
        setCommentText('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
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

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleaned = tagInput.trim().toLowerCase().replace(/[^a-zA-Z0-9-]/g, '');
      if (cleaned && !tagsList.includes(cleaned)) {
        setTagsList([...tagsList, cleaned]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTagsList(tagsList.filter(t => t !== tagToRemove));
  };

  const handleStartEdit = (discourse) => {
    setEditingDiscourse(discourse);
    setFormType(discourse.type);
    setTitle(discourse.title || '');
    setContent(discourse.content || '');
    if (discourse.type === 'CHRONICLE') {
      setSelectedHouse(discourse.house || (houses.length > 0 ? houses[0].name : ''));
      setTagsList(discourse.tags || []);
      setCoverPreview(discourse.coverUrl || '');
    } else {
      setCoverPreview('');
    }
    setIsCreating(true);
    handleCloseChronicle();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !user || isPublishing) return;

    try {
      setIsPublishing(true);
      let uploadedCoverUrl = editingDiscourse?.coverUrl || '';

      if (formType === 'CHRONICLE' && coverFile) {
        setIsUploading(true);
        try {
          uploadedCoverUrl = await uploadBookImage(coverFile);
        } catch (uploadErr) {
          alert(`Cover Upload Failed: ${uploadErr.message}`);
          setIsPublishing(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const payload = {
        type: formType,
        title: title.trim(),
        content: content,
        house: formType === 'CHRONICLE' ? selectedHouse : '',
        tags: formType === 'CHRONICLE' ? tagsList : [],
        coverUrl: uploadedCoverUrl || (formType === 'CHRONICLE' ? 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80' : '')
      };

      let res;
      if (editingDiscourse) {
        res = await updateDiscourse(editingDiscourse.id, payload);
      } else {
        res = await publishDiscourse(payload);
      }

      if (res && res.success) {
        setIsCreating(false);
        resetForm();
        loadDiscourses();
      }
    } catch (err) {
      console.error('Error saving discourse:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTagsList([]);
    setTagInput('');
    setCoverFile(null);
    setCoverPreview('');
    setEditingDiscourse(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you certain you wish to purge this academic discourse? This action is irreversible and will also remove all associated comments or replies.")) {
      return;
    }
    try {
      const res = await deleteDiscourse(id);
      if (res && res.success) {
        handleCloseChronicle();
        setExpandedDebate(null);
        loadDiscourses();
      } else {
        alert(res?.message || "Failed to delete discourse");
      }
    } catch (err) {
      console.error('Failed to delete discourse:', err);
      alert("Error deleting discourse");
    }
  };

  // Debates
  const handleOpenDebate = async (debate) => {
    if (expandedDebate?.id === debate.id) {
      setExpandedDebate(null);
      setDebateReplies([]);
      return;
    }
    setExpandedDebate(debate);
    setDebateReplies([]);
    try {
      const res = await fetchDiscourseById(debate.id);
      if (res && res.success) {
        setDebateReplies(res.data.responses || []);
      }
    } catch (err) {
      console.error('Error fetching debate replies:', err);
    }
  };

  const handlePostReply = async (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim() || !user || isSubmittingReply) return;

    try {
      setIsSubmittingReply(true);
      const res = await replyToDebate(parentId, {
        content: replyText.trim()
      });
      if (res && res.success) {
        setDebateReplies([...debateReplies, res.data]);
        setReplyText('');
        setReplyInputId(null);
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const filteredDiscourses = discourses.filter(disc => {
    const titleMatch = disc.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const contentMatch = disc.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const authorMatch = disc.authorName?.toLowerCase().includes(searchQuery.toLowerCase());
    const houseMatch = disc.house?.toLowerCase().includes(searchQuery.toLowerCase());
    const tagsMatch = disc.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return titleMatch || contentMatch || authorMatch || houseMatch || tagsMatch;
  });

  // Construct debate threaded replies locally
  const buildThreadedReplies = () => {
    // Top-level replies to the root debate
    const rootReplies = debateReplies.filter(r => r.parentId === expandedDebate.id);
    const replyChildrenMap = {};
    debateReplies.forEach(r => {
      if (r.parentId !== expandedDebate.id) {
        if (!replyChildrenMap[r.parentId]) {
          replyChildrenMap[r.parentId] = [];
        }
        replyChildrenMap[r.parentId].push(r);
      }
    });

    const renderReplyNode = (reply, depth = 0) => {
      const children = replyChildrenMap[reply.id] || [];
      return (
        <div key={reply.id} className="debate-reply-node" style={{ marginLeft: `${Math.min(depth * 20, 100)}px` }}>
          <div className="debate-reply-card royal-card glassmorphic">
            <div className="reply-header">
              <div className="reply-author-info">
                {reply.authorPhotoUrl ? (
                  <img src={reply.authorPhotoUrl} alt={reply.authorName} className="reply-avatar" />
                ) : (
                  <div className="reply-avatar-fallback"><User size={12} /></div>
                )}
                <span className="reply-author-name gold-gradient-text">{reply.authorName}</span>
              </div>
              <span className="reply-date">
                {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
              </span>
            </div>
            <p className="reply-text-content">{reply.content}</p>
            
            {user && (
              <div className="reply-actions">
                <button 
                  onClick={() => {
                    setReplyInputId(replyInputId === reply.id ? null : reply.id);
                    setReplyText('');
                  }} 
                  className="reply-trigger-btn"
                >
                  <MessageCircle size={12} /> Reply
                </button>
              </div>
            )}

            {replyInputId === reply.id && (
              <form onSubmit={(e) => handlePostReply(e, reply.id)} className="reply-submit-form animate-fade-in">
                <input
                  type="text"
                  placeholder={`Reply to ${reply.authorName}...`}
                  className="royal-input reply-input"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                  autoFocus
                />
                <button type="submit" disabled={isSubmittingReply} className="royal-btn reply-btn">
                  <Send size={12} />
                </button>
              </form>
            )}
          </div>
          {children.length > 0 && (
            <div className="nested-replies-container">
              <div className="nested-connector-line"></div>
              <div className="nested-replies-list">
                {children.map(child => renderReplyNode(child, depth + 1))}
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="debate-discussion-tree">
        {rootReplies.length > 0 ? (
          rootReplies.map(reply => renderReplyNode(reply, 0))
        ) : (
          <div className="no-replies-placeholder">
            <HelpCircle size={24} className="gold-glow-icon" />
            <p>No opinions voiced yet. Share your sovereign intellectual stance first!</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="discourses-page-container animate-fade-in">
      
      {/* Immersive Chronicle Detailed Modal */}
      {selectedChronicle && (
        <div className="focal-detail-overlay animate-fade-in" onClick={handleCloseChronicle}>
          <div className="focal-detail-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="focal-close-btn" onClick={handleCloseChronicle}>
              <X size={20} />
            </button>
            
            {loadingDetail ? (
              <div className="focal-loading">
                <div className="loader-mini"></div>
                <p>Retrieving sacred chronicles...</p>
              </div>
            ) : chronicleDetail ? (
              <div className="focal-content-scroll">
                <div className="focal-cover-frame">
                  <img src={chronicleDetail.coverUrl} alt={chronicleDetail.title} />
                  <div className="focal-cover-overlay"></div>
                </div>
                
                <div className="focal-body">
                  <div className="focal-meta-row">
                    <span className="house-badge">{chronicleDetail.house || 'Sovereign Lore'}</span>
                    <span className="focal-meta-item"><Calendar size={12} /> {new Date(chronicleDetail.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <h1 className="focal-title glow-text">{chronicleDetail.title}</h1>

                  <div className="focal-author-signature">
                    <Award size={18} className="gold-glow-icon" />
                    <div className="sig-text">
                      <span className="sig-lbl">Scribed By</span>
                      <span className="sig-name gold-gradient-text">{chronicleDetail.authorName}</span>
                    </div>
                  </div>

                  {user && (user.uid === chronicleDetail.authorId || user.role === 'ADMIN') && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleStartEdit(chronicleDetail)} 
                        className="royal-btn edit-discourse-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem' }}
                      >
                        <PenTool size={14} /> Edit Chronicle
                      </button>
                      <button 
                        onClick={() => handleDelete(chronicleDetail.id)} 
                        className="royal-btn delete-discourse-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#e63946', borderColor: '#e63946', color: '#fff' }}
                      >
                        <Trash2 size={14} /> Delete Chronicle
                      </button>
                    </div>
                  )}

                  <div 
                    className="focal-content-html"
                    dangerouslySetInnerHTML={{ __html: chronicleDetail.content }}
                  />

                  {chronicleDetail.tags && chronicleDetail.tags.length > 0 && (
                    <div className="focal-tags-container">
                      {chronicleDetail.tags.map(t => (
                        <span key={t} className="royal-tag">#{t}</span>
                      ))}
                    </div>
                  )}

                  <hr className="focal-divider" />

                  {/* Comments Section */}
                  <div className="focal-comments-section">
                    <h3 className="comments-section-title">
                      <MessageSquare size={16} /> Scholarly Dialogue ({chronicleComments.length})
                    </h3>

                    {user ? (
                      <form onSubmit={handleAddComment} className="comment-post-box">
                        <textarea
                          placeholder="Grace this dissertation with your insights..."
                          className="royal-input comment-textarea"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          required
                          rows={3}
                        />
                        <button type="submit" disabled={isSubmittingComment} className="royal-btn comment-submit-btn">
                          {isSubmittingComment ? 'Transcribing...' : 'Scribe Insight'} <Send size={12} />
                        </button>
                      </form>
                    ) : (
                      <div className="comments-unauth-notice royal-card">
                        <p>Only verified salon patrons may record insights. Please enter the salon.</p>
                      </div>
                    )}

                    <div className="comments-thread-list">
                      {chronicleComments.map(c => (
                        <div key={c.id} className="comment-card royal-card">
                          <div className="comment-card-header">
                            <div className="comment-user">
                              {c.authorPhotoUrl ? (
                                <img src={c.authorPhotoUrl} alt={c.authorName} className="comment-avatar" />
                              ) : (
                                <div className="comment-avatar-fallback"><User size={12} /></div>
                              )}
                              <span className="comment-user-name gold-gradient-text">{c.authorName}</span>
                            </div>
                            <span className="comment-time">
                              {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="comment-text-content">"{c.content}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="focal-error">
                <h3>Error loading details</h3>
                <p>Failed to unroll this specific chronicle.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Page Layout */}
      <header className="discourses-header">
        <div className="header-badge">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">INTELLECTUAL DISCOURSES</span>
        </div>
        <h1 className="discourses-title glow-text">The Socratic Portico</h1>
        <p className="discourses-subtitle">
          Participate in nested salon debates or read rich critical dissertations written by club scholars and curators.
        </p>

        {/* Tab Selector */}
        <div className="royal-tabs-container">
          <button 
            className={`royal-tab-btn ${activeTab === 'CHRONICLE' ? 'active' : ''}`}
            onClick={() => { setActiveTab('CHRONICLE'); setIsCreating(false); }}
          >
            <BookText size={16} /> Intellectual Chronicles
          </button>
          <button 
            className={`royal-tab-btn ${activeTab === 'DEBATE' ? 'active' : ''}`}
            onClick={() => { setActiveTab('DEBATE'); setIsCreating(false); }}
          >
            <HelpCircle size={16} /> Courtyard Debates
          </button>
        </div>
      </header>

      {/* Action Controls & Composition Form */}
      {user && (
        <section className="composition-orchestrator">
          {!isCreating ? (
            <button 
              onClick={() => { setIsCreating(true); setFormType(activeTab); }} 
              className="royal-btn composition-trigger-btn"
            >
              {activeTab === 'CHRONICLE' ? (
                <>
                  <PenTool size={16} /> Scribe a Chronicle
                </>
              ) : (
                <>
                  <Plus size={16} /> Ignite a Debate Topic
                </>
              )}
            </button>
          ) : (
            <div className="royal-card composition-card animate-fade-in">
              <div className="comp-header">
                <h3>{editingDiscourse ? (formType === 'CHRONICLE' ? 'Edit Intellectual Chronicle' : 'Edit Courtyard Debate Topic') : (formType === 'CHRONICLE' ? 'Scribe New Intellectual Chronicle' : 'Ignite Courtyard Debate Topic')}</h3>
                <button onClick={() => { setIsCreating(false); resetForm(); }} className="close-comp-btn">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePublish} className="composition-form">
                <div className="form-group">
                  <label className="royal-label">Sovereign Title</label>
                  <input
                    type="text"
                    className="royal-input"
                    placeholder={formType === 'CHRONICLE' ? 'e.g. The Hedonistic Tapestry of Oscar Wilde' : 'e.g. Should Classicism remain the cornerstone of modern curation?'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {formType === 'CHRONICLE' && (
                  <div className="form-row-grid">
                    <div className="form-group">
                      <label className="royal-label">Salon House</label>
                      <select 
                        className="royal-input royal-select"
                        value={selectedHouse}
                        onChange={(e) => setSelectedHouse(e.target.value)}
                        required
                      >
                        {houses.map(h => (
                          <option key={h.id} value={h.name}>{h.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="royal-label">Image Cover flyer</label>
                      <div className="flyer-upload-zone">
                        <input
                          type="file"
                          id="chronicle-cover-file"
                          accept="image/*"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="chronicle-cover-file" className="flyer-upload-trigger">
                          <Image size={16} /> Upload Banner
                        </label>
                        {coverPreview && (
                          <div className="flyer-upload-preview">
                            <img src={coverPreview} alt="Preview" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="royal-label">Sacred Content</label>
                  {formType === 'CHRONICLE' ? (
                    <RichTextEditor 
                      value={content}
                      onChange={setContent}
                      placeholder="Draft your exquisite dissertation..."
                    />
                  ) : (
                    <textarea
                      className="royal-input debate-textarea"
                      placeholder="Describe the philosophical bounds or query of your debate..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                      rows={5}
                    />
                  )}
                </div>

                {formType === 'CHRONICLE' && (
                  <div className="form-group">
                    <label className="royal-label">Custom Tags (Press Enter after each)</label>
                    <input
                      type="text"
                      className="royal-input"
                      placeholder="Type tag and press Enter..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                    {tagsList.length > 0 && (
                      <div className="tags-display-row">
                        {tagsList.map(t => (
                          <span key={t} className="royal-tag">
                            #{t} <X size={10} className="remove-tag-icon" onClick={() => handleRemoveTag(t)} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="comp-actions">
                  <button 
                    type="submit" 
                    disabled={isPublishing || (formType === 'CHRONICLE' && !content)}
                    className="royal-btn comp-submit-btn"
                  >
                    {isPublishing ? (isUploading ? 'Uploading cover image...' : 'Transcribing lore...') : (editingDiscourse ? 'Save Sovereign Updates' : 'Publish to Portico')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {/* Search Filter Bar */}
      <section className="search-filter-section royal-card glassmorphic">
        <div className="search-wrapper">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'CHRONICLE' ? 'chronicles' : 'debates'} by title, tags, or author...`}
            className="royal-input search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Primary Feed Grid */}
      <main className="discourses-main-feed">
        {loading ? (
          <div className="loading-boundary">
            <div className="loader-mini"></div>
            <p>Gathering sovereign words...</p>
          </div>
        ) : filteredDiscourses.length > 0 ? (
          <div className={activeTab === 'CHRONICLE' ? 'chronicles-grid' : 'debates-list'}>
            
            {/* Chronicles Tab Rendering */}
            {activeTab === 'CHRONICLE' && filteredDiscourses.map(disc => (
              <div key={disc.id} className="chronicle-card royal-card glassmorphic animate-fade-in">
                <div className="chron-cover-wrapper">
                  <img src={disc.coverUrl || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80'} alt={disc.title} />
                  <div className="chron-badge">{disc.house || 'Sovereign Lore'}</div>
                </div>
                <div className="chron-content">
                  <div className="chron-meta">
                    <span className="chron-date"><Calendar size={12} /> {new Date(disc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <h3 className="chron-title">{disc.title}</h3>
                  <div className="chron-excerpt" dangerouslySetInnerHTML={{ __html: disc.content.substring(0, 160) + '...' }} />
                  <div className="chron-footer">
                    <span className="chron-author">by <strong className="gold-gradient-text">{disc.authorName}</strong></span>
                    <button onClick={() => handleOpenChronicle(disc)} className="chron-read-btn">
                      Examine Essay <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Debates Tab Rendering */}
            {activeTab === 'DEBATE' && filteredDiscourses.map(disc => {
              const isExpanded = expandedDebate?.id === disc.id;
              return (
                <div key={disc.id} className={`debate-thread-card royal-card glassmorphic animate-fade-in ${isExpanded ? 'expanded' : ''}`}>
                  <div className="debate-main-header" onClick={() => handleOpenDebate(disc)}>
                    <div className="debate-title-block">
                      <HelpCircle size={20} className="debate-icon gold-glow-icon" />
                      <div className="title-text">
                        <h4>{disc.title}</h4>
                        <div className="debate-meta">
                          <span>Sparked by <strong className="gold-gradient-text">{disc.authorName}</strong></span>
                          <span>•</span>
                          <span>{new Date(disc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    <button className="debate-expand-trigger">
                      {isExpanded ? 'Fold Dialogue' : 'Join Dialogue'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="debate-expanded-body animate-fade-in">
                      <p className="debate-lead-concept">{disc.content}</p>
                      
                      {user && (user.uid === disc.authorId || user.role === 'ADMIN') && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handleStartEdit(disc)} 
                            className="royal-btn edit-discourse-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
                          >
                            <PenTool size={12} /> Edit Debate Topic
                          </button>
                          <button 
                            onClick={() => handleDelete(disc.id)} 
                            className="royal-btn delete-discourse-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#e63946', borderColor: '#e63946', color: '#fff' }}
                          >
                            <Trash2 size={12} /> Delete Topic
                          </button>
                        </div>
                      )}
                      
                      <div className="debate-dialectic-portico">
                        <h5>
                          <MessageCircle size={14} /> Dialectical Thread
                        </h5>
                        
                        {/* Debate replies tree render */}
                        {buildThreadedReplies()}

                        {/* Top level Reply Box for root debate */}
                        {user && replyInputId === null && (
                          <form onSubmit={(e) => handlePostReply(e, disc.id)} className="debate-root-reply-form">
                            <textarea
                              placeholder="Submit your dialectic response to this topic..."
                              className="royal-input root-reply-textarea"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              required
                              rows={3}
                            />
                            <button type="submit" disabled={isSubmittingReply} className="royal-btn root-reply-submit">
                              Voice Stance <Send size={12} />
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        ) : (
          <div className="royal-card no-discourses-fallback">
            <BookText size={48} className="fallback-icon" />
            <h3>No Academic Discourses Sparked</h3>
            <p>No Chronicles or Debates were found matching your query. Scribe the first entry to begin the dialogue!</p>
          </div>
        )}
      </main>

    </div>
  );
};

export default DiscoursesPage;
