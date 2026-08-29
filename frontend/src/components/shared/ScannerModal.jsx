import React, { useEffect } from 'react';
import { Camera, Smartphone, Scan, X, AlertTriangle, Edit3, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ContinuousScannerAnimation from './ContinuousScannerAnimation';
import './ScannerModal.css';

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
    const { t } = useLanguage();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const Viewfinder = () => (activeTab === 'barcode' || activeTab === 'validator_qr') && scannerId  ? (
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
                        <div className="scanner-loading-state animate-fade-in" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw className="spin-icon" size={48} style={{ color: 'var(--gold-primary)' }} />
                            <h4 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>Verifying...</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Securely authenticating volume.</p>
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
                                        renderViewfinder={<Viewfinder />}
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
