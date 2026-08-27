import re

with open('frontend/src/components/shared/ScannerModal.jsx', 'r') as f:
    content = f.read()

bad_tabs = '''                {/* Header (Hidden on Mobile) */}
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
                </div>'''

good_tabs = '''                {/* Tabs (Header removed to save space, X button moved here) */}
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
                </div>'''

content = content.replace(bad_tabs, good_tabs)

# Fix the footer
bad_footer = '''                {/* Mobile Cancel Button */}
                <div className="scanner-modal-footer mobile-only">
                    <button className="royal-btn-secondary w-100" onClick={onClose}>{t('common.cancel')}</button>
                </div>'''
content = content.replace(bad_footer, "")

with open('frontend/src/components/shared/ScannerModal.jsx', 'w') as f:
    f.write(content)
