import React, { useState } from 'react';
import { Shield, Users, Award, Radio, CheckCircle, RefreshCw, Key } from 'lucide-react';
import './UserManagementPage.css';

const UserManagementPage = ({ user }) => {
  const [assigningRfidId, setAssigningRfidId] = useState(null);
  const [rfidValue, setRfidValue] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [members, setMembers] = useState([
    { id: 'usr-1', email: 'archduke@royalbook.club', firstName: 'Archduke', lastName: 'of Prose', role: 'ADMIN', rfidToken: 'RFID-99081' },
    { id: 'usr-2', email: 'lady.cheste@royalbook.club', firstName: 'Lady', lastName: 'Chesterfield', role: 'MEMBER', rfidToken: 'RFID-12001' },
    { id: 'usr-3', email: 'patron3@royalbook.club', firstName: 'Eminent', lastName: 'Scholar', role: 'MEMBER', rfidToken: null },
    { id: 'usr-4', email: 'scribe@royalbook.club', firstName: 'Royal', lastName: 'Scribe', role: 'MEMBER', rfidToken: null }
  ]);

  const handleToggleRole = (memberId) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const newRole = m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
        triggerSuccess(`Role updated to ${newRole} for ${m.firstName} ${m.lastName}`);
        return { ...m, role: newRole };
      }
      return m;
    }));
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

  return (
    <div className="user-mgmt-container animate-fade-in">
      <header className="user-mgmt-header">
        <div className="header-badge-admin">
          <Shield size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">MEMBER PROTOCOLS</span>
        </div>
        <h1 className="user-mgmt-title glow-text">User Registry & Smart-Access</h1>
        <p className="user-mgmt-subtitle">
          Administer salon credentials, grant administrator access, and register hardware RFID access keys for smart-lock entry.
        </p>
      </header>

      {/* Main Registry Table */}
      <section className="user-registry-table-section royal-card">
        <div className="section-head-with-icon">
          <Users size={20} className="gold-glow-icon" />
          <h3>Sovereign Patron Ledger</h3>
        </div>

        {successMsg && (
          <div className="success-banner animate-fade-in success-banner-mgmt">
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        <div className="ledger-table-container">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Scholar Name</th>
                <th>Email Address</th>
                <th>Role Rank</th>
                <th>RFID Key Ring</th>
                <th className="actions-header">Access Controls</th>
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
                        onClick={() => handleToggleRole(member.id)} 
                        className="royal-btn-secondary mini-table-btn"
                        id={`toggle-role-btn-${member.id}`}
                      >
                        Change Rank
                      </button>
                      <button 
                        onClick={() => setAssigningRfidId(member.id)} 
                        className="royal-btn mini-table-btn"
                        id={`assign-rfid-btn-${member.id}`}
                      >
                        Key RFID
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
                            Save
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
      </section>
    </div>
  );
};

export default UserManagementPage;
