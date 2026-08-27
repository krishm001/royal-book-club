import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

bad_mock_phone = r'<div className="mock-phone-body-state">.*?(?=<div className="zoomed-qr-container")'
good_mock_phone = '''<div className="mock-phone-body-state" style={{ flex: 1, position: 'relative' }}>
        
        {/* Mock Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px', borderBottom: `0.5px solid ${tPalette.glassBorder}` }}>
          <div style={{ fontSize: '3px', fontWeight: 'bold', color: type==='nfc' ? tPalette.accent : tPalette.textSecondary, background: type==='nfc' ? 'rgba(212,175,55,0.1)' : 'transparent', padding: '1px 2px', borderRadius: '1px' }}>{t('catalog.nfcTap', 'Tap')}</div>
          <div style={{ fontSize: '3px', fontWeight: 'bold', color: type==='barcode' ? tPalette.accent : tPalette.textSecondary, background: type==='barcode' ? 'rgba(212,175,55,0.1)' : 'transparent', padding: '1px 2px', borderRadius: '1px' }}>{t('catalog.qrBarcodeScan', 'Scan')}</div>
          <div style={{ fontSize: '3px', fontWeight: 'bold', color: tPalette.textSecondary, padding: '1px 2px' }}>{t('catalog.manualSubtab', 'Manual')}</div>
          <div style={{ fontSize: '3px', padding: '1px 2px', color: tPalette.textSecondary }}>×</div>
        </div>

        {/* Mock Viewfinder (QR only) */}
        {type === 'barcode' && (
          <div className="mock-scan-body" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '38px', height: '18px', background: tPalette.viewfinderBg, border: `1px solid ${tPalette.accent}`, borderRadius: '2px', margin: '4px 0', position: 'relative' }}>
              <div className="mock-laser" style={{ background: '#ff3b30', boxShadow: '0 0 2px #ff3b30' }}></div>
            </div>
            
            <div style={{ fontSize: '4.5px', fontWeight: 'bold', color: tPalette.textPrimary, textAlign: 'center', margin: '2px 0' }}>
              {isReturn ? 'Scan return QR code' : 'Scan library QR code'}
            </div>
            
            {/* The 3D scene sits below the caption */}
            <div style={{ width: '100%', flex: 1 }}></div>
          </div>
        )}

        {/* Mock NFC state */}
        {type === 'nfc' && (
          <div className="mock-scan-body" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '4.5px', fontWeight: 'bold', color: tPalette.textPrimary, textAlign: 'center', margin: '6px 0 2px' }}>
              Tap phone on book cover
            </div>
          </div>
        )}

        {/* Mock Success Popup overlaying the view */}
        <div className="mock-success-body">
          {isConfirmation ? (
            <div style={{ background: tPalette.surface, border: `1px solid ${tPalette.accent}`, padding: '4px', margin: '2px', borderRadius: '3px', zIndex: 10 }}>
              <div style={{ fontSize: '5px', fontWeight: 'bold', color: tPalette.accent, textAlign: 'center', marginBottom: '2px' }}>Checkout complete!</div>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                <div style={{ width: '12px', height: '16px', background: '#ccc', backgroundImage: `url(${frontCoverUrl})`, backgroundSize: 'cover' }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '3.5px', fontWeight: 'bold', color: tPalette.textPrimary }}>{book?.title || 'Book Title'}</div>
                </div>
              </div>
              <div style={{ fontSize: '3px', color: tPalette.textSecondary, marginBottom: '2px' }}>A physical possession barcode or NFC match has been registered.</div>
              <div style={{ background: tPalette.accent, color: '#fff', fontSize: '3.5px', fontWeight: 'bold', textAlign: 'center', padding: '2px', borderRadius: '1.5px' }}>CONFIRM</div>
            </div>
          ) : (
            <div style={{ background: tPalette.surface, border: `1px solid ${tPalette.accent}`, padding: '4px', margin: '4px', borderRadius: '3px', zIndex: 10 }}>
              <div style={{ margin: '2px auto', width: '12px', height: '12px', borderRadius: '50%', border: `1.5px solid ${tPalette.checkColor}`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke={tPalette.checkColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <div style={{ fontSize: '4.5px', fontWeight: 'bold', color: tPalette.textPrimary, textAlign: 'center', marginBottom: '1px' }}>Royal Verification Confirmed</div>
              <div style={{ fontSize: '3px', color: tPalette.textSecondary, textAlign: 'center', marginBottom: '3px' }}>How was your experience?</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1px', marginBottom: '3px' }}>
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="4" height="4" viewBox="0 0 24 24" fill="none" stroke={tPalette.accent} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                ))}
              </div>
              <div style={{ background: tPalette.accent, color: '#fff', fontSize: '3.5px', fontWeight: 'bold', textAlign: 'center', padding: '2px', borderRadius: '1.5px' }}>{isReturn ? 'WRITE REVIEW' : 'VIEW GATEPASS'}</div>
            </div>
          )}
        </div>
      </div>

      '''

content = re.sub(bad_mock_phone, good_mock_phone, content, flags=re.DOTALL)

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
