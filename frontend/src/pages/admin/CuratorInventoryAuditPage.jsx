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
          <p>Syncing physical ledger configurations...</p>
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
          <h1>Curator Shelf Audit</h1>
          <p>Verify physical book volumes, reconcile ledger stocks, and update catalog counts automatically.</p>
        </div>
        <Link to="/admin" className="royal-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} />
          <span>Exit Dashboard</span>
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
          <h2>No Active Shelf Audit</h2>
          <p>
            Start a fresh catalog reconciliation session. This compiles expected volume records 
            across the library shelves, ready for physical scan validation.
          </p>
          <button 
            type="button" 
            onClick={handleStartSession} 
            disabled={actionLoading}
            className="royal-btn lookup-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', padding: '12px 28px' }}
          >
            {actionLoading ? <RefreshCw className="spin-icon" size={18} /> : <Play size={18} />}
            <span>Begin New Physical Audit</span>
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
                  <span>Real-time Shelf Scanning Terminal</span>
                </h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.75, lineHeight: '1.5' }}>
                  Scan physical book barcodes, enter ISBN values manually, or tap pre-programmed NTAG213 volume cards to register item locations.
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
                    <span>Validate Code</span>
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
                    <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: 0 }}>Tap catalog tag to browser device NFC antenna...</p>
                  </div>
                )}
              </div>
            )}

            {/* Expected Volumes List */}
            <div className="audit-panel">
              <div className="panel-header">
                <h3>
                  <BookOpen size={18} />
                  <span>Curation Ledger Reconciliation status</span>
                </h3>
                <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{books.length} Catalogue entries</span>
              </div>

              <div className="catalog-scroll-list">
                {books.map((book) => {
                  const scannedCountForThis = scannedIsbns.filter(isbn => isbn === book.isbn).length;
                  const isFullyAudited = scannedCountForThis >= (book.totalCopies || 1);
                  const isPartiallyAudited = scannedCountForThis > 0 && scannedCountForThis < (book.totalCopies || 1);
                  
                  return (
                    <div 
                      key={book.isbn} 
                      className={`catalog-item-card ${isFullyAudited ? 'scanned' : isPartiallyAudited ? 'scanned' : 'missing'}`}
                    >
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="book-cover-thumbnail" />
                      ) : (
                        <div className="book-cover-thumbnail" style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContext: 'center' }}>
                          <BookOpen size={16} style={{ margin: 'auto', opacity: 0.3 }} />
                        </div>
                      )}
                      
                      <div className="book-meta-details">
                        <h4>{book.title}</h4>
                        <p style={{ marginBottom: '2px' }}>{Array.isArray(book.authors) ? book.authors.join(', ') : book.author}</p>
                        <p style={{ fontSize: '0.74rem', opacity: 0.55 }}>ISBN: {book.isbn}</p>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                          Scanned: {scannedCountForThis} / Expected: {book.totalCopies || 0}
                        </span>
                        {isFullyAudited ? (
                          <span className="status-badge scanned-badge">Verified</span>
                        ) : isPartiallyAudited ? (
                          <span className="status-badge scanned-badge" style={{ color: '#fbbf24', borderColor: '#fbbf24' }}>Partial</span>
                        ) : (
                          <span className="status-badge missing-badge">Missing</span>
                        )}
                      </div>
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
                <h3>Reconciliation Stats</h3>
              </div>

              <div className="audit-progress-block">
                <div className="progress-labels">
                  <span>Audit Progress</span>
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
                  <span>Finalize & Reconcile Catalog</span>
                </button>
              ) : (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Session Reconciled successfully.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="royal-btn-secondary"
                    style={{ width: '100%', marginTop: '12px' }}
                  >
                    Start New Audit
                  </button>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="audit-panel" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ color: '#d4af37', fontFamily: '"Outfit", sans-serif', fontSize: '0.9rem', fontWeight: '600', margin: '0 0 10px 0' }}>Shelf audit instructions:</h4>
              <ul style={{ fontSize: '0.78rem', opacity: 0.75, paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.4' }}>
                <li>Bulk scan physical tags sequentially from shelf slots using Web NFC.</li>
                <li>Books expected in catalog but missing in physical scan counts will have total/available volumes decremented automatically.</li>
                <li>Finalizing permanently writes adjustments to database. All active loans remain unaffected.</li>
              </ul>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default CuratorInventoryAuditPage;
