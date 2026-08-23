import { useLanguage } from '../../i18n/LanguageContext';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { listAdminRequests, approveAdminRequest, rejectAdminRequest } from '../../services/adminRequestApi';

export default function AdminRequests({ user }) {
  const { t } = useLanguage();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  const isAdmin = user && user.role === 'ADMIN';

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAdminRequests('PENDING');
      setRequests(data || []);
    } catch (e) {
      console.error('Failed to load admin requests', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    try {
      await approveAdminRequest(id, 'Approved via admin console');
      load();
    } catch (e) {
      console.error('Approve failed', e);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectAdminRequest(id, 'Rejected by admin');
      load();
    } catch (e) {
      console.error('Reject failed', e);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-requests">
        <h3>{t('auto_3195', 'Access Denied')}</h3>
        <p>{t('auto_3196', 'Only administrators can review admin requests.')}</p>
      </div>
    );
  }

  if (loading) return <div>{t('auto_3197', 'Loading admin requests...')}</div>;

  return (
    <div className="admin-requests" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Link to="/admin" className="back-link" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={16} /> {t('auto_3198', 'Curator Console')}
      </Link>
      <h3>{t('auto_3199', 'Pending Admin Requests')}</h3>
      {requests.length === 0 ? (
        <div>{t('auto_3200', 'No pending requests.')}</div>
      ) : (
        <ul className="requests-list">
          {requests.map(r => (
            <li key={r.id} className="request-row">
              <div style={{ flex: 1 }}>
                <div><strong>{r.requesterEmail}</strong> ({r.requesterUid})</div>
                <div style={{ color: '#666' }}>{r.reason}</div>
                <div style={{ fontSize: '0.85rem', color: '#999' }}>{new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleApprove(r.id)} className="royal-btn">{t('auto_3201', 'Approve')}</button>
                <button onClick={() => handleReject(r.id)} className="royal-btn-secondary">{t('auto_3202', 'Reject')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
