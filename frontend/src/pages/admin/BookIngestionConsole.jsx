import React, { useState } from 'react';
import { Shield, PlusCircle, Sparkles, Upload, Scan, CheckCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import './BookIngestionConsole.css';

const BookIngestionConsole = ({ user }) => {
  const [isbn, setIsbn] = useState('');
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [ingestionSuccess, setIngestionSuccess] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [bulkProgress, setBulkProgress] = useState(-1); // -1 = idle, 0 to 100 = processing

  // Simulate scanning/fetching from Open Library API
  const handleIsbnFetch = () => {
    if (!isbn.trim()) return;
    setFetchingMetadata(true);

    setTimeout(() => {
      setFetchingMetadata(false);
      // Simulate populating from Open Library lookup
      setManualTitle('La Vérité sur l\'Affaire Harry Quebert');
      setManualAuthor('Joël Dicker');
    }, 1500);
  };

  const handleIngestionSubmit = (e) => {
    e.preventDefault();
    if (!manualTitle || !manualAuthor) return;

    setIngestionSuccess(true);
    setTimeout(() => {
      setIngestionSuccess(false);
      setManualTitle('');
      setManualAuthor('');
      setIsbn('');
    }, 3000);
  };

  const handleBulkUploadSimulate = (e) => {
    e.preventDefault();
    setBulkProgress(0);
    const interval = setInterval(() => {
      setBulkProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setBulkProgress(-1), 2000); // clear progress
          return 100;
        }
        return prev + 25;
      });
    }, 600);
  };

  return (
    <div className="ingestion-container animate-fade-in">
      <header className="ingestion-header">
        <div className="header-badge-admin">
          <Shield size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">ADMIN ACQUISITION</span>
        </div>
        <h1 className="ingestion-title glow-text">Acquisition Ingestion Console</h1>
        <p className="ingestion-subtitle">
          Acquire and register new physical and digital masterworks into the Royal Library ledger.
        </p>
      </header>

      <div className="ingestion-grid">
        {/* Left Side: Single Book Intake Form */}
        <div className="royal-card form-intake-card">
          <h3>Single Volume Intake</h3>
          <p className="section-p-desc">Register an individual book volume. Query metadata by ISBN or input details manually.</p>

          <div className="isbn-query-wrapper">
            <label className="royal-input-label">ISBN Lookup</label>
            <div className="isbn-input-row">
              <input 
                type="text" 
                placeholder="e.g. 9780141439570" 
                className="royal-input isbn-input-box"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
              />
              <button 
                onClick={handleIsbnFetch} 
                className="royal-btn lookup-btn"
                disabled={fetchingMetadata}
                id="isbn-lookup-btn"
              >
                {fetchingMetadata ? <RefreshCw className="spin-icon" size={14} /> : 'Fetch'}
              </button>
            </div>
          </div>

          <div className="form-divider"><span>OR MANUAL ENTRY</span></div>

          <form onSubmit={handleIngestionSubmit} className="manual-intake-form">
            <div className="input-group">
              <label className="royal-input-label">Volume Title</label>
              <input 
                type="text" 
                placeholder="The Picture of Dorian Gray" 
                className="royal-input"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="royal-input-label">Author Name</label>
              <input 
                type="text" 
                placeholder="Oscar Wilde" 
                className="royal-input"
                value={manualAuthor}
                onChange={(e) => setManualAuthor(e.target.value)}
                required
              />
            </div>

            <div className="submit-row">
              <button type="submit" className="royal-btn submit-book-btn" id="add-volume-btn">
                Add Volume to Ledger
              </button>
            </div>
          </form>

          {ingestionSuccess && (
            <div className="success-banner animate-fade-in">
              <CheckCircle size={18} /> Volume successfully registered in Cloud Firestore ledger!
            </div>
          )}
        </div>

        {/* Right Side: Bulk Upload spreadsheets & Scan option */}
        <div className="royal-card bulk-ingest-card">
          <h3>Asynchronous Bulk Upload</h3>
          <p className="section-p-desc">Ingest entire catalog archives asynchronously using spreadsheets (.csv or .xlsx formats).</p>

          <div className="drag-drop-zone-simulated" onClick={handleBulkUploadSimulate}>
            <Upload size={32} className="gold-glow-icon upload-logo-sim" />
            {bulkProgress === -1 ? (
              <>
                <p className="upload-p">Drag & Drop Catalog Spreadsheet</p>
                <span className="upload-sub">or click here to simulate bulk upload</span>
              </>
            ) : bulkProgress < 100 ? (
              <div className="progress-bar-wrapper">
                <span className="progress-percentage-label">Ingesting... {bulkProgress}%</span>
                <div className="progress-outer">
                  <div className="progress-inner" style={{ width: `${bulkProgress}%` }}></div>
                </div>
              </div>
            ) : (
              <div className="bulk-success-wrapper animate-fade-in">
                <CheckCircle size={24} className="text-success" />
                <p className="bulk-success-title">Spreadsheet Parsing Complete</p>
                <span className="bulk-success-sub">Ledger updated with parsed records asynchronously.</span>
              </div>
            )}
          </div>

          <div className="form-divider"><span>OR BARCODE INTEGRATION</span></div>

          <div className="barcode-scan-section">
            <div className="barcode-promo-frame">
              <Scan size={24} className="gold-glow-icon" />
              <div>
                <h4>Interactive Barcode Scanner</h4>
                <p>Use local scanner modules in Phase 2 to scan printed books instantly using hardware RFID/ISBN scan sweeps.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookIngestionConsole;
