import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const PrintableHelpBanners = () => {
  const { t } = useLanguage();

  // Common styles
  const pageStyle = {
    fontFamily: '"Playfair Display", Georgia, serif',
    color: '#000',
    backgroundColor: '#fff',
    margin: 0,
    padding: '40px',
    boxSizing: 'border-box',
    width: '297mm',
    height: '210mm',
    pageBreakAfter: 'always',
    border: '4px solid #d4af37',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  };

  const headerStyle = {
    textAlign: 'center',
    borderBottom: '2px solid #d4af37',
    paddingBottom: '20px',
    marginBottom: '30px'
  };

  const titleStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    letterSpacing: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px'
  };

  const subtitleStyle = {
    fontSize: '28px',
    color: '#333',
    margin: 0,
    fontStyle: 'italic'
  };

  const stepsContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '30px',
    flex: 1
  };

  const stepStyle = {
    flex: 1,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#fdfbf7',
    border: '1px solid #eee',
    borderRadius: '8px'
  };

  const stepNumberStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: '10px'
  };

  const stepTitleStyle = {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: '15px 0',
    textTransform: 'uppercase'
  };

  const stepTextStyle = {
    fontSize: '16px',
    lineHeight: 1.4,
    color: '#444',
    whiteSpace: 'pre-line'
  };

  const footerStyle = {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px'
  };

  const tentPageStyle = {
    fontFamily: '"Playfair Display", Georgia, serif',
    color: '#000',
    backgroundColor: '#fff',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
    width: '210mm',
    height: '297mm', // A4 portrait, folded to two A5 landscape
    pageBreakAfter: 'always',
    display: 'flex',
    flexDirection: 'column'
  };

  const tentHalfStyle = {
    flex: 1,
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    border: '2px solid #d4af37',
    boxSizing: 'border-box',
    textAlign: 'center'
  };

  // SVGs
  const CrownIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );

  const BookOpenIcon = () => (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );

  const SmartphoneIcon = () => (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );

  const KeyIcon = () => (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );

  const UserIcon = () => (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  return (
    <div className="printable-help-banners" style={{ display: 'none' }}>
      
      {/* Banner 1: Checkout */}
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}><CrownIcon /> {t('ROYAL BOOK CLUB')} <CrownIcon /></h1>
          <h2 style={subtitleStyle}>{t('Self-Checkout Guide')}</h2>
        </div>
        <div style={stepsContainerStyle}>
          <div style={stepStyle}>
            <div style={stepNumberStyle}>1</div>
            <BookOpenIcon />
            <div style={stepTitleStyle}>{t('PICK UP')}</div>
            <div style={stepTextStyle}>{t('Pick up your chosen book from the shelf')}</div>
          </div>
          <div style={stepStyle}>
            <div style={stepNumberStyle}>2</div>
            <SmartphoneIcon />
            <div style={stepTitleStyle}>{t('TAP or SCAN')}</div>
            <div style={stepTextStyle}>
              {t('NFC: Hold phone on front cover\nQR: Camera on back cover QR')}
            </div>
          </div>
          <div style={stepStyle}>
            <div style={stepNumberStyle}>3</div>
            <KeyIcon />
            <div style={stepTitleStyle}>{t('SIGN IN')}</div>
            <div style={stepTextStyle}>{t('New? Quick sign up via Google, LinkedIn, or Email')}</div>
          </div>
          <div style={stepStyle}>
            <div style={stepNumberStyle}>4</div>
            <CheckCircleIcon />
            <div style={stepTitleStyle}>{t('CHECKOUT')}</div>
            <div style={stepTextStyle}>{t('Click the golden Checkout button. Show Gatepass at exit.')}</div>
          </div>
        </div>
        <div style={footerStyle}>
          <div>{t('📱 iPhone: Hold top edge near NFC badge')}</div>
          <div>{t('🤖 Android: Center-back of phone, slide up/down')}</div>
        </div>
      </div>

      {/* Banner 2: Return */}
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}><CrownIcon /> {t('ROYAL BOOK CLUB')} <CrownIcon /></h1>
          <h2 style={subtitleStyle}>{t('How to Return a Book')}</h2>
        </div>
        <div style={stepsContainerStyle}>
          <div style={stepStyle}>
            <div style={stepNumberStyle}>1</div>
            <UserIcon />
            <div style={stepTitleStyle}>{t('OPEN PROFILE')}</div>
            <div style={stepTextStyle}>{t('Find your book in Active Loans on the website')}</div>
          </div>
          <div style={stepStyle}>
            <div style={stepNumberStyle}>2</div>
            <SmartphoneIcon />
            <div style={stepTitleStyle}>{t('VERIFY')}</div>
            <div style={stepTextStyle}>
              {t('NFC: Tap phone on book\nQR: Scan sticker or desk placard\nGPS: Stand inside library')}
            </div>
          </div>
          <div style={stepStyle}>
            <div style={stepNumberStyle}>3</div>
            <CheckCircleIcon />
            <div style={stepTitleStyle}>{t('DONE')}</div>
            <div style={stepTextStyle}>{t('Return confirmed! Place book back on shelf. Optional: Write a review.')}</div>
          </div>
        </div>
      </div>

      {/* Banner 3: NFC Quick Tips (Tent Card) */}
      <div style={tentPageStyle}>
        {/* Top half - right side up */}
        <div style={tentHalfStyle}>
          <h2 style={{ fontSize: '36px', marginBottom: '30px' }}>{t('📱 NFC Scanning Tips')}</h2>
          
          <div style={{ display: 'flex', gap: '40px', textAlign: 'left', marginBottom: '40px', maxWidth: '80%' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '24px', borderBottom: '2px solid #d4af37', paddingBottom: '10px' }}>{t('iPhone')}</h3>
              <ul style={{ fontSize: '18px', lineHeight: 1.6, paddingLeft: '20px' }}>
                <li>{t('Top edge near NFC badge')}</li>
                <li>{t('Screen must be unlocked')}</li>
                <li>{t('iPhone 7/8: Open NFC from Control Center first')}</li>
              </ul>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '24px', borderBottom: '2px solid #d4af37', paddingBottom: '10px' }}>{t('Android')}</h3>
              <ul style={{ fontSize: '18px', lineHeight: 1.6, paddingLeft: '20px' }}>
                <li>{t('Center-back of phone')}</li>
                <li>{t('Slide up/down slowly')}</li>
                <li>{t('Wait for vibration')}</li>
              </ul>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '40px', fontSize: '20px', fontWeight: 'bold' }}>
            <div style={{ color: '#d32f2f' }}>{t('❌ Remove metallic cases')}</div>
            <div style={{ color: '#388e3c' }}>{t('✅ No app download needed!')}</div>
          </div>
        </div>

        {/* Bottom half - rotated 180 degrees */}
        <div style={{ ...tentHalfStyle, transform: 'rotate(180deg)', borderTop: 'none' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '30px' }}>{t('📱 NFC Scanning Tips')}</h2>
          
          <div style={{ display: 'flex', gap: '40px', textAlign: 'left', marginBottom: '40px', maxWidth: '80%' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '24px', borderBottom: '2px solid #d4af37', paddingBottom: '10px' }}>{t('iPhone')}</h3>
              <ul style={{ fontSize: '18px', lineHeight: 1.6, paddingLeft: '20px' }}>
                <li>{t('Top edge near NFC badge')}</li>
                <li>{t('Screen must be unlocked')}</li>
                <li>{t('iPhone 7/8: Open NFC from Control Center first')}</li>
              </ul>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '24px', borderBottom: '2px solid #d4af37', paddingBottom: '10px' }}>{t('Android')}</h3>
              <ul style={{ fontSize: '18px', lineHeight: 1.6, paddingLeft: '20px' }}>
                <li>{t('Center-back of phone')}</li>
                <li>{t('Slide up/down slowly')}</li>
                <li>{t('Wait for vibration')}</li>
              </ul>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '40px', fontSize: '20px', fontWeight: 'bold' }}>
            <div style={{ color: '#d32f2f' }}>{t('❌ Remove metallic cases')}</div>
            <div style={{ color: '#388e3c' }}>{t('✅ No app download needed!')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableHelpBanners;
