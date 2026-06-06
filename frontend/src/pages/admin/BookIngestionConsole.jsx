import React, { useState } from 'react';
import { Shield, Sparkles, Upload, Scan, CheckCircle, RefreshCw, X } from 'lucide-react';
import { createBook, lookupBookByIsbn, fetchBookByIsbn } from '../../services/libraryApi';
import { uploadBookImage } from '../../services/storageApi';
import './BookIngestionConsole.css';

const BookIngestionConsole = ({ user }) => {
  const [isbn, setIsbn] = useState('');
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [ingestionSuccess, setIngestionSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState(0);
  const [totalCopies, setTotalCopies] = useState(1);
  const [availableCopies, setAvailableCopies] = useState(1);
  const [bulkProgress, setBulkProgress] = useState(-1);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Check if user is admin
  const isAdmin = user && user.role === 'ADMIN';

  const handleIsbnFetch = async () => {
    if (!isbn.trim()) return;
    setErrorMessage('');
    setInfoMessage('');
    setFetchingMetadata(true);
    setIsEditMode(false);

    try {
      const existingBook = await fetchBookByIsbn(isbn.trim());
      if (existingBook && existingBook.title) {
        setManualTitle(existingBook.title || '');
        setManualAuthor(Array.isArray(existingBook.authors) ? existingBook.authors.join(', ') : existingBook.author || '');
        setPublisher(existingBook.publisher || '');
        setPublishDate(existingBook.publishDate || existingBook.publishYear || '');
        setCoverUrl(existingBook.coverUrl || '');
        setDescription(existingBook.description || existingBook.subtitle || '');
        setPages(existingBook.pages || 0);
        setTotalCopies(existingBook.totalCopies || 1);
        setAvailableCopies(existingBook.availableCopies || existingBook.totalCopies || 1);
        setIsEditMode(true);
        setInfoMessage('Existing book found in catalog. Edit the fields and save the updated details.');
      }
    } catch (catalogError) {
      if (catalogError?.response?.status === 404) {
        try {
          const metadata = await lookupBookByIsbn(isbn.trim());
          setManualTitle(metadata.title || '');
          setManualAuthor(Array.isArray(metadata.authors) ? metadata.authors.map((author) => author.name).join(', ') : metadata.authors || '');
          setPublisher(metadata.publishers?.[0] || metadata.publisher || '');
          setPublishDate(metadata.publish_date || '');
          setCoverUrl(metadata.coverUrl || metadata.cover?.large || '');
          setDescription(metadata.description || metadata.subtitle || '');
          setPages(metadata.number_of_pages || 0);
          setTotalCopies(1);
          setAvailableCopies(1);
          setInfoMessage('Lookup returned metadata from Open Library; complete any missing payload fields.');
        } catch (lookupError) {
          console.error(lookupError);
          setErrorMessage('Could not fetch book metadata from the backend lookup service.');
        }
      } else {
        console.error(catalogError);
        setErrorMessage('Could not fetch book details from catalog lookup.');
      }
    } finally {
      setFetchingMetadata(false);
    }
  };

  const resetForm = () => {
    setIsbn('');
    setManualTitle('');
    setManualAuthor('');
    setPublisher('');
    setPublishDate('');
    setCoverUrl('');
    setDescription('');
    setPages(0);
    setTotalCopies(1);
    setAvailableCopies(1);
    setSelectedImageFile(null);
    setImagePreview(null);
    setIsEditMode(false);
    setInfoMessage('');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!selectedImageFile) {
      setErrorMessage('Please select an image file.');
      return;
    }

    setUploadingImage(true);
    setErrorMessage('');

    try {
      const uploadedUrl = await uploadBookImage(selectedImageFile);
      setCoverUrl(uploadedUrl);
      setSelectedImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImagePreview = () => {
    setSelectedImageFile(null);
    setImagePreview(null);
  };

  const handleIngestionSubmit = async (e) => {
    e.preventDefault();

    if (!isbn.trim() || !manualTitle.trim() || !manualAuthor.trim()) {
      setErrorMessage('ISBN, title, and author are required.');
      return;
    }

    setErrorMessage('');

    const authors = manualAuthor.split(',').map((name) => name.trim()).filter(Boolean);
    const bookDto = {
      isbn: isbn.trim(),
      title: manualTitle.trim(),
      subtitle: '',
      authors,
      publisher: publisher.trim(),
      publishDate: publishDate.trim(),
      description: description.trim(),
      coverUrl: coverUrl.trim(),
      pages: pages || 0,
      totalCopies: totalCopies || 1,
      availableCopies: availableCopies || 1,
    };

    try {
      await createBook(bookDto);
      setIngestionSuccess(true);
      resetForm();
      setTimeout(() => setIngestionSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage(isEditMode ? 'Unable to update book record at this time.' : 'Unable to create book record at this time.');
    }
  };

  const handleBulkUploadSimulate = (e) => {
    e.preventDefault();
    if (bulkProgress >= 0) return;

    setBulkProgress(0);
    const interval = setInterval(() => {
      setBulkProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setBulkProgress(-1), 2000);
          return 100;
        }
        return prev + 25;
      });
    }, 600);
  };

  return (
    <div className="ingestion-container animate-fade-in">
      {!isAdmin ? (
        <>
          <header className="ingestion-header">
            <h1 className="ingestion-title glow-text">Access Denied</h1>
            <p className="ingestion-subtitle">Only administrators can access the book ingestion console.</p>
          </header>
        </>
      ) : (
        <>
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
            {infoMessage && (
              <div className="info-banner royal-card">
                <p>{infoMessage}</p>
              </div>
            )}
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
              <label className="royal-input-label">Author Name(s)</label>
              <input
                type="text"
                placeholder="Oscar Wilde, Mary Shelley"
                className="royal-input"
                value={manualAuthor}
                onChange={(e) => setManualAuthor(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="royal-input-label">Publisher</label>
              <input
                type="text"
                className="royal-input"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="royal-input-label">Publish Date</label>
              <input
                type="text"
                className="royal-input"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                placeholder="e.g. 1890"
              />
            </div>

            <div className="input-group">
              <label className="royal-input-label">Cover Image</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                      id="image-file-input"
                    />
                    <label htmlFor="image-file-input" style={{ flex: 1 }}>
                      <button
                        type="button"
                        onClick={() => document.getElementById('image-file-input')?.click()}
                        className="royal-btn"
                        style={{ width: '100%' }}
                      >
                        {selectedImageFile ? `File: ${selectedImageFile.name}` : 'Upload Image'}
                      </button>
                    </label>
                    {selectedImageFile && (
                      <button
                        type="button"
                        onClick={handleImageUpload}
                        className="royal-btn"
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Uploading...' : 'Confirm Upload'}
                      </button>
                    )}
                  </div>
                  {imagePreview && (
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px' }} />
                      <button
                        type="button"
                        onClick={removeImagePreview}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '8px' }}>OR</p>
              <input
                type="text"
                className="royal-input"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="Paste direct image URL (https://...)"
              />
            </div>

            <div className="input-group">
              <label className="royal-input-label">Description</label>
              <textarea
                className="royal-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-grid-two">
              <div className="input-group">
                <label className="royal-input-label">Pages</label>
                <input
                  type="number"
                  className="royal-input"
                  min="0"
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label className="royal-input-label">Total Copies</label>
                <input
                  type="number"
                  className="royal-input"
                  min="1"
                  value={totalCopies}
                  onChange={(e) => setTotalCopies(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="royal-input-label">Available Copies</label>
              <input
                type="number"
                className="royal-input"
                min="0"
                max={totalCopies}
                value={availableCopies}
                onChange={(e) => setAvailableCopies(Number(e.target.value))}
              />
            </div>

            <div className="submit-row">
              <button type="submit" className="royal-btn submit-book-btn" id="add-volume-btn">
                {isEditMode ? 'Save Updated Details' : 'Add Volume to Ledger'}
              </button>
            </div>
          </form>

          {ingestionSuccess && (
            <div className="success-banner animate-fade-in">
              <CheckCircle size={18} /> Volume successfully registered in Cloud Firestore ledger!
            </div>
          )}

          {errorMessage && (
            <div className="error-banner royal-card">
              <p>{errorMessage}</p>
            </div>
          )}
        </div>

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
        </>
      )}
    </div>
  );
};

export default BookIngestionConsole;
