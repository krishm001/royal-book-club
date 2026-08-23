import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createAdminRequest } from '../../services/adminRequestApi';
import { getAllUsers, updateUserRole, getActiveCheckoutsCount, deleteUserPermanently } from '../../services/userApi';
import { Shield, Users, Award, Radio, CheckCircle, RefreshCw, Key, ArrowLeft, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './UserManagementPage.css';
const UserManagementPage = ({
  user
}) => {
  const {
    t
  } = useLanguage();
  const [assigningRfidId, setAssigningRfidId] = useState(null);
  const [rfidValue, setRfidValue] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for permanent member soft-deletion / anonymization
  const [deletingMember, setDeletingMember] = useState(null);
  const [activeCheckoutsCount, setActiveCheckoutsCount] = useState(0);
  const [checkingCheckouts, setCheckingCheckouts] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [hardDelete, setHardDelete] = useState(false);

  // Check if user is admin
  const isAdmin = user && user.role === 'ADMIN';
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await getAllUsers();
        const users = Array.isArray(response) ? response : response.data || [];
        setMembers(users);
      } catch (e) {
        console.error('Failed to load users', e);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);
  const handleToggleRole = async member => {
    if (!member?.id) {
      return;
    }
    const isSelf = user?.uid === member.id;
    const targetRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    if (isSelf && targetRole !== 'ADMIN') {
      triggerSuccess('Administrators cannot downgrade their own role.');
      return;
    }
    try {
      const response = await updateUserRole(member.id, targetRole);
      const updatedUser = response?.data || response;
      setMembers(prev => prev.map(m => m.id === member.id ? {
        ...m,
        role: updatedUser.role || targetRole
      } : m));
      triggerSuccess(`Role updated to ${targetRole} for ${member.firstName} ${member.lastName}`);
    } catch (e) {
      console.error('Failed to update role', e);
      const message = e?.response?.data?.message || e.message || 'Could not update role.';
      triggerSuccess(message);
    }
  };
  const triggerSuccess = msg => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };
  const handleRfidAssignSubmit = (e, memberId) => {
    e.preventDefault();
    if (!rfidValue.trim()) return;
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        triggerSuccess(`Assigned RFID key ${rfidValue} to ${m.firstName} ${m.lastName}`);
        return {
          ...m,
          rfidToken: rfidValue
        };
      }
      return m;
    }));
    setRfidValue('');
    setAssigningRfidId(null);
  };
  const initiateDeleteUser = async member => {
    if (!member?.id) return;
    setDeletingMember(member);
    setCheckingCheckouts(true);
    setDeleteError('');
    setHardDelete(false);
    try {
      const response = await getActiveCheckoutsCount(member.id);
      const count = response?.data !== undefined ? response.data : response;
      setActiveCheckoutsCount(count);
    } catch (err) {
      console.error('Failed to query active checkouts', err);
      setDeleteError('Failed to query active checkouts status.');
      setActiveCheckoutsCount(0);
    } finally {
      setCheckingCheckouts(false);
    }
  };
  const handleDeleteConfirm = async (force = false) => {
    if (!deletingMember?.id) return;
    try {
      await deleteUserPermanently(deletingMember.id, force, hardDelete);
      setMembers(prev => prev.filter(m => m.id !== deletingMember.id));
      triggerSuccess(hardDelete ? `Successfully hard-deleted member:` : `Successfully anonymized member: ${deletingMember.firstName} ${deletingMember.lastName}`);
      setDeletingMember(null);
    } catch (err) {
      console.error('Deletion failed', err);
      const msg = err?.response?.data?.message || err?.message || 'An error occurred during deletion.';
      setDeleteError(msg);
    }
  };
  if (!isAdmin) {
    return <div className="user-mgmt-container animate-fade-in">
        <div style={{
        textAlign: 'center',
        padding: '40px'
      }}>
          <h2>{t('admin.privilegedSanctuary', 'Access Denied')}</h2>
          <p>{t('admin.accessDeniedDesc', 'Only administrators can access this page.')}</p>
        </div>
      </div>;
  }
  return <div className="user-mgmt-container animate-fade-in">
      <header className="user-mgmt-header">
        <Link to="/admin" className="back-link">
          <ArrowLeft size={16} /> {t('admin.backToConsole', 'Curator Console')}
        </Link>
        <div className="header-badge-admin">
          <Shield size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('admin.memberProtocols', 'MEMBER PROTOCOLS')}</span>
        </div>
        <h1 className="user-mgmt-title glow-text">{t('admin.userRfidRegistries', 'User Registry & Smart-Access')}</h1>
        <p className="user-mgmt-subtitle">
          {t('admin.userRfidDesc', 'Administer library credentials, grant administrator access, and register hardware RFID access keys for smart-lock entry.')}
        </p>
      </header>

      <div style={{
      marginTop: 12,
      marginBottom: 8
    }}>
        <button onClick={async () => {
        try {
          await createAdminRequest('Requesting admin access via UI');
          triggerSuccess('Admin request submitted. Awaiting approval.');
        } catch (e) {
          console.error('Failed to submit admin request', e);
          triggerSuccess('Failed to submit admin request');
        }
      }} className="royal-btn">{t('admin.reviewRequests', 'Request Admin Access')}</button>
      </div>

      {/* Main Registry Table */}
      <section className="user-registry-table-section royal-card">
        <div className="section-head-with-icon">
          <Users size={20} className="gold-glow-icon" />
          <h3>{t('admin.registeredPatrons', 'Royal Patron Ledger')}</h3>
        </div>

        {successMsg && <div className="success-banner animate-fade-in success-banner-mgmt">
            <CheckCircle size={16} /> {successMsg}
          </div>}

        {loading ? <div style={{
        padding: '20px',
        textAlign: 'center'
      }}>{t('common.loading', 'Loading members...')}</div> : members.length === 0 ? <div style={{
        padding: '20px',
        textAlign: 'center'
      }}>{t('admin.noMembersFound', 'No members found.')}</div> : <div className="ledger-table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>{t('admin.patron', 'Scholar Name')}</th>
                  <th>{t('auth.emailAddress', 'Email Address')}</th>
                  <th>{t('admin.role', 'Role Rank')}</th>
                  <th>{t('admin.nfcUidLabel', 'RFID Key Ring')}</th>
                  <th className="actions-header">{t('admin.actions', 'Access Controls')}</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => <tr key={member.id} className="ledger-row">
                    <td className="member-name-td">
                      <span className="name-bold">{member.firstName} {member.lastName}</span>
                      <span className="id-sub">{member.id}</span>
                    </td>
                    <td>{member.email}</td>
                    <td>
                      <span className={`role-pill ${member.role}`}>
                        <Award size={12} /> {member.role}
                      </span>
                    </td>
                    <td>
                      {member.rfidToken ? <span className="rfid-assigned-tag">
                          <Radio size={12} className="pulse-signal" /> {member.rfidToken}
                        </span> : <span className="rfid-empty-tag">{t('admin.noTokenKeyed', 'No Token Keyed')}</span>}
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons-row">
                        <button onClick={() => handleToggleRole(member)} className="royal-btn-secondary mini-table-btn" id={`toggle-role-btn-${member.id}`} disabled={user?.uid === member.id && member.role === 'ADMIN'} title={user?.uid === member.id && member.role === 'ADMIN' ? t('admin.cannotChangeSelf', 'You cannot change your own admin rank') : ''}>
                          {user?.uid === member.id ? t('admin.currentAdmin', 'Current Admin') : member.role === 'ADMIN' ? t('admin.demoteAdmin', 'Demote') : t('admin.promoteAdmin', 'Promote to Admin')}
                        </button>
                        <button onClick={() => setAssigningRfidId(member.id)} className="royal-btn mini-table-btn" id={`assign-rfid-btn-${member.id}`}>
                          {t('admin.assignNfcBtn', 'Key RFID')}
                        </button>
                        <button onClick={() => initiateDeleteUser(member)} className="royal-btn-danger-outline mini-table-btn delete-member-btn" id={`delete-user-btn-${member.id}`} disabled={user?.uid === member.id} title={user?.uid === member.id ? t('admin.cannotDeleteSelf', 'You cannot delete yourself') : t('admin.permanentlyDeleteMember', 'Permanently delete member')}>
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Expandable RFID Assign Drawer */}
                      {assigningRfidId === member.id && <form onSubmit={e => handleRfidAssignSubmit(e, member.id)} className="rfid-assign-form animate-slide-down">
                          <div className="form-sub-row">
                            <input type="text" placeholder={t("str_5370", "RFID-XXXXX")} className="royal-input mini-form-input" value={rfidValue} onChange={e => setRfidValue(e.target.value)} required />
                            <button type="submit" className="royal-btn submit-rfid-btn">
                              {t('admin.save', 'Save')}
                            </button>
                            <button type="button" onClick={() => setAssigningRfidId(null)} className="cancel-rfid-btn">
                              X
                            </button>
                          </div>
                        </form>}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </section>

      {deletingMember && <div className="delete-modal-overlay animate-fade-in" onClick={() => setDeletingMember(null)}>
          <div className="delete-modal-content royal-card" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-header">
              <Shield className="gold-glow-icon" size={24} />
              <h2 className="gold-gradient-text">{t('admin.royalRemovalProtocol', 'Royal Removal Protocol')}</h2>
            </div>
            
            <div className="delete-modal-body">
              {checkingCheckouts ? <div className="delete-modal-loading">
                  <RefreshCw className="animate-spin" size={24} style={{
              color: 'var(--accent)'
            }} />
                  <p>{t('admin.interrogatingCheckouts', 'Interrogating active checkouts registry...')}</p>
                </div> : <>
                  <p className="delete-warning-intro">
                    {t('admin.initiatingRemovalFor', 'You are initiating permanent removal for:')}
                    <br />
                    <strong className="delete-member-name">{deletingMember.firstName} {deletingMember.lastName}</strong>
                    <br />
                    <span className="uid-label">{t("str_5371", "UID:")} </span><code className="uid-code">{deletingMember.id}</code>
                  </p>
                  
                  {activeCheckoutsCount > 0 && <div className="delete-warning-box active-checkouts animate-slide-down">
                      <h3>⚠️ {t('admin.activeCheckoutsFoundTitle', 'Active Checkouts Found')} ({activeCheckoutsCount})</h3>
                      <p>
                        {t('admin.activeCheckoutsWarningDesc', 'This scholar currently has active book checkouts or outstanding return requests. Removing this account will permanently clear their access credentials.')}
                      </p>
                      <p className="override-disclaimer">
                        <strong>{t('admin.curatorNotice', 'Curator Notice:')}</strong> {t('admin.overrideAnonymizeNotice', 'You may choose to override and force deletion. Active checkouts will be force-returned to inventory.')}
                      </p>
                    </div>}
                  
                  <div className="delete-options-section" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                     <label style={{ display: 'block', marginBottom: '15px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input type="radio" name="deleteType" value="anonymize" checked={!hardDelete} onChange={() => setHardDelete(false)} style={{ accentColor: 'var(--accent)' }} />
                          <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>{t('admin.softAnonymize', 'Anonymize Profile (Recommended)')}</span>
                        </div>
                        <p style={{ margin: '4px 0 0 24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                           {t('admin.softAnonymizeDesc', 'Wipes all PII (email, address, phone) and revokes access, but preserves their generated content and ledger history under an anonymous profile.')}
                        </p>
                     </label>
                     <label style={{ display: 'block', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input type="radio" name="deleteType" value="hard" checked={hardDelete} onChange={() => setHardDelete(true)} style={{ accentColor: '#ef4444' }} />
                          <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>{t('admin.hardDelete', 'Absolute Erasure')}</span>
                        </div>
                        <p style={{ margin: '4px 0 0 24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                           {t('admin.hardDeleteDesc', 'Completely purges their user document and recursively destroys all their generated content (reviews, blogs, comments, etc.).')}
                        </p>
                     </label>
                  </div>

                  {deleteError && <div className="delete-error-banner animate-slide-down">
                      {deleteError}
                    </div>}
                  
                  <div className="delete-modal-actions">
                    <button onClick={() => setDeletingMember(null)} className="royal-btn-secondary">
                      {t('common.cancel', 'Cancel')}
                    </button>
                    {activeCheckoutsCount > 0 ? <button onClick={() => handleDeleteConfirm(true)} className="royal-btn-danger override-btn" id="confirm-force-delete-btn">
                        {t('admin.overrideAndDelete', 'Override & Delete')}
                      </button> : <button onClick={() => handleDeleteConfirm(false)} className="royal-btn-danger" id="confirm-delete-btn">
                        {t('admin.confirmDelete', 'Confirm Delete')}
                      </button>}
                  </div>
                </>}
            </div>
          </div>
        </div>}
    </div>;
};
export default UserManagementPage;