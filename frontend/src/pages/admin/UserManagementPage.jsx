import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createAdminRequest } from '../../services/adminRequestApi';
import { getAllUsers, updateUserRole } from '../../services/userApi';
import { Shield, Users, Award, Radio, CheckCircle, RefreshCw, Key, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './UserManagementPage.css';

const UserManagementPage = ({ user }) => {
  const { t } = useLanguage();
  const [assigningRfidId, setAssigningRfidId] = useState(null);
  const [rfidValue, setRfidValue] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleToggleRole = async (member) => {
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
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: updatedUser.role || targetRole } : m)));
      triggerSuccess(`Role updated to ${targetRole} for ${member.firstName} ${member.lastName}`);
    } catch (e) {
      console.error('Failed to update role', e);
      const message = e?.response?.data?.message || e.message || 'Could not update role.';
      triggerSuccess(message);
    }
  };

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRfidAssignSubmit = (e, memberId) => {
    e.preventDefault();
    if (!rfidValue.trim()) return;

    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        triggerSuccess(`Assigned RFID key ${rfidValue} to ${m.firstName} ${m.lastName}`);
        return { ...m, rfidToken: rfidValue };
      }
      return m;
    }));

    setRfidValue('');
    setAssigningRfidId(null);
  };

  if (!isAdmin) {
    return (
      <div className="user-mgmt-container animate-fade-in">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2>{t('admin.privilegedSanctuary', 'Access Denied')}</h2>
          <p>{t('admin.accessDeniedDesc', 'Only administrators can access this page.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-mgmt-container animate-fade-in">
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
          {t('admin.userRfidDesc', 'Administer salon credentials, grant administrator access, and register hardware RFID access keys for smart-lock entry.')}
        </p>
      </header>

      <div style={{ marginTop: 12, marginBottom: 8 }}>
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
          <h3>{t('admin.registeredPatrons', 'Sovereign Patron Ledger')}</h3>
        </div>

        {successMsg && (
          <div className="success-banner animate-fade-in success-banner-mgmt">
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>{t('common.loading', 'Loading members...')}</div>
        ) : members.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>No members found.</div>
        ) : (
          <div className="ledger-table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>{t('admin.patron', 'Scholar Name')}</th>
                  <th>Email Address</th>
                  <th>{t('admin.role', 'Role Rank')}</th>
                  <th>{t('admin.nfcUidLabel', 'RFID Key Ring')}</th>
                  <th className="actions-header">{t('admin.actions', 'Access Controls')}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="ledger-row">
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
                      {member.rfidToken ? (
                        <span className="rfid-assigned-tag">
                          <Radio size={12} className="pulse-signal" /> {member.rfidToken}
                        </span>
                      ) : (
                        <span className="rfid-empty-tag">No Token Keyed</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons-row">
                        <button 
                          onClick={() => handleToggleRole(member)} 
                          className="royal-btn-secondary mini-table-btn"
                          id={`toggle-role-btn-${member.id}`}
                          disabled={user?.uid === member.id && member.role === 'ADMIN'}
                          title={user?.uid === member.id && member.role === 'ADMIN' ? 'You cannot change your own admin rank' : ''}
                        >
                          {user?.uid === member.id
                            ? 'Current Admin'
                            : member.role === 'ADMIN' ? t('admin.demoteAdmin', 'Demote') : t('admin.promoteAdmin', 'Promote to Admin')}
                        </button>
                        <button 
                          onClick={() => setAssigningRfidId(member.id)} 
                          className="royal-btn mini-table-btn"
                          id={`assign-rfid-btn-${member.id}`}
                        >
                          {t('admin.assignNfcBtn', 'Key RFID')}
                        </button>
                      </div>

                      {/* Expandable RFID Assign Drawer */}
                      {assigningRfidId === member.id && (
                        <form 
                          onSubmit={(e) => handleRfidAssignSubmit(e, member.id)} 
                          className="rfid-assign-form animate-slide-down"
                        >
                          <div className="form-sub-row">
                            <input 
                              type="text" 
                              placeholder="RFID-XXXXX" 
                              className="royal-input mini-form-input"
                              value={rfidValue}
                              onChange={(e) => setRfidValue(e.target.value)}
                              required
                            />
                            <button type="submit" className="royal-btn submit-rfid-btn">
                              {t('admin.save', 'Save')}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setAssigningRfidId(null)} 
                              className="cancel-rfid-btn"
                            >
                              X
                            </button>
                          </div>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default UserManagementPage;
