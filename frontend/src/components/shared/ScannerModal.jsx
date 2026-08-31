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
    onActionChange, 
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
        if (isOpen) {
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
    }, [isOpen, getLocalized]);



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
                {!loading ? (
                <div className="scanner-tabs" style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <button className={`tab-btn ${activeTab === 'nfc' ? 'active' : ''} ${book !== null && !book?.ntagUid ? 'tab-disabled' : ''}`} onClick={() => onTabChange('nfc')} disabled={book !== null && !book?.ntagUid} style={{ padding: '6px 4px', fontWeight: 'bold' }}>{t('catalog.nfcTap', 'Tap')}</button>
                    <button className={`tab-btn ${activeTab === 'barcode' || activeTab === 'validator_qr' ? 'active' : ''}`} onClick={() => onTabChange('barcode')} style={{ padding: '6px 4px', fontWeight: 'bold' }}>{t('catalog.qrBarcodeScan', 'Scan')}</button>
                    {showManualTab && (
                        <button className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => onTabChange('manual')} style={{ padding: '6px 4px', fontWeight: 'bold' }}>{t('catalog.manualSubtab', 'Manual')}</button>
                    )}
                    <button onClick={onClose} className="tab-btn close-btn" style={{ flex: '0 0 40px', padding: '6px 4px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}><X size={18} /></button>
                </div>
                ) : (
                <div className="nfc-modal-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '20px 24px 12px 24px',
                    borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
                }}>
                    <h3 style={{
                        margin: 0,
                        color: 'var(--accent)',
                        fontSize: '1.25rem',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        letterSpacing: '0.05em'
                    }}>
                        {actionType === 'checkout' ? t('catalog.royalCheckoutVerif', 'Royal Checkout Verification') : t('catalog.royalReturnVerif', 'Royal Return Verification')}
                    </h3>
                    <button onClick={onClose} className="close-nfc-btn" style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px'
                    }}><X size={18} /></button>
                </div>
                )}

                                {/* Body Content */}
                <div className="scanner-modal-body" style={loading ? { padding: 0 } : {}}>
                    {loading ? (
                        <div className="scanner-loading-state animate-fade-in" style={{ 
                            padding: '40px 0 0 0', 
                            textAlign: 'center', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'flex-start',
                            minHeight: '320px',
                            background: 'var(--surface)',
                            borderRadius: '12px',
                            width: '100%'
                        }}>
                            <div className="royal-spinner" style={{
                                width: '40px',
                                height: '40px',
                                margin: '0 auto 16px',
                                borderColor: 'var(--accent) transparent var(--accent) transparent'
                            }}></div>
                            <h4 style={{
                                color: 'var(--text-primary)',
                                margin: '0 0 8px 0',
                                fontSize: '1.1rem',
                                fontWeight: 'bold'
                            }}>
                                {actionType === 'checkout' ? 'Executing Instant Royal Checkout...' : 'Executing Instant Royal Return...'}
                            </h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, marginBottom: '24px' }}>
                                Cryptographically validating NFC physical signature and updating catalog ledger...
                            </p>
                            
                            <div className="loading-quote-container\" style={{ 
                                marginTop: 'auto', 
                                fontStyle: 'italic', 
                                color: 'var(--text-primary)', 
                                padding: '24px', 
                                background: 'var(--surface-elevated)', 
                                borderTop: '2px solid var(--accent)', 
                                width: '100%',
                                fontSize: '0.95rem',
                                lineHeight: '1.5',
                                borderRadius: '0 0 12px 12px'
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
                                        actionToggleNode={
                                            onActionChange ? (
                                                <div style={{ display: 'flex', background: 'var(--glass-bg)', borderRadius: '16px', padding: '2px', border: '1px solid var(--glass-border)', margin: '4px auto 0 auto' }}>
                                                    <button 
                                                        onClick={() => onActionChange('checkout')}
                                                        style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: '14px', border: 'none', cursor: 'pointer', background: actionType === 'checkout' ? 'var(--accent)' : 'transparent', color: actionType === 'checkout' ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold' }}
                                                    >
                                                        Checkout
                                                    </button>
                                                    <button 
                                                        onClick={() => onActionChange('return')}
                                                        style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: '14px', border: 'none', cursor: 'pointer', background: actionType === 'return' ? 'var(--accent)' : 'transparent', color: actionType === 'return' ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold' }}
                                                    >
                                                        Return
                                                    </button>
                                                </div>
                                            ) : null
                                        } 
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
