import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import ContinuousScannerAnimation from '../shared/ContinuousScannerAnimation';
import './HelpSceneAnimation.css';

const HelpSceneAnimation = ({ activeStage, selectedPath, isMobile, headingText }) => {
  const { t } = useLanguage();

  // STAGE 1: Getting Ready
  // We use the continuous scanner animation, which matches the real checkout experience.
  const renderStage1 = () => {
    let type = 'barcode';
    if (selectedPath === 'nfc' || selectedPath === 'top_scanner') type = 'nfc';
    
    // We can render ContinuousScannerAnimation
    return (
      <div className="help-scene-inner scale-wrapper stage1-wrapper">
        <ContinuousScannerAnimation type={type} action="checkout" />
      </div>
    );
  };

  // STAGE 2: Sign In & Setup
  // We will build a simple CSS animation simulating the onboarding flow.
  const renderStage2 = () => {
    return (
      <div className="help-scene-inner stage2-wrapper">
        <div className="onboarding-simulator">
           <div className="sim-phone">
              <div className="sim-notch"></div>
              
              {/* Sequence of screens */}
              <div className="sim-screens-container">
                 <div className="sim-screen signin-screen">
                    <h4>{t('Sign In')}</h4>
                    <div className="sim-btn google">{t('Continue with Google')}</div>
                    <div className="sim-btn email">{t('Continue with Email')}</div>
                 </div>
                 <div className="sim-screen email-verification">
                    <div className="inbox-header">{t('Email Inbox')}</div>
                    <div className="email-card">
                       <strong>From:</strong> noreply@royal-book-club.firebaseapp.com<br/>
                       <strong>Subject:</strong> Verify your email for Royal Book Club<br/><br/>
                       {t('Follow this link to verify your email address.')}
                       <div className="verify-link">{t('Verify Email')}</div>
                    </div>
                 </div>
                 <div className="sim-screen profile-setup">
                    <h4>{t('Profile Setup')}</h4>
                    <div className="sim-input phone"></div>
                    <div className="sim-input location"></div>
                    <div className="sim-btn complete">{t('Complete Setup')}</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  // STAGE 3: Execute Checkout / Return
  const renderStage3 = () => {
    // If it's a standard scanner, we show ContinuousScannerAnimation again but maybe it's too repetitive?
    // User requested: "Stage 3... should show Executing Instant Royal Checkout popup with quotes... Standard Scanner also should show video of all transiting popups"
    if (selectedPath === 'instant') {
      return (
        <div className="help-scene-inner stage3-wrapper">
           <div className="sim-popup processing-popup">
              <div className="sim-spinner"></div>
              <h4>{t('Executing Instant Royal Checkout...')}</h4>
              <p className="sim-quote">"A word, deeply read, becomes conviction..."</p>
           </div>
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
