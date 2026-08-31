import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Wifi, QrCode, CheckCircle, Star } from 'lucide-react';
import { getLogoSvgString } from '../../utils/qrStickerGenerator';
import './ContinuousScanner.css';

const ContinuousScannerAnimation = ({ type = 'barcode', book = null, action = 'checkout', isConfirmation = false, renderViewfinder }) => {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState(0);
  const { t } = useLanguage(); // For text instructions

  // Detect current theme
  const currentTheme = useMemo(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }, []);
  const isAcademic = currentTheme === 'academic';

  // Theme-aware color palette for phone screen mockup
  const tPalette = useMemo(() => {
    if (isAcademic) {
      return {
        surface: '#f5f2eb',
        surfaceEl: '#eae5dc',
        accent: '#8d1222',
        accentHover: '#b31c31',
        textPrimary: '#2c1a1c',
        textSecondary: '#4a3638',
        glassBg: 'rgba(234, 229, 220, 0.7)',
        glassBorder: 'rgba(88, 17, 26, 0.15)',
        headerBg: 'rgba(245, 242, 235, 0.85)',
        viewfinderBg: '#3a0a10',
        checkColor: '#8d1222',
      };
    }
    return {
      surface: '#0f0f23',
      surfaceEl: '#1e1e3f',
      accent: '#d4a574',
      accentHover: '#e8c59c',
      textPrimary: '#f0e6d3',
      textSecondary: '#8b8ba3',
      glassBg: 'rgba(30, 30, 63, 0.4)',
      glassBorder: 'rgba(212, 165, 116, 0.15)',
      headerBg: 'rgba(15, 15, 35, 0.75)',
      viewfinderBg: '#0a0a1a',
      checkColor: '#d4a574',
    };
  }, [isAcademic]);

  const isReturn = action === 'return';
  
  useEffect(() => {
    const tm = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(tm);
  }, []);

  const startTimeRef = useRef(Date.now());
  // Phase text instructions synced to CSS animation (20s loop)
  useEffect(() => {
    startTimeRef.current = Date.now();
    const getPhase = () => {
      const elapsed = ((Date.now() - startTimeRef.current) / 1000) % 20;
      if (elapsed < 5) return 0;
      if (elapsed < 10) return 1;
      if (elapsed < 15) return 2;
      return 3;
    };
    const interval = setInterval(() => setPhase(getPhase()), 500);
    return () => clearInterval(interval);
  }, [mounted, action, type]);



  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  const isDesktop = !isMobile;

  const frontCoverUrl = book?.coverUrl || '/images/default-scanner-book.png';
  const backCoverUrl = book?.backCoverUrl || '/images/book-back-cover.png';
  
  // Text instructions based on phase
  const getInstructionText = () => {
    if (isReturn) {
      if (type === 'barcode') {
        if (phase === 0) return '1. Flip to back cover';
        if (phase === 1) return '2. Scan QR on back cover';
        if (phase === 2) return '3. Focus until QR is scanned successfully';
        return '4. Place the book back on shelf';
      } else {
        if (phase === 0) return '1. Hold front cover facing you';
        if (phase === 1) return '2. Tap your phone to the top-left corner';
        if (phase === 2) return '3. Slide it slowly up and down until it connects';
        return '4. Place the book back on shelf';
      }
    } else {
      if (type === 'barcode') {
        if (phase === 0) return '1. Pick up the book';
        if (phase === 1) return '2. Flip to back cover';
        if (phase === 2) return '3. Scan QR on back cover';
        return '4. Focus until QR is scanned successfully';
      } else {
        if (phase === 0) return '1. Pick up the book';
        if (phase === 1) return '2. Hold front cover facing you';
        if (phase === 2) return '3. Tap your phone to the top-left corner';
        return '4. Slide it slowly up and down until it connects';
      }
    }
  };

  // Phase-aware Phone Screen — shows scanning UI or success UI based on current phase
  const showSuccess = isReturn ? (phase === 1) : (phase === 3);
  
  const MockPhoneScreen = () => (
    <div className="mock-screen" style={{ background: tPalette.surface }}>
      {/* Status bar */}
      <div className="mock-status-bar" style={{ background: tPalette.headerBg }}>
        <span style={{ fontSize: '4px', color: tPalette.textSecondary }}>9:41</span>
        <div style={{ display: 'flex', gap: '1px' }}>
          <div style={{ width: '4px', height: '3px', background: tPalette.textSecondary, borderRadius: '1px' }}></div>
          <div style={{ width: '6px', height: '3px', background: tPalette.textSecondary, borderRadius: '1px' }}></div>
        </div>
      </div>
      {/* Tab row matching real UI: Tap | Scan | Manual | X */}
      <div style={{ display: 'flex', margin: '1px', gap: '1px' }}>
        <div style={{ flex: 1, fontSize: '3px', textAlign: 'center', fontWeight: 'bold', color: type==='nfc' ? '#fff' : tPalette.textSecondary, background: type==='nfc' ? tPalette.accent : 'transparent', borderRadius: '1.5px', padding: '1.5px 0', border: type==='nfc' ? 'none' : `0.5px solid ${tPalette.glassBorder}` }}>Tap</div>
        <div style={{ flex: 1, fontSize: '3px', textAlign: 'center', fontWeight: 'bold', color: type==='barcode' ? '#fff' : tPalette.textSecondary, background: type==='barcode' ? tPalette.accent : 'transparent', borderRadius: '1.5px', padding: '1.5px 0', border: type==='barcode' ? 'none' : `0.5px solid ${tPalette.glassBorder}` }}>Scan</div>
        <div style={{ flex: 1, fontSize: '3px', textAlign: 'center', color: tPalette.textSecondary, padding: '1.5px 0', border: `0.5px solid ${tPalette.glassBorder}`, borderRadius: '1.5px' }}>Manual</div>
        <div style={{ width: '8px', fontSize: '4px', textAlign: 'center', color: tPalette.textSecondary, padding: '1px 0' }}>×</div>
      </div>

      <div className="mock-phone-body-state" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* SCANNING STATE — visible when NOT showing success */}
        {!showSuccess && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px' }}>
            {type === 'barcode' ? (
              <>
                {/* Mini viewfinder */}
                <div style={{
                  width: '38px', height: '16px', background: tPalette.viewfinderBg,
                  border: `1px solid ${tPalette.accent}`, borderRadius: '2px',
                  margin: '3px auto 2px', position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '4px', borderTop: '1px solid #fff', borderLeft: '1px solid #fff' }}></div>
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '4px', borderTop: '1px solid #fff', borderRight: '1px solid #fff' }}></div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '4px', height: '4px', borderBottom: '1px solid #fff', borderLeft: '1px solid #fff' }}></div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '4px', height: '4px', borderBottom: '1px solid #fff', borderRight: '1px solid #fff' }}></div>
                  <div className="mock-laser" style={{ background: '#ff3b30', boxShadow: '0 0 2px #ff3b30' }}></div>
                </div>
                <div style={{ fontSize: '3.5px', fontWeight: 'bold', color: tPalette.textPrimary, textAlign: 'center', margin: '2px 0' }}>
                  {isReturn ? 'Scan QR on back cover' : 'Scan QR on back cover'}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 2px' }}>
                <div style={{ fontSize: '4px', fontWeight: 'bold', color: tPalette.textPrimary, margin: '4px 0' }}>
                  Tap phone on NFC logo
                </div>
                <div style={{ fontSize: '3px', color: tPalette.textSecondary }}>
                  Hold steady near top-left corner
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUCCESS STATE — visible when showing success */}
        {showSuccess && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px' }}>
          {isConfirmation ? (
            <>
              <div style={{ padding: '2px 4px', border: `1px solid ${tPalette.glassBorder}`, borderRadius: '2px', background: tPalette.surfaceEl, margin: '2px 4px', display: 'flex', gap: '3px' }}>
                <div style={{ width: '16px', height: '22px', background: '#ccc', borderRadius: '1px', backgroundImage: `url(${frontCoverUrl})`, backgroundSize: 'cover' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '4.5px', fontWeight: 'bold', color: tPalette.textPrimary }}>{book?.title || 'Book Title'}</div>
                  <div style={{ fontSize: '3px', color: tPalette.textSecondary }}>ISBN: {book?.isbn || '1234567890'}</div>
                </div>
              </div>
              <div style={{ fontSize: '3px', color: tPalette.textSecondary, textAlign: 'center', margin: '2px 4px', lineHeight: '1.2' }}>
                {t('catalog.p2dDesc', 'A physical possession barcode or NFC match has been registered.')} Proceed with instant checkout? No curator approval required.
              </div>
              <div style={{ display: 'flex', gap: '2px', margin: '2px 4px' }}>
                <div style={{ flex: 1, fontSize: '3.5px', textAlign: 'center', padding: '2px', borderRadius: '1px', border: `1px solid ${tPalette.accent}`, color: tPalette.accent }}>
                  CANCEL
                </div>
                <div style={{ flex: 1, fontSize: '3.5px', textAlign: 'center', padding: '2px', borderRadius: '1px', background: tPalette.accent, color: '#fff', fontWeight: 'bold' }}>
                  {isReturn ? t('common.confirm', 'CONFIRM') + ' RETURN' : t('common.confirm', 'CONFIRM') + ' CHECKOUT'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ margin: '3px auto', width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${tPalette.checkColor}`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={tPalette.checkColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <div style={{ fontSize: '5px', fontWeight: 'bold', color: tPalette.textPrimary, textAlign: 'center', fontFamily: 'Georgia, serif' }}>{t('catalog.royalVerification', 'Royal Verification Confirmed')}</div>
              <div style={{ fontSize: '3.5px', color: tPalette.textSecondary, textAlign: 'center', margin: '1px 0' }}>Transaction ledger updated.</div>
              
              <div style={{ margin: '2px 4px', padding: '2px', border: `1px solid ${tPalette.glassBorder}`, borderRadius: '2px', background: tPalette.glassBg }}>
                <div style={{ fontSize: '3.5px', color: tPalette.textSecondary, textAlign: 'center', marginBottom: '1px' }}>{t('catalog.howExperience', 'How was your experience?')}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1px' }}>
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="5" height="5" viewBox="0 0 24 24" fill="none" stroke={tPalette.accent} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2px', margin: '2px 4px' }}>
                <div style={{ flex: 1, fontSize: '3.5px', textAlign: 'center', padding: '2px', borderRadius: '1px', background: tPalette.accent, color: '#fff', fontWeight: 'bold' }}>
                  {isReturn ? t('catalog.writeReview', 'WRITE REVIEW') : t('catalog.viewGatepass', 'VIEW GATEPASS')}
                </div>
                <div style={{ flex: 0.6, fontSize: '3.5px', textAlign: 'center', padding: '2px', borderRadius: '1px', border: `1px solid ${tPalette.accent}`, color: tPalette.accent }}>
                  DONE
                </div>
              </div>
            </>
          )}
          </div>
        )}
      </div>
    </div>
  );
  const animClass = isReturn 
    ? (type === 'barcode' ? 'return-barcode' : 'return-nfc')
    : (type === 'barcode' ? 'checkout-barcode' : 'checkout-nfc');

  return (
    <div className={`continuous-scanner-container ${type}-mode ${animClass}-mode ${isDesktop ? 'desktop-scale' : 'mobile-scale'}`}>
      
      {renderViewfinder && renderViewfinder}

      {actionToggleNode && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', zIndex: 110 }}>{actionToggleNode}</div>}

      {/* Instruction Text Overlay */}
      <div className="anim-instruction-text" style={{ position: "relative", margin: "8px 0", zIndex: 100, textAlign: "center" }}>
        <p style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{getInstructionText()}</span>
          {(phase === 2 || phase === 3) && (
            <span style={{ fontSize: '0.75rem', opacity: 0.8, fontStyle: 'italic', fontWeight: 'normal' }}>
              {type === 'nfc' 
                ? (isIOS ? "Tip for iPhone: iPhones scan from the top edge." : "Tip for Android: Android phones scan from the center-back.")
                : "Tip - Adjust distance until QR is clear."}
            </span>
          )}
        </p>
      </div>

      <div className="scene-3d" key={type + "-" + action}>
        
        {/* The Library Shelf */}
        <div className={`library-shelf ${animClass}-shelf`}>
           <div className="fake-spine spine-1"></div>
           <div className="fake-spine spine-2"></div>
           <div className="fake-spine spine-3"></div>
           <div className="spine-gap"></div>
           <div className="fake-spine spine-4"></div>
           <div className="fake-spine spine-5"></div>
           <div className="shelf-board"></div>
        </div>

        {/* The Person on the Floor (realistic silhouette) */}
        <div className={`anim-person ${animClass}-person`}>
           <svg width="70" height="160" viewBox="0 0 70 160">
             {/* Head */}
             <circle cx="35" cy="18" r="12" fill="#3a3a3a" />
             {/* Hair */}
             <path d="M 23 18 C 23 8, 47 8, 47 18" fill="#222" />
             {/* Neck */}
             <rect x="31" y="29" width="8" height="6" fill="#dcb38f" rx="2" />
             {/* Torso */}
             <path d="M 18 35 C 18 35, 35 33, 52 35 L 50 85 L 20 85 Z" fill="#3a3a3a" />
             {/* Left arm */}
             <path d="M 18 40 L 5 70 L 8 72 L 22 50" fill="#3a3a3a" />
             {/* Right arm reaching up toward shelf */}
             <path className="person-arm" d="M 52 40 C 58 35, 65 25, 70 15" stroke="#dcb38f" strokeWidth="8" fill="none" strokeLinecap="round" />
             {/* Legs */}
             <rect x="22" y="85" width="10" height="50" fill="#2a2a2a" rx="3" />
             <rect x="38" y="85" width="10" height="50" fill="#2a2a2a" rx="3" />
             {/* Shoes */}
             <rect x="20" y="133" width="14" height="6" fill="#1a1a1a" rx="2" />
             <rect x="36" y="133" width="14" height="6" fill="#1a1a1a" rx="2" />
           </svg>
        </div>

        {/* The 3D Book */}
        <div className={`anim-book-wrapper ${animClass}-book`}>
          <div className="anim-book">
            
            {/* The hand elements are embedded into the book faces below */}


            <div className="book-core"></div>
            <div className="book-face book-front" style={{ backgroundImage: `url(${frontCoverUrl})` }}>

            </div>
            <div className="book-face book-back" style={{ backgroundImage: `url(${backCoverUrl})` }}>
              {type === 'barcode' && (
                <div className="book-qr-sticker" style={{
                  position: 'absolute', top: '10px', left: '10px', width: '35px', height: '20px',
                  backgroundImage: 'url(/images/qr_sticker.png)', backgroundSize: 'cover',
                  transform: 'translateZ(1px)', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                }}></div>
              )}
            </div>
            <div className="book-face book-spine">
              <div className="spine-text">{book?.title || 'Book Title'}</div>
              <div className={`anim-hand-spine ${animClass}-hand`} style={{position: 'absolute', bottom: 10, left: -2, width: 24, height: 40}}>
                 <svg width="28" height="40" viewBox="0 0 28 40" style={{ transform: 'rotate(90deg)' }}>
                   <path d="M 0 40 C 0 20, 10 10, 20 10 C 25 10, 28 15, 28 20 C 28 30, 20 40, 15 40 Z" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                   <path d="M 10 25 Q 15 22, 20 25" stroke="#c0936f" strokeWidth="1" fill="none" opacity="0.6"/>
                 </svg>
              </div>
            </div>
            <div className="book-face book-top"></div>
            <div className="book-face book-bottom">
              <div className={`anim-hand-bottom ${animClass}-hand`} style={{position: 'absolute', top: 0, left: 10, width: 80, height: 24}}>
                 <svg width="80" height="24" viewBox="0 0 80 24" style={{ transform: 'rotateX(180deg)' }}>
                   {/* Fingers supporting bottom */}
                   <path d="M 0 24 C 0 5, 10 0, 15 0 C 20 0, 25 5, 25 24" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                   <path d="M 20 24 C 20 5, 30 -2, 35 -2 C 40 -2, 45 5, 45 24" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                   <path d="M 40 24 C 40 5, 50 0, 55 0 C 60 0, 65 5, 65 24" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                   <path d="M 60 24 C 60 10, 70 5, 75 5 C 80 5, 80 10, 80 24" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                 </svg>
              </div>
            </div>
            <div className="book-face book-right"></div>
          </div>
        </div>

        {/* The 3D Phone */}
        <div className={`anim-phone-wrapper ${animClass}-phone ${isIOS ? 'ios' : 'android'}`}>
          <div className="anim-phone">
             <div className="phone-face phone-front">
                <MockPhoneScreen />
             </div>
             <div className="phone-face phone-back">
                <div className="rear-camera"></div>
             </div>
             <div className="phone-face phone-left"></div>
             <div className="phone-face phone-right"></div>
             <div className="phone-face phone-top"></div>
             <div className="phone-face phone-bottom"></div>
          </div>
        </div>
        
        {/* Zoomed QR Sticker (barcode mode only) */}
        {type === 'barcode' && (
          <div className={`zoomed-qr-container ${animClass}-qr`}></div>
        )}
      </div>

    </div>
  );
};

export default ContinuousScannerAnimation;
