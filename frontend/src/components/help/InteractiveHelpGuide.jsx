import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BookOpen, Smartphone, QrCode, Wifi, Key, CheckCircle2, ArrowRight, ArrowLeft, RotateCcw, User, LogIn, UserPlus, MapPin, Star, Clock, ChevronRight, Search } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ContinuousScannerAnimation from '../shared/ContinuousScannerAnimation';
import './InteractiveHelpGuide.css';

// --- Scene definitions ---
const SCENES = {
  // ============ ENTRY ============
  welcome: {
    id: 'welcome',
    title: 'helpGuide.welcomeTitle',
    titleFallback: 'Welcome to the Royal Book Club',
    subtitle: 'helpGuide.welcomeSubtitle',
    subtitleFallback: 'Want to quick checkout or browse the digital catalog?',
    animationType: 'welcome',
    autoAdvance: null,
    branches: [
      { id: 'checkout', label: 'helpGuide.checkout', fallback: 'Quick Checkout (NFC/QR)', icon: 'Wifi', targetScene: 'pickup', highlight: true },
      { id: 'browse', label: 'helpGuide.browse', fallback: 'Browse Digital Catalog', icon: 'Search', targetScene: 'browse_catalog' },
      { id: 'return', label: 'helpGuide.return', fallback: 'Return a Book', icon: 'RotateCcw', targetScene: 'return_start' },
    ],
  },

  // ============ BROWSE CATALOG FLOW ============
  browse_catalog: {
    id: 'browse_catalog',
    title: 'helpGuide.browseCatalogTitle',
    titleFallback: 'Browse the Digital Catalog',
    subtitle: 'helpGuide.browseCatalogSubtitle',
    subtitleFallback: 'Explore the library\'s collection directly on your phone. How would you like to checkout?',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/01_catalog_page.png',
    branches: [
      { id: 'top_scanner', label: 'helpGuide.topScanner', fallback: 'Use Top Scanner', icon: 'Smartphone', targetScene: 'top_scanner' },
      { id: 'book_card', label: 'helpGuide.bookCard', fallback: 'From a Book Card', icon: 'BookOpen', targetScene: 'book_card' },
      { id: 'book_detail', label: 'helpGuide.bookDetail', fallback: 'From Book Details', icon: 'ChevronRight', targetScene: 'book_detail' },
    ],
  },
  
  top_scanner: {
    id: 'top_scanner',
    title: 'helpGuide.topScannerTitle',
    titleFallback: 'Top Scanner Checkout',
    subtitle: 'helpGuide.topScannerSubtitle',
    subtitleFallback: 'Tap the scanner icon at the top of the catalog. Scan your book, and confirm checkout instantly.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/15_top_scanner_p2d.png',
    autoAdvance: { targetScene: 'auth_check_browse', delay: 8000 },
    branches: [
      { id: 'next', label: 'helpGuide.next', fallback: 'Next →', icon: 'ArrowRight', targetScene: 'auth_check_browse', highlight: true },
    ],
  },
  
  book_card: {
    id: 'book_card',
    title: 'helpGuide.bookCardTitle',
    titleFallback: 'Book Card Checkout',
    subtitle: 'helpGuide.bookCardSubtitle',
    subtitleFallback: 'Find a book in the catalog and click the "Checkout" button directly on its card.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/16_book_card_highlight.png',
    autoAdvance: { targetScene: 'scanner_modal', delay: 8000 },
    branches: [
      { id: 'next', label: 'helpGuide.next', fallback: 'Verify Physical Book →', icon: 'ArrowRight', targetScene: 'scanner_modal', highlight: true },
    ],
  },
  
  book_detail: {
    id: 'book_detail',
    title: 'helpGuide.bookDetailTitle',
    titleFallback: 'Book Detail Checkout',
    subtitle: 'helpGuide.bookDetailSubtitle',
    subtitleFallback: 'Read the summary, reviews, and details. Then click the Checkout button at the bottom of the screen.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/07_book_detail_page.png',
    autoAdvance: { targetScene: 'scanner_modal', delay: 8000 },
    branches: [
      { id: 'next', label: 'helpGuide.next', fallback: 'Verify Physical Book →', icon: 'ArrowRight', targetScene: 'scanner_modal', highlight: true },
    ],
  },
  
  scanner_modal: {
    id: 'scanner_modal',
    title: 'helpGuide.scannerModalTitle',
    titleFallback: 'Verify Physical Presence',
    subtitle: 'helpGuide.scannerModalSubtitle',
    subtitleFallback: 'The app needs to verify you physically have the book. A scanner popup will appear.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/09_scanner_modal_nfc.png',
    branches: [
      { id: 'next', label: 'helpGuide.next', fallback: 'Next →', icon: 'ArrowRight', targetScene: 'auth_check_browse', highlight: true },
    ],
  },
  
  auth_check_browse: {
    id: 'auth_check_browse',
    title: 'helpGuide.qrAuthCheckTitle',
    titleFallback: 'Almost Done!',
    subtitle: 'helpGuide.qrAuthCheckSubtitle',
    subtitleFallback: 'The book is verified. If you are signed in, checkout will now complete! If not, a login popup will appear.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/02_onboarding_signin.png',
    branches: [
      { id: 'signed_in', label: 'helpGuide.alreadySignedIn', fallback: 'I\'m already signed in', icon: 'CheckCircle2', targetScene: 'checkout_success', highlight: true },
      { id: 'need_login', label: 'helpGuide.needSignIn', fallback: 'I need to sign in / I\'m new', icon: 'LogIn', targetScene: 'auth_choice' },
    ],
  },

  // ============ QUICK CHECKOUT FLOW ============
  pickup: {
    id: 'pickup',
    title: 'helpGuide.pickupTitle',
    titleFallback: 'Step 1: Pick Up Your Book',
    subtitle: 'helpGuide.pickupSubtitle',
    subtitleFallback: 'Browse the shelves and pick up the book you\'d like to borrow.',
    animationType: 'pickup',
    autoAdvance: { targetScene: 'scan_choice', delay: 8000 },
    branches: [
      { id: 'next', label: 'helpGuide.next', fallback: 'Next →', icon: 'ArrowRight', targetScene: 'scan_choice', highlight: true },
    ],
  },

  scan_choice: {
    id: 'scan_choice',
    title: 'helpGuide.scanChoiceTitle',
    titleFallback: 'Step 2: Scan the Book',
    subtitle: 'helpGuide.scanChoiceSubtitle',
    subtitleFallback: 'How would you like to scan? You don\'t need to open the website first!',
    animationType: 'nfc_scan',
    branches: [
      { id: 'nfc', label: 'helpGuide.nfcTap', fallback: 'Tap NFC (Recommended)', icon: 'Wifi', targetScene: 'nfc_tips', highlight: true },
      { id: 'qr', label: 'helpGuide.scanQr', fallback: 'Scan QR Code', icon: 'QrCode', targetScene: 'qr_tips' },
    ],
  },

  // --- NFC Path ---
  nfc_tips: {
    id: 'nfc_tips',
    title: 'helpGuide.nfcTipsTitle',
    titleFallback: 'NFC Tap — How To',
    subtitle: 'helpGuide.nfcTipsSubtitle',
    subtitleFallback: 'Just tap your phone on the gold NFC badge on the book\'s front cover. No app needed!',
    animationType: 'nfc_scan',
    deviceTips: true,
    autoAdvance: { targetScene: 'nfc_auth_choice', delay: 10000 },
    branches: [
      { id: 'next', label: 'helpGuide.gotIt', fallback: 'Got it! What\'s next? →', icon: 'ArrowRight', targetScene: 'nfc_auth_choice', highlight: true },
    ],
  },

  nfc_auth_choice: {
    id: 'nfc_auth_choice',
    title: 'helpGuide.nfcLandedTitle',
    titleFallback: 'Step 3: Book Page Opens Automatically',
    subtitle: 'helpGuide.nfcLandedSubtitle',
    subtitleFallback: 'The book\'s detail page opens in your browser. Now you can check out instantly!',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/08_book_detail_nfc_instant.png',
    branches: [
      { id: 'signed_in', label: 'helpGuide.alreadySignedIn', fallback: 'I\'m already signed in', icon: 'CheckCircle2', targetScene: 'instant_checkout', highlight: true },
      { id: 'need_login', label: 'helpGuide.needSignIn', fallback: 'I need to sign in / I\'m new', icon: 'LogIn', targetScene: 'auth_choice' },
    ],
  },

  instant_checkout: {
    id: 'instant_checkout',
    title: 'helpGuide.instantCheckoutTitle',
    titleFallback: 'Instant NFC Checkout',
    subtitle: 'helpGuide.instantCheckoutSubtitle',
    subtitleFallback: 'Since you tapped via NFC, you\'ll see a golden "Instant Checkout" button with a 3-minute timer. Just tap it — no further scanning needed!',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/08_book_detail_nfc_instant.png',
    autoAdvance: { targetScene: 'checkout_success', delay: 10000 },
    branches: [
      { id: 'next', label: 'helpGuide.next', fallback: 'What happens next? →', icon: 'ArrowRight', targetScene: 'checkout_success', highlight: true },
    ],
  },

  // --- Auth Branch ---
  auth_choice: {
    id: 'auth_choice',
    title: 'helpGuide.authChoiceTitle',
    titleFallback: 'Sign In Required',
    subtitle: 'helpGuide.authChoiceSubtitle',
    subtitleFallback: 'A secure login popup will slide up. Have you registered before?',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/02_onboarding_signin.png',
    branches: [
      { id: 'login', label: 'helpGuide.haveAccount', fallback: 'Yes, I have an account (Login)', icon: 'LogIn', targetScene: 'login_flow', highlight: true },
      { id: 'signup', label: 'helpGuide.newUser', fallback: 'No, I\'m new (Sign Up)', icon: 'UserPlus', targetScene: 'signup_flow' },
    ],
  },

  login_flow: {
    id: 'login_flow',
    title: 'helpGuide.loginFlowTitle',
    titleFallback: 'Quick Login',
    subtitle: 'helpGuide.loginFlowSubtitle',
    subtitleFallback: 'Tap "Google" or "LinkedIn" for one-tap sign in, or enter your email and password.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/02_onboarding_signin.png',
    autoAdvance: { targetScene: 'instant_checkout', delay: 10000 },
    branches: [
      { id: 'next', label: 'helpGuide.loggedIn', fallback: 'Logged in! Continue →', icon: 'ArrowRight', targetScene: 'instant_checkout', highlight: true },
    ],
  },

  signup_flow: {
    id: 'signup_flow',
    title: 'helpGuide.signupFlowTitle',
    titleFallback: 'Quick Sign Up: Step 1',
    subtitle: 'helpGuide.signupFlowSubtitle',
    subtitleFallback: 'Create your account: Choose Google/LinkedIn (instant) or Email.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/03_onboarding_signup.png',
    branches: [
      { id: 'next', label: 'helpGuide.next', fallback: 'Next →', icon: 'ArrowRight', targetScene: 'signup_terms', highlight: true },
    ],
  },
  
  signup_terms: {
    id: 'signup_terms',
    title: 'helpGuide.signupTermsTitle',
    titleFallback: 'Sign Up: Terms & Conditions',
    subtitle: 'helpGuide.signupTermsSubtitle',
    subtitleFallback: 'Review and accept the library covenant and privacy policy.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/04_onboarding_terms.png',
    branches: [
      { id: 'next', label: 'helpGuide.next', fallback: 'Next →', icon: 'ArrowRight', targetScene: 'signup_profile', highlight: true },
    ],
  },
  
  signup_profile: {
    id: 'signup_profile',
    title: 'helpGuide.signupProfileTitle',
    titleFallback: 'Sign Up: Profile Setup',
    subtitle: 'helpGuide.signupProfileSubtitle',
    subtitleFallback: 'Fill in your phone number and address (required by the library). Done!',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/06_onboarding_profile.png',
    branches: [
      { id: 'next', label: 'helpGuide.signedUp', fallback: 'Signed up! Continue →', icon: 'ArrowRight', targetScene: 'instant_checkout', highlight: true },
    ],
  },

  // --- QR Path ---
  qr_tips: {
    id: 'qr_tips',
    title: 'helpGuide.qrTipsTitle',
    titleFallback: 'QR Code Scan — How To',
    subtitle: 'helpGuide.qrTipsSubtitle',
    subtitleFallback: 'Flip the book to its back cover. Point your phone\'s camera at the QR code from 4-8 inches away.',
    animationType: 'qr_scan',
    qrTips: true,
    autoAdvance: { targetScene: 'qr_landed', delay: 10000 },
    branches: [
      { id: 'next', label: 'helpGuide.scanned', fallback: 'Scanned! What\'s next? →', icon: 'ArrowRight', targetScene: 'qr_landed', highlight: true },
    ],
  },

  qr_landed: {
    id: 'qr_landed',
    title: 'helpGuide.qrLandedTitle',
    titleFallback: 'Step 3: Book Page Opens',
    subtitle: 'helpGuide.qrLandedSubtitle',
    subtitleFallback: 'The book\'s detail page opens. Click the "Checkout" button.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/07_book_detail_page.png',
    autoAdvance: { targetScene: 'qr_verify_choice', delay: 6000 },
    branches: [
      { id: 'next', label: 'helpGuide.clickedCheckout', fallback: 'Clicked Checkout →', icon: 'ArrowRight', targetScene: 'qr_verify_choice', highlight: true },
    ],
  },

  qr_verify_choice: {
    id: 'qr_verify_choice',
    title: 'helpGuide.qrVerifyTitle',
    titleFallback: 'Step 4: Verify the Book',
    subtitle: 'helpGuide.qrVerifySubtitle',
    subtitleFallback: 'The scanner popup will open. Choose how you want to verify you physically have the book:',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/09_scanner_modal_nfc.png',
    branches: [
      { id: 'nfc', label: 'helpGuide.tapNfc', fallback: 'Tap NFC (If phone supports)', icon: 'Wifi', targetScene: 'qr_nfc_verify', highlight: true },
      { id: 'camera', label: 'helpGuide.scanCamera', fallback: 'Scan QR with Camera', icon: 'QrCode', targetScene: 'qr_camera_verify' },
    ],
  },

  qr_nfc_verify: {
    id: 'qr_nfc_verify',
    title: 'helpGuide.qrNfcVerifyTitle',
    titleFallback: 'Tap to Verify',
    subtitle: 'helpGuide.qrNfcVerifySubtitle',
    subtitleFallback: 'Hold your phone to the NFC badge on the front cover. Once verified, checkout completes instantly!',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/09_scanner_modal_nfc.png',
    autoAdvance: { targetScene: 'auth_check_qr', delay: 6000 },
    branches: [
      { id: 'next', label: 'helpGuide.verified', fallback: 'Verified! →', icon: 'ArrowRight', targetScene: 'auth_check_qr', highlight: true },
    ],
  },

  qr_camera_verify: {
    id: 'qr_camera_verify',
    title: 'helpGuide.qrCameraVerifyTitle',
    titleFallback: 'Scan to Verify',
    subtitle: 'helpGuide.qrCameraVerifySubtitle',
    subtitleFallback: 'Point your phone camera at the QR sticker on the back cover again. The in-app viewfinder will capture it.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/10_scanner_modal_qr.png',
    autoAdvance: { targetScene: 'auth_check_qr', delay: 6000 },
    branches: [
      { id: 'next', label: 'helpGuide.verified', fallback: 'Verified! →', icon: 'ArrowRight', targetScene: 'auth_check_qr', highlight: true },
    ],
  },

  auth_check_qr: {
    id: 'auth_check_qr',
    title: 'helpGuide.qrAuthCheckTitle',
    titleFallback: 'Almost Done!',
    subtitle: 'helpGuide.qrAuthCheckSubtitle',
    subtitleFallback: 'The book is verified. If you are signed in, checkout will now complete! If not, a login popup will appear.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/02_onboarding_signin.png',
    branches: [
      { id: 'signed_in', label: 'helpGuide.alreadySignedIn', fallback: 'I\'m already signed in', icon: 'CheckCircle2', targetScene: 'checkout_success', highlight: true },
      { id: 'need_login', label: 'helpGuide.needSignIn', fallback: 'I need to sign in / I\'m new', icon: 'LogIn', targetScene: 'auth_choice' },
    ],
  },

  checkout_success: {
    id: 'checkout_success',
    title: 'helpGuide.checkoutSuccessTitle',
    titleFallback: '✅ Checkout Complete!',
    subtitle: 'helpGuide.checkoutSuccessSubtitle',
    subtitleFallback: 'Rate your experience! Your Gatepass is ready.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/11_checkout_success.png',
    branches: [
      { id: 'next', label: 'helpGuide.viewGatepass', fallback: 'View Gatepass →', icon: 'ArrowRight', targetScene: 'checkout_complete', highlight: true },
    ],
  },

  checkout_complete: {
    id: 'checkout_complete',
    title: 'helpGuide.checkoutCompleteTitle',
    titleFallback: 'Your Gatepass',
    subtitle: 'helpGuide.checkoutCompleteSubtitle',
    subtitleFallback: 'Show this Gatepass at the library exit gate. You can view your active loans in your profile anytime.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/12_gatepass_page.png',
    branches: [
      { id: 'restart', label: 'helpGuide.startOver', fallback: '↻ Start Over', icon: 'RotateCcw', targetScene: 'welcome' },
    ],
  },

  // ============ RETURN FLOW ============
  return_start: {
    id: 'return_start',
    title: 'helpGuide.returnStartTitle',
    titleFallback: 'Step 1: Find Your Book',
    subtitle: 'helpGuide.returnStartSubtitle',
    subtitleFallback: 'Open the website. Go to your Profile or Study page. Find the book in your Active Loans.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/13_return_scanner.png',
    autoAdvance: { targetScene: 'return_method', delay: 8000 },
    branches: [
      { id: 'next', label: 'helpGuide.foundBook', fallback: 'Found it! →', icon: 'ArrowRight', targetScene: 'return_method', highlight: true },
    ],
  },

  return_method: {
    id: 'return_method',
    title: 'helpGuide.returnMethodTitle',
    titleFallback: 'Step 2: Verify Your Return',
    subtitle: 'helpGuide.returnMethodSubtitle',
    subtitleFallback: 'Click "Return" on the book. Choose a verification method:',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/13_return_scanner.png',
    branches: [
      { id: 'nfc', label: 'helpGuide.returnNfc', fallback: 'Tap NFC on Book', icon: 'Wifi', targetScene: 'return_nfc', highlight: true },
      { id: 'qr', label: 'helpGuide.returnQr', fallback: 'Scan QR Code', icon: 'QrCode', targetScene: 'return_qr' },
      { id: 'gps', label: 'helpGuide.returnGps', fallback: 'GPS Location (Stand in library)', icon: 'MapPin', targetScene: 'return_gps' },
    ],
  },

  return_nfc: {
    id: 'return_nfc',
    title: 'helpGuide.returnNfcTitle',
    titleFallback: 'NFC Return',
    subtitle: 'helpGuide.returnNfcSubtitle',
    subtitleFallback: 'Hold your phone to the book\'s NFC badge (just like checkout). Once verified, the return completes instantly!',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/09_scanner_modal_nfc.png',
    autoAdvance: { targetScene: 'return_complete', delay: 6000 },
    branches: [
      { id: 'next', label: 'helpGuide.returnDone', fallback: 'Return Confirmed! →', icon: 'ArrowRight', targetScene: 'return_complete', highlight: true },
    ],
  },

  return_qr: {
    id: 'return_qr',
    title: 'helpGuide.returnQrTitle',
    titleFallback: 'QR Return',
    subtitle: 'helpGuide.returnQrSubtitle',
    subtitleFallback: 'You can either:\n• Scan the book\'s back cover QR sticker, or\n• Scan the "Return Validator" QR placard at the main desk',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/10_scanner_modal_qr.png',
    autoAdvance: { targetScene: 'return_complete', delay: 8000 },
    branches: [
      { id: 'next', label: 'helpGuide.returnDone', fallback: 'Return Confirmed! →', icon: 'ArrowRight', targetScene: 'return_complete', highlight: true },
    ],
  },

  return_gps: {
    id: 'return_gps',
    title: 'helpGuide.returnGpsTitle',
    titleFallback: 'GPS Location Return',
    subtitle: 'helpGuide.returnGpsSubtitle',
    subtitleFallback: 'Stand physically inside the library. When prompted, allow location access. The app verifies you are within the library\'s geofence boundary.',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/13_return_scanner.png',
    autoAdvance: { targetScene: 'return_complete', delay: 10000 },
    branches: [
      { id: 'next', label: 'helpGuide.returnDone', fallback: 'Return Confirmed! →', icon: 'ArrowRight', targetScene: 'return_complete', highlight: true },
    ],
  },

  return_complete: {
    id: 'return_complete',
    title: 'helpGuide.returnCompleteTitle',
    titleFallback: '✅ Return Complete!',
    subtitle: 'helpGuide.returnCompleteSubtitle',
    subtitleFallback: 'Your book is returned to the catalog. Place it back on its shelf.\n\nYou can optionally write a book review to help other readers!',
    animationType: 'screenshot',
    screenshotUrl: '/help-screenshots/14_return_success.png',
    branches: [
      { id: 'restart', label: 'helpGuide.startOver', fallback: '↻ Start Over', icon: 'RotateCcw', targetScene: 'welcome' },
    ],
  },
};


// --- Mini Components for the UI ---

// Renders the realistic screenshot phone frame
const PhoneScreenshot = ({ imageUrl }) => (
  <div className="phone-mockup-frame">
    <div className="phone-notch"></div>
    <div className="phone-screen-image-container">
      {imageUrl ? (
        <img src={imageUrl} alt="App Screenshot" className="phone-screenshot" />
      ) : (
        <div className="phone-screen-placeholder">
          <BookOpen size={48} className="placeholder-icon" />
          <p>Screenshot Loading...</p>
        </div>
      )}
    </div>
  </div>
);

export default function InteractiveHelpGuide() {
  const { t } = useLanguage();
  const [currentSceneId, setCurrentSceneId] = useState('welcome');
  const [history, setHistory] = useState([]);
  const [autoAdvanceTimeLeft, setAutoAdvanceTimeLeft] = useState(null);
  
  const scene = SCENES[currentSceneId];
  const timerRef = useRef(null);
  
  const handleBranchClick = useCallback((targetSceneId) => {
    setHistory(prev => [...prev, currentSceneId]);
    setCurrentSceneId(targetSceneId);
  }, [currentSceneId]);
  
  const handleBack = useCallback(() => {
    if (history.length > 0) {
      const prevScene = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setCurrentSceneId(prevScene);
    }
  }, [history]);
  
  const handleRestart = useCallback(() => {
    setHistory([]);
    setCurrentSceneId('welcome');
  }, []);
  
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setAutoAdvanceTimeLeft(null);
    
    if (scene.autoAdvance) {
      const { delay, targetScene } = scene.autoAdvance;
      let remaining = delay / 1000;
      setAutoAdvanceTimeLeft(remaining);
      
      timerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          handleBranchClick(targetScene);
        } else {
          setAutoAdvanceTimeLeft(remaining);
        }
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scene, handleBranchClick]);
  
  // Render the visual block based on animationType
  const renderVisuals = () => {
    if (scene.animationType === 'screenshot') {
       return <PhoneScreenshot imageUrl={scene.screenshotUrl} />;
    }
    
    if (scene.animationType === 'pickup') {
      return (
        <div className="help-scene-container">
           <ContinuousScannerAnimation type="nfc" action="checkout" forcePhase="pickup" />
        </div>
      );
    }
    if (scene.animationType === 'nfc_scan') {
      return (
        <div className="help-scene-container">
           <ContinuousScannerAnimation type="nfc" action="checkout" forcePhase="scan" />
        </div>
      );
    }
    if (scene.animationType === 'qr_scan') {
      return (
        <div className="help-scene-container">
           <ContinuousScannerAnimation type="barcode" action="checkout" forcePhase="scan" />
        </div>
      );
    }
    if (scene.animationType === 'welcome') {
       // generic nice view
       return (
         <div className="help-scene-container">
            <ContinuousScannerAnimation type="nfc" action="checkout" forcePhase="pickup" />
         </div>
       );
    }
    
    return null;
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen size={20} />;
      case 'Smartphone': return <Smartphone size={20} />;
      case 'QrCode': return <QrCode size={20} />;
      case 'Wifi': return <Wifi size={20} />;
      case 'Key': return <Key size={20} />;
      case 'CheckCircle2': return <CheckCircle2 size={20} />;
      case 'ArrowRight': return <ArrowRight size={20} />;
      case 'RotateCcw': return <RotateCcw size={20} />;
      case 'LogIn': return <LogIn size={20} />;
      case 'UserPlus': return <UserPlus size={20} />;
      case 'MapPin': return <MapPin size={20} />;
      case 'ChevronRight': return <ChevronRight size={20} />;
      case 'Search': return <Search size={20} />;
      default: return <ArrowRight size={20} />;
    }
  };

  return (
    <div className="interactive-help-guide">
      {/* Visual Left Side */}
      <div className="guide-visual-panel">
        {renderVisuals()}
        
        {/* Device Tips Overlay */}
        {scene.deviceTips && (
          <div className="device-tips-overlay glass-panel">
            <h4>iPhone</h4>
            <ul>
              <li>{t('helpGuide.iphoneTip1', 'Hold TOP EDGE of phone near gold badge')}</li>
              <li>{t('helpGuide.iphoneTip2', 'Screen must be unlocked')}</li>
              <li>{t('helpGuide.iphoneTip3', 'iPhone 7/8: Open Control Center → Tap "NFC Tag Reader" first')}</li>
            </ul>
            <h4 className="mt-4">Android</h4>
            <ul>
              <li>{t('helpGuide.androidTip1', 'Hold CENTER-BACK of phone flat against badge')}</li>
              <li>{t('helpGuide.androidTip2', 'Slowly slide up and down until you feel a vibration')}</li>
              <li>{t('helpGuide.androidTip3', 'Older phones: Enable NFC in Settings → Connected Devices')}</li>
            </ul>
          </div>
        )}
        
        {scene.qrTips && (
          <div className="device-tips-overlay glass-panel">
            <h4>QR Tips</h4>
            <ul>
              <li>{t('helpGuide.qrTipDistance', 'Hold phone 4-8 inches (10-20 cm) away')}</li>
              <li>{t('helpGuide.qrTipLight', 'Avoid shadows or glare — tilt book slightly if reflective')}</li>
              <li>{t('helpGuide.qrTipFocus', 'Center QR in frame, hold steady 1-2s for autofocus')}</li>
            </ul>
          </div>
        )}
      </div>

      {/* Interactive Right Side */}
      <div className="guide-interaction-panel">
        <div className="guide-header">
          {history.length > 0 && (
            <button className="btn-icon" onClick={handleBack} aria-label="Go Back">
              <ArrowLeft size={20} />
              <span>{t('helpGuide.back', 'Back')}</span>
            </button>
          )}
          {currentSceneId !== 'welcome' && (
            <button className="btn-icon text-muted" onClick={handleRestart}>
              <RotateCcw size={16} />
              <span>{t('helpGuide.restart', 'Restart')}</span>
            </button>
          )}
        </div>
        
        <div className="guide-content">
          <h2 className="scene-title">{t(scene.title, scene.titleFallback)}</h2>
          <div className="scene-subtitle">
            {t(scene.subtitle, scene.subtitleFallback).split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          
          <div className="scene-branches">
            {scene.branches.map(branch => (
              <button
                key={branch.id}
                className={`branch-btn ${branch.highlight ? 'highlight' : ''}`}
                onClick={() => handleBranchClick(branch.targetScene)}
              >
                <div className="branch-icon">{getIcon(branch.icon)}</div>
                <div className="branch-label">{t(branch.label, branch.fallback)}</div>
              </button>
            ))}
          </div>
          
          {autoAdvanceTimeLeft !== null && scene.autoAdvance && (
            <div className="auto-advance-indicator">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${(autoAdvanceTimeLeft / (scene.autoAdvance.delay / 1000)) * 100}%` }}
                />
              </div>
              <span>{t('helpGuide.autoAdvance', 'Auto-advancing in {{n}}s...').replace('{{n}}', autoAdvanceTimeLeft)}</span>
              <button className="btn-text-small" onClick={() => {
                if(timerRef.current) clearInterval(timerRef.current);
                setAutoAdvanceTimeLeft(null);
              }}>
                {t('helpGuide.cancel', 'Cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
