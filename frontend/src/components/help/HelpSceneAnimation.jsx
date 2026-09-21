import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import ContinuousScannerAnimation from '../shared/ContinuousScannerAnimation';
import './HelpSceneAnimation.css';

const HelpSceneAnimation = ({ activeStage, selectedPath, isMobile, headingText }) => {
  const { t } = useLanguage();
  const [localTime, setLocalTime] = useState(0);

  // Global 20s clock sync to match ContinuousScannerAnimation (which loops every 20s based on Date.now())
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTime(Date.now() % 20000);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = (localTime / 20000) * 100;

  // STAGE 1: Getting Ready
  const renderStage1 = () => {
    let type = 'barcode';
    if (selectedPath === 'nfc' || selectedPath === 'top_scanner') type = 'nfc';
    
    // In the last 4 seconds of the 20s loop (16s to 20s), we overlay the zoomed final state
    const showZoomedFinal = localTime > 16000;
    const finalImage = selectedPath === 'new_user' || selectedPath === 'nfc' ? '03_onboarding_signup.png' : '08_book_detail_nfc_instant.png';

    return (
      <div className="help-scene-inner scale-wrapper stage1-wrapper">
        <ContinuousScannerAnimation type={type} action="checkout" />
        
        {/* The enlarged final state overlay */}
        <div className={`final-state-overlay ${showZoomedFinal ? 'visible' : ''}`}>
           <div className="zoomed-phone-frame">
              <img src={`/help-screenshots/${finalImage}`} alt="Final State" />
              {showZoomedFinal && (
                <div className="fake-cursor cursor-click-transition"></div>
              )}
           </div>
        </div>
      </div>
    );
  };

  // STAGE 2: Sign In & Setup
  const renderStage2 = () => {
    // 20 second loop for stage 2 screenshots
    // 0-4s: Options
    // 4-8s: Email Verification Mock
    // 8-12s: Verification Pending
    // 12-16s: Covenant
    // 16-20s: Profile Setup & Click
    let currentImg = 'stage2_1_options.png';
    let showClick = false;
    let mockEmail = false;

    if (localTime > 4000 && localTime <= 7000) {
      mockEmail = true;
    } else if (localTime > 7000 && localTime <= 10000) {
      currentImg = 'stage2_3_verification.png';
    } else if (localTime > 10000 && localTime <= 14000) {
      currentImg = 'stage2_4_covenant.png';
    } else if (localTime > 14000) {
      currentImg = 'stage2_5_profile.png';
      if (localTime > 18000) showClick = true;
    }

    return (
      <div className="help-scene-inner stage2-wrapper">
        <div className="sim-phone real-screenshots">
           <div className="sim-notch"></div>
           
           {!mockEmail ? (
             <img src={`/help-screenshots/${currentImg}`} className="screen-img" alt="Onboarding Step" />
           ) : (
             <div className="sim-screen email-verification-override">
                <div className="inbox-header">Google Mail</div>
                <div className="email-card">
                   <strong>From:</strong> noreply@royal-book-club.firebaseapp.com<br/>
                   <strong>Subject:</strong> Verify your email for Royal Book Club<br/><br/>
                   {t('Follow this link to verify your email address.')}
                   <div className="verify-link">{t('Verify Email')}</div>
                </div>
             </div>
           )}

           {showClick && <div className="fake-cursor cursor-click-complete"></div>}
        </div>
      </div>
    );
  };

  // STAGE 3: Execute Checkout / Return
  const renderStage3 = () => {
    if (selectedPath === 'instant') {
      return (
        <div className="help-scene-inner stage3-wrapper">
           <div className="sim-popup processing-popup">
              <div className="sim-spinner"></div>
              <h4>{t('Executing Instant Royal Checkout...')}</h4>
              <p className="sim-quote">"A word, deeply read, becomes conviction..."</p>
           </div>
           {localTime > 17000 && <div className="fake-cursor cursor-click-transition"></div>}
        </div>
      );
    }
    
    let type = 'barcode';
    if (selectedPath === 'standard' || selectedPath === 'return_nfc') type = 'nfc';
    
    return (
      <div className="help-scene-inner scale-wrapper stage3-wrapper">
        <ContinuousScannerAnimation type={type} action={selectedPath.startsWith('return') ? 'return' : 'checkout'} />
      </div>
    );
  };

  // STAGE 4: Gatepass
  const renderStage4 = () => {
    return (
      <div className="help-scene-inner stage4-wrapper">
         <div className="sim-phone">
            <div className="sim-notch"></div>
            <div className="gatepass-ticket">
               <h3>{t('Security Gatepass')}</h3>
               <div className="sim-barcode"></div>
               <div className="sim-btn green">{t('Valid to exit')}</div>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className={`help-scene-wrapper ${isMobile ? 'mobile' : 'desktop'}`}>
      <div className="scene-header">
        <h2>{headingText || t(`STAGE ${activeStage}`)}</h2>
        <div className="timeline-bar" style={{ width: `${progressPercent}%` }}></div>
      </div>
      <div className="scene-content">
        {activeStage === 1 && renderStage1()}
        {activeStage === 2 && renderStage2()}
        {activeStage === 3 && renderStage3()}
        {activeStage === 4 && renderStage4()}
      </div>
    </div>
  );
};

export default HelpSceneAnimation;
