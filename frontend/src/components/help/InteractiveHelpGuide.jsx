import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ChevronDown, ChevronUp, CheckCircle2, ArrowRight } from 'lucide-react';
import HelpSceneAnimation from './HelpSceneAnimation';
import './InteractiveHelpGuide.css';

const PhoneScreenshot = ({ imageUrl }) => (
  <div className="phone-mockup final-state-mockup">
    <div className="phone-notch"></div>
    <div className="phone-screen">
      <img src={imageUrl} alt="Final State Screenshot" />
    </div>
  </div>
);

const DATA = {
  stage1: {
    title: 'helpGuide.megaStage1',
    fallback: 'Stage 1: Getting Ready',
    description: 'Find your book and get ready to check it out.',
    paths: {
      nfc: {
        id: 'nfc',
        label: 'Tap NFC (Recommended)',
        desc: 'Unlock your phone and tap it against the gold NFC badge on the book cover.',
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
    fallback: 'Stage 2: Sign In & Profile Setup',
    description: 'Create an account and complete your profile.',
    paths: {
      new_user: {
        id: 'new_user',
        label: 'New User (Sign Up)',
        desc: 'Sign up with Google (recommended) or email. Verify your email, accept terms, and provide your phone number.',
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
    fallback: 'Stage 3: Execute Checkout / Return',
    description: 'Finalize the transaction.',
    paths: {
      instant: {
        id: 'instant',
        label: 'Instant Checkout (from NFC)',
        desc: 'Click the Instant Checkout button. A processing popup appears, followed by success!',
        screenshot: '/help-screenshots/17_checkout_in_progress.png'
      },
      standard: {
        id: 'standard',
        label: 'Standard Checkout (Scanner)',
        desc: 'Tap your NFC badge or scan the QR code in the scanner popup.',
        screenshot: '/help-screenshots/09_scanner_modal_nfc.png'
      },
      top_scanner_p2d: {
        id: 'top_scanner_p2d',
        label: 'Checkout via Top Scanner',
        desc: 'After scanning, confirm the book details in the popup, then complete the checkout.',
        screenshot: '/help-screenshots/19_p2d_confirmation.png'
      },
      return_gps: {
        id: 'return_gps',
        label: 'Return via GPS',
        desc: 'Stand in the library and allow location access to automatically verify your return.',
        screenshot: '/help-screenshots/14_return_success.png'
      },
      return_qr: {
        id: 'return_qr',
        label: 'Return via Validator QR',
        desc: 'If GPS fails, scan the Validator QR placard at the library desk.',
        screenshot: '/help-screenshots/13_return_scanner.png'
      }
    }
  },
  stage4: {
    title: 'helpGuide.megaStage4',
    fallback: 'Stage 4: View Gatepass',
    description: 'Walk out the door with your Gatepass.',
    paths: {
      gatepass: {
        id: 'gatepass',
        label: 'Show Gatepass',
        desc: 'Click "View Gatepass" and present the barcode at the library exit scanner.',
        screenshot: '/help-screenshots/12_gatepass_page.png'
      }
    }
  }
};

export default function InteractiveHelpGuide() {
  const { t } = useLanguage();
  const [activeStage, setActiveStage] = useState(1);
  const guideRef = useRef(null);

  const [selectedPaths, setSelectedPaths] = useState({
    stage1: 'nfc',
    stage2: 'new_user',
    stage3: 'instant',
    stage4: 'gatepass'
  });
  const [expandedBranches, setExpandedBranches] = useState({
    stage1: false,
    stage2: false,
    stage3: false,
    stage4: false
  });

  // Auto-scroll on mount
  useEffect(() => {
    if (guideRef.current) {
      setTimeout(() => {
        guideRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, []);

  const handleSelectPath = (stageId, pathId) => {
    setSelectedPaths(prev => ({ ...prev, [stageId]: pathId }));
    setExpandedBranches(prev => ({ ...prev, [stageId]: false }));
  };

  const toggleBranches = (stageId) => {
    setExpandedBranches(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const nextStage = () => {
    if (activeStage < 4) setActiveStage(activeStage + 1);
  };

  const renderStage = (stageNum, stageKey) => {
    const stageData = DATA[stageKey];
    const currentPathId = selectedPaths[stageKey];
    const currentPath = stageData.paths[currentPathId];
    const isActive = activeStage === stageNum;
    const isCompleted = activeStage > stageNum;

    const hasOtherWays = Object.keys(stageData.paths).length > 1;

    return (
      <div className={`mega-stage-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`} key={stageKey}>
        <div className="mega-stage-indicator">
          <div className="stage-number" onClick={() => setActiveStage(stageNum)} style={{ cursor: 'pointer' }}>
            {isCompleted ? <CheckCircle2 size={16} /> : stageNum}
          </div>
          {stageNum < 4 && <div className="stage-line"></div>}
        </div>
        
        <div className="mega-stage-content">
          {/* We hide the header text when active, because HelpSceneAnimation takes over showing the heading! */}
          {!isActive && (
            <div className="mega-stage-header collapsed" onClick={() => setActiveStage(stageNum)}>
              <h3>{t(stageData.title, stageData.fallback)}</h3>
              <p>{stageData.description}</p>
            </div>
          )}

          {isActive && (
            <div className="mega-stage-body animate-fade-in">
              <div className="active-path-card split-layout">
                <div className="path-video-pane">
                  {/* The animation frame with integrated headings */}
                  <HelpSceneAnimation 
                    activeStage={stageNum} 
                    selectedPath={currentPathId} 
                    headingText={t(stageData.title, stageData.fallback)}
                  />
                  
                  {stageNum < 4 && (
                    <button className="royal-btn next-stage-btn" onClick={nextStage}>
                      {t('helpGuide.nextStage', 'Continue to next step')} <ArrowRight size={16} />
                    </button>
                  )}
                </div>

                <div className="path-screenshot-pane">
                  <div className="screenshot-label">{t('helpGuide.finalState', 'Final State')}</div>
                  <PhoneScreenshot imageUrl={currentPath.screenshot} />
                  <div className="screenshot-desc">
                    <strong>{currentPath.label}</strong>
                    <p>{currentPath.desc}</p>
                  </div>
                </div>
              </div>

              {hasOtherWays && (
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
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="interactive-help-guide" ref={guideRef}>
      <div className="mega-stage-rail">
        {renderStage(1, 'stage1')}
        {renderStage(2, 'stage2')}
        {renderStage(3, 'stage3')}
        {renderStage(4, 'stage4')}
      </div>
    </div>
  );
}
