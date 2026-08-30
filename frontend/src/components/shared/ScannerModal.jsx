import React, { useEffect } from 'react';
import { Camera, Smartphone, Scan, X, AlertTriangle, Edit3, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ContinuousScannerAnimation from './ContinuousScannerAnimation';
import './ScannerModal.css';
import { fetchHeroConfig } from '../../services/heroApi';

const ScannerModal = ({ 
    isOpen, 
    onClose, 
    activeTab, 
    onTabChange, 
    book, 
    actionType, 
    isConfirmation,
    error,
    scannerId,
    onScannerClick,
    html5QrCodeRef,
    showManualTab = false,
    loading = false
}) => {
    const { t, getLocalized } = useLanguage();
    const DEFAULT_QUOTE = "A room without books is like a body without a soul. - Cicero";
    const [loadingQuote, setLoadingQuote] = React.useState(DEFAULT_QUOTE);

    useEffect(() => {
        if (loading) {
            fetchHeroConfig().then(res => {
                if (res && res.data) {
                    const quotes = getLocalized(res.data, 'featuredQuotes') || [];
                    if (quotes.length > 0) {
                        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                        setLoadingQuote(randomQuote);
                    }
                }
            }).catch(e => console.warn('Failed to load quote', e));
        }
    }, [loading, getLocalized]);



    if (!isOpen) return null;

    const viewfinderNode = (activeTab === 'barcode' || activeTab === 'validator_qr') && scannerId  ? (
        <div className="viewfinder-wrapper" style={{ position: 'relative' }}>
            <div 
                id={scannerId} 
                className="scanner-focus-ring-container"
                onClick={(e) => onScannerClick && html5QrCodeRef && onScannerClick(e, html5QrCodeRef.current)}
            ></div>
            <div className="scanner-laser-line"></div>
        </div>
    ) : null;

    return (
        <div className="universal-scanner-overlay animate-fade-in">
            <div className="universal-scanner-modal royal-card">
                {/* Tabs (Header removed to save space, X button moved here) */}
                <div className="scanner-tabs" style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <button 
                        className={`tab-btn ${activeTab === 'nfc' ? 'active' : ''} ${book !== null && !book?.ntagUid ? 'tab-disabled' : ''}`}
                        onClick={() => onTabChange('nfc')}
                        disabled={book !== null && !book?.ntagUid}
                        style={{ padding: '6px 4px', fontWeight: 'bold' }}
                    >
                        {t('catalog.nfcTap', 'Tap')}
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'barcode' || activeTab === 'validator_qr' ? 'active' : ''}`}
                        onClick={() => onTabChange('barcode')}
                        style={{ padding: '6px 4px', fontWeight: 'bold' }}
                    >
                        {t('catalog.qrBarcodeScan', 'Scan')}
                    </button>
                    {showManualTab && (
                        <button 
                            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} 
                            onClick={() => onTabChange('manual')}
                            style={{ padding: '6px 4px', fontWeight: 'bold' }}
                        >
                            {t('catalog.manualSubtab', 'Manual')}
                        </button>
                    )}
                    <button onClick={onClose} className="tab-btn close-btn" style={{ flex: '0 0 40px', padding: '6px 4px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <X size={18} />
                    </button>
                </div>

                                {/* Body Content */}
                <div className="scanner-modal-body">
                    {loading ? (
                        <div className="scanner-loading-state animate-fade-in" style={{ 
                            padding: '40px 20px', 
                            textAlign: 'center', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            minHeight: '380px',
                            background: 'var(--surface)',
                            borderRadius: '12px'
                        }}>
                            <div className="gold-check-animation-wrapper" style={{ margin: '10px 0 20px' }}>
                                <RefreshCw className="spin-icon" size={64} style={{ color: 'var(--gold-primary)' }} />
                            </div>
                            <h3 style={{ 
                                color: 'var(--gold-primary)', 
                                fontFamily: 'var(--font-serif)', 
                                fontSize: '1.5rem', 
                                marginBottom: '12px' 
                            }}>
                                {t('catalog.verifyingProgress', 'Verification in Progress')}
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, marginBottom: '32px' }}>
                                Securely authenticating volume. Please wait...
                            </p>
                            
                            <div className="loading-quote-container" style={{ 
                                marginTop: 'auto', 
                                fontStyle: 'italic', 
                                color: 'var(--gold-primary)', 
                                padding: '20px', 
                                background: 'var(--glass-bg)', 
                                borderRadius: '8px', 
                                border: '1px solid var(--glass-border)', 
                                width: '100%',
                                fontSize: '0.95rem',
                                lineHeight: '1.5'
                            }}>
                                "{loadingQuote}"
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Animation Handles the Viewfinder Placement Internally */}
                            {(activeTab !== 'manual') && (
                                <div className="animation-wrapper">
                                    <ContinuousScannerAnimation 
                                        action={actionType} 
                                        type={activeTab === 'nfc' ? 'nfc' : 'barcode'} 
                                        book={book} 
                                        isConfirmation={isConfirmation}
                                        renderViewfinder={viewfinderNode}
                                    />
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="scanner-error">
                                    <AlertTriangle size={16} /> <span>{error}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>


            </div>
        </div>
    );
};
export default ScannerModal;
