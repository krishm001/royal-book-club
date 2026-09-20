import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ChevronDown, ChevronUp, CheckCircle2, ArrowRight } from 'lucide-react';
import './InteractiveHelpGuide.css';

const PhoneScreenshot = ({ imageUrl }) => (
  <div className="phone-mockup">
    <div className="phone-notch"></div>
    <div className="phone-screen">
      <img src={imageUrl} alt="App screenshot" />
    </div>
  </div>
);

const DATA = {
  stage1: {
    title: 'helpGuide.megaStage1',
    fallback: 'Getting Ready',
    description: 'Find your book and get ready to check it out.',
    paths: {
      nfc: {
        id: 'nfc',
        label: 'Tap NFC (Recommended)',
        desc: 'Unlock your phone and tap it against the gold NFC badge on the book cover. No app needed! The book detail page will open instantly.',
        screenshot: '/help-screenshots/08_book_detail_nfc_instant.png'
      },
      qr: {
        id: 'qr',
        label: 'Scan QR Code',
        desc: 'Open your camera and scan the QR code on the back of the book.',
        screenshot: '/help-screenshots/07_book_detail_page.png'
      },
      top_scanner: {
        id: 'top_scanner',
        label: 'Top Scanner (In App)',
        desc: 'Open the website, go to the Study tab, and click the scanner icon at the top.',
        screenshot: '/help-screenshots/09_scanner_modal_nfc.png'
      },
      book_card: {
        id: 'book_card',
        label: 'Browse & Checkout',
        desc: 'Browse the digital catalog, find your book, and click the checkout icon on the card.',
        screenshot: '/help-screenshots/16_book_card_highlight.png'
      }
    }
  },
  stage2: {
    title: 'helpGuide.megaStage2',
    fallback: 'Sign In & Profile Setup',
    description: 'If you are not already signed in with a complete profile.',
    paths: {
      new_user: {
        id: 'new_user',
        label: 'New User (Sign Up)',
        desc: 'Sign up with Google (recommended) or email. You will need to verify your email, accept the terms, and provide your phone number.',
        screenshot: '/help-screenshots/03_onboarding_signup.png'
      },
      returning: {
        id: 'returning',
        label: 'Returning User (Login)',
        desc: 'Sign in to your account. If any mandatory information is missing, you will be prompted to complete it.',
        screenshot: '/help-screenshots/02_onboarding_signin.png'
      },
      signed_in: {
        id: 'signed_in',
        label: 'Already Signed In',
        desc: 'If you are already signed in with a complete profile, this step is skipped entirely!',
        screenshot: '/help-screenshots/01_catalog_page.png'
      }
    }
  },
  stage3: {
    title: 'helpGuide.megaStage3',
    fallback: 'Execute Checkout / Return',
    description: 'Finalize the process and get your Gatepass.',
    paths: {
      instant: {
        id: 'instant',
        label: 'Instant Checkout (from NFC)',
        desc: 'Since you tapped NFC, just click the Instant Checkout button. A processing popup with a literary quote appears, followed by your Gatepass!',
        screenshot: '/help-screenshots/17_checkout_in_progress.png'
      },
      standard: {
        id: 'standard',
        label: 'Standard Checkout (Scanner)',
        desc: 'Tap your NFC badge or scan the QR code in the scanner popup. Then receive your Gatepass.',
        screenshot: '/help-screenshots/09_scanner_modal_nfc.png'
      },
      top_scanner_p2d: {
        id: 'top_scanner_p2d',
        label: 'Checkout via Top Scanner',
        desc: 'After scanning, confirm the book details in the popup, then complete the checkout.',
        screenshot: '/help-screenshots/15_top_scanner_p2d.png'
      },
      return_gps: {
        id: 'return_gps',
        label: 'Return via GPS',
        desc: 'Click Return on your active loan. Stand in the library and allow location access to automatically verify your return.',
        screenshot: '/help-screenshots/14_return_success.png'
      },
      return_qr: {
        id: 'return_qr',
        label: 'Return via Validator QR',
        desc: 'If GPS fails, scan the Validator QR placard at the library desk to complete your return.',
        screenshot: '/help-screenshots/13_return_scanner.png'
      }
    }
  }
};

export default function InteractiveHelpGuide() {
  const { t } = useLanguage();
  const [activeStage, setActiveStage] = useState(1);
  const [selectedPaths, setSelectedPaths] = useState({
    stage1: 'nfc',
    stage2: 'new_user',
    stage3: 'instant'
  });
  const [expandedBranches, setExpandedBranches] = useState({
    stage1: false,
    stage2: false,
    stage3: false
  });

  const handleSelectPath = (stageId, pathId) => {
    setSelectedPaths(prev => ({ ...prev, [stageId]: pathId }));
    setExpandedBranches(prev => ({ ...prev, [stageId]: false }));
  };

  const toggleBranches = (stageId) => {
    setExpandedBranches(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const nextStage = () => {
    if (activeStage < 3) setActiveStage(activeStage + 1);
  };

  const renderStage = (stageNum, stageKey) => {
    const stageData = DATA[stageKey];
    const currentPathId = selectedPaths[stageKey];
    const currentPath = stageData.paths[currentPathId];
    const isActive = activeStage === stageNum;
    const isCompleted = activeStage > stageNum;

    return (
      <div className={`mega-stage-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`} key={stageKey}>
        <div className="mega-stage-indicator">
          <div className="stage-number">{isCompleted ? <CheckCircle2 size={16} /> : stageNum}</div>
          {stageNum < 3 && <div className="stage-line"></div>}
        </div>
        
        <div className="mega-stage-content">
          <div 
            className="mega-stage-header" 
            onClick={() => setActiveStage(stageNum)}
          >
            <h3>{t(stageData.title, stageData.fallback)}</h3>
            <p>{stageData.description}</p>
          </div>

          {isActive && (
            <div className="mega-stage-body animate-fade-in">
              <div className="active-path-card">
                <div className="path-text">
                  <h4>{currentPath.label}</h4>
                  <p>{currentPath.desc}</p>
                  
                  {stageNum < 3 && (
                    <button className="royal-btn next-stage-btn" onClick={nextStage}>
                      {t('helpGuide.nextStage', 'Continue')} <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                <div className="path-visual">
                  <PhoneScreenshot imageUrl={currentPath.screenshot} />
                </div>
              </div>

              <div className="branch-expander">
                <button onClick={() => toggleBranches(stageKey)} className="branch-toggle-btn">
                  {expandedBranches[stageKey] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {t('helpGuide.otherWays', 'Other ways to do this')}
                </button>
                
                {expandedBranches[stageKey] && (
                  <div className="branch-options animate-fade-in">
                    {Object.values(stageData.paths).map(path => (
                      path.id !== currentPathId && (
                        <button 
                          key={path.id} 
                          className="branch-btn"
                          onClick={() => handleSelectPath(stageKey, path.id)}
                        >
                          <div className="branch-info">
                            <h5>{path.label}</h5>
                            <p>{path.desc}</p>
                          </div>
                        </button>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="interactive-help-guide">
      <div className="mega-stage-rail">
        {renderStage(1, 'stage1')}
        {renderStage(2, 'stage2')}
        {renderStage(3, 'stage3')}
      </div>
    </div>
  );
}
