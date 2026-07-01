import React, { useState, useEffect } from 'react';
import { 
  Shield, Sparkles, ArrowLeft, Loader2, CheckCircle, AlertTriangle, 
  Trash2, ThumbsUp, ThumbsDown, BookOpen, MessageSquare, Edit3, 
  Eye, RefreshCw, AlertCircle, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { 
  getBlockedContents, clearBlockedContents, getPendingReviews, 
  approveReview, rejectReview 
} from '../../services/moderationApi';
import './CuratorModerationPage.css';

const CuratorModerationPage = ({ user }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'blocked'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores id of item being processed
  const [message, setMessage] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [blockedLogs, setBlockedLogs] = useState([]);
  const [expandedItems, setExpandedItems] = useState({}); // track expanded state for long content

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
          setMessage({ type: 'error', text: res?.message || t('admin.errorPendingReviews', 'Failed to fetch pending review requests.') });
        }
      } else {
        const res = await getBlockedContents();
        if (res?.success) {
          setBlockedLogs(res.data || []);
        } else {
          setMessage({ type: 'error', text: res?.message || t('admin.errorBlockedLogs', 'Failed to fetch blocked content logs.') });
        }
      }
    } catch (err) {
      console.error('Error fetching moderation data:', err);
      setMessage({ type: 'error', text: `${t('admin.connectionFailure', 'Connection failure:')} ${err.message}` });
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
        setMessage({ type: 'success', text: t('admin.successApprove', 'Substance/Chronicle approved and published to the realm.') });
      } else {
        setMessage({ type: 'error', text: res?.message || t('admin.errorApprove', 'Failed to approve item.') });
      }
    } catch (err) {
      console.error('Approve action failed', err);
      setMessage({ type: 'error', text: `${t('admin.errorApproveAction', 'Approve action failed:')} ${err.message}` });
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
        setMessage({ type: 'success', text: t('admin.successReject', 'Substance/Chronicle rejected and permanently purged.') });
      } else {
        setMessage({ type: 'error', text: res?.message || t('admin.errorReject', 'Failed to reject item.') });
      }
    } catch (err) {
      console.error('Reject action failed', err);
      setMessage({ type: 'error', text: `${t('admin.errorRejectAction', 'Reject action failed:')} ${err.message}` });
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
        setMessage({ type: 'success', text: t('admin.successClearLedger', 'The blocked content ledger has been successfully cleared.') });
      } else {
        setMessage({ type: 'error', text: res?.message || t('admin.errorClearLedger', 'Failed to clear ledger.') });
      }
    } catch (err) {
      console.error('Clear logs failed', err);
      setMessage({ type: 'error', text: `${t('admin.errorClearLogs', 'Failed to clear logs:')} ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCollectionLabel = (col) => {
    switch (col?.toLowerCase()) {
      case 'discourses': return t('admin.chronicleBlogDebate', 'Chronicle Blog / Debate');
      case 'discourse_comments': return t('admin.blogComment', 'Blog Comment');
      case 'book_reviews': return t('admin.bookReview', 'Book Review');
      default: return col;
    }
  };

  const getCollectionIcon = (col) => {
    switch (col?.toLowerCase()) {
      case 'discourses': return <Edit3 size={14} className="type-icon-gold" />;
      case 'discourse_comments': return <MessageSquare size={14} className="type-icon-gold" />;
      case 'book_reviews': return <BookOpen size={14} className="type-icon-gold" />;
      default: return <Edit3 size={14} className="type-icon-gold" />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-access-denied-container animate-fade-in">
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
      </div>
    );
  }

  return (
    <div className="curator-moderation-container animate-fade-in">
      <div className="curator-moderation-inner">
        {/* Back Link */}
        <Link to="/admin" className="back-link-academy">
          <ArrowLeft size={16} /> {t('admin.backToConsole', 'Return to Curator Console')}
        </Link>

        {/* Header */}
        <header className="curator-moderation-header">
          <div className="header-badge-moderation">
            <Shield size={14} className="gold-glow-icon" />
            <span className="gold-gradient-text">{t('admin.sovereignContentModeration', 'Sovereign Content Moderation').toUpperCase()}</span>
          </div>
          <h1 className="moderation-page-title glow-text">{t('admin.moderationLedger', 'Content Moderation Ledger')}</h1>
          <p className="moderation-page-subtitle">
            {t('admin.moderationDesc', 'Manage scholarly content. Approve items held in manual review or inspect the ledger of automatically blocked items flagged for spam and offensive terms.')}
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="moderation-tabs-row">
          <button 
             className={`moderation-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <Clock size={16} />
            <span>{t('admin.pendingReviewQueue', 'Pending Review Queue')} ({pendingReviews.length})</span>
          </button>
          <button 
            className={`moderation-tab-btn ${activeTab === 'blocked' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocked')}
          >
            <AlertCircle size={16} />
            <span>{t('admin.blockedLogsFeed', 'Blocked Logs Feed')} ({blockedLogs.length})</span>
          </button>
          <button className="moderation-refresh-btn icon-only" onClick={loadData} title={t('admin.refreshLiveData', 'Refresh Live Data')} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {message && (
          <div className={`royal-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="moderation-loader-box">
            <Loader2 className="animate-spin gold-glow-icon" size={48} />
            <p className="loader-text">{t('admin.queryingDatabases', 'Querying content databases...')}</p>
          </div>
        ) : activeTab === 'pending' ? (
          /* Pending Approvals Section */
          <div className="moderation-content-panel">
            {pendingReviews.length === 0 ? (
              <div className="royal-card moderation-empty-card">
                <Sparkles className="empty-icon gold-glow" size={48} />
                <h3>{t('admin.noPendingReviews', 'No Items Pending Review')}</h3>
                <p>{t('admin.noPendingReviewsDesc', 'The queue is completely clear. All submissions are safely within standard API tiers or approved by automate systems.')}</p>
              </div>
            ) : (
              <div className="pending-reviews-grid">
                {pendingReviews.map((item) => {
                  const isExpanded = expandedItems[item.id];
                  const hasLongContent = item.content && item.content.length > 250;
                  const displayContent = hasLongContent && !isExpanded 
                    ? `${item.content.substring(0, 250)}...` 
                    : item.content;

                  return (
                    <div className="royal-card pending-review-card animate-fade-in" key={item.id}>
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
                        {item.title && item.title !== item.type && (
                          <h4 className="review-title-text">{item.title}</h4>
                        )}
                        {item.coverUrl && (
                          <div className="review-cover-container">
                            <img src={item.coverUrl} alt={t('admin.blogCover', 'Blog Cover')} className="review-cover-image" />
                          </div>
                        )}
                        <p className="review-content-text">{displayContent}</p>
                        
                        {hasLongContent && (
                          <button 
                            type="button" 
                            className="expand-content-btn"
                            onClick={() => toggleExpand(item.id)}
                          >
                            <Eye size={12} /> {isExpanded ? t('admin.collapseContent', 'Collapse Content') : t('admin.viewFullContent', 'View Full Content')}
                          </button>
                        )}

                        <div className="review-meta-row">
                          <div className="meta-author">
                            <strong>{t('admin.submittedBy', 'Submitted By:')}</strong> {item.authorName} <span className="meta-id">({item.authorId || t('admin.guest', 'Guest')})</span>
                          </div>
                          {item.referenceId && (
                            <div className="meta-ref">
                              <strong>{t('admin.referenceLocator', 'Reference Locator:')}</strong> <span className="ref-hash">{item.referenceId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="review-card-actions">
                        <button 
                          className="royal-btn approve-action-btn"
                          disabled={actionLoading !== null}
                          onClick={() => handleApprove(item.collection, item.id)}
                        >
                          {actionLoading === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ThumbsUp size={14} />
                          )}
                          <span>{t('admin.approvePublish', 'Approve & Publish')}</span>
                        </button>
                        <button 
                          className="royal-btn reject-action-btn"
                          disabled={actionLoading !== null}
                          onClick={() => handleReject(item.collection, item.id)}
                        >
                          {actionLoading === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ThumbsDown size={14} />
                          )}
                          <span>{t('admin.rejectDelete', 'Reject & Delete')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Blocked Logs Section */
          <div className="moderation-content-panel">
            <div className="blocked-ledger-actions-row">
              <p className="ledger-desc">
                {t('admin.blockedLogsDesc', 'Log records of user-generated inputs that violated spam or language policies (RegEx / API filters). Logs are held for audit trails and can be cleaned periodically.')}
              </p>
              {blockedLogs.length > 0 && (
                <button 
                  className="royal-btn clear-ledger-btn"
                  onClick={handleClearBlockedLogs}
                >
                  <Trash2 size={14} />
                  <span>{t('admin.purgeBlockedLedger', 'Purge Blocked Ledger')}</span>
                </button>
              )}
            </div>

            {blockedLogs.length === 0 ? (
              <div className="royal-card moderation-empty-card">
                <Shield className="empty-icon gold-glow" size={48} />
                <h3>{t('admin.blockedLedgerEmpty', 'Blocked Ledger is Empty')}</h3>
                <p>{t('admin.blockedLedgerEmptyDesc', 'No policy violations have been logged in this period. The community is abiding by peaceful standards.')}</p>
              </div>
            ) : (
              <div className="blocked-logs-table-wrapper royal-card">
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
                    {blockedLogs.map((log) => {
                      const isExpanded = expandedItems[log.id];
                      const contentText = log.content || '';
                      const hasLongContent = contentText.length > 80;
                      const displayContent = hasLongContent && !isExpanded 
                        ? `${contentText.substring(0, 80)}...` 
                        : contentText;

                      return (
                        <tr key={log.id} className="blocked-row">
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
                              {hasLongContent && (
                                <button 
                                  type="button" 
                                  className="text-toggle-mini-btn"
                                  onClick={() => toggleExpand(log.id)}
                                >
                                  {isExpanded ? t('admin.collapse', 'Collapse') : t('admin.expand', 'Expand')}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CuratorModerationPage;
