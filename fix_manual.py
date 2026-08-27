import re

with open('frontend/src/pages/catalog/BookDetailPage.jsx', 'r') as f:
    content = f.read()

# Make sure FallbackForm is rendered if fallbackModalOpen is true
# We can put it right next to ScannerModal

fallback_code = """
      <ScannerModal 
        isOpen={nfcModalOpen} 
        onClose={handleCloseNfcModal} 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          if (tab === 'manual') {
            handleCloseNfcModal();
            setFallbackModalOpen(true);
            return;
          }
          setActiveTab(tab);
          if (tab === 'barcode' || tab === 'validator_qr') {
            startDetailBarcodeScanner();
          } else {
            stopDetailBarcodeScanner();
          }
        }} 
        book={book} 
        actionType={nfcActionType} 
        isConfirmation={false}
        error={nfcError || detailScannerError}
        scannerId="detail-barcode-reader"
        onScannerClick={null}
        html5QrCodeRef={detailHtml5QrCodeRef}
        showManualTab={true}
      />
      
      {/* Fallback Request Ledger Submission Modal Overlay */}
      {fallbackModalOpen && book && <div className="nfc-modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "var(--glass-bg)",
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div className="royal-card nfc-modal-card animate-fade-in" style={{
          width: '100%',
          maxWidth: '440px',
          padding: '24px',
          background: 'var(--surface)',
          border: '1px solid var(--accent)',
          boxShadow: "0 10px 40px var(--card-shadow)",
          borderRadius: '8px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>{t('catalog.manualEntryForm', 'Manual Entry Form')}</h3>
            <button onClick={() => setFallbackModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
              {t('catalog.ledgerDetails', 'Ledger Details (ISBN / Accession)')}
            </label>
            <input 
              type="text" 
              className="royal-input w-full" 
              placeholder={t('catalog.enterIdentifier', 'Enter identifier...')}
              value={book?.isbn || book?.id || ''}
              disabled
            />
          </div>
          <div style={{ padding: '12px', background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '6px', marginBottom: '24px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {t('catalog.curatorApprovalMsg', 'Manual submissions bypass instantaneous cryptographic checkout and require curator approval. Your gatepass will remain pending.')}
            </p>
          </div>
          <button 
            className="royal-btn primary w-full"
            style={{ padding: '12px', fontSize: '0.95rem' }}
            disabled={fallbackLoading}
            onClick={async () => {
              setFallbackLoading(true);
              try {
                // Simulate submission
                await new Promise(r => setTimeout(r, 1000));
                setFallbackSuccess(true);
                setTimeout(() => {
                  setFallbackModalOpen(false);
                  setFallbackSuccess(false);
                }, 2000);
              } finally {
                setFallbackLoading(false);
              }
            }}
          >
            {fallbackLoading ? <Loader className="spin" size={18} /> : (fallbackSuccess ? <CheckCircle size={18} /> : t('catalog.submitLedger', 'Submit Ledger to Curator'))}
          </button>
        </div>
      </div>}
"""

content = re.sub(r'<ScannerModal.*?</ScannerModal>', fallback_code, content, flags=re.DOTALL)
with open('frontend/src/pages/catalog/BookDetailPage.jsx', 'w') as f:
    f.write(content)

