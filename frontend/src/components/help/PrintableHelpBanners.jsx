import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const PrintableHelpBanners = () => {
  const { t } = useLanguage();

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
    flexDirection: 'column'
  };

  const headerStyle = {
    textAlign: 'center',
    borderBottom: '2px solid #d4af37',
    paddingBottom: '20px',
    marginBottom: '20px'
  };

  const titleStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    letterSpacing: '4px',
    color: '#1a1a2e'
  };

  const subtitleStyle = {
    fontSize: '28px',
    color: '#333',
    margin: 0,
    fontStyle: 'italic'
  };

  const mainPathStyle = {
    flex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fdfbf7',
    border: '2px solid #d4af37',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    textAlign: 'center'
  };

  const subPathsContainer = {
    flex: 1,
    display: 'flex',
    gap: '20px',
    justifyContent: 'space-between'
  };

  const subPathStyle = {
    flex: 1,
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center'
  };

  return (
    <div className="printable-help-banners" style={{ display: 'none' }}>
      
      {/* Banner 1: MEGA-STAGE 1 */}
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>{t('STAGE 1: GETTING READY')}</h1>
          <h2 style={subtitleStyle}>{t('How to start checking out your book')}</h2>
        </div>
        
        <div style={mainPathStyle}>
          <h2 style={{ fontSize: '42px', color: '#d4af37', margin: '0 0 20px 0' }}>★ {t('QUICKEST PATH: NFC TAP')}</h2>
          <p style={{ fontSize: '32px', margin: 0 }}>
            {t('1. Unlock your phone')}<br/>
            {t('2. Tap phone to the Gold NFC Badge on the book cover')}<br/>
            {t('3. Done! The app opens instantly.')}
          </p>
        </div>

        <div style={subPathsContainer}>
          <div style={subPathStyle}>
            <h3 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>{t('OR: Scan QR Code')}</h3>
            <p style={{ fontSize: '20px' }}>{t('Open your camera and scan the QR sticker on the back of the book.')}</p>
          </div>
          <div style={subPathStyle}>
            <h3 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>{t('OR: Use Website Scanner')}</h3>
            <p style={{ fontSize: '20px' }}>{t('Go to royalbookclub.com, click Study, and use the Top Scanner.')}</p>
          </div>
        </div>
      </div>

      {/* Banner 2: MEGA-STAGE 2 */}
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>{t('STAGE 2: SIGN IN & SETUP')}</h1>
          <h2 style={subtitleStyle}>{t('Create a free account to borrow books')}</h2>
        </div>

        <div style={mainPathStyle}>
          <h2 style={{ fontSize: '42px', color: '#d4af37', margin: '0 0 20px 0' }}>{t('NEW TO THE LIBRARY?')}</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 40px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{t('1. Sign Up')}</p>
              <p style={{ fontSize: '24px' }}>{t('Use Google for 1-tap sign up, or email.')}</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{t('2. Verify')}</p>
              <p style={{ fontSize: '24px' }}>{t('Verify email & accept Library Terms.')}</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{t('3. Profile')}</p>
              <p style={{ fontSize: '24px' }}>{t('Enter your phone number.')}</p>
            </div>
          </div>
        </div>

        <div style={subPathsContainer}>
          <div style={subPathStyle}>
            <h3 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>{t('RETURNING USERS')}</h3>
            <p style={{ fontSize: '20px' }}>{t('Just sign in! If you are already signed in, this entire step is skipped automatically.')}</p>
          </div>
          <div style={{ ...subPathStyle, flex: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '80px', height: '80px', border: '4px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>QR</div>
            <p style={{ margin: '10px 0 0 0', fontWeight: 'bold' }}>{t('Scan for Help')}</p>
          </div>
        </div>
      </div>

      {/* Banner 3: MEGA-STAGE 3 */}
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>{t('STAGE 3: COMPLETE CHECKOUT / RETURN')}</h1>
          <h2 style={subtitleStyle}>{t('Get your Gatepass and enjoy reading')}</h2>
        </div>

        <div style={{ display: 'flex', flex: 1, gap: '20px' }}>
          <div style={{ ...mainPathStyle, flex: 1, margin: 0, justifyContent: 'flex-start', paddingTop: '40px' }}>
            <h2 style={{ fontSize: '36px', color: '#d4af37' }}>{t('CHECKOUT')}</h2>
            <ul style={{ fontSize: '26px', textAlign: 'left', lineHeight: '1.6', marginTop: '20px' }}>
              <li><strong>{t('NFC Tap:')}</strong> {t('Click "Instant Checkout"')}</li>
              <li><strong>{t('Standard:')}</strong> {t('Use the Scanner Popup')}</li>
              <li style={{ marginTop: '20px', listStyle: 'none', color: '#d4af37', fontWeight: 'bold', textAlign: 'center' }}>
                {t('→ WAIT FOR GATEPASS ←')}
              </li>
            </ul>
          </div>

          <div style={{ ...mainPathStyle, flex: 1, margin: 0, justifyContent: 'flex-start', paddingTop: '40px' }}>
            <h2 style={{ fontSize: '36px', color: '#d4af37' }}>{t('RETURN')}</h2>
            <ul style={{ fontSize: '26px', textAlign: 'left', lineHeight: '1.6', marginTop: '20px' }}>
              <li><strong>{t('NFC Tap:')}</strong> {t('Click "Instant Return"')}</li>
              <li><strong>{t('GPS Location:')}</strong> {t('Stand inside the library')}</li>
              <li><strong>{t('QR Validator:')}</strong> {t('Scan library desk QR')}</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PrintableHelpBanners;
