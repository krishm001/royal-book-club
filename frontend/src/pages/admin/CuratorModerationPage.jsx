import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, ArrowLeft, Loader2, CheckCircle, AlertTriangle, Trash2, ThumbsUp, ThumbsDown, BookOpen, MessageSquare, Edit3, Eye, RefreshCw, AlertCircle, Clock, Star, BarChart2, BookMarked } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { getBlockedContents, clearBlockedContents, getPendingReviews, approveReview, rejectReview } from '../../services/moderationApi';
import { fetchPendingSiteReviews, approveSiteReview, rejectSiteReview, fetchRatingStatistics, publishSiteReview, unpublishSiteReview, disapproveSiteReview } from '../../services/libraryApi';
import './CuratorModerationPage.css';
const CuratorModerationPage = ({
  user
}) => {
  const {
    t
  } = useLanguage();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'blocked' | 'site-reviews' | 'approved-testimonials' | 'statistics'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores id of item being processed
  const [message, setMessage] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [blockedLogs, setBlockedLogs] = useState([]);
  const [siteReviews, setSiteReviews] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [expandedItems, setExpandedItems] = useState({}); // track expanded state for long content

  const pendingSiteReviews = siteReviews.filter(item => !item.approved);
  const approvedSiteReviews = siteReviews.filter(item => item.approved);
  const isAdmin = user && user.role === 'ADMIN';
  const loadData = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setMessage(null);
      if (activeTab === 'pending') {
        const res = await getPendingReviews();
        if (res?.success) {
          setPendingReviews(res.data || []);
        } else {
          setMessage({
            type: 'error',
            text: res?.message || t('admin.errorPendingReviews', 'Failed to fetch pending review requests.')
          });
        }
      } else if (activeTab === 'blocked') {
        const res = await getBlockedContents();
        if (res?.success) {
          setBlockedLogs(res.data || []);
        } else {
          setMessage({
            type: 'error',
            text: res?.message || t('admin.errorBlockedLogs', 'Failed to fetch blocked content logs.')
          });
        }
      } else if (activeTab === 'site-reviews' || activeTab === 'approved-testimonials') {
        const res = await fetchPendingSiteReviews();
        if (res?.success) {
          setSiteReviews(res.data || []);
        } else {
          setMessage({
            type: 'error',
            text: res?.message || 'Failed to fetch site testimonials.'
          });
        }
      } else if (activeTab === 'statistics') {
        const res = await fetchRatingStatistics();
        if (res?.success) {
          setRatingStats(res.data || null);
        } else {
          setMessage({
            type: 'error',
            text: res?.message || 'Failed to fetch rating statistics.'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching moderation data:', err);
      setMessage({
        type: 'error',
        text: `${t('admin.connectionFailure', 'Connection failure:')} ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, [activeTab, isAdmin]);
  const handleApprove = async (collection, id) => {
    try {
      setActionLoading(id);
      setMessage(null);
      const res = await approveReview(collection, id);
      if (res?.success) {
        setPendingReviews(prev => prev.filter(item => item.id !== id));
        setMessage({
          type: 'success',
          text: t('admin.successApprove', 'Substance/Chronicle approved and published to the realm.')
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || t('admin.errorApprove', 'Failed to approve item.')
        });
      }
    } catch (err) {
      console.error('Approve action failed', err);
      setMessage({
        type: 'error',
        text: `${t('admin.errorApproveAction', 'Approve action failed:')} ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };
  const handleReject = async (collection, id) => {
    if (!window.confirm(t('admin.confirmReject', 'Are you sure you want to permanently discard and delete this user submission?'))) {
      return;
    }
    try {
      setActionLoading(id);
      setMessage(null);
      const res = await rejectReview(collection, id);
      if (res?.success) {
        setPendingReviews(prev => prev.filter(item => item.id !== id));
        setMessage({
          type: 'success',
          text: t('admin.successReject', 'Substance/Chronicle rejected and permanently purged.')
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || t('admin.errorReject', 'Failed to reject item.')
        });
      }
    } catch (err) {
      console.error('Reject action failed', err);
      setMessage({
        type: 'error',
        text: `${t('admin.errorRejectAction', 'Reject action failed:')} ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };
  const handleApproveSiteReview = async id => {
    try {
      setActionLoading(id);
      setMessage(null);
      const res = await approveSiteReview(id);
      if (res?.success) {
        setSiteReviews(prev => prev.map(item => item.id === id ? {
          ...item,
          approved: true,
          published: false
        } : item));
        setMessage({
          type: 'success',
          text: 'Site testimonial has been approved and moved to the Approved tab (hidden by default).'
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || 'Failed to approve site review.'
        });
      }
    } catch (err) {
      console.error('Approve site review failed', err);
      setMessage({
        type: 'error',
        text: `Approve failed: ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };
  const handlePublishSiteReview = async id => {
    try {
      setActionLoading(id);
      setMessage(null);
      const res = await publishSiteReview(id);
      if (res?.success) {
        setSiteReviews(prev => prev.map(item => item.id === id ? {
          ...item,
          approved: true,
          published: true
        } : item));
        setMessage({
          type: 'success',
          text: 'Site testimonial has been approved and published to the homepage!'
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || 'Failed to publish site review.'
        });
      }
    } catch (err) {
      console.error('Publish site review failed', err);
      setMessage({
        type: 'error',
        text: `Publish failed: ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };
  const handleUnpublishSiteReview = async id => {
    try {
      setActionLoading(id);
      setMessage(null);
      const res = await unpublishSiteReview(id);
      if (res?.success) {
        setSiteReviews(prev => prev.map(item => item.id === id ? {
          ...item,
          published: false
        } : item));
        setMessage({
          type: 'success',
          text: 'Site testimonial has been unpublished and is now hidden from the main page.'
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || 'Failed to unpublish site review.'
        });
      }
    } catch (err) {
      console.error('Unpublish site review failed', err);
      setMessage({
        type: 'error',
        text: `Unpublish failed: ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };
  const handleDisapproveSiteReview = async id => {
    try {
      setActionLoading(id);
      setMessage(null);
      const res = await disapproveSiteReview(id);
      if (res?.success) {
        setSiteReviews(prev => prev.map(item => item.id === id ? {
          ...item,
          approved: false,
          published: false
        } : item));
        setMessage({
          type: 'success',
          text: 'Site testimonial approval has been revoked. It is now back in the pending queue.'
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || 'Failed to disapprove site review.'
        });
      }
    } catch (err) {
      console.error('Disapprove site review failed', err);
      setMessage({
        type: 'error',
        text: `Disapprove failed: ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };
  const handleRejectSiteReview = async id => {
    if (!window.confirm('Are you sure you want to delete and permanently purge this site review?')) {
      return;
    }
    try {
      setActionLoading(id);
      setMessage(null);
      const res = await rejectSiteReview(id);
      if (res?.success) {
        setSiteReviews(prev => prev.filter(item => item.id !== id));
        setMessage({
          type: 'success',
          text: 'Site review has been successfully purged.'
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || 'Failed to delete site review.'
        });
      }
    } catch (err) {
      console.error('Delete site review failed', err);
      setMessage({
        type: 'error',
        text: `Purge failed: ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };
  const handleClearBlockedLogs = async () => {
    if (!window.confirm(t('admin.confirmClearLedger', 'Are you sure you want to clear the entire blocked submissions ledger? This action is irreversible.'))) {
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const res = await clearBlockedContents();
      if (res?.success) {
        setBlockedLogs([]);
        setMessage({
          type: 'success',
          text: t('admin.successClearLedger', 'The blocked content ledger has been successfully cleared.')
        });
      } else {
        setMessage({
          type: 'error',
          text: res?.message || t('admin.errorClearLedger', 'Failed to clear ledger.')
        });
      }
    } catch (err) {
      console.error('Clear logs failed', err);
      setMessage({
        type: 'error',
        text: `${t('admin.errorClearLogs', 'Failed to clear logs:')} ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  const toggleExpand = id => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const getCollectionLabel = col => {
    switch (col?.toLowerCase()) {
      case 'discourses':
        return t('admin.chronicleBlogDebate', 'Chronicle Blog / Debate');
      case 'discourse_comments':
        return t('admin.blogComment', 'Blog Comment');
      case 'book_reviews':
        return t('admin.bookReview', 'Book Review');
      default:
        return col;
    }
  };
  const getCollectionIcon = col => {
    switch (col?.toLowerCase()) {
      case 'discourses':
        return <Edit3 size={14} className="type-icon-gold" />;
      case 'discourse_comments':
        return <MessageSquare size={14} className="type-icon-gold" />;
      case 'book_reviews':
        return <BookOpen size={14} className="type-icon-gold" />;
      default:
        return <Edit3 size={14} className="type-icon-gold" />;
    }
  };
  if (!isAdmin) {
    return <div className="admin-access-denied-container animate-fade-in">
        <div className="royal-card denied-card">
          <div className="denied-icon-wrapper">
            <Shield size={48} className="denied-shield-icon" />
          </div>
          <h2 className="denied-title gold-gradient-text">{t('admin.privilegedSanctuary', 'Privileged Sanctuary')}</h2>
          <p className="denied-message">
            {t('admin.accessDeniedDesc', 'Your current credentials do not grant access to the Content Moderation Console. Curation of user generated content is reserved for assigned Curators.')}
          </p>
          <div className="denied-actions">
            <Link to="/" className="royal-btn return-home-btn">
              {t('admin.returnEntrance', 'Return to Entrance Hall')}
            </Link>
          </div>
        </div>
      </div>;
  }
  return <div className="curator-moderation-container animate-fade-in">
      <div className="curator-moderation-inner">
        {/* Back Link */}
        <Link to="/admin" className="back-link-academy">
          <ArrowLeft size={16} /> {t('admin.backToConsole', 'Return to Curator Console')}
        </Link>

        {/* Header */}
        <header className="curator-moderation-header">
          <div className="header-badge-moderation">
            <Shield size={14} className="gold-glow-icon" />
            <span className="gold-gradient-text">{t('admin.royalContentModeration', 'Royal Content Moderation').toUpperCase()}</span>
          </div>
          <h1 className="moderation-page-title glow-text">{t('admin.moderationLedger', 'Content Moderation Ledger')}</h1>
          <p className="moderation-page-subtitle">
            {t('admin.moderationDesc', 'Manage scholarly content. Approve items held in manual review or inspect the ledger of automatically blocked items flagged for spam and offensive terms.')}
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="moderation-tabs-row" style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
          <button className={`moderation-tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
            <Clock size={16} />
            <span>{t('admin.pendingReviewQueue', 'Content Moderation')} ({pendingReviews.length})</span>
          </button>
          <button className={`moderation-tab-btn ${activeTab === 'blocked' ? 'active' : ''}`} onClick={() => setActiveTab('blocked')}>
            <AlertCircle size={16} />
            <span>{t('admin.blockedLogsFeed', 'Spam/Blocked Ledger')} ({blockedLogs.length})</span>
          </button>
          <button className={`moderation-tab-btn ${activeTab === 'site-reviews' ? 'active' : ''}`} onClick={() => setActiveTab('site-reviews')}>
            <MessageSquare size={16} />
            <span>{t("str_5298", "Site Testimonials (")}{pendingSiteReviews.length})</span>
          </button>
          <button className={`moderation-tab-btn ${activeTab === 'approved-testimonials' ? 'active' : ''}`} onClick={() => setActiveTab('approved-testimonials')}>
            <CheckCircle size={16} />
            <span>{t("str_5299", "Approved Testimonials (")}{approvedSiteReviews.length})</span>
          </button>
          <button className={`moderation-tab-btn ${activeTab === 'statistics' ? 'active' : ''}`} onClick={() => setActiveTab('statistics')}>
            <BarChart2 size={16} />
            <span>{t('auto_3375', 'Evaluation Statistics')}</span>
          </button>
          <button className="moderation-refresh-btn icon-only" onClick={loadData} title={t('admin.refreshLiveData', 'Refresh Live Data')} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {message && <div className={`royal-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>}

        {loading ? <div className="moderation-loader-box">
            <Loader2 className="animate-spin gold-glow-icon" size={48} />
            <p className="loader-text">{t('admin.queryingDatabases', 'Querying content databases...')}</p>
          </div> : activeTab === 'pending' ? (/* Pending Approvals Section */
      <div className="moderation-content-panel">
            {pendingReviews.length === 0 ? <div className="royal-card moderation-empty-card">
                <Sparkles className="empty-icon gold-glow" size={48} />
                <h3>{t('admin.noPendingReviews', 'No Items Pending Review')}</h3>
                <p>{t('admin.noPendingReviewsDesc', 'The queue is completely clear. All submissions are safely within standard API tiers or approved by automate systems.')}</p>
              </div> : <div className="pending-reviews-grid">
                {pendingReviews.map(item => {
            const isExpanded = expandedItems[item.id];
            const hasLongContent = item.content && item.content.length > 250;
            const displayContent = hasLongContent && !isExpanded ? `${item.content.substring(0, 250)}...` : item.content;
            return <div className="royal-card pending-review-card animate-fade-in" key={item.id}>
                      <div className="review-card-header">
                        <div className="badge-item-type">
                          {getCollectionIcon(item.collection)}
                          <span>{getCollectionLabel(item.collection)}</span>
                        </div>
                        <div className="badge-item-date">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : t('admin.recent', 'Recent')}
                        </div>
                      </div>

                      <div className="review-card-body">
                        {item.title && item.title !== item.type && <h4 className="review-title-text">{item.title}</h4>}
                        {item.coverUrl && <div className="review-cover-container">
                            <img src={item.coverUrl} alt={t('admin.blogCover', 'Blog Cover')} className="review-cover-image" />
                          </div>}
                        <p className="review-content-text">{displayContent}</p>
                        
                        {hasLongContent && <button type="button" className="expand-content-btn" onClick={() => toggleExpand(item.id)}>
                            <Eye size={12} /> {isExpanded ? t('admin.collapseContent', 'Collapse Content') : t('admin.viewFullContent', 'View Full Content')}
                          </button>}

                        <div className="review-meta-row">
                          <div className="meta-author">
                            <strong>{t('admin.submittedBy', 'Submitted By:')}</strong> {item.authorName} <span className="meta-id">({item.authorId || t('admin.guest', 'Guest')})</span>
                          </div>
                          {item.referenceId && <div className="meta-ref">
                              <strong>{t('admin.referenceLocator', 'Reference Locator:')}</strong> <span className="ref-hash">{item.referenceId}</span>
                            </div>}
                        </div>
                      </div>

                      <div className="review-card-actions">
                        <button className="royal-btn approve-action-btn" disabled={actionLoading !== null} onClick={() => handleApprove(item.collection, item.id)}>
                          {actionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
                          <span>{t('admin.approvePublish', 'Approve & Publish')}</span>
                        </button>
                        <button className="royal-btn reject-action-btn" disabled={actionLoading !== null} onClick={() => handleReject(item.collection, item.id)}>
                          {actionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
                          <span>{t('admin.rejectDelete', 'Reject & Delete')}</span>
                        </button>
                      </div>
                    </div>;
          })}
              </div>}
          </div>) : activeTab === 'blocked' ? (/* Blocked Logs Section */
      <div className="moderation-content-panel">
            <div className="blocked-ledger-actions-row">
              <p className="ledger-desc">
                {t('admin.blockedLogsDesc', 'Log records of user-generated inputs that violated spam or language policies (RegEx / API filters). Logs are held for audit trails and can be cleaned periodically.')}
              </p>
              {blockedLogs.length > 0 && <button className="royal-btn clear-ledger-btn" onClick={handleClearBlockedLogs}>
                  <Trash2 size={14} />
                  <span>{t('admin.purgeBlockedLedger', 'Purge Blocked Ledger')}</span>
                </button>}
            </div>

            {blockedLogs.length === 0 ? <div className="royal-card moderation-empty-card">
                <Shield className="empty-icon gold-glow" size={48} />
                <h3>{t('admin.blockedLedgerEmpty', 'Blocked Ledger is Empty')}</h3>
                <p>{t('admin.blockedLedgerEmptyDesc', 'No policy violations have been logged in this period. The community is abiding by peaceful standards.')}</p>
              </div> : <div className="blocked-logs-table-wrapper royal-card">
                <table className="blocked-logs-table">
                  <thead>
                    <tr>
                      <th>{t('admin.timestamp', 'Timestamp')}</th>
                      <th>{t('admin.offenderIdentity', 'Offender Identity')}</th>
                      <th>{t('admin.type', 'Type')}</th>
                      <th>{t('admin.violationReason', 'Violation Reason')}</th>
                      <th>{t('admin.flaggedContentPreview', 'Flagged Content Preview')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedLogs.map(log => {
                const isExpanded = expandedItems[log.id];
                const contentText = log.content || '';
                const hasLongContent = contentText.length > 80;
                const displayContent = hasLongContent && !isExpanded ? `${contentText.substring(0, 80)}...` : contentText;
                return <tr key={log.id} className="blocked-row">
                          <td className="col-time">
                            {log.blockedAt ? new Date(log.blockedAt).toLocaleString() : t('admin.notAvailable', 'N/A')}
                          </td>
                          <td className="col-user">
                            <span className="user-email">{log.userEmail}</span>
                            <span className="user-id">{t('admin.idLabel', 'ID:')} {log.userId || t('admin.guestCaps', 'GUEST')}</span>
                          </td>
                          <td className="col-type">
                            <span className="blocked-type-badge">{log.contentType || t('admin.textCaps', 'TEXT')}</span>
                          </td>
                          <td className="col-reason">
                            <span className="reason-text">{log.reason}</span>
                          </td>
                          <td className="col-content">
                            <div className="content-cell-box">
                              <span className="raw-content">{displayContent}</span>
                              {hasLongContent && <button type="button" className="text-toggle-mini-btn" onClick={() => toggleExpand(log.id)}>
                                  {isExpanded ? t('admin.collapse', 'Collapse') : t('admin.expand', 'Expand')}
                                </button>}
                            </div>
                          </td>
                        </tr>;
              })}
                  </tbody>
                </table>
              </div>}
          </div>) : activeTab === 'site-reviews' ? (/* Site Reviews Section */
      <div className="moderation-content-panel">
            <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '24px',
          maxWidth: '800px',
          lineHeight: '1.6'
        }}>
              {t('auto_3376', 'These site reviews and testimonials have been submitted by members. By default, reviews are withheld from public exhibition pending curator approval to protect against vulgarity, commercial spam, or malicious postings.')}
            </p>

            {pendingSiteReviews.length === 0 ? <div className="royal-card moderation-empty-card">
                <Sparkles className="empty-icon gold-glow" size={48} />
                <h3>{t('auto_3377', 'No Testimonials Pending Review')}</h3>
                <p>{t('auto_3378', 'The site testimonials queue is completely clear. All submitted feedback has been processed.')}</p>
              </div> : <div className="pending-reviews-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '20px'
        }}>
                {pendingSiteReviews.map(item => <div className="royal-card pending-review-card animate-fade-in" key={item.id} style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
            border: '1px solid var(--border-color, rgba(212,175,55,0.15))'
          }}>
                    <div>
                      <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-color, rgba(212,175,55,0.1))',
                paddingBottom: '10px'
              }}>
                        <div style={{
                  display: 'flex',
                  gap: '3px'
                }}>
                          {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill={s <= item.rating ? "var(--accent)" : "none"} stroke={s <= item.rating ? "var(--accent)" : "var(--border-color)"} />)}
                        </div>
                        <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}>
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      
                      <p style={{
                fontSize: '0.95rem',
                color: 'var(--text-primary)',
                fontStyle: 'italic',
                marginBottom: '20px',
                lineHeight: '1.6'
              }}>
                        "{item.comment}"
                      </p>
                    </div>

                    <div>
                      <div style={{
                borderTop: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                paddingTop: '12px',
                marginBottom: '16px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                        <div><strong>{t("str_5300", "Author:")}</strong> {item.memberName}</div>
                        <div><strong>{t("str_5301", "Email:")}</strong> {item.memberEmail || 'N/A'}</div>
                      </div>

                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                        <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                          <button className="royal-btn-secondary" disabled={actionLoading !== null} onClick={() => handleApproveSiteReview(item.id)} style={{
                    flex: 1,
                    padding: '7px 8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }} title={t("str_5302", "Approve but keep hidden from the home page")}>
                            {actionLoading === item.id ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />} {t("str_5303", "Approve Only")} </button>
                          <button className="royal-btn" disabled={actionLoading !== null} onClick={() => handlePublishSiteReview(item.id)} style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: 'var(--accent-gradient)',
                    color: 'var(--surface)'
                  }} title={t("str_5304", "Approve and immediately publish to the home page")}>
                            {actionLoading === item.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {t("str_5305", "Approve & Publish")} </button>
                        </div>
                        <button className="royal-btn-secondary" disabled={actionLoading !== null} onClick={() => handleRejectSiteReview(item.id)} style={{
                  padding: '7px 8px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: '1px solid #dc2626',
                  color: '#dc2626',
                  fontWeight: '600'
                }}>
                          {actionLoading === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} {t("str_5306", "Delete Testimonial")} </button>
                      </div>
                    </div>
                  </div>)}
              </div>}
          </div>) : activeTab === 'approved-testimonials' ? (/* Approved Testimonials Section */
      <div className="moderation-content-panel">
            <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '24px',
          maxWidth: '800px',
          lineHeight: '1.6'
        }}> {t("str_5307", "These site testimonials have been approved by curators. You can control which of these are actively published and rotated on the main home page carousel (up to 5 random published testimonials are displayed at a time).")} </p>

            {approvedSiteReviews.length === 0 ? <div className="royal-card moderation-empty-card">
                <CheckCircle className="empty-icon gold-glow" size={48} />
                <h3>{t('auto_3379', 'No Approved Testimonials')}</h3>
                <p>{t("str_5308", "There are no approved testimonials yet. Go to the \"Site Testimonials\" tab to approve new submissions.")}</p>
              </div> : <div className="approved-reviews-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '20px'
        }}>
                {approvedSiteReviews.map(item => <div className="royal-card pending-review-card animate-fade-in" key={item.id} style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
            border: '1px solid var(--border-color, rgba(212,175,55,0.15))'
          }}>
                    <div>
                      <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-color, rgba(212,175,55,0.1))',
                paddingBottom: '10px'
              }}>
                        <div style={{
                  display: 'flex',
                  gap: '3px'
                }}>
                          {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill={s <= item.rating ? "var(--accent)" : "none"} stroke={s <= item.rating ? "var(--accent)" : "var(--border-color)"} />)}
                        </div>
                        {item.published ? <span style={{
                  fontSize: '0.7rem',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid #10b981',
                  color: '#10b981',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                            {t('auto_3380', 'Published')}
                          </span> : <span style={{
                  fontSize: '0.7rem',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'rgba(156,163,175,0.15)',
                  border: '1px solid var(--text-secondary)',
                  color: 'var(--text-secondary)',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                            {t('auto_3381', 'Hidden')}
                          </span>}
                      </div>
                      
                      <p style={{
                fontSize: '0.95rem',
                color: 'var(--text-primary)',
                fontStyle: 'italic',
                marginBottom: '20px',
                lineHeight: '1.6'
              }}>
                        "{item.comment}"
                      </p>
                    </div>

                    <div>
                      <div style={{
                borderTop: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                paddingTop: '12px',
                marginBottom: '16px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                        <div><strong>{t("str_5309", "Author:")}</strong> {item.memberName}</div>
                        <div><strong>{t("str_5310", "Email:")}</strong> {item.memberEmail || 'N/A'}</div>
                        <div style={{
                  marginTop: '4px',
                  fontSize: '0.75rem'
                }}>
                          <strong>{t("str_5311", "Date:")}</strong> {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'Recent'}
                        </div>
                      </div>

                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                        <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                          {item.published ? <button className="royal-btn-secondary" disabled={actionLoading !== null} onClick={() => handleUnpublishSiteReview(item.id)} style={{
                    flex: 1,
                    padding: '7px 8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                              {actionLoading === item.id ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} {t("str_5312", "Hide From Main")} </button> : <button className="royal-btn" disabled={actionLoading !== null} onClick={() => handlePublishSiteReview(item.id)} style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: 'var(--accent-gradient)',
                    color: 'var(--surface)'
                  }}>
                              {actionLoading === item.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {t("str_5313", "Publish to Main")} </button>}
                          <button className="royal-btn-secondary" disabled={actionLoading !== null} onClick={() => handleDisapproveSiteReview(item.id)} style={{
                    flex: 1,
                    padding: '7px 8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }} title={t("str_5314", "Revoke approval and return to Pending Site Testimonials")}>
                            {actionLoading === item.id ? <Loader2 size={12} className="animate-spin" /> : <ThumbsDown size={12} />} {t("str_5315", "Disapprove")} </button>
                        </div>
                        <button className="royal-btn-secondary" disabled={actionLoading !== null} onClick={() => handleRejectSiteReview(item.id)} style={{
                  padding: '7px 8px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: '1px solid #dc2626',
                  color: '#dc2626',
                  fontWeight: '600'
                }}>
                          {actionLoading === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} {t("str_5316", "Permanent Delete")} </button>
                      </div>
                    </div>
                  </div>)}
              </div>}
          </div>) : (/* Statistics Section */
      <div className="moderation-content-panel">
            <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '30px',
          maxWidth: '800px',
          lineHeight: '1.6'
        }}>
              {t('auto_3382', 'Examine rating distribution counts and evaluation diagnostics for both the overall platform and specific physical checkout experiences.')}
            </p>

            {ratingStats ? <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '30px'
        }}>
                
                {/* Platform Testimonial Stats */}
                <div className="royal-card" style={{
            padding: '30px',
            border: '1px solid var(--border-color, rgba(212,175,55,0.2))'
          }}>
                  <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
              borderBottom: '1px solid var(--border-color, rgba(212,175,55,0.15))',
              paddingBottom: '12px'
            }}>
                    <MessageSquare size={18} className="gold-glow-icon" />
                    <h3 style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                color: 'var(--accent)',
                fontSize: '1.25rem',
                fontWeight: 600
              }}>
                      {t('auto_3383', 'Site Review Statistics')}
                    </h3>
                  </div>

                  <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '24px'
            }}>
                    <span className="gold-gradient-text" style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                fontFamily: 'var(--font-display)'
              }}>
                      {ratingStats.averageSiteRating ? ratingStats.averageSiteRating.toFixed(1) : '0.0'}
                    </span>
                    <div>
                      <div style={{
                  display: 'flex',
                  gap: '2px',
                  marginBottom: '4px'
                }}>
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} fill={s <= Math.round(ratingStats.averageSiteRating || 0) ? "var(--accent)" : "none"} stroke={s <= Math.round(ratingStats.averageSiteRating || 0) ? "var(--accent)" : "var(--border-color)"} />)}
                      </div>
                      <span style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}> {t("str_5317", "Based on")} {ratingStats.totalSiteReviews || 0} {t("str_5318", "reviews")} </span>
                    </div>
                  </div>

                  <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
                    {[5, 4, 3, 2, 1].map(stars => {
                const count = ratingStats.siteRatingCounts?.[stars] || ratingStats.siteRatingCounts?.[stars.toString()] || 0;
                const percentage = ratingStats.totalSiteReviews > 0 ? count / ratingStats.totalSiteReviews * 100 : 0;
                return <div key={stars} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                          <span style={{
                    width: '45px',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                            {stars} <Star size={12} fill="var(--accent)" stroke="var(--accent)" />
                          </span>
                          <div style={{
                    flex: 1,
                    height: '8px',
                    background: 'var(--accent-light, rgba(128,128,128,0.1))',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                            <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent-light), var(--accent))',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                          </div>
                          <span style={{
                    width: '30px',
                    textAlign: 'right',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                  }}>
                            {count}
                          </span>
                        </div>;
              })}
                  </div>
                </div>

                {/* Checkout Experience Stats */}
                <div className="royal-card" style={{
            padding: '30px',
            border: '1px solid var(--border-color, rgba(212,175,55,0.2))'
          }}>
                  <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
              borderBottom: '1px solid var(--border-color, rgba(212,175,55,0.15))',
              paddingBottom: '12px'
            }}>
                    <BookMarked size={18} className="gold-glow-icon" />
                    <h3 style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                color: 'var(--accent)',
                fontSize: '1.25rem',
                fontWeight: 600
              }}>
                      {t('auto_3384', 'Checkout Experience Ratings')}
                    </h3>
                  </div>

                  <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '24px'
            }}>
                    <span className="gold-gradient-text" style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                fontFamily: 'var(--font-display)'
              }}>
                      {ratingStats.averageCheckoutRating ? ratingStats.averageCheckoutRating.toFixed(1) : '0.0'}
                    </span>
                    <div>
                      <div style={{
                  display: 'flex',
                  gap: '2px',
                  marginBottom: '4px'
                }}>
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} fill={s <= Math.round(ratingStats.averageCheckoutRating || 0) ? "var(--accent)" : "none"} stroke={s <= Math.round(ratingStats.averageCheckoutRating || 0) ? "var(--accent)" : "var(--border-color)"} />)}
                      </div>
                      <span style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}> {t("str_5319", "Based on")} {ratingStats.totalCheckoutRatings || 0} {t("str_5320", "evaluations")} </span>
                    </div>
                  </div>

                  <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
                    {[5, 4, 3, 2, 1].map(stars => {
                const count = ratingStats.checkoutRatingCounts?.[stars] || ratingStats.checkoutRatingCounts?.[stars.toString()] || 0;
                const percentage = ratingStats.totalCheckoutRatings > 0 ? count / ratingStats.totalCheckoutRatings * 100 : 0;
                return <div key={stars} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                          <span style={{
                    width: '45px',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                            {stars} <Star size={12} fill="var(--accent)" stroke="var(--accent)" />
                          </span>
                          <div style={{
                    flex: 1,
                    height: '8px',
                    background: 'var(--accent-light, rgba(128,128,128,0.1))',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                            <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #b8860b, var(--accent))',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                          </div>
                          <span style={{
                    width: '30px',
                    textAlign: 'right',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                  }}>
                            {count}
                          </span>
                        </div>;
              })}
                  </div>
                </div>

              </div> : <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          background: 'var(--accent-light, rgba(128,128,128,0.03))',
          border: '1px dashed var(--border-color)',
          borderRadius: '8px'
        }}>
                {t('auto_3385', 'No rating statistics could be aggregated. Verify transactions have been completed.')}
              </div>}
          </div>)}
      </div>
    </div>;
};
export default CuratorModerationPage;