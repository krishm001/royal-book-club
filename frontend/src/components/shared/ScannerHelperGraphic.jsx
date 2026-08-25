import React from 'react';
import { QrCode, Wifi } from 'lucide-react';
import { getLogoSvgString } from '../../utils/qrStickerGenerator';

const ScannerHelperGraphic = ({ type = 'barcode', bookImage = null }) => {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  // Default to android on desktop
  const isAndroid = isMobile ? !isIOS : true; 
  const isDesktop = !isMobile;

  // Use up to 1.5x scaling on desktop, max out around available space.
  // Using container dimensions and flex to make it responsive.
  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: isDesktop ? '20px' : '10px',
    margin: '12px auto',
    width: '100%',
    maxWidth: isDesktop ? '600px' : '360px',
    position: 'relative'
  };

  const phoneScale = isDesktop ? 1.5 : 1;
  const bookScale = isDesktop ? 1.5 : 1;

  // Real Phone SVG
  const PhoneSVG = ({ isNfc = false }) => {
    const w = 50 * phoneScale;
    const h = 100 * phoneScale;

    // Mini popup inside phone screen
    const PhoneScreenInner = () => (
      <g>
        {/* Background */}
        <rect x="5" y="15" width="40" height="75" fill="#000" />
        
        {/* Mock modal UI top bar */}
        <rect x="5" y="60" width="40" height="30" fill="#1c1c1e" rx="2" />
        <rect x="15" y="65" width="20" height="3" fill="#d4af37" rx="1.5" />
        
        {/* Camera feed area */}
        {type === 'barcode' ? (
          <g>
            <rect x="10" y="25" width="30" height="30" fill="#333" rx="2" stroke="#d4af37" strokeWidth="1" />
            <line x1="10" y1="40" x2="40" y2="40" stroke="#ff3b30" strokeWidth="1.5" filter="drop-shadow(0 0 1px #ff3b30)">
              <animate attributeName="y1" values="25; 55; 25" dur="2s" repeatCount="indefinite" />
              <animate attributeName="y2" values="25; 55; 25" dur="2s" repeatCount="indefinite" />
            </line>
          </g>
        ) : (
          <g>
            <circle cx="25" cy="40" r="8" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.8" />
            <circle cx="25" cy="40" r="1" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0">
              <animate attributeName="r" values="1; 12" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1; 0" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="25" cy="40" r="1" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0">
              <animate attributeName="r" values="1; 12" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1; 0" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </g>
    );

    if (isIOS && !isAndroid) {
      return (
        <svg width={w} height={h} viewBox="0 0 50 100" fill="none" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4))' }}>
          <rect x="2" y="2" width="46" height="96" rx="8" fill="#1c1c1e" stroke="#48484a" strokeWidth="1.5"/>
          {/* iOS Notch */}
          <path d="M 15 2 L 15 6 C 15 8 17 8 19 8 L 31 8 C 33 8 35 8 35 6 L 35 2 Z" fill="#000" />
          <PhoneScreenInner />
          <circle cx="25" cy="5" r="1.5" fill="#222"/>
        </svg>
      );
    } else {
      // Android
      return (
        <svg width={w} height={h} viewBox="0 0 50 100" fill="none" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4))' }}>
          <rect x="2" y="2" width="46" height="96" rx="4" fill="#202124" stroke="#5f6368" strokeWidth="1.5"/>
          <circle cx="25" cy="8" r="1.5" fill="#000"/>
          <PhoneScreenInner />
          <rect x="10" y="93" width="30" height="1.5" rx="0.5" fill="#5f6368" opacity="0.6"/>
        </svg>
      );
    }
  };

  const coverUrl = bookImage || (type === 'nfc' ? '/images/book-front-cover.png' : '/images/book-back-cover.png');
  
  const bookW = 70 * bookScale;
  const bookH = 100 * bookScale;

  if (type === 'nfc') {
    // NFC Overlapping Layout
    // "Make phone image look like it is tapping on top left of the book."
    // "For iPhone it should be top edge, for andtroid it should be back side of phone"
    const phoneStyle = {
      position: 'absolute',
      zIndex: 10,
      filter: 'drop-shadow(2px 8px 12px rgba(0,0,0,0.6))',
      transition: 'all 0.3s ease',
      transformOrigin: 'center center'
    };
    
    if (isIOS && !isAndroid) {
      // iPhone top edge tapping top left of book
      phoneStyle.top = isDesktop ? '-40px' : '-20px';
      phoneStyle.left = isDesktop ? '-30px' : '-10px';
      phoneStyle.transform = 'rotate(20deg)';
    } else {
      // Android back side tapping (laying somewhat flat over top left)
      phoneStyle.top = isDesktop ? '-10px' : '0px';
      phoneStyle.left = isDesktop ? '-20px' : '-5px';
      phoneStyle.transform = 'rotate(10deg) skewX(10deg) scale(0.9)';
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px auto 30px auto', position: 'relative', width: bookW, height: bookH }}>
        {/* The Book */}
        <div style={{
          position: 'relative',
          width: `${bookW}px`,
          height: `${bookH}px`,
          borderRadius: '3px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 1
        }}>
          {/* NFC Tilted Wifi Icon at top left (No Sticker) */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'var(--accent)',
            borderRadius: '50%',
            width: isDesktop ? '24px' : '18px',
            height: isDesktop ? '24px' : '18px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            <Wifi size={isDesktop ? 14 : 10} color="#000" style={{ transform: 'rotate(90deg)' }} strokeWidth={3} />
          </div>
        </div>

        {/* The Tapping Phone */}
        <div style={phoneStyle}>
          <PhoneSVG isNfc={true} />
        </div>
      </div>
    );
  }

  // Barcode Layout
  return (
    <div style={containerStyle}>
      {/* 1. Phone Scanning */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <PhoneSVG />
      </div>
      
      {/* 2. Book with small sticker */}
      <div style={{
        position: 'relative',
        width: `${bookW}px`,
        height: `${bookH}px`,
        borderRadius: '3px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0
      }}>
        {/* Small Golden Sticker Top Center */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '50%',
          transform: 'translateX(50%)',
          display: 'flex',
          alignItems: 'center',
          width: isDesktop ? '32px' : '24px',
          height: isDesktop ? '15px' : '11px',
          backgroundColor: '#0c0f1d',
          border: '0.5px solid #d4af37',
          borderRadius: '1px',
          padding: '1px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
        }}>
          <div style={{ width: isDesktop ? '10px' : '8px', height: isDesktop ? '10px' : '8px', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5px', borderRadius: '0.5px', flexShrink: 0 }}>
             <QrCode size={isDesktop ? 8 : 7} color="#000" strokeWidth={3} />
          </div>
          <div style={{ width: isDesktop ? '6px' : '4px', height: isDesktop ? '6px' : '4px', marginLeft: '1px', flexShrink: 0, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: getLogoSvgString('golden').replace(/width="200"/g, 'width="100%"').replace(/height="200"/g, 'height="100%"') }} />
        </div>
      </div>

      {/* 3. Enlarged Sticker */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        width: isDesktop ? '120px' : '85px',
        height: isDesktop ? '56px' : '40px',
        backgroundColor: '#0c0f1d',
        border: '1.5px solid #d4af37',
        borderRadius: '3px',
        padding: isDesktop ? '4px' : '3px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        flexShrink: 0
      }}>
        <div style={{ width: isDesktop ? '36px' : '26px', height: isDesktop ? '36px' : '26px', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2px', borderRadius: '2px', flexShrink: 0 }}>
            <QrCode size={isDesktop ? 32 : 24} color="#000" strokeWidth={2} />
        </div>
        
        {/* We use SVG container strictly so the raw logo string doesn't burst out as huge diamonds */}
        <div style={{ width: isDesktop ? '20px' : '14px', height: isDesktop ? '20px' : '14px', marginLeft: '4px', flexShrink: 0, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: getLogoSvgString('golden').replace(/width="200"/g, 'width="100%"').replace(/height="200"/g, 'height="100%"') }} />
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '4px',
          color: '#d4af37',
          flexGrow: 1
        }}>
          <div style={{ fontSize: isDesktop ? '9px' : '6.5px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Royal</div>
          <div style={{ fontSize: isDesktop ? '9px' : '6.5px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Book</div>
          <div style={{ fontSize: isDesktop ? '9px' : '6.5px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Club</div>
          <div style={{ fontSize: isDesktop ? '6px' : '4.5px', marginTop: '2px', color: '#b4a064', fontFamily: 'monospace' }}>#100000001</div>
        </div>
      </div>
    </div>
  );
};

export default ScannerHelperGraphic;
