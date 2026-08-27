import React from 'react';
import { Camera, Smartphone, Scan, X, AlertTriangle, Edit3 } from 'lucide-react';
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
    showManualTab = false
}) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    const Viewfinder = () => (activeTab === 'barcode' || activeTab === 'validator_qr') && scannerId  ? (
        <div className="viewfinder-wrapper">
            <div 
                id={scannerId} 
                className="scanner-focus-ring-container"
                onClick={(e) => onScannerClick && html5QrCodeRef && onScannerClick(e, html5QrCodeRef.current)}
            ></div>
        </div>
    ) : null;

    return (
        <div className="universal-scanner-overlay animate-fade-in">
            <div className="universal-scanner-modal royal-card">
                {/* Header (Hidden on Mobile) */}
                <div className="scanner-modal-header desktop-only">
                    <div className="header-title">
                        <Scan size={18} className="gold-glow-icon" />
                        <h3>
                            {isConfirmation 
                                ? (actionType === 'return' ? 'Royal Return Verification' : 'Royal Checkout Verification')
                                : t('catalog.selfCheckout', 'Royal Scanner')}
                        </h3>
                    </div>
                    <button onClick={onClose} className="close-btn"><X size={18} /></button>
                </div>

                {/* Tabs (Compressed on Mobile, Full on Desktop) */}
                <div className="scanner-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'nfc' ? 'active' : ''} ${!book  && activeTab !== 'nfc' ? '' : (!book?.ntagUid && book !== null ? 'tab-disabled' : '')}`}
                        onClick={() => onTabChange('nfc')}
                        disabled={book !== null && !book?.ntagUid}
                    >
                        <Smartphone size={16} className="desktop-icon" /> 
                        <span className="desktop-text">{t('catalog.nfcTap', 'NFC Tap')}</span>
                        <span className="mobile-text">Tap</span>
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'barcode' || activeTab === 'validator_qr' ? 'active' : ''}`}
                        onClick={() => onTabChange('barcode')}
                    >
                        <Camera size={16} className="desktop-icon" /> 
                        <span className="desktop-text">{t('catalog.qrBarcodeScan', 'QR / Barcode Scan')}</span>
                        <span className="mobile-text">Scan</span>
                    </button>
                    {showManualTab && (
                        <button 
                            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} 
                            onClick={() => onTabChange('manual')}
                        >
                            <Edit3 size={16} className="desktop-icon" />
                            <span className="desktop-text">{t('catalog.manualSubtab', 'Manual Request')}</span>
                            <span className="mobile-text">Manual</span>
                        </button>
                    )}
                </div>

                {/* Body Content */}
                <div className="scanner-modal-body">
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
                </div>

                {/* Mobile Cancel Button */}
                <div className="scanner-modal-footer mobile-only">
                    <button className="royal-btn-secondary w-100" onClick={onClose}>{t('common.cancel')}</button>
                </div>
            </div>
        </div>
    );
};
export default ScannerModal;
