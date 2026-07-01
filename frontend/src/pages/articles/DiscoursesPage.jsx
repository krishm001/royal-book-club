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
  Trash2,
  Pencil
} from 'lucide-react';
import { 
  fetchDiscourses, 
  fetchDiscourseById, 
  publishDiscourse, 
  commentOnChronicle, 
  replyToDebate,
  updateDiscourse,
  deleteDiscourse,
  toggleDiscourseReaction,
  toggleCommentReaction,
  updateComment,
  deleteComment
} from '../../services/discourseApi';
import { fetchBlogHouses } from '../../services/genreApi';
import { uploadBookImage } from '../../services/storageApi';
import RichTextEditor from '../../components/shared/RichTextEditor';
import { useLanguage } from '../../i18n/LanguageContext';
import './DiscoursesPage.css';

const DiscoursesPage = ({ user }) => {
  const { t, getLocalized } = useLanguage();
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
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

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

  // Reply edit states
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState('');
  const [isSubmittingReplyEdit, setIsSubmittingReplyEdit] = useState(false);

  // Mobile long-press gesture states
  const [longPressedReplyId, setLongPressedReplyId] = useState(null);
  const touchTimerRef = React.useRef(null);

  const handleTouchStart = (replyId) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setLongPressedReplyId(prevId => prevId === replyId ? null : replyId);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };


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

  const handleStartEditComment = (commentId, text) => {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleUpdateCommentSubmit = async (commentId) => {
    if (!editingCommentText.trim()) return;
    try {
      const res = await updateComment(commentId, { content: editingCommentText.trim() });
      if (res && res.success) {
        setChronicleComments(prev => prev.map(c => c.id === commentId ? { ...c, content: res.data.content } : c));
        handleCancelEditComment();
      }
    } catch (err) {
      console.error('Failed to update comment:', err);
    }
  };

  const handleDeleteCommentClick = async (commentId) => {
    if (!window.confirm(t('discourses.deleteCommentConfirm', "Are you sure you wish to delete this comment? This action is irreversible."))) return;
    try {
      const res = await deleteComment(commentId);
      if (res && res.success) {
        setChronicleComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
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
          alert(`${t('discourses.coverUploadFailed', 'Cover Upload Failed')}: ${uploadErr.message}`);
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
    if (!window.confirm(t('discourses.deleteDiscourseConfirm', "Are you certain you wish to purge this academic discourse? This action is irreversible and will also remove all associated comments or replies."))) {
      return;
    }
    try {
      const res = await deleteDiscourse(id);
      if (res && res.success) {
        handleCloseChronicle();
        setExpandedDebate(null);
        loadDiscourses();
      } else {
        alert(res?.message || t('discourses.failedToDeleteDiscourse', "Failed to delete discourse"));
      }
    } catch (err) {
      console.error('Failed to delete discourse:', err);
      alert(t('discourses.errorDeletingDiscourse', "Error deleting discourse"));
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

  const handleStartEditReply = (reply) => {
    setEditingReplyId(reply.id);
    setEditingReplyText(reply.content);
  };

  const handleSaveEditReply = async (e, reply) => {
    e.preventDefault();
    if (!editingReplyText.trim() || isSubmittingReplyEdit) return;

    try {
      setIsSubmittingReplyEdit(true);
      const payload = {
        ...reply,
        content: editingReplyText.trim()
      };
      const res = await updateDiscourse(reply.id, payload);
      if (res && res.success) {
        setEditingReplyId(null);
        // Refresh replies for expanded debate
        const detailRes = await fetchDiscourseById(expandedDebate.id);
        if (detailRes && detailRes.success) {
          setDebateReplies(detailRes.data.responses || []);
        }
      }
    } catch (err) {
      console.error('Failed to update reply:', err);
    } finally {
      setIsSubmittingReplyEdit(false);
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm(t('discourses.deleteReplyConfirm', "Are you certain you wish to purge this dialectic reply? This action is irreversible."))) {
      return;
    }
    try {
      const res = await deleteDiscourse(replyId);
      if (res && res.success) {
        // Refresh replies for expanded debate
        const detailRes = await fetchDiscourseById(expandedDebate.id);
        if (detailRes && detailRes.success) {
          setDebateReplies(detailRes.data.responses || []);
        }
      } else {
        alert(res?.message || t('discourses.failedToDeleteReply', "Failed to delete reply"));
      }
    } catch (err) {
      console.error('Failed to delete reply:', err);
      alert(t('discourses.errorDeletingReply', "Error deleting reply"));
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

  // Socratic reaction helpers
  const toggleLocalReaction = (reactionsMap, reactionType, userId) => {
    const currentReactions = reactionsMap ? { ...reactionsMap } : {};
    const userList = currentReactions[reactionType] ? [...currentReactions[reactionType]] : [];
    
    const userIdx = userList.indexOf(userId);
    if (userIdx > -1) {
      userList.splice(userIdx, 1);
    } else {
      userList.push(userId);
    }
    
    currentReactions[reactionType] = userList;
    return currentReactions;
  };

  const handleToggleReaction = async (id, reactionType, targetType) => {
    if (!user) {
      alert(t('discourses.mustBeLoggedInReaction', "You must be logged in to participate in academic reactions."));
      return;
    }
    const userId = user.uid || user.id;

    // Optimistic Update
    if (targetType === 'chronicle' || targetType === 'debate') {
      // 1. Update in discourses list
      setDiscourses(prev => prev.map(d => {
        if (d.id === id) {
          return { ...d, reactions: toggleLocalReaction(d.reactions, reactionType, userId) };
        }
        return d;
      }));

      // 2. Update in selected chronicle detail if open
      if (chronicleDetail && chronicleDetail.id === id) {
        setChronicleDetail(prev => ({
          ...prev,
          reactions: toggleLocalReaction(prev.reactions, reactionType, userId)
        }));
      }

      // 3. Update in expanded debate if open
      if (expandedDebate && expandedDebate.id === id) {
        setExpandedDebate(prev => ({
          ...prev,
          reactions: toggleLocalReaction(prev.reactions, reactionType, userId)
        }));
      }

      // Call API
      try {
        await toggleDiscourseReaction(id, reactionType);
      } catch (err) {
        console.error("Failed to toggle discourse reaction:", err);
        // Revert or reload if error
        loadDiscourses();
        if (chronicleDetail && chronicleDetail.id === id) {
          handleOpenChronicle(chronicleDetail);
        }
      }
    } else if (targetType === 'comment') {
      // Update in chronicle comments array
      setChronicleComments(prev => prev.map(c => {
        if (c.id === id) {
          return { ...c, reactions: toggleLocalReaction(c.reactions, reactionType, userId) };
        }
        return c;
      }));

      // Call API
      try {
        await toggleCommentReaction(id, reactionType);
      } catch (err) {
        console.error("Failed to toggle comment reaction:", err);
        // Revert or reload if error
        if (selectedChronicle) {
          handleOpenChronicle(selectedChronicle);
        }
      }
    } else if (targetType === 'reply') {
      // Update in debate replies array
      setDebateReplies(prev => prev.map(r => {
        if (r.id === id) {
          return { ...r, reactions: toggleLocalReaction(r.reactions, reactionType, userId) };
        }
        return r;
      }));

      // Call API (debate replies are Discourse objects!)
      try {
        await toggleDiscourseReaction(id, reactionType);
      } catch (err) {
        console.error("Failed to toggle reply reaction:", err);
        // Revert or reload if error
        if (expandedDebate) {
          const detailRes = await fetchDiscourseById(expandedDebate.id);
          if (detailRes && detailRes.success) {
            setDebateReplies(detailRes.data.responses || []);
          }
        }
      }
    }
  };

  const renderReactions = (node, targetType) => {
    const emojis = ["👍", "❤️", "💡", "🎓"];
    const reactions = node.reactions || {};
    const userId = user?.uid || user?.id;

    return (
      <div className="socratic-reactions-wrapper">
        {/* Current reactions display */}
        <div className="active-reactions-list">
          {emojis.map(emoji => {
            const users = reactions[emoji] || [];
            const count = users.length;
            if (count === 0) return null;
            const hasReacted = userId && users.includes(userId);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggleReaction(node.id, emoji, targetType)}
                className={`reaction-pill-badge ${hasReacted ? 'active' : ''}`}
                title={`${count} ${t('discourses.patronsReacted', 'patron(s) reacted')}`}
              >
                <span className="pill-emoji">{emoji}</span>
                <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Hoverable reaction picker */}
        {user && (
          <div className="reaction-picker-trigger-wrapper">
            <button type="button" className="reaction-picker-trigger" title={t('discourses.voiceAcademicResponse', 'Voice Academic Response')}>
              <Sparkles size={12} className="trigger-icon" />
              <span className="trigger-lbl">{t('discourses.react', 'React')}</span>
            </button>
            <div className="hover-emoji-bar glassmorphic animate-scale-up">
              {emojis.map(emoji => {
                const users = reactions[emoji] || [];
                const hasReacted = userId && users.includes(userId);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleToggleReaction(node.id, emoji, targetType)}
                    className={`picker-emoji-btn ${hasReacted ? 'active' : ''}`}
                    title={
                      emoji === "👍" ? t('discourses.concur', 'Concur') :
                      emoji === "❤️" ? t('discourses.adore', 'Adore') :
                      emoji === "💡" ? t('discourses.inspiriting', 'Inspiriting') :
                      t('discourses.scholarly', 'Scholarly')
                    }
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Construct debate threaded replies locally
  const buildThreadedReplies = () => {
    // 1. Find all root-level replies to the expanded debate topic
    const rootReplies = debateReplies.filter(r => r.parentId === expandedDebate.id);

    // 2. Build a mapping of ALL replies for easy lookup (e.g. for citations)
    const repliesMap = {};
    debateReplies.forEach(r => {
      repliesMap[r.id] = r;
    });

    // 3. Helper to recursively collect all descendants of a reply to flatten them
    const getDescendants = (parentId) => {
      let descendants = [];
      const children = debateReplies.filter(r => r.parentId === parentId);
      children.forEach(child => {
        descendants.push(child);
        descendants = descendants.concat(getDescendants(child.id));
      });
      return descendants;
    };

    // 4. Render a single reply node
    const renderReplyCard = (reply, depth, rootReplyId) => {
      const isMe = user && (user.uid === reply.authorId || user.id === reply.authorId);
      const isFlattened = depth === 1 && reply.parentId !== rootReplyId;
      const parentReply = isFlattened ? repliesMap[reply.parentId] : null;

      return (
        <div 
          key={reply.id} 
          className={`debate-reply-node ${isMe ? 'reply-mine' : 'reply-other'} depth-${depth}`}
        >
          <div 
            className={`debate-reply-card royal-card glassmorphic ${isMe ? 'bubble-mine' : 'bubble-other'} ${longPressedReplyId === reply.id ? 'actions-active' : ''}`}
            onTouchStart={() => handleTouchStart(reply.id)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
            
            {/* Citation Quote Card for flattened sub-replies */}
            {isFlattened && parentReply && (
              <div className="socratic-citation-card">
                <span className="citation-author">{t('discourses.replyingTo', 'Replying to')} {parentReply.authorName}</span>
                <p className="citation-text">"{parentReply.content.slice(0, 60)}{parentReply.content.length > 60 ? '...' : ''}"</p>
              </div>
            )}

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
                {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('discourses.justNow', 'Just now')}
              </span>
            </div>

            {editingReplyId === reply.id ? (
              <form onSubmit={(e) => handleSaveEditReply(e, reply)} className="reply-edit-form animate-fade-in" style={{ marginTop: '8px', padding: '4px' }}>
                <textarea
                  className="royal-input reply-edit-textarea"
                  value={editingReplyText}
                  onChange={(e) => setEditingReplyText(e.target.value)}
                  required
                  rows={2}
                />
                <div className="reply-edit-actions-row">
                  <button type="submit" disabled={isSubmittingReplyEdit} className="royal-btn reply-save-btn">
                    {t('common.save', 'Save')}
                  </button>
                  <button type="button" onClick={() => setEditingReplyId(null)} className="royal-btn-secondary reply-cancel-btn">
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <p className="reply-text-content">{reply.content}</p>
            )}

            {/* Unified compact single-row footer containing both reactions and actions */}
            <div className="reply-footer-row">
              {renderReactions(reply, 'reply')}

              {user && (
                <div className="reply-actions">
                  <button 
                    onClick={() => {
                      setReplyInputId(replyInputId === reply.id ? null : reply.id);
                      setReplyText('');
                    }} 
                    className="reply-trigger-btn"
                  >
                    <MessageCircle size={12} /> <span className="btn-label-text">{t('discourses.reply')}</span>
                  </button>

                  {(user.uid === reply.authorId || user.id === reply.authorId || user.role === 'ADMIN') && (
                    <>
                      <button 
                        onClick={() => handleStartEditReply(reply)}
                        className="reply-edit-btn"
                      >
                        <PenTool size={12} /> <span className="btn-label-text">{t('discourses.edit')}</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteReply(reply.id)}
                        className="reply-delete-btn"
                      >
                        <Trash2 size={12} /> <span className="btn-label-text">{t('discourses.delete')}</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {replyInputId === reply.id && (
              <form onSubmit={(e) => handlePostReply(e, reply.id)} className="reply-submit-form animate-fade-in">
                <input
                  type="text"
                  placeholder={`${t('discourses.replyTo', 'Reply to')} ${reply.authorName}...`}
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
        </div>
      );
    };

    return (
      <div className="debate-discussion-tree">
        {rootReplies.length > 0 ? (
          rootReplies.map(rootReply => {
            const descendants = getDescendants(rootReply.id);
            return (
              <div key={rootReply.id} className="debate-root-reply-group">
                {/* Render the root-level reply (depth 0) */}
                {renderReplyCard(rootReply, 0, rootReply.id)}

                {/* Render all descendant sub-replies flattened to depth 1 */}
                {descendants.length > 0 && (
                  <div className="nested-replies-container">
                    <div className="nested-connector-line"></div>
                    <div className="nested-replies-list">
                      {descendants.map(descendant => renderReplyCard(descendant, 1, rootReply.id))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="no-replies-placeholder">
            <HelpCircle size={24} className="gold-glow-icon" />
            <p>{t('discourses.noOpinionsVoiced', 'No opinions voiced yet. Share your sovereign intellectual stance first!')}</p>
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
                <p>{t('discourses.retrievingSacredChronicles', 'Retrieving sacred chronicles...')}</p>
              </div>
            ) : chronicleDetail ? (
              <div className="focal-content-scroll">
                <div className="focal-cover-frame">
                  <img src={chronicleDetail.coverUrl} alt={chronicleDetail.title} />
                  <div className="focal-cover-overlay"></div>
                </div>
                
                <div className="focal-body">
                  <div className="focal-meta-row">
                    <span className="house-badge">{chronicleDetail.house || t('discourses.sovereignLore', 'Sovereign Lore')}</span>
                    <span className="focal-meta-item"><Calendar size={12} /> {new Date(chronicleDetail.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <h1 className="focal-title glow-text">{chronicleDetail.title}</h1>

                  <div className="focal-author-signature">
                    <Award size={18} className="gold-glow-icon" />
                    <div className="sig-text">
                      <span className="sig-lbl">{t('discourses.scribedBy', 'Scribed By')}</span>
                      <span className="sig-name gold-gradient-text">{chronicleDetail.authorName}</span>
                    </div>
                  </div>

                  {user && (user.uid === chronicleDetail.authorId || user.id === chronicleDetail.authorId || user.role === 'ADMIN') && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleStartEdit(chronicleDetail)} 
                        className="royal-btn edit-discourse-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem' }}
                      >
                        <PenTool size={14} /> {t('discourses.edit', 'Edit')}
                      </button>
                      <button 
                        onClick={() => handleDelete(chronicleDetail.id)} 
                        className="royal-btn delete-discourse-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#e63946', borderColor: '#e63946', color: '#fff' }}
                      >
                        <Trash2 size={14} /> {t('discourses.delete', 'Delete')}
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

                  {renderReactions(chronicleDetail, 'chronicle')}

                  <hr className="focal-divider" />

                  {/* Comments Section */}
                  <div className="focal-comments-section">
                    <h3 className="comments-section-title">
                      <MessageSquare size={16} /> {t('discourses.scholarlyDialogue', 'Scholarly Dialogue')} ({chronicleComments.length})
                    </h3>

                    {user ? (
                      <form onSubmit={handleAddComment} className="comment-post-box">
                        <textarea
                          placeholder={t('discourses.graceInsightsPlaceholder', 'Grace this dissertation with your insights...')}
                          className="royal-input comment-textarea"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          required
                          rows={3}
                        />
                        <button type="submit" disabled={isSubmittingComment} className="royal-btn comment-submit-btn">
                          {isSubmittingComment ? t('discourses.transcribing', 'Transcribing...') : t('discourses.scribeInsight', 'Scribe Insight')} <Send size={12} />
                        </button>
                      </form>
                    ) : (
                      <div className="comments-unauth-notice royal-card">
                        <p>{t('discourses.verifiedPatronsNotice', 'Only verified salon patrons may record insights. Please enter the salon.')}</p>
                      </div>
                    )}

                    <div className="comments-thread-list">
                      {chronicleComments.map(c => {
                        const isAuthor = user && (user.uid === c.authorId || user.id === c.authorId);
                        const isAdmin = user && user.role === 'ADMIN';
                        const isEditing = editingCommentId === c.id;

                        return (
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
                              <div className="comment-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span className="comment-time">
                                  {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                {!isEditing && (isAuthor || isAdmin) && (
                                  <div className="comment-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {isAuthor && (
                                      <button 
                                        onClick={() => handleStartEditComment(c.id, c.content)} 
                                        className="comment-action-btn edit-btn" 
                                        title={t('discourses.editInsight')}
                                        style={{ background: 'none', border: 'none', color: 'var(--gold-color)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                                      >
                                        <Pencil size={12} />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleDeleteCommentClick(c.id)} 
                                      className="comment-action-btn delete-btn" 
                                      title={t('discourses.purgeInsight')}
                                      style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {isEditing ? (
                              <div className="comment-edit-form" style={{ marginTop: '0.5rem' }}>
                                <textarea
                                  className="royal-input comment-textarea edit-mode"
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  rows={2}
                                  style={{ width: '100%', marginBottom: '0.5rem' }}
                                />
                                <div className="comment-edit-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button onClick={() => handleUpdateCommentSubmit(c.id)} className="royal-btn small-btn save-btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                                    {t('common.update', 'Update')}
                                  </button>
                                  <button onClick={handleCancelEditComment} className="royal-btn small-btn cancel-btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#ccc' }}>
                                    {t('common.cancel', 'Cancel')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="comment-text-content">"{c.content}"</p>
                            )}
                            {renderReactions(c, 'comment')}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="focal-error">
                <h3>{t('discourses.errorLoadingDetails', 'Error loading details')}</h3>
                <p>{t('discourses.failedToUnroll', 'Failed to unroll this specific chronicle.')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Page Layout */}
      <header className="discourses-header">
        <div className="header-badge">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('discourses.intellectualDiscourses', 'Intellectual Discourses')}</span>
        </div>
        <h1 className="discourses-title glow-text">{t('discourses.socraticPortico', 'The Socratic Portico')}</h1>
        <p className="discourses-subtitle">
          {t('discourses.tagline', "Where questions matter more than answers. In a world drowning in opinions, Royal Book Club offers something rare - rigorous inquiry. Through 'Intellectual Chronicles' and 'Courtyard Debates', we do not tell you what to think. We dare you to.")}
        </p>

        {/* Tab Selector */}
        <div className="royal-tabs-container">
          <button 
            className={`royal-tab-btn ${activeTab === 'CHRONICLE' ? 'active' : ''}`}
            onClick={() => { setActiveTab('CHRONICLE'); setIsCreating(false); }}
          >
            <BookText size={16} /> {t('discourses.intellectualChronicles', 'Intellectual Chronicles')}
          </button>
          <button 
            className={`royal-tab-btn ${activeTab === 'DEBATE' ? 'active' : ''}`}
            onClick={() => { setActiveTab('DEBATE'); setIsCreating(false); }}
          >
            <HelpCircle size={16} /> {t('discourses.courtyardDebates', 'Courtyard Debates')}
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
                  <PenTool size={16} /> {t('discourses.scribeChronicle', 'Scribe a Chronicle')}
                </>
              ) : (
                <>
                  <Plus size={16} /> {t('discourses.igniteDebateTopic', 'Ignite a Debate Topic')}
                </>
              )}
            </button>
          ) : (
            <div className="royal-card composition-card animate-fade-in">
              <div className="comp-header">
                <h3>{editingDiscourse ? (formType === 'CHRONICLE' ? t('discourses.editChronicle', 'Edit Intellectual Chronicle') : t('discourses.editDebateTopic', 'Edit Debate Topic')) : (formType === 'CHRONICLE' ? t('discourses.scribeNewChronicle', 'Scribe New Intellectual Chronicle') : t('discourses.igniteNewDebate', 'Ignite Courtyard Debate Topic'))}</h3>
                <button onClick={() => { setIsCreating(false); resetForm(); }} className="close-comp-btn">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePublish} className="composition-form">
                <div className="form-group">
                  <label className="royal-label">{t('discourses.sovereignTitleLabel', 'Sovereign Title')}</label>
                  <input
                    type="text"
                    className="royal-input"
                    placeholder={formType === 'CHRONICLE' ? t('discourses.chronicleTitlePlaceholder', 'e.g. The Hedonistic Tapestry of Oscar Wilde') : t('discourses.debateTitlePlaceholder', 'e.g. Should Classicism remain the cornerstone of modern curation?')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {formType === 'CHRONICLE' && (
                  <div className="form-row-grid">
                    <div className="form-group">
                      <label className="royal-label">{t('discourses.salonHouseLabel', 'Salon House')}</label>
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
                      <label className="royal-label">{t('discourses.imageCoverFlyerLabel', 'Image Cover flyer')}</label>
                      <div className="flyer-upload-zone">
                        <input
                          type="file"
                          id="chronicle-cover-file"
                          accept="image/*"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="chronicle-cover-file" className="flyer-upload-trigger">
                          <Image size={16} /> {t('discourses.uploadBanner', 'Upload Banner')}
                        </label>
                        {coverPreview && (
                          <div className="flyer-upload-preview">
                            <img src={coverPreview} alt={t('discourses.previewImageAlt', 'Preview')} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="royal-label">{t('discourses.sacredContentLabel', 'Sacred Content')}</label>
                  {formType === 'CHRONICLE' ? (
                    <RichTextEditor 
                      value={content}
                      onChange={setContent}
                      placeholder={t('discourses.dissertationPlaceholder', 'Draft your exquisite dissertation...')}
                    />
                  ) : (
                    <textarea
                      className="royal-input debate-textarea"
                      placeholder={t('discourses.debateBoundsPlaceholder', 'Describe the philosophical bounds or query of your debate...')}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                      rows={5}
                    />
                  )}
                </div>

                {formType === 'CHRONICLE' && (
                  <div className="form-group">
                    <label className="royal-label">{t('discourses.customTagsLabel', 'Custom Tags (Press Enter after each)')}</label>
                    <input
                      type="text"
                      className="royal-input"
                      placeholder={t('discourses.typeTagPlaceholder', 'Type tag and press Enter...')}
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
                    {isPublishing ? (isUploading ? t('discourses.uploadingCover', 'Uploading cover image...') : t('discourses.transcribingLore', 'Transcribing lore...')) : (editingDiscourse ? t('discourses.saveSovereignUpdates', 'Save Sovereign Updates') : t('discourses.publishToPortico', 'Publish to Portico'))}
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
            placeholder={activeTab === 'CHRONICLE' ? t('discourses.searchChroniclesPlaceholder', 'Search chronicles by title, tags, or author...') : t('discourses.searchDebatesPlaceholder', 'Search debates by title, tags, or author...')}
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
            <p>{t('discourses.gatheringSovereignWords', 'Gathering sovereign words...')}</p>
          </div>
        ) : filteredDiscourses.length > 0 ? (
          <div className={activeTab === 'CHRONICLE' ? 'chronicles-grid' : 'debates-list'}>
            
            {/* Chronicles Tab Rendering */}
            {activeTab === 'CHRONICLE' && filteredDiscourses.map(disc => (
              <div key={disc.id} className="chronicle-card royal-card glassmorphic animate-fade-in">
                <div className="chron-cover-wrapper">
                  <img src={disc.coverUrl || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80'} alt={disc.title} />
                  <div className="chron-badge">{disc.house || t('discourses.sovereignLore', 'Sovereign Lore')}</div>
                </div>
                <div className="chron-content">
                  <div className="chron-meta">
                    <span className="chron-date"><Calendar size={12} /> {new Date(disc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <h3 className="chron-title">{disc.title}</h3>
                  <div className="chron-excerpt" dangerouslySetInnerHTML={{ __html: disc.content.substring(0, 160) + '...' }} />
                  {renderReactions(disc, 'chronicle')}
                  <div className="chron-footer">
                    <span className="chron-author">{t('common.by', 'by')} <strong className="gold-gradient-text">{disc.authorName}</strong></span>
                    <button onClick={() => handleOpenChronicle(disc)} className="chron-read-btn">
                      {t('discourses.examineEssay', 'Examine Essay')} <ChevronRight size={14} />
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
                          <span>{t('discourses.sparked', 'Sparked')} {t('common.by', 'by')} <strong className="gold-gradient-text">{disc.authorName}</strong></span>
                          <span>•</span>
                          <span>{new Date(disc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span>•</span>
                          <span>{disc.repliesCount || 0} {disc.repliesCount === 1 ? t('discourses.instance', 'instance') : t('discourses.instances', 'instances')}</span>
                        </div>
                      </div>
                    </div>
                    <button className="debate-expand-trigger" onClick={(e) => { e.stopPropagation(); handleOpenDebate(disc); }}>
                      {isExpanded ? (
                        <>
                          <X size={14} /> <span className="btn-label-text">{t('discourses.foldDialogue', 'Fold Dialogue')}</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare size={14} /> <span className="btn-label-text">{t('discourses.joinDialogue', 'Join Dialogue')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="debate-expanded-body animate-fade-in">
                      <p className="debate-lead-concept">{disc.content}</p>
                      {renderReactions(disc, 'debate')}
                      
                      {user && (user.uid === disc.authorId || user.id === disc.authorId || user.role === 'ADMIN') && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handleStartEdit(disc)} 
                            className="royal-btn edit-discourse-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
                          >
                            <PenTool size={12} /> {t('discourses.editDebateTopic', 'Edit Debate Topic')}
                          </button>
                          <button 
                            onClick={() => handleDelete(disc.id)} 
                            className="royal-btn delete-discourse-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#e63946', borderColor: '#e63946', color: '#fff' }}
                          >
                            <Trash2 size={12} /> {t('discourses.deleteTopic', 'Delete Topic')}
                          </button>
                        </div>
                      )}

                      {/* Top level Reply Box for root debate (Sticky Voice My Stance) */}
                      {user && replyInputId === null && (
                        <div className="debate-stance-sticky-wrapper royal-card glassmorphic">
                          <form onSubmit={(e) => handlePostReply(e, disc.id)} className="debate-root-reply-form">
                            <textarea
                              placeholder={t('discourses.submitResponsePlaceholder', 'Submit your dialectic response to this topic...')}
                              className="royal-input root-reply-textarea"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              required
                              rows={2}
                            />
                            <button type="submit" disabled={isSubmittingReply} className="royal-btn root-reply-submit">
                              {t('discourses.voiceStance', 'Voice Stance')} <Send size={12} />
                            </button>
                          </form>
                        </div>
                      )}
                      
                      <div className="debate-dialectic-portico">
                        <h5>
                          <MessageCircle size={14} /> {t('discourses.dialecticalThread', 'Dialectical Thread')}
                        </h5>
                        
                        {/* Debate replies tree render */}
                        {buildThreadedReplies()}
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
            <h3>{t('discourses.noDiscoursesTitle', 'No Academic Discourses Sparked')}</h3>
            <p>{t('discourses.noDiscoursesDesc', 'No Chronicles or Debates were found matching your query. Scribe the first entry to begin the dialogue!')}</p>
          </div>
        )}
      </main>

    </div>
  );
};

export default DiscoursesPage;
