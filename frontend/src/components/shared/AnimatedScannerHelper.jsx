import React, { useState, useEffect } from 'react';
import { Wifi, QrCode } from 'lucide-react';
import { getLogoSvgString } from '../../utils/qrStickerGenerator';

const AnimatedScannerHelper = ({ type = 'barcode', book = null }) => {
  const [step, setStep] = useState(1);
  const totalSteps = type === 'barcode' ? 4 : 3;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  const isAndroid = isMobile ? !isIOS : true; 
  const isDesktop = !isMobile;

  const baseScale = isDesktop ? 1.5 : 1;
  const bookW = 70 * baseScale;
  const bookH = 100 * baseScale;
  const phoneW = 50 * baseScale;
  const phoneH = 100 * baseScale;

  const frontCoverUrl = book?.coverUrl || '/images/book-front-cover.png';
  const backCoverUrl = book?.backCoverUrl || '/images/book-back-cover.png';

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev % totalSteps) + 1);
    }, 4500); // 4.5 seconds per step for slower reading
    return () => clearInterval(timer);
  }, [totalSteps]);

  const PhoneSVG = ({ mode = 'scan' }) => {
    return (
      <svg width={phoneW} height={phoneH} viewBox="0 0 50 100" fill="none" style={{ filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.6))' }}>
        <rect x="2" y="2" width="46" height="96" rx={isAndroid ? "4" : "8"} fill={isAndroid ? "#202124" : "#1c1c1e"} stroke={isAndroid ? "#5f6368" : "#48484a"} strokeWidth="1.5"/>
        {isIOS && !isAndroid && <path d="M 15 2 L 15 6 C 15 8 17 8 19 8 L 31 8 C 33 8 35 8 35 6 L 35 2 Z" fill="#000" />}
        {isAndroid && <rect x="10" y="93" width="30" height="1.5" rx="0.5" fill="#5f6368" opacity="0.6"/>}
        <circle cx="25" cy={isAndroid ? 8 : 5} r="1.5" fill={isAndroid ? "#000" : "#222"}/>
        
        {/* Screen Content */}
        <g>
          <rect x="5" y="15" width="40" height="75" fill="#000" />
          
          {mode === 'success' ? (
            <g>
              <rect x="5" y="15" width="40" height="75" fill="#0f1710" />
              <circle cx="25" cy="45" r="10" fill="#2ea043" />
              <path d="M 20 45 L 23 48 L 30 40" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <rect x="10" y="65" width="30" height="4" rx="2" fill="#2ea043" opacity="0.5" />
            </g>
          ) : (
            <g>
              {/* Modal UI Mockup */}
              <rect x="5" y="50" width="40" height="40" fill="#1c1c1e" rx="2" />
              <rect x="15" y="55" width="20" height="2" fill="#d4af37" rx="1" />
              
              {type === 'barcode' ? (
                <g>
                  {/* Viewfinder box inside phone UI */}
                  <rect x="10" y="62" width="30" height="20" fill="#333" rx="2" stroke="#d4af37" strokeWidth="1" />
                  <line x1="10" y1="72" x2="40" y2="72" stroke="#ff3b30" strokeWidth="1.5" filter="drop-shadow(0 0 1px #ff3b30)">
                    <animate attributeName="y1" values="62; 82; 62" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="y2" values="62; 82; 62" dur="2s" repeatCount="indefinite" />
                  </line>
                </g>
              ) : (
                <g>
                  <circle cx="25" cy="70" r="8" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.8" />
                  <circle cx="25" cy="70" r="1" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0">
                    <animate attributeName="r" values="1; 12" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1; 0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}
            </g>
          )}
        </g>
      </svg>
    );
  };

  const HandSVG = ({ side = 'right', flip = false }) => (
    <svg width="40" height="60" viewBox="0 0 40 60" fill="none" style={{
      position: 'absolute',
      [side]: '-15px',
      top: '50%',
      transform: `translateY(-50%) ${side === 'left' ? 'scaleX(-1)' : ''}`,
      zIndex: 5,
      transition: 'opacity 0.3s ease',
      opacity: flip ? 1 : 0
    }}>
      {/* Thumb overlapping front */}
      <path d="M40 20 C 25 20, 15 25, 15 35 C 15 45, 25 50, 40 50" fill="#dcb38f" stroke="#c0936f" strokeWidth="2"/>
      <path d="M18 35 C 18 32, 22 30, 26 30" stroke="#c0936f" strokeWidth="1" fill="none"/>
    </svg>
  );

  const BookGraphic = ({ showBack, highlightQr, isFlipping }) => (
    <div style={{
      position: 'relative',
      width: `${bookW}px`,
      height: `${bookH}px`,
      borderRadius: '3px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      transformStyle: 'preserve-3d',
      transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: showBack ? 'rotateY(-180deg)' : 'rotateY(0deg)',
      zIndex: 2
    }}>
      {/* Hands holding the book */}
      <HandSVG side="right" flip={isFlipping} />
      <HandSVG side="left" flip={isFlipping} />

      {/* Spine (visible during 3D flip) */}
      <div style={{
        position: 'absolute',
        left: '-10px',
        width: '20px',
        height: '100%',
        background: '#333',
        transform: 'rotateY(-90deg) translateZ(10px)',
        transformOrigin: 'right',
        borderLeft: '1px solid #111',
        borderRight: '1px solid #111'
      }}></div>

      {/* Front Face */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        backgroundImage: `url(${frontCoverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '3px',
        transform: 'translateZ(10px)'
      }}>
        {type === 'nfc' && (
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
        )}
      </div>

      {/* Back Face */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        backgroundImage: `url(${backCoverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '3px',
        transform: 'rotateY(180deg) translateZ(10px)'
      }}>
        {type === 'barcode' && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '50%',
            transform: 'translateX(50%)',
            width: isDesktop ? '32px' : '24px',
            height: isDesktop ? '15px' : '11px',
            backgroundColor: '#0c0f1d',
            border: highlightQr ? '1.5px solid #ff3b30' : '0.5px solid #d4af37',
            borderRadius: '1px',
            padding: '1px',
            boxShadow: highlightQr ? '0 0 12px #ff3b30' : '0 1px 3px rgba(0,0,0,0.4)',
            transition: 'all 0.5s ease',
            display: 'flex'
          }}>
            <div style={{ width: isDesktop ? '10px' : '8px', height: isDesktop ? '10px' : '8px', background: 'white', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
               <QrCode size={isDesktop ? 8 : 7} color="#000" strokeWidth={3} />
            </div>
            <div style={{ width: isDesktop ? '6px' : '4px', height: isDesktop ? '6px' : '4px', marginLeft: '1px', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: getLogoSvgString('golden').replace(/width="200"/g, 'width="100%"').replace(/height="200"/g, 'height="100%"') }} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: isDesktop ? '600px' : '360px', margin: '0 auto', textAlign: 'center', padding: '10px' }}>
      
      {/* Title Text dynamically based on step */}
      <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '8px', fontWeight: '600' }}>
        {type === 'barcode' ? (
          step === 1 ? <span>Step 1: Pick up <span style={{color: 'var(--accent)'}}>"{book?.title || 'Book'}"</span></span> :
          step === 2 ? 'Step 2: Flip to back cover' :
          step === 3 ? 'Step 3: Locate QR sticker' :
          'Step 4: Scan and checkout'
        ) : (
          step === 1 ? <span>Step 1: Pick up <span style={{color: 'var(--accent)'}}>"{book?.title || 'Book'}"</span></span> :
          step === 2 ? 'Step 2: Hold front cover facing you' :
          'Step 3: Tap phone on top left NFC logo'
        )}
      </h4>

      {/* Animation Stage */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: `${bookH + 80}px`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--surface-elevated)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(212, 175, 55, 0.2)'
      }}>
        
        {/* Step 1: Shelf Background (only visible in step 1) */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '40%',
          bottom: '10px',
          borderBottom: '12px solid #4a3b2c',
          opacity: step === 1 ? 1 : 0,
          transition: 'opacity 0.5s ease',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.5)'
        }}>
           {/* Shelf details */}
           <div style={{ position: 'absolute', bottom: '-12px', width: '100%', height: '4px', background: '#362a1f' }}></div>
        </div>

        {/* The Book (Center) */}
        <div style={{
          position: 'absolute',
          transform: step === 1 ? `translateY(15px) scale(0.7)` : 'translateY(0) scale(1)',
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <BookGraphic 
            showBack={type === 'barcode' && step >= 2} 
            highlightQr={type === 'barcode' && step >= 3} 
            isFlipping={type === 'barcode' && step === 2} 
          />
        </div>

        {/* The Phone (Slides in later) */}
        {(type === 'barcode' && step >= 4) || (type === 'nfc' && step === 3) ? (
          <div style={{
            position: 'absolute',
            zIndex: 10,
            left: '50%',
            top: '50%',
            transform: type === 'barcode' 
              ? `translate(-130%, -50%) rotate(5deg)`
              : (isIOS && !isAndroid ? `translate(-90%, -80%) rotate(20deg)` : `translate(-80%, -50%) rotate(10deg) skewX(10deg) scale(0.9)`),
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <PhoneSVG mode={step === (type === 'barcode' ? 4 : 3) && Math.floor(Date.now() / 1000) % 2 === 0 ? 'success' : 'scan'} />
          </div>
        ) : null}

        {/* Zoomed Sticker for QR Step 3/4 */}
        {type === 'barcode' && step >= 3 && (
          <div className="animate-fade-in" style={{
            position: 'absolute',
            right: isDesktop ? '15%' : '5%',
            zIndex: 5
          }}>
            {/* Dotted Line Connection */}
            {step === 4 && (
               <svg style={{ position: 'absolute', left: '-120px', top: '20px', width: '120px', height: '100px', overflow: 'visible', zIndex: -1 }}>
                 <path d="M 0,-10 C 60,-10 60,0 120,0" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4">
                   <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
                 </path>
               </svg>
            )}
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              width: isDesktop ? '120px' : '85px',
              height: isDesktop ? '56px' : '40px',
              backgroundColor: '#0c0f1d',
              border: '1.5px solid #d4af37',
              borderRadius: '3px',
              padding: isDesktop ? '4px' : '3px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
            }}>
              <div style={{ width: isDesktop ? '36px' : '26px', height: isDesktop ? '36px' : '26px', background: 'white', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                 <QrCode size={isDesktop ? 30 : 22} color="#000" strokeWidth={2} />
              </div>
              <div style={{ width: isDesktop ? '20px' : '14px', height: isDesktop ? '20px' : '14px', marginLeft: '4px', flexShrink: 0, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: getLogoSvgString('golden').replace(/width="200"/g, 'width="100%"').replace(/height="200"/g, 'height="100%"') }} />
              <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '4px', color: '#d4af37', flexGrow: 1 }}>
                <div style={{ fontSize: isDesktop ? '9px' : '6.5px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Royal</div>
                <div style={{ fontSize: isDesktop ? '9px' : '6.5px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Book</div>
                <div style={{ fontSize: isDesktop ? '9px' : '6.5px', lineHeight: '1.1', fontFamily: 'Georgia, serif' }}>Club</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} onClick={() => setStep(i + 1)} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: step === i + 1 ? 'var(--accent)' : 'rgba(212,175,55,0.3)',
            cursor: 'pointer',
            transition: 'background 0.3s ease'
          }}></div>
        ))}
      </div>
    </div>
  );
};

export default AnimatedScannerHelper;
