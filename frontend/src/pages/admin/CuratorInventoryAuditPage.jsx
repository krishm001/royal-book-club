import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Smartphone, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Play, 
  StopCircle, 
  Search, 
  Compass, 
  BookOpen, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { fetchBooks } from '../../services/libraryApi';
import { 
  startAudit, 
  scanItem, 
  completeAudit, 
  getActiveAudit 
} from '../../services/inventoryAuditApi';
import './CuratorInventoryAuditPage.css';

const CuratorInventoryAuditPage = ({ user }) => {
  const { t } = useLanguage();
  
  // App states
  const [books, setBooks] = useState([]);
  const [activeAudit, setActiveAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [scanInput, setScanInput] = useState('');
  
  // NFC Web scan states
  const [isNfcReading, setIsNfcReading] = useState(false);
  const [nfcError, setNfcError] = useState('');
  const [nfcSuccess, setNfcSuccess] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Curator Audit Notes & Checklist verification states
  const [auditNotes, setAuditNotes] = useState({});
  const [auditChecklists, setAuditChecklists] = useState({});
  const [selectedFilterFlag, setSelectedFilterFlag] = useState('ALL');
  const [expandedBookIsbn, setExpandedBookIsbn] = useState(null);

  // Fetch initial data: catalog books and current active audit
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const catalog = await fetchBooks();
      setBooks(catalog || []);
      
      const curatorId = user?.id || 'SYSTEM_CURATOR';
      try {
        const active = await getActiveAudit(curatorId);
        setActiveAudit(active);
      } catch (err) {
        // 404 is acceptable if no active audit exists
        setActiveAudit(null);
      }
    } catch (err) {
      console.error("Failed to load initial audit data:", err);
      setErrorMessage("Could not load current inventory status from ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Load audit-specific notes and checklists from localStorage when activeAudit changes
  useEffect(() => {
    if (activeAudit) {
      const storedNotes = localStorage.getItem(`audit_notes_${activeAudit.id}`);
      if (storedNotes) {
        setAuditNotes(JSON.parse(storedNotes));
      } else {
        setAuditNotes({});
      }

      const storedChecklists = localStorage.getItem(`audit_checklists_${activeAudit.id}`);
      if (storedChecklists) {
        setAuditChecklists(JSON.parse(storedChecklists));
      } else {
        setAuditChecklists({});
      }
    }
  }, [activeAudit]);

  const updateNote = (isbn, value) => {
    const updated = { ...auditNotes, [isbn]: value };
    setAuditNotes(updated);
    if (activeAudit) {
      localStorage.setItem(`audit_notes_${activeAudit.id}`, JSON.stringify(updated));
    }
  };

  const updateChecklist = (isbn, key, value) => {
    const defaultChecklist = {
      isbnMatch: true,
      descriptionCorrect: true,
      genreCorrect: true,
      tagsCorrect: true,
      nfcPresent: true
    };
    const currentChecklist = auditChecklists[isbn] || defaultChecklist;
    const updatedChecklist = { ...currentChecklist, [key]: value };
    const updated = { ...auditChecklists, [isbn]: updatedChecklist };
    setAuditChecklists(updated);
    if (activeAudit) {
      localStorage.setItem(`audit_checklists_${activeAudit.id}`, JSON.stringify(updated));
    }
  };

  // Handle starting a new audit session
  const handleStartSession = async () => {
    try {
      setActionLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      const curatorId = user?.id || 'SYSTEM_CURATOR';
      const audit = await startAudit(curatorId);
      setActiveAudit(audit);
      setSuccessMessage("Active inventory audit session started successfully!");
    } catch (err) {
      console.error("Failed to start session:", err);
      setErrorMessage(err.response?.data?.message || "Failed to start a new audit session.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle scanning / adding an item to the session
  const handleScanItemSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!scanInput.trim() || !activeAudit) return;
    
    try {
      setActionLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      const updatedAudit = await scanItem(activeAudit.id, scanInput.trim());
      setActiveAudit(updatedAudit);
      setScanInput('');
      setSuccessMessage(`Scanned item successfully!`);
    } catch (err) {
      console.error("Scan submission error:", err);
      setErrorMessage(err.response?.data?.message || `Failed to reconcile item "${scanInput}".`);
    } finally {
      setActionLoading(false);
    }
  };

  // Web NFC Reader hook
  const handleNfcRead = async () => {
    setNfcError('');
    setNfcSuccess(false);
    setErrorMessage('');
    setSuccessMessage('');

    if (!('NDEFReader' in window)) {
      setNfcError('Web NFC is not supported on this device/browser. Android Chrome is recommended.');
      return;
    }

    try {
      setIsNfcReading(true);
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener("readingerror", () => {
        setNfcError("Could not read tag. Try tapping again.");
        setIsNfcReading(false);
      });

      ndef.addEventListener("reading", async ({ serialNumber, message }) => {
        let targetUid = serialNumber;
        if (message && message.records) {
          for (const record of message.records) {
            if (record.recordType === "url") {
              const decoder = new TextDecoder("utf-8");
              const url = decoder.decode(record.data);
              const uMatch = url.match(/[?&]u=([^&]+)/);
              if (uMatch && uMatch[1]) {
                targetUid = uMatch[1];
              }
            }
          }
        }

        const cleanUid = (targetUid || '').trim().toLowerCase().replace(/:/g, '');
        console.log("Scanned NFC Tag: ", cleanUid);
        
        try {
          const updatedAudit = await scanItem(activeAudit.id, cleanUid);
          setActiveAudit(updatedAudit);
          setNfcSuccess(true);
          setSuccessMessage(`NFC Copy "${cleanUid}" scanned and reconciled successfully.`);
        } catch (err) {
          setErrorMessage(err.response?.data?.message || `Unregistered or mismatching NFC Tag: ${cleanUid}`);
        } finally {
          setIsNfcReading(false);
        }
      });
    } catch (err) {
      console.error("NFC Scanning activation failed:", err);
      setNfcError(err.message || "Failed to launch Web NFC hardware listener.");
      setIsNfcReading(false);
    }
  };

  // Handle final completion and reconciliation
  const handleCompleteSession = async () => {
    if (!activeAudit) return;
    if (!window.confirm("Are you sure you want to finalize this inventory audit? This will permanently update the catalog total/available copy counts of any missing shelves.")) return;

    try {
      setActionLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      const finishedAudit = await completeAudit(activeAudit.id);
      setActiveAudit(finishedAudit);
      setSuccessMessage("Reconciliation Complete! Catalog stock records successfully synchronized with Shelf logs.");
      // Reload overall book list to show updated totals
      const updatedCatalog = await fetchBooks();
      setBooks(updatedCatalog || []);
    } catch (err) {
      console.error("Completion error:", err);
      setErrorMessage(err.response?.data?.message || "Failed to finalize and complete inventory audit.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="audit-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="spin-icon" size={40} style={{ color: '#d4af37', marginBottom: '12px' }} />
          <p>{t('auto_3350', 'Syncing physical ledger configurations...')}</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalExpected = books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
  const scannedIsbns = activeAudit?.auditedIsbns || [];
  const scannedCount = scannedIsbns.length;
  const progressPercent = totalExpected > 0 ? Math.round((scannedCount / totalExpected) * 100) : 0;

  return (
    <div className="audit-container">
      {/* Premium Glass Header Card */}
      <div className="audit-header-card">
        <div className="audit-title-section">
          <h1>{t('auto_3351', 'Curator Shelf Audit')}</h1>
          <p>{t('auto_3352', 'Verify physical book volumes, reconcile ledger stocks, and update catalog counts automatically.')}</p>
        </div>
        <Link to="/admin" className="royal-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} />
          <span>{t('auto_3353', 'Exit Dashboard')}</span>
        </Link>
      </div>

      {/* Message Banners */}
      {errorMessage && (
        <div className="royal-card" style={{ borderLeft: '4px solid #ff7b72', background: 'rgba(255, 123, 114, 0.05)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertTriangle style={{ color: '#ff7b72' }} />
          <span style={{ fontSize: '0.9rem', color: '#ff7b72' }}>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="royal-card" style={{ borderLeft: '4px solid #34d399', background: 'rgba(52, 211, 153, 0.05)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <CheckCircle2 style={{ color: '#34d399' }} />
          <span style={{ fontSize: '0.9rem', color: '#34d399' }}>{successMessage}</span>
        </div>
      )}

      {!activeAudit ? (
        /* Empty/Inactive State */
        <div className="audit-empty-state">
          <div className="audit-empty-icon">
            <ClipboardCheck size={40} />
          </div>
          <h2>{t('auto_3354', 'No Active Shelf Audit')}</h2>
          <p>
            {t('auto_3355', 'Start a fresh catalog reconciliation session. This compiles expected volume records              across the library shelves, ready for physical scan validation.')}
          </p>
          <button 
            type="button" 
            onClick={handleStartSession} 
            disabled={actionLoading}
            className="royal-btn lookup-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', padding: '12px 28px' }}
          >
            {actionLoading ? <RefreshCw className="spin-icon" size={18} /> : <Play size={18} />}
            <span>{t('auto_3356', 'Begin New Physical Audit')}</span>
          </button>
        </div>
      ) : (
        /* Active Audit Layout */
        <div className="audit-dashboard-grid">
          
          {/* Left Main column - Scanning console and Expected lists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Scan Area Card */}
            {activeAudit.status === 'ACTIVE' && (
              <div className="audit-panel scanner-card">
                <h3 style={{ color: '#d4af37', fontFamily: '"Outfit", sans-serif', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <Sparkles size={18} />
                  <span>{t('auto_3357', 'Real-time Shelf Scanning Terminal')}</span>
                </h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.75, lineHeight: '1.5' }}>
                  {t('auto_3358', 'Scan physical book barcodes, enter ISBN values manually, or tap pre-programmed NTAG213 volume cards to register item locations.')}
                </p>

                <form onSubmit={handleScanItemSubmit} className="scanner-flex-row">
                  <input
                    type="text"
                    className="royal-input scanner-input"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Enter Book ISBN or physical barcode..."
                    disabled={actionLoading}
                  />
                  <button 
                    type="submit" 
                    disabled={actionLoading || !scanInput.trim()}
                    className="royal-btn"
                    style={{ padding: '0 24px' }}
                  >
                    <span>{t('auto_3359', 'Validate Code')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNfcRead}
                    disabled={actionLoading || isNfcReading}
                    className={`royal-btn-secondary ${isNfcReading ? 'loading-btn' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', border: '1px solid rgba(212, 175, 55, 0.3)' }}
                  >
                    {isNfcReading ? <RefreshCw className="spin-icon" size={14} /> : <Smartphone size={14} />}
                    <span>{isNfcReading ? 'Awaiting Tap...' : 'Bulk Scan NFC'}</span>
                  </button>
                </form>

                {nfcError && (
                  <p style={{ color: '#ff7b72', fontSize: '0.8rem', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={12} /> {nfcError}
                  </p>
                )}
                {isNfcReading && (
                  <div style={{ marginTop: '14px', background: 'rgba(212,175,55,0.04)', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <Smartphone size={24} className="gold-glow-icon animate-pulse" style={{ color: '#d4af37', marginBottom: '6px' }} />
                    <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: 0 }}>{t('auto_3360', 'Tap catalog tag to browser device NFC antenna...')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Expected Volumes List */}
            <div className="audit-panel">
              <div className="panel-header">
                <h3>
                  <BookOpen size={18} />
                  <span>{t('auto_3361', 'Curation Ledger Reconciliation status')}</span>
                </h3>
                <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{books.length} Catalogue entries</span>
              </div>

              {/* Premium Flag-based Filter Row */}
              <div className="audit-flag-filters" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', scrollbarWidth: 'none', msOverflowStyle: 'none', marginBottom: '14px' }}>
                {[
                  { key: 'ALL', label: 'All Items' },
                  { key: 'ISBN_MISMATCH', label: 'Mismatched ISBNs' },
                  { key: 'BAD_DESCRIPTION', label: 'Bad Descriptions' },
                  { key: 'BAD_GENRE', label: 'Bad Genres' },
                  { key: 'BAD_TAGS', label: 'Bad Tags' },
                  { key: 'NFC_MISSING', label: 'NFC Missing' },
                  { key: 'HAS_NOTES', label: 'Has Notes' }
                ].map(filter => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setSelectedFilterFlag(filter.key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      border: '1px solid ' + (selectedFilterFlag === filter.key ? 'var(--accent, #d4af37)' : 'rgba(255, 255, 255, 0.08)'),
                      background: selectedFilterFlag === filter.key ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      color: selectedFilterFlag === filter.key ? 'var(--accent, #d4af37)' : 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s'
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="catalog-scroll-list">
                {books.filter((book) => {
                  const defaultChecklist = {
                    isbnMatch: true,
                    descriptionCorrect: true,
                    genreCorrect: true,
                    tagsCorrect: true,
                    nfcPresent: true
                  };
                  const checklist = auditChecklists[book.isbn] || defaultChecklist;
                  const notes = auditNotes[book.isbn] || '';

                  if (selectedFilterFlag === 'ALL') return true;
                  if (selectedFilterFlag === 'ISBN_MISMATCH') return !checklist.isbnMatch;
                  if (selectedFilterFlag === 'BAD_DESCRIPTION') return !checklist.descriptionCorrect;
                  if (selectedFilterFlag === 'BAD_GENRE') return !checklist.genreCorrect;
                  if (selectedFilterFlag === 'BAD_TAGS') return !checklist.tagsCorrect;
                  if (selectedFilterFlag === 'NFC_MISSING') return !checklist.nfcPresent;
                  if (selectedFilterFlag === 'HAS_NOTES') return notes.trim().length > 0;
                  return true;
                }).map((book) => {
                  const scannedCountForThis = scannedIsbns.filter(isbn => isbn === book.isbn).length;
                  const isFullyAudited = scannedCountForThis >= (book.totalCopies || 1);
                  const isPartiallyAudited = scannedCountForThis > 0 && scannedCountForThis < (book.totalCopies || 1);
                  
                  return (
                    <div key={book.isbn} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '12px' }}>
                      <div 
                        className={`catalog-item-card ${isFullyAudited ? 'scanned' : isPartiallyAudited ? 'scanned' : 'missing'}`}
                        onClick={() => setExpandedBookIsbn(expandedBookIsbn === book.isbn ? null : book.isbn)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s', background: expandedBookIsbn === book.isbn ? 'rgba(212, 175, 55, 0.04)' : 'rgba(255,255,255,0.01)' }}
                      >
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="book-cover-thumbnail" />
                        ) : (
                          <div className="book-cover-thumbnail" style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={16} style={{ margin: 'auto', opacity: 0.3 }} />
                          </div>
                        )}
                        
                        <div className="book-meta-details">
                          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{book.title}</span>
                            {(auditNotes[book.isbn] || '').trim() && (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(212, 175, 55, 0.15)', color: '#d4af37', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>{t('auto_3362', 'Note')}</span>
                            )}
                          </h4>
                          <p style={{ marginBottom: '2px' }}>{Array.isArray(book.authors) ? book.authors.join(', ') : book.author}</p>
                          <p style={{ fontSize: '0.74rem', opacity: 0.55 }}>ISBN: {book.isbn}</p>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                            Scanned: {scannedCountForThis} / Expected: {book.totalCopies || 0}
                          </span>
                          {isFullyAudited ? (
                            <span className="status-badge scanned-badge">{t('auto_3363', 'Verified')}</span>
                          ) : isPartiallyAudited ? (
                            <span className="status-badge scanned-badge" style={{ color: '#fbbf24', borderColor: '#fbbf24' }}>{t('auto_3364', 'Partial')}</span>
                          ) : (
                            <span className="status-badge missing-badge">{t('auto_3365', 'Missing')}</span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Tray */}
                      {expandedBookIsbn === book.isbn && (
                        <div 
                          className="book-audit-tray animate-fade-in" 
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            background: 'rgba(0, 0, 0, 0.25)', 
                            border: '1px solid rgba(212, 175, 55, 0.15)', 
                            borderRadius: '10px', 
                            padding: '16px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px' 
                          }}
                        >
                          <span style={{ fontSize: '0.85rem', color: '#d4af37', fontWeight: '600', fontFamily: '"Outfit", sans-serif' }}>{t('auto_3366', 'Copy Checklist Verification')}</span>
                          
                          {/* Checklist items */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                            {[
                              { key: 'isbnMatch', label: 'ISBN match' },
                              { key: 'descriptionCorrect', label: 'Description correct' },
                              { key: 'genreCorrect', label: 'Genre correct' },
                              { key: 'tagsCorrect', label: 'Tags correct' },
                              { key: 'nfcPresent', label: 'NFC present' }
                            ].map(item => {
                              const defaultChecklist = {
                                isbnMatch: true,
                                descriptionCorrect: true,
                                genreCorrect: true,
                                tagsCorrect: true,
                                nfcPresent: true
                              };
                              const currentVal = (auditChecklists[book.isbn] || defaultChecklist)[item.key];
                              return (
                                <label 
                                  key={item.key} 
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.85)' }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={currentVal}
                                    onChange={(e) => updateChecklist(book.isbn, item.key, e.target.checked)}
                                    style={{
                                      accentColor: 'var(--accent, #d4af37)',
                                      cursor: 'pointer',
                                      width: '15px',
                                      height: '15px'
                                    }}
                                  />
                                  <span>{item.label}</span>
                                </label>
                              );
                            })}
                          </div>

                          {/* Free-text Curator Notes */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.78rem', color: '#d4af37', fontWeight: '500' }}>Curator Audit Notes:</span>
                            <textarea
                              className="royal-input"
                              placeholder="Capture custom free-text notes for this book copy..."
                              value={auditNotes[book.isbn] || ''}
                              onChange={(e) => updateNote(book.isbn, e.target.value)}
                              style={{
                                width: '100%',
                                minHeight: '60px',
                                fontSize: '0.8rem',
                                padding: '8px 12px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(212, 175, 55, 0.12)',
                                borderRadius: '8px',
                                resize: 'vertical',
                                color: '#ffffff'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right column - Progress panel and Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Session Stats card */}
            <div className="audit-panel" style={{ background: 'rgba(212, 175, 55, 0.03)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
              <div className="panel-header">
                <h3>{t('auto_3367', 'Reconciliation Stats')}</h3>
              </div>

              <div className="audit-progress-block">
                <div className="progress-labels">
                  <span>{t('auto_3368', 'Audit Progress')}</span>
                  <span style={{ fontWeight: '600', color: '#d4af37' }}>{progressPercent}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                  <span style={{ opacity: 0.8, fontSize: '0.88rem' }}>Session status:</span>
                  <span style={{ fontWeight: '600', color: activeAudit.status === 'ACTIVE' ? '#fbbf24' : '#34d399', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                    {activeAudit.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                  <span style={{ opacity: 0.8, fontSize: '0.88rem' }}>Total expected copies:</span>
                  <span style={{ fontWeight: '600' }}>{totalExpected}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                  <span style={{ opacity: 0.8, fontSize: '0.88rem' }}>Total copies found:</span>
                  <span style={{ fontWeight: '600', color: '#34d399' }}>{scannedCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ opacity: 0.8, fontSize: '0.88rem' }}>Total missing copies:</span>
                  <span style={{ fontWeight: '600', color: '#ff7b72' }}>{Math.max(0, totalExpected - scannedCount)}</span>
                </div>
              </div>

              {activeAudit.status === 'ACTIVE' ? (
                <button
                  type="button"
                  onClick={handleCompleteSession}
                  disabled={actionLoading}
                  className="royal-btn"
                  style={{ width: '100%', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {actionLoading ? <RefreshCw className="spin-icon" size={16} /> : <StopCircle size={16} />}
                  <span>{t('auto_3369', 'Finalize & Reconcile Catalog')}</span>
                </button>
              ) : (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> {t('auto_3370', 'Session Reconciled successfully.')}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="royal-btn-secondary"
                    style={{ width: '100%', marginTop: '12px' }}
                  >
                    {t('auto_3371', 'Start New Audit')}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="audit-panel" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ color: '#d4af37', fontFamily: '"Outfit", sans-serif', fontSize: '0.9rem', fontWeight: '600', margin: '0 0 10px 0' }}>Shelf audit instructions:</h4>
              <ul style={{ fontSize: '0.78rem', opacity: 0.75, paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.4' }}>
                <li>{t('auto_3372', 'Bulk scan physical tags sequentially from shelf slots using Web NFC.')}</li>
                <li>{t('auto_3373', 'Books expected in catalog but missing in physical scan counts will have total/available volumes decremented automatically.')}</li>
                <li>{t('auto_3374', 'Finalizing permanently writes adjustments to database. All active loans remain unaffected.')}</li>
              </ul>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default CuratorInventoryAuditPage;
