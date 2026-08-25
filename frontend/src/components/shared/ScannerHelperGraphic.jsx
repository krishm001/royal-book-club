import React from 'react';
import { Camera, ArrowRight, QrCode } from 'lucide-react';
import { getLogoSvgString } from '../../utils/qrStickerGenerator';

const ScannerHelperGraphic = ({ type = 'barcode', bookImage = null }) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  const isAndroid = /android/i.test(navigator.userAgent);
  
  const PhoneSVG = () => {
    const scanAnimation = type === 'barcode' ? (
      <line x1="10" y1="20" x2="90" y2="20" stroke="var(--accent)" strokeWidth="4" filter="drop-shadow(0 0 2px var(--accent))">
        <animate attributeName="y1" values="20; 180; 20" dur="2s" repeatCount="indefinite" />
        <animate attributeName="y2" values="20; 180; 20" dur="2s" repeatCount="indefinite" />
      </line>
    ) : (
      <g>
        <circle cx="50" cy="30" r="10" fill="none" stroke="var(--accent)" strokeWidth="4" opacity="0">
          <animate attributeName="r" values="10; 60" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1; 0" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="30" r="10" fill="none" stroke="var(--accent)" strokeWidth="4" opacity="0">
          <animate attributeName="r" values="10; 60" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1; 0" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
        </circle>
      </g>
    );

    if (isIOS) {
      return (
        <svg width="40" height="70" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}>
          <rect x="5" y="5" width="90" height="190" rx="15" fill="#1c1c1e" stroke="#48484a" strokeWidth="2"/>
          <rect x="35" y="10" width="30" height="8" rx="4" fill="#000"/>
          <circle cx="50" cy="100" r="15" fill="none" stroke="#48484a" strokeWidth="2" opacity="0.3"/>
          {scanAnimation}
        </svg>
      );
    } else {
      return (
        <svg width="40" height="70" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}>
          <rect x="5" y="5" width="90" height="190" rx="10" fill="#202124" stroke="#5f6368" strokeWidth="2"/>
          <circle cx="50" cy="15" r="3" fill="#000"/>
          <rect x="15" y="180" width="70" height="2" rx="1" fill="#5f6368" opacity="0.5"/>
          {scanAnimation}
        </svg>
      );
    }
  };

  const coverUrl = bookImage || (type === 'nfc' ? '/images/book-front-cover.png' : '/images/book-back-cover.png');
  
  const stickerStyle = type === 'nfc' 
    ? { top: '6px', left: '6px' } 
    : { top: '6px', right: '50%', transform: 'translateX(50%)' };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '8px 0', opacity: 0.9, transform: 'scale(0.95)', transformOrigin: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <PhoneSVG />
        <span style={{ fontSize: '0.65rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
          {isIOS ? 'iPhone' : isAndroid ? 'Android' : 'Phone'}
        </span>
      </div>
      
      <ArrowRight size={12} color="var(--text-secondary)" />
      
      <div style={{
        position: 'relative',
        width: '60px',
        height: '86px',
        borderRadius: '2px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          position: 'absolute',
          ...stickerStyle,
          display: 'flex',
          alignItems: 'center',
          width: '24px',
          height: '11px',
          backgroundColor: '#0c0f1d',
          border: '0.5px solid #d4af37',
          borderRadius: '1px',
          padding: '1px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
        }}>
          <div style={{ width: '8px', height: '8px', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5px', borderRadius: '0.5px', flexShrink: 0 }}>
             <QrCode size={7} color="#000" strokeWidth={3} />
          </div>
          <div style={{ width: '4px', height: '4px', marginLeft: '1px', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: getLogoSvgString('golden') }} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: '1px',
            color: '#d4af37',
            flexGrow: 1
          }}>
            <div style={{ fontSize: '2px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Royal</div>
            <div style={{ fontSize: '2px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Book</div>
            <div style={{ fontSize: '2px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Club</div>
          </div>
        </div>
      </div>

      <ArrowRight size={12} color="var(--text-secondary)" />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        width: '80px',
        height: '38px',
        backgroundColor: '#0c0f1d',
        border: '1px solid #d4af37',
        borderRadius: '2px',
        padding: '2px 2px 2px 3px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <div style={{ width: '25px', height: '25px', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1px', borderRadius: '1px', flexShrink: 0 }}>
            <QrCode size={23} color="#000" />
        </div>
        <div style={{ width: '14px', height: '14px', marginLeft: '3px', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: getLogoSvgString('golden') }} />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '3px',
          color: '#d4af37',
          flexGrow: 1
        }}>
          <div style={{ fontSize: '6px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Royal</div>
          <div style={{ fontSize: '6px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Book</div>
          <div style={{ fontSize: '6px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Club</div>
          <div style={{ fontSize: '4px', marginTop: '1px', color: '#b4a064', fontFamily: 'monospace' }}>#100000001</div>
        </div>
      </div>
    </div>
  );
};

export default ScannerHelperGraphic;
