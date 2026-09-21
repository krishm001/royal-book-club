import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import ContinuousScannerAnimation from '../shared/ContinuousScannerAnimation';
import './HelpSceneAnimation.css';

/**
 * HelpSceneAnimation — Video pane for the Interactive Help Guide.
 *
 * Renders a looping 20-second animation for each stage/path combination.
 * Uses ContinuousScannerAnimation for physical scan scenes, and real
 * screenshots (cycled inside a phone frame) for app-only flows.
 *
 * Path IDs come from InteractiveHelpGuide.jsx DATA object:
 *   Stage 1: 'nfc' | 'qr' | 'top_scanner' | 'book_card'
 *   Stage 2: 'new_user' | 'returning' | 'signed_in'
 *   Stage 3: 'instant' | 'standard' | 'top_scanner_p2d' | 'return_gps' | 'return_qr'
 *   Stage 4: 'gatepass'
 */
const HelpSceneAnimation = ({ activeStage, selectedPath, isMobile, headingText }) => {
  const { t } = useLanguage();
  const [localTime, setLocalTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setLocalTime(Date.now() % 20000), 100);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = (localTime / 20000) * 100;

  // ─── STAGE 1: Getting Ready ───────────────────────────────────────
  const renderStage1 = () => {
    // Map each path to its correct final-state screenshot (files that EXIST)
    const finalImageMap = {
      nfc: '08_book_detail_nfc_instant.png',       // Book detail with Instant NFC Checkout button
      qr: '07_book_detail_page.png',               // Book detail page (standard checkout)
      top_scanner: '15_top_scanner_p2d.png',        // Scanner modal from top scanner
      book_card: '16_book_card_highlight.png',      // Book card with checkout button highlighted
    };
    const finalImage = finalImageMap[selectedPath] || '08_book_detail_nfc_instant.png';

    const showZoomedFinal = localTime > 16000;

    // For 'top_scanner' and 'book_card', the user navigates via the app (no physical book).
    // Show real screenshots cycling inside a phone frame instead of CSS mockups.
    if (selectedPath === 'top_scanner' || selectedPath === 'book_card') {
      // Sequence of real screenshots showing the app navigation
      const screenshotSequence = selectedPath === 'top_scanner'
        ? [
            { img: '01_catalog_page.png', label: t('Open the website') },
            { img: '09_scanner_modal_nfc.png', label: t('Click Scan / Tap NFC button') },
          ]
        : [
            { img: '01_catalog_page.png', label: t('Browse the catalog') },
            { img: '16_book_card_highlight.png', label: t('Find your book and click checkout') },
          ];

      // Split 16 seconds across the screenshots (last 4s reserved for zoom)
      const segmentDuration = 16000 / screenshotSequence.length;
      const currentIdx = Math.min(
        Math.floor(localTime / segmentDuration),
        screenshotSequence.length - 1
      );
      const current = screenshotSequence[currentIdx];

      return (
        <div className="help-scene-inner stage1-ui-wrapper">
          <div className="screenshot-phone-wrapper">
            <div className="sim-phone real-screenshots">
              <div className="sim-notch"></div>
              <img
                src={`/help-screenshots/${current.img}`}
                className="screen-img"
                alt={current.label}
              />
            </div>
            <div className="screenshot-step-label">{current.label}</div>
          </div>

          {/* Zoomed final state overlay in last 4 seconds */}
          <div className={`final-state-overlay ${showZoomedFinal ? 'visible' : ''}`}>
            <div className="zoomed-phone-frame">
              <img src={`/help-screenshots/${finalImage}`} alt="Final State" />
              <div className="fake-cursor cursor-click-transition"></div>
            </div>
          </div>
        </div>
      );
    }

    // For 'nfc' and 'qr', user physically interacts with the book → 3D scanner animation
    const type = selectedPath === 'qr' ? 'barcode' : 'nfc';

    return (
      <div className="help-scene-inner scale-wrapper stage1-wrapper">
        <ContinuousScannerAnimation type={type} action="checkout" />

        {/* Zoomed final state overlay in last 4 seconds */}
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

  // ─── STAGE 2: Sign In & Profile Setup ─────────────────────────────
  const renderStage2 = () => {
    // Path-aware: different sequences for different user states
    if (selectedPath === 'signed_in') {
      // Already signed in — step is skipped
      return (
        <div className="help-scene-inner stage2-wrapper">
          <div className="skip-message">
            <div className="skip-icon">✓</div>
            <h4>{t('Already Signed In')}</h4>
            <p>{t('This step is automatically skipped when you are already logged in with a complete profile.')}</p>
          </div>
        </div>
      );
    }

    if (selectedPath === 'returning') {
      // Returning user — simpler login flow
      // Use existing screenshots: sign-in screen → profile (if needed)
      const sequence = [
        { img: '02_onboarding_signin.png', duration: 10000 },
        { img: '06_onboarding_profile.png', duration: 10000 },
      ];

      let elapsed = 0;
      let currentImg = sequence[0].img;
      for (const step of sequence) {
        if (localTime < elapsed + step.duration) {
          currentImg = step.img;
          break;
        }
        elapsed += step.duration;
        currentImg = step.img;
      }

      return (
        <div className="help-scene-inner stage2-wrapper">
          <div className="sim-phone real-screenshots">
            <div className="sim-notch"></div>
            <img src={`/help-screenshots/${currentImg}`} className="screen-img" alt="Login Step" />
          </div>
        </div>
      );
    }

    // New User — full signup flow with real screenshots
    // Sequence: Sign-up options → Email verification sim → Terms → Profile
    const sequence = [
      { img: '03_onboarding_signup.png', endMs: 4000 },   // Sign-up options
      { type: 'email_sim', endMs: 8000 },                  // Email verification simulation
      { img: '04_onboarding_terms.png', endMs: 12000 },    // Covenant / Terms
      { img: '06_onboarding_profile.png', endMs: 20000 },  // Profile setup
    ];

    let currentStep = sequence[0];
    for (const step of sequence) {
      if (localTime < step.endMs) {
        currentStep = step;
        break;
      }
    }

    const showClick = localTime > 18000;

    return (
      <div className="help-scene-inner stage2-wrapper">
        <div className="sim-phone real-screenshots">
          <div className="sim-notch"></div>
          {currentStep.type === 'email_sim' ? (
            <div className="sim-screen email-verification-override">
              <div className="inbox-header">
                <span className="inbox-icon">✉</span> Email Inbox
              </div>
              <div className="email-card">
                <strong>From:</strong> noreply@royal-book-club.firebaseapp.com<br/>
                <strong>Subject:</strong> Verify your email for Royal Book Club<br/><br/>
                {t('Follow this link to verify your email address.')}
                <div className="verify-link">{t('Verify Email')}</div>
              </div>
            </div>
          ) : (
            <img
              src={`/help-screenshots/${currentStep.img}`}
              className="screen-img"
              alt="Onboarding Step"
            />
          )}
          {showClick && <div className="fake-cursor cursor-click-complete"></div>}
        </div>
      </div>
    );
  };

  // ─── STAGE 3: Execute Checkout / Return ───────────────────────────
  const renderStage3 = () => {
    // Instant NFC checkout — no scanner needed, just the processing popup
    if (selectedPath === 'instant') {
      return (
        <div className="help-scene-inner stage3-wrapper">
          <div className="sim-popup processing-popup">
            <div className="sim-spinner"></div>
            <h4>{t('Executing Instant Royal Checkout...')}</h4>
            <p className="sim-quote">&ldquo;A word, deeply read, becomes conviction...&rdquo;</p>
          </div>
          {localTime > 17000 && <div className="fake-cursor cursor-click-transition"></div>}
        </div>
      );
    }

    // Top Scanner P2D — show the confirmation popup screenshot sequence
    if (selectedPath === 'top_scanner_p2d') {
      const showConfirm = localTime > 10000;
      return (
        <div className="help-scene-inner stage3-wrapper">
          <div className="sim-phone real-screenshots">
            <div className="sim-notch"></div>
            <img
              src={`/help-screenshots/${showConfirm ? '19_p2d_confirmation.png' : '09_scanner_modal_nfc.png'}`}
              className="screen-img"
              alt="Scanner then Confirm"
            />
          </div>
        </div>
      );
    }

    // Return via GPS — show success screen
    if (selectedPath === 'return_gps') {
      return (
        <div className="help-scene-inner stage3-wrapper">
          <div className="sim-phone real-screenshots">
            <div className="sim-notch"></div>
            <img
              src={`/help-screenshots/${localTime > 10000 ? '14_return_success.png' : '07_book_detail_page.png'}`}
              className="screen-img"
              alt="Return via GPS"
            />
          </div>
        </div>
      );
    }

    // Return via QR — use the scanner animation in return mode
    if (selectedPath === 'return_qr') {
      return (
        <div className="help-scene-inner scale-wrapper stage3-wrapper">
          <ContinuousScannerAnimation type="barcode" action="return" />
        </div>
      );
    }

    // Standard checkout (scanner popup) — use the 3D scanner animation
    // selectedPath === 'standard'
    return (
      <div className="help-scene-inner scale-wrapper stage3-wrapper">
        <ContinuousScannerAnimation type="nfc" action="checkout" />
      </div>
    );
  };

  // ─── STAGE 4: Gatepass ────────────────────────────────────────────
  const renderStage4 = () => (
    <div className="help-scene-inner stage4-wrapper">
      <div className="sim-phone real-screenshots">
        <div className="sim-notch"></div>
        <img
          src="/help-screenshots/12_gatepass_page.png"
          className="screen-img"
          alt="Security Gatepass"
        />
      </div>
    </div>
  );

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
