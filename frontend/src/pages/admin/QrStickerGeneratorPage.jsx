import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Download, Printer, RefreshCw, Sparkles, Layers, ArrowLeft, CheckCircle, Info } from 'lucide-react';
import { STICKER_LAYOUT, generateStickerPreviewData, generateStickerPdf, LOGO_SVG_STRING } from '../../utils/qrStickerGenerator';
import { useLanguage } from '../../i18n/LanguageContext';
import './QrStickerGeneratorPage.css';
const QrStickerGeneratorPage = ({
  user
}) => {
  const {
    t
  } = useLanguage();
  const isAdmin = user && user.role === 'ADMIN';
  const [startCount, setStartCount] = useState(STICKER_LAYOUT.DEFAULT_START_COUNTER);
  const [sheetCount, setSheetCount] = useState(1);
  const [urlPrefix, setUrlPrefix] = useState(STICKER_LAYOUT.DEFAULT_URL_PREFIX);
  const [showCutLines, setShowCutLines] = useState(true);
  const [previewScale, setPreviewScale] = useState(0.85); // Scale factor for preview

  const [previewStickers, setPreviewStickers] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Calculate summary metrics
  const totalStickers = useMemo(() => sheetCount * STICKER_LAYOUT.STICKERS_PER_SHEET, [sheetCount]);
  const endCount = useMemo(() => {
    const s = parseInt(startCount, 10) || STICKER_LAYOUT.DEFAULT_START_COUNTER;
    return s + totalStickers - 1;
  }, [startCount, totalStickers]);

  // Load preview data
  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const data = await generateStickerPreviewData({
        startCount,
        sheetCount: 1,
        // Only render 1st sheet for lightweight live preview
        urlPrefix
      });
      setPreviewStickers(data);
    } catch (err) {
      console.error('Failed to generate sticker preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };
  useEffect(() => {
    loadPreview();
  }, [startCount, urlPrefix]);
  const handleDownloadPdf = async () => {
    try {
      setGeneratingPdf(true);
      setStatusMessage('Rendering high-resolution A4 sticker PDF...');
      const doc = await generateStickerPdf({
        startCount,
        sheetCount,
        urlPrefix,
        showCutLines
      });
      const fileName = `royal-book-club-qr-stickers-${startCount}-${endCount}.pdf`;
      doc.save(fileName);
      setStatusMessage(`Successfully exported ${fileName}`);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setStatusMessage('Error: Failed to generate PDF document.');
    } finally {
      setGeneratingPdf(false);
    }
  };
  const handlePrintDirect = async () => {
    try {
      setGeneratingPdf(true);
      setStatusMessage('Preparing printable document...');
      const doc = await generateStickerPdf({
        startCount,
        sheetCount,
        urlPrefix,
        showCutLines
      });
      const blobUrl = doc.output('bloburl');
      const printWindow = window.open(blobUrl);
      if (printWindow) {
        printWindow.focus();
      }
      setStatusMessage('Print dialogue opened.');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error('Failed to print PDF:', err);
      setStatusMessage('Error opening print dialogue.');
    } finally {
      setGeneratingPdf(false);
    }
  };
  if (!isAdmin) {
    return <div className="admin-access-denied-container animate-fade-in" style={{
      padding: '4rem 1rem',
      textAlign: 'center'
    }}>
        <div className="royal-card denied-card" style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2rem'
      }}>
          <h2 className="gold-gradient-text">{t('auto_3427', 'Curator Access Mandated')}</h2>
          <p style={{
          color: 'var(--text-secondary)',
          margin: '1rem 0'
        }}>
            {t('auto_3428', 'Only royal administrators are authorized to generate physical catalog assets.')}
          </p>
          <Link to="/admin" className="royal-btn">
            {t('auto_3429', 'Return to Entrance')}
          </Link>
        </div>
      </div>;
  }

  // Pixels per mm for display preview (e.g. 3.78 px per mm at 96 DPI)
  const MM_TO_PX = 3.779527559;
  const sheetWidthPx = STICKER_LAYOUT.PAGE_WIDTH_MM * MM_TO_PX;
  const sheetHeightPx = STICKER_LAYOUT.PAGE_HEIGHT_MM * MM_TO_PX;
  return <div className="qr-generator-container animate-fade-in">
      {/* Header Navigation */}
      <div style={{
      marginBottom: '1.5rem'
    }}>
        <Link to="/admin" className="royal-btn-secondary" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.85rem'
      }}>
          <ArrowLeft size={14} /> {t('auto_3430', 'Back to Curator Console')}
        </Link>
      </div>

      <header className="qr-generator-header">
        <div className="header-badge-admin">
          <QrCode size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('auto_3431', 'Physical Catalog Fabrication')}</span>
        </div>
        <h1 className="glow-text">{t('auto_3432', 'QR Code Sticker Sheet Generator')}</h1>
        <p>
          {t('auto_3433', 'Generate precision-formatted 65-up A4 printable sticker sheets for physical volumes.           Each sticker encodes a direct catalog deep link with Royal Book Club branding.')}
        </p>
      </header>

      {/* Configuration Card */}
      <section className="royal-card qr-controls-card">
        <div className="controls-grid">
          <div className="control-field">
            <label htmlFor="start-count-input">{t('auto_3434', 'Starting QR Counter ID')}</label>
            <input id="start-count-input" type="number" min="1" value={startCount} onChange={e => setStartCount(parseInt(e.target.value, 10) || '')} placeholder="100000001" />
          </div>

          <div className="control-field">
            <label htmlFor="sheet-count-select">{t("str_5355", "Number of Sheets (65/sheet)")}</label>
            <select id="sheet-count-select" value={sheetCount} onChange={e => setSheetCount(parseInt(e.target.value, 10) || 1)}>
              <option value="1">{t("str_5356", "1 Sheet (65 Stickers)")}</option>
              <option value="2">{t("str_5357", "2 Sheets (130 Stickers)")}</option>
              <option value="3">{t("str_5358", "3 Sheets (195 Stickers)")}</option>
              <option value="4">{t("str_5359", "4 Sheets (260 Stickers)")}</option>
              <option value="5">{t("str_5360", "5 Sheets (325 Stickers)")}</option>
              <option value="10">{t("str_5361", "10 Sheets (650 Stickers)")}</option>
            </select>
          </div>

          <div className="control-field">
            <label htmlFor="url-prefix-input">{t('auto_3435', 'URL Target Prefix')}</label>
            <input id="url-prefix-input" type="text" value={urlPrefix} onChange={e => setUrlPrefix(e.target.value)} placeholder={t("str_5362", "https://bookshelfnet.com/?qr=")} />
          </div>

          <label className="toggle-field">
            <input type="checkbox" checked={showCutLines} onChange={e => setShowCutLines(e.target.checked)} />
            <span>{t('auto_3436', 'Draw Cutting & Alignment Guides')}</span>
          </label>
        </div>

        {/* Summary & Actions Bar */}
        <div className="generator-summary-row">
          <div className="summary-badges">
            <div className="summary-badge">
              <Layers size={14} /> {t("str_5363", "Total:")} <strong>{totalStickers} {t("str_5364", "stickers")}</strong> ({sheetCount} {sheetCount === 1 ? 'sheet' : 'sheets'})
            </div>
            <div className="summary-badge">
              <QrCode size={14} /> {t("str_5365", "Sequence:")} <strong>#{startCount} — #{endCount}</strong>
            </div>
            <div className="summary-badge">
              <Info size={14} /> {t("str_5366", "Grid:")} <strong>{t('auto_3437', '13 rows × 5 cols')}</strong> {t("str_5367", "(39 \xD7 21.0 mm)")} </div>
          </div>

          <div className="action-buttons-group">
            <button onClick={handleDownloadPdf} disabled={generatingPdf} className="royal-btn-gold" id="download-stickers-btn">
              <Download size={16} />
              <span>{generatingPdf ? 'Generating PDF...' : 'Download Printable PDF'}</span>
            </button>
            <button onClick={handlePrintDirect} disabled={generatingPdf} className="royal-btn-secondary" id="print-stickers-btn" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
              <Printer size={16} />
              <span>{t('auto_3438', 'Print Directly')}</span>
            </button>
          </div>
        </div>

        {statusMessage && <div style={{
        marginTop: '1rem',
        padding: '10px 14px',
        background: 'rgba(78, 204, 163, 0.1)',
        border: '1px solid rgba(78, 204, 163, 0.3)',
        borderRadius: '6px',
        color: 'var(--success, #4ecca3)',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
            <CheckCircle size={16} />
            <span>{statusMessage}</span>
          </div>}
      </section>

      {/* Interactive Sheet Preview */}
      <section className="preview-container-section">
        <div className="preview-section-header">
          <div className="preview-title">
            <Sparkles size={18} className="gold-glow-icon" />
            <span>{t("str_5368", "Live A4 Sheet Preview (Sheet 1 of")} {sheetCount})</span>
          </div>

          <div className="preview-controls">
            <button onClick={() => setPreviewScale(0.6)} className={`zoom-btn ${previewScale === 0.6 ? 'active' : ''}`}>60%</button>
            <button onClick={() => setPreviewScale(0.85)} className={`zoom-btn ${previewScale === 0.85 ? 'active' : ''}`}>85%</button>
            <button onClick={() => setPreviewScale(1.0)} className={`zoom-btn ${previewScale === 1.0 ? 'active' : ''}`}>100%</button>
            <button onClick={loadPreview} className="zoom-btn" title={t("str_5369", "Refresh QR Codes")}>
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        <div className="a4-preview-viewport">
          <div className="a4-sheet-canvas" style={{
          width: `${sheetWidthPx}px`,
          height: `${sheetHeightPx}px`,
          transform: `scale(${previewScale})`,
          marginBottom: `${sheetHeightPx * (previewScale - 1)}px`
        }}>
            {loadingPreview ? <div style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#666'
          }}>
                <div className="royal-spinner" style={{
              width: '40px',
              height: '40px',
              margin: '0 auto 12px'
            }}></div>
                <p style={{
              margin: 0,
              fontWeight: '600'
            }}>{t('auto_3439', 'Rendering 65 stickers...')}</p>
              </div> : previewStickers.map(sticker => {
            const xMm = STICKER_LAYOUT.LEFT_MARGIN_MM + sticker.col * STICKER_LAYOUT.COL_PITCH_MM;
            const yMm = STICKER_LAYOUT.TOP_MARGIN_MM + sticker.row * STICKER_LAYOUT.ROW_PITCH_MM;
            const wMm = STICKER_LAYOUT.STICKER_WIDTH_MM;
            const hMm = STICKER_LAYOUT.STICKER_HEIGHT_MM;
            const leftPx = xMm * MM_TO_PX;
            const topPx = yMm * MM_TO_PX;
            const widthPx = wMm * MM_TO_PX;
            const heightPx = hMm * MM_TO_PX;
            const qrSizePx = STICKER_LAYOUT.QR_SIZE_MM * MM_TO_PX;
            const logoSizePx = STICKER_LAYOUT.LOGO_SIZE_MM * MM_TO_PX;
            return <div key={sticker.count} className={`sticker-cell-tile ${showCutLines ? 'bordered' : ''}`} style={{
              left: `${leftPx}px`,
              top: `${topPx}px`,
              width: `${widthPx}px`,
              height: `${heightPx}px`,
              padding: '2px 3px'
            }} title={`Sticker #${sticker.count} (${sticker.url})`}>
                    {/* Left: QR Code (vertically centered) */}
                    <div className="sticker-qr-wrapper" style={{
                width: `${qrSizePx}px`,
                height: `${qrSizePx}px`
              }}>
                      {sticker.qrDataUrl && <img src={sticker.qrDataUrl} alt={`QR ${sticker.count}`} />}
                    </div>

                    {/* Middle: Logo Image Emblem (vertically centered) */}
                    <div className="sticker-logo-wrapper" style={{
                width: `${logoSizePx}px`,
                height: `${logoSizePx}px`
              }} dangerouslySetInnerHTML={{
                __html: LOGO_SVG_STRING
              }} />

                    {/* Right: Branding (Playfair Display serif font, deep burgundy) */}
                    <div className="sticker-brand-col">
                      <div className="sticker-brand-line" style={{
                  fontSize: '11.5px',
                  lineHeight: '1.1'
                }}>{t('auto_brand_1', 'Royal')}</div>
                      <div className="sticker-brand-line" style={{
                  fontSize: '11.5px',
                  lineHeight: '1.1'
                }}>{t('auto_brand_2', 'Book')}</div>
                      <div className="sticker-brand-line" style={{
                  fontSize: '11.5px',
                  lineHeight: '1.1'
                }}>{t('auto_brand_3', 'Club')}</div>
                      <div className="sticker-counter-tag" style={{
                  fontSize: '5.2px',
                  marginTop: '2px'
                }}>#{sticker.count}</div>
                    </div>
                  </div>;
          })}
          </div>
        </div>
      </section>
    </div>;
};
export default QrStickerGeneratorPage;