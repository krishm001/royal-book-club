import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/apiClient';
import { Shield, RefreshCw, AlertTriangle, ArrowLeft, CheckCircle, Search, Sliders, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './NfcCounterDashboard.css';
const NfcCounterDashboard = ({
  user
}) => {
  const {
    t
  } = useLanguage();
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [minCounterFilter, setMinCounterFilter] = useState(0);

  // Selection
  const [selectedUids, setSelectedUids] = useState([]);
  const [resetting, setResetting] = useState(false);
  const isAdmin = user && user.role === 'ADMIN';
  const fetchCounters = async (minVal = null) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const url = `/api/v1/admin/nfc/counters${minVal !== null ? `?minCounter=${minVal}` : ''}`;
      const response = await api.get(url);
      setCounters(Array.isArray(response.data) ? response.data : response.data || []);
      setSelectedUids([]); // Clear selections on reload
    } catch (e) {
      console.error('Failed to load NFC counters', e);
      setErrorMsg('Failed to load physical NFC counter records from backend.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAdmin) {
      fetchCounters();
    }
  }, [isAdmin]);
  const handleRefresh = () => {
    fetchCounters(minCounterFilter > 0 ? minCounterFilter : null);
  };
  const handleMinCounterChange = e => {
    const val = parseInt(e.target.value, 10) || 0;
    setMinCounterFilter(val);
    fetchCounters(val > 0 ? val : null);
  };
  const handleToggleSelect = rawDocId => {
    setSelectedUids(prev => prev.includes(rawDocId) ? prev.filter(id => id !== rawDocId) : [...prev, rawDocId]);
  };
  const handleToggleSelectAll = filteredList => {
    const ids = filteredList.map(c => c.rawDocumentId || c.ntagUid);
    const allSelected = ids.every(id => selectedUids.includes(id));
    if (allSelected) {
      setSelectedUids(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedUids(prev => {
        const union = new Set([...prev, ...ids]);
        return Array.from(union);
      });
    }
  };
  const handleResetCounters = async () => {
    if (selectedUids.length === 0) return;
    if (!window.confirm(`Are you absolutely sure you want to reset the tap sequences for ${selectedUids.length} selected physical tag(s) to 0? This will authorize new physical taps to register as fresh.`)) {
      return;
    }
    try {
      setResetting(true);
      setErrorMsg('');
      const response = await api.post('/api/v1/admin/nfc/counters/reset', {
        ntagUids: selectedUids
      });
      if (response.data?.success) {
        setSuccessMsg(`Successfully reset ${selectedUids.length} counters to zero!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchCounters(minCounterFilter > 0 ? minCounterFilter : null);
      } else {
        setErrorMsg('Backend rejected counter reset request.');
      }
    } catch (e) {
      console.error('Failed to reset counters', e);
      setErrorMsg('Failed to execute bulk counter reset.');
    } finally {
      setResetting(false);
    }
  };
  const handleDeleteCounters = async () => {
    if (selectedUids.length === 0) return;
    if (!window.confirm(`Are you absolutely sure you want to permanently delete the physical counter records for the ${selectedUids.length} selected NFC tag(s)? This cannot be undone and will erase all sequence/tap history for these tags.`)) {
      return;
    }
    try {
      setResetting(true);
      setErrorMsg('');
      const response = await api.post('/api/v1/admin/nfc/counters/delete', {
        ntagUids: selectedUids
      });
      if (response.data?.success) {
        setSuccessMsg(response.data.message || `Successfully deleted ${selectedUids.length} NFC tag records!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchCounters(minCounterFilter > 0 ? minCounterFilter : null);
      } else {
        setErrorMsg('Backend rejected counter deletion request.');
      }
    } catch (e) {
      console.error('Failed to delete counters', e);
      setErrorMsg('Failed to execute bulk counter deletion.');
    } finally {
      setResetting(false);
    }
  };
  const handleDeleteIndividual = async rawDocId => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete this physical NFC counter record? This will erase all sequence/tap history.`)) {
      return;
    }
    try {
      setResetting(true);
      setErrorMsg('');
      const response = await api.post('/api/v1/admin/nfc/counters/delete', {
        ntagUids: [rawDocId]
      });
      if (response.data?.success) {
        setSuccessMsg(`Successfully deleted the selected NFC tag record!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchCounters(minCounterFilter > 0 ? minCounterFilter : null);
      } else {
        setErrorMsg('Backend rejected counter deletion request.');
      }
    } catch (e) {
      console.error('Failed to delete counter', e);
      setErrorMsg('Failed to execute counter deletion.');
    } finally {
      setResetting(false);
    }
  };

  // Human readable colon formatting helper
  const formatUidWithColons = rawUid => {
    if (!rawUid) return '';
    const clean = rawUid.replace(/:/g, '').toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length; i += 2) {
      parts.push(clean.substring(i, i + 2));
    }
    return parts.join(':');
  };
  const filteredCounters = counters.filter(c => {
    const term = searchQuery.toLowerCase();
    const uidFormatted = formatUidWithColons(c.ntagUid).toLowerCase();
    const uidClean = (c.ntagUid || '').toLowerCase();
    const title = (c.bookTitle || '').toLowerCase();
    const author = (c.bookAuthor || '').toLowerCase();
    const isbn = (c.bookIsbn || '').toLowerCase();
    return uidClean.includes(term) || uidFormatted.includes(term) || title.includes(term) || author.includes(term) || isbn.includes(term);
  });
  if (!isAdmin) {
    return <div className="admin-access-denied-container">
        <div className="royal-card denied-card" style={{
        maxWidth: '500px',
        margin: '60px auto',
        textAlign: 'center'
      }}>
          <div className="denied-icon-wrapper" style={{
          marginBottom: '24px'
        }}>
            <Shield size={48} style={{
            color: '#d62828'
          }} />
          </div>
          <h2 style={{
          fontFamily: 'Cinzel, serif',
          color: 'var(--accent, #d4af37)',
          marginBottom: '16px'
        }}>
            {t('auto_3406', 'Sovereign Access Denied')}
          </h2>
          <p style={{
          color: 'var(--text-secondary, #b8b09f)'
        }}>
            {t('auto_3407', 'This panel is restricted exclusively to authorized curators of the Royal Library.')}
          </p>
          <Link to="/" className="royal-btn" style={{
          marginTop: '24px',
          display: 'inline-block'
        }}>
            {t('auto_3408', 'Return to Entrance')}
          </Link>
        </div>
      </div>;
  }
  const allFilteredSelected = filteredCounters.length > 0 && filteredCounters.every(item => selectedUids.includes(item.rawDocumentId || item.ntagUid));
  return <div className="nfc-dashboard-container animate-fade-in" style={{
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px 24px 60px 24px'
  }}>
      {/* Header breadcrumb */}
      <div className="dashboard-back-row" style={{
      marginBottom: '32px'
    }}>
        <Link to="/admin" className="back-to-console-btn" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--accent, #d4af37)',
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontWeight: '600'
      }}>
          <ArrowLeft size={16} /> {t('auto_3409', 'Back to Curator Console')}
        </Link>
      </div>

      <header className="nfc-dashboard-header" style={{
      marginBottom: '40px',
      textAlign: 'center'
    }}>
        <div className="header-badge" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '50px',
        background: 'rgba(212, 175, 55, 0.1)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        marginBottom: '16px'
      }}>
          <Shield size={12} style={{
          color: 'var(--accent, #d4af37)'
        }} />
          <span style={{
          fontSize: '0.75rem',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--accent, #d4af37)'
        }}>
            {t('auto_3410', 'Physical Security Diagnostics')}
          </span>
        </div>
        <h1 style={{
        fontFamily: 'Cinzel, serif',
        fontSize: '2.4rem',
        fontWeight: 'bold',
        margin: '0 0 12px 0',
        color: 'var(--text-primary, #ffffff)'
      }}>
          {t('auto_3411', 'NFC Tag Counter & Sequence Audit')}
        </h1>
        <p style={{
        color: 'var(--text-secondary, #b8b09f)',
        maxWidth: '750px',
        margin: '0 auto',
        fontSize: '1rem',
        lineHeight: '1.6'
      }}>
          {t('auto_3412', 'Monitor hardware tap counters on NTAG213 masterworks. Execute sequence reset commands to synchronize and self-heal local tap verification sessions.')}
        </p>
      </header>

      {/* Control center banner */}
      <div className="nfc-control-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      marginBottom: '32px'
    }}>
        
        {/* Search and Filters card */}
        <div className="royal-card control-panel-card" style={{
        padding: '20px 24px'
      }}>
          <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '1.15rem',
          color: 'var(--accent, #d4af37)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
            <Sliders size={18} /> {t('auto_3413', 'Filter Diagnostics Ledger')}
          </h3>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
            
            {/* Search inputs */}
            <div className="search-input-wrapper" style={{
            position: 'relative'
          }}>
              <input type="text" placeholder={t("str_5347", "Search by UID, Title, Author, or ISBN...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="royal-input" style={{
              width: '100%',
              paddingLeft: '38px',
              fontSize: '0.85rem'
            }} />
              <Search size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)'
            }} />
            </div>

            {/* Min-counter query parameter */}
            <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
              <label style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--accent, #d4af37)',
              fontWeight: 'bold'
            }}> {t("str_5348", "Filter Min Tap Counter:")} {minCounterFilter}
              </label>
              <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
                <input type="range" min="0" max="100" value={minCounterFilter} onChange={handleMinCounterChange} style={{
                flex: 1,
                accentColor: 'var(--accent, #d4af37)',
                cursor: 'pointer'
              }} />
                <input type="number" min="0" value={minCounterFilter} onChange={handleMinCounterChange} className="royal-input" style={{
                width: '70px',
                padding: '6px 8px',
                fontSize: '0.85rem',
                textAlign: 'center'
              }} />
              </div>
            </div>

          </div>
        </div>

        {/* Administration/Bulk commands card */}
        <div className="royal-card control-panel-card" style={{
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
          <div>
            <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '1.15rem',
            color: 'var(--accent, #d4af37)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
              <Shield size={18} /> {t('auto_3414', 'Administrative Commands')}
            </h3>
            <p style={{
            margin: '0 0 16px 0',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
              {t('auto_3415', 'Resetting physical counters forces a cloud sequence synchronization. Obsolete local caches on patron smartphones will automatically self-heal and accept the newly synchronized sequence.')}
            </p>
          </div>

          <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
            <button onClick={handleRefresh} className="royal-btn-secondary" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.85rem'
          }}>
              <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> {t('auto_3416', 'Refresh Ledger')}
            </button>
            
            <button onClick={handleResetCounters} disabled={selectedUids.length === 0 || resetting} className="royal-btn" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.85rem',
            backgroundColor: selectedUids.length > 0 ? 'var(--accent, #d4af37)' : 'rgba(212, 175, 55, 0.1)',
            borderColor: selectedUids.length > 0 ? 'var(--accent, #d4af37)' : 'rgba(212, 175, 55, 0.2)',
            color: selectedUids.length > 0 ? '#1a1a1a' : 'var(--text-secondary)'
          }}>
              <RefreshCw size={14} /> {t("str_5349", "Reset Selected (")}{selectedUids.length})
            </button>

            <button onClick={handleDeleteCounters} disabled={selectedUids.length === 0 || resetting} className="royal-btn" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.85rem',
            backgroundColor: selectedUids.length > 0 ? '#b22222' : 'rgba(178, 34, 34, 0.1)',
            borderColor: selectedUids.length > 0 ? '#b22222' : 'rgba(178, 34, 34, 0.2)',
            color: selectedUids.length > 0 ? '#ffffff' : 'var(--text-secondary)'
          }}>
              <Trash2 size={14} /> {t("str_5350", "Delete Selected (")}{selectedUids.length})
            </button>
          </div>
        </div>

      </div>

      {/* Notifications area */}
      {successMsg && <div className="success-banner animate-fade-in" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'rgba(34, 139, 34, 0.15)',
      border: '1px solid rgba(34, 139, 34, 0.4)',
      borderRadius: '8px',
      padding: '14px 20px',
      color: '#7cfc00',
      marginBottom: '24px',
      fontSize: '0.9rem'
    }}>
          <CheckCircle size={18} /> {successMsg}
        </div>}

      {errorMsg && <div className="error-banner animate-fade-in" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'rgba(178, 34, 34, 0.15)',
      border: '1px solid rgba(178, 34, 34, 0.4)',
      borderRadius: '8px',
      padding: '14px 20px',
      color: '#ff6b6b',
      marginBottom: '24px',
      fontSize: '0.9rem'
    }}>
          <AlertTriangle size={18} /> {errorMsg}
        </div>}

      {/* Diagnostic Ledger Table Card */}
      <div className="royal-card ledger-table-card" style={{
      overflow: 'hidden',
      padding: 0
    }}>
        {loading ? <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '80px 0',
        gap: '16px'
      }}>
            <RefreshCw size={36} className="spin-icon" style={{
          color: 'var(--accent, #d4af37)'
        }} />
            <p style={{
          margin: 0,
          color: 'var(--text-secondary, #b8b09f)',
          fontSize: '0.9rem'
        }}>{t('auto_3417', 'Auditing physical NFC registers from cloud Firestore...')}</p>
          </div> : filteredCounters.length === 0 ? <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '80px 0',
        gap: '12px'
      }}>
            <AlertTriangle size={36} style={{
          color: 'var(--accent, #d4af37)',
          opacity: 0.6
        }} />
            <p style={{
          margin: 0,
          color: 'var(--text-primary, #ffffff)',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}>{t('auto_3418', 'No NFC Counter Logs Found')}</p>
            <p style={{
          margin: 0,
          color: 'var(--text-secondary, #b8b09f)',
          fontSize: '0.85rem'
        }}>{t('auto_3419', 'No active tag counters match the selected search query or filters.')}</p>
          </div> : <div style={{
        overflowX: 'auto'
      }}>
            <table className="diagnostic-table" style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.85rem'
        }}>
              <thead>
                <tr style={{
              background: 'rgba(212, 175, 55, 0.05)',
              borderBottom: '1px solid rgba(212, 175, 55, 0.15)'
            }}>
                  <th style={{
                padding: '16px 20px',
                width: '40px',
                textAlign: 'center'
              }}>
                    <input type="checkbox" checked={allFilteredSelected} onChange={() => handleToggleSelectAll(filteredCounters)} style={{
                  cursor: 'pointer',
                  accentColor: 'var(--accent, #d4af37)'
                }} />
                  </th>
                  <th style={{
                padding: '16px 20px',
                color: 'var(--accent, #d4af37)',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.1em'
              }}>{t('auto_3420', 'Hardware UID')}</th>
                  <th style={{
                padding: '16px 20px',
                color: 'var(--accent, #d4af37)',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.1em'
              }}>{t('auto_3421', 'Paired Masterwork')}</th>
                  <th style={{
                padding: '16px 20px',
                color: 'var(--accent, #d4af37)',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                textAlign: 'center'
              }}>{t('auto_3422', 'Tap Counter')}</th>
                  <th style={{
                padding: '16px 20px',
                color: 'var(--accent, #d4af37)',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.1em'
              }}>{t('auto_3423', 'First Seen At')}</th>
                  <th style={{
                padding: '16px 20px',
                color: 'var(--accent, #d4af37)',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.1em'
              }}>{t('auto_3424', 'Last Diagnostic Reset')}</th>
                  <th style={{
                padding: '16px 20px',
                color: 'var(--accent, #d4af37)',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                textAlign: 'center'
              }}>{t('auto_3425', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCounters.map((item, idx) => {
              const selectId = item.rawDocumentId || item.ntagUid;
              return <tr key={selectId} className="diagnostic-row" style={{
                borderBottom: idx < filteredCounters.length - 1 ? '1px solid rgba(212, 175, 55, 0.08)' : 'none',
                background: selectedUids.includes(selectId) ? 'rgba(212, 175, 55, 0.03)' : 'transparent',
                transition: 'background 0.2s'
              }}>
                      <td style={{
                  padding: '16px 20px',
                  textAlign: 'center'
                }}>
                        <input type="checkbox" checked={selectedUids.includes(selectId)} onChange={() => handleToggleSelect(selectId)} style={{
                    cursor: 'pointer',
                    accentColor: 'var(--accent, #d4af37)'
                  }} />
                      </td>
                      <td style={{
                  padding: '16px 20px',
                  fontWeight: '600',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  color: '#ffffff'
                }}>
                        {formatUidWithColons(item.ntagUid)}
                      </td>
                      <td style={{
                  padding: '16px 20px'
                }}>
                        {item.hasBook ? <div style={{
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                            <span style={{
                      fontWeight: 'bold',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}>{item.bookTitle}</span>
                            <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}>{t("str_5351", "By")} {item.bookAuthor || 'Unknown Curator'} {t("str_5352", "\u2022 ISBN")} {item.bookIsbn}</span>
                          </div> : <span style={{
                    fontStyle: 'italic',
                    color: 'var(--text-secondary)'
                  }}>{t("str_5353", "Orphaned Tag (No matching volume found)")}</span>}
                      </td>
                      <td style={{
                  padding: '16px 20px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  color: item.counter > 0 ? 'var(--accent)' : 'var(--text-secondary)'
                }}>
                        {item.counter}
                      </td>
                      <td style={{
                  padding: '16px 20px',
                  color: 'var(--text-secondary)'
                }}>
                        {item.firstSeenAt ? new Date(item.firstSeenAt).toLocaleString() : 'N/A'}
                      </td>
                      <td style={{
                  padding: '16px 20px',
                  color: 'var(--text-secondary)'
                }}>
                        {item.lastResetAt ? <span style={{
                    color: '#00fa9a',
                    fontWeight: '600'
                  }}>{new Date(item.lastResetAt).toLocaleString()}</span> : <span style={{
                    opacity: 0.5
                  }}>{t('auto_3426', 'Never Reset')}</span>}
                      </td>
                      <td style={{
                  padding: '16px 20px',
                  textAlign: 'center'
                }}>
                        <button onClick={() => handleDeleteIndividual(selectId)} title={t("str_5354", "Delete this tag record")} style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ff4d4d',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 77, 77, 0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>;
            })}
              </tbody>
            </table>
          </div>}
      </div>
    </div>;
};
export default NfcCounterDashboard;