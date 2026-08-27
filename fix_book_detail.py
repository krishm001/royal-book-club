import re

with open('frontend/src/pages/catalog/BookDetailPage.jsx', 'r') as f:
    content = f.read()

# Replace the block. It starts with `{nfcModalOpen && <div className="nfc-modal-overlay"`
# and ends right before `{instantConfirmOpen && <div className="nfc-modal-overlay"`

start_str = '{nfcModalOpen && <div className="nfc-modal-overlay"'
end_str = '{instantConfirmOpen && <div className="nfc-modal-overlay"'

if start_str in content and end_str in content:
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    
    replacement = '''
      <ScannerModal 
        isOpen={nfcModalOpen} 
        onClose={handleCloseCardModal} 
        activeTab={activeTab} 
        onTabChange={(tab) => {
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
        error={checkoutError}
        scannerId="detail-barcode-reader"
        onScannerClick={null}
        html5QrCodeRef={detailHtml5QrCodeRef}
        showManualTab={true}
      />

    '''
    
    content = content[:start_idx] + replacement + content[end_idx:]
    
    with open('frontend/src/pages/catalog/BookDetailPage.jsx', 'w') as f:
        f.write(content)
    print("Replaced successfully!")
else:
    print("Could not find blocks.")

