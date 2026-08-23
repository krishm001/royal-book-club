import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Smartphone, QrCode, ClipboardList, Key, HelpCircle, ShieldCheck, CheckCircle2, Printer, MapPin, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import './HelpPage.css';

// Import generated step assets
import nfcTapGuideImg from '../../assets/nfc_tap_guide.png';
import barcodeScanGuideImg from '../../assets/barcode_scan_guide.png';
import instantLoanGuideImg from '../../assets/instant_loan_guide.png';
import secureAccountLoginImg from '../../assets/secure_account_login.png';
const HelpPage = () => {
  const {
    t
  } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('checkout'); // checkout | return | gatepass | faq

  // Method selectors
  const [checkoutMethod, setCheckoutMethod] = useState('nfc'); // nfc | barcode | manual
  const [returnMethod, setReturnMethod] = useState('gps'); // gps | qr

  // Active Train Hop indices
  const [activeNfcHop, setActiveNfcHop] = useState(0);
  const [activeBarcodeHop, setActiveBarcodeHop] = useState(0);
  const [activeManualHop, setActiveManualHop] = useState(0);
  const [activeGpsHop, setActiveGpsHop] = useState(0);
  const [activeQrHop, setActiveQrHop] = useState(0);
  const nfcSteps = [{
    title: t('sagesGuild.nfcStep1Title', 'Tap Smartphone'),
    headline: t('sagesGuild.nfcStep1Headline', 'Hold & Swipe Device'),
    short: t('sagesGuild.nfcStep1Short', 'Unlock screen and tap top-left of front cover'),
    verbatim: t('sagesGuild.nfcStep1Verbatim', "There is an NFC sticker placed on the top-left inside the front cover. You do NOT need to open the book; the tap works perfectly from the outside through the cover. Ensure your smartphone's screen is unlocked. Gently place your phone flat near the top-left of the book's front cover:\n\n• 📱 iPhone (iOS): Tap the top edge of your iPhone against the top-left of the front cover.\n• 🤖 Android: Place the back center of your phone flat against the top-left of the front cover. For older Android models, ensure NFC is manually turned on in your settings (usually always-on when screen is on).\n\nWait for a brief vibration, and your phone will seamlessly open the website to check out the book!"),
    tips: t('sagesGuild.nfcStep1Tips', "Remove thick metallic phone cases if the signal is not instantly received."),
    icon: <Smartphone size={20} />,
    image: nfcTapGuideImg
  }, {
    title: t('sagesGuild.nfcStep2Title', 'Secure Account'),
    headline: t('sagesGuild.nfcStep2Headline', 'Sign In Securely'),
    short: t('sagesGuild.nfcStep2Short', 'Select Google, LinkedIn, or Email and complete requirements'),
    verbatim: t('sagesGuild.nfcStep2Verbatim', "If you are a first-time scholar, a secure login popup will slide up. Prompt yourself to fill in all required details before proceeding. Under our library requirements, you are prompted to provide your flat number and phone number if mandated. Logging in via Google or LinkedIn is preferred and seamless, but traditional Email signup is available and will require an email verification step before proceeding."),
    tips: t('sagesGuild.nfcStep2Tips', "All credentials are encrypted and stored securely inside the Royal ledger."),
    icon: <Key size={20} />,
    image: secureAccountLoginImg
  }, {
    title: t('sagesGuild.nfcStep3Title', 'Secure Sovereign Checkout'),
    headline: t('sagesGuild.nfcStep3Headline', 'Authorize & Go'),
    short: t('sagesGuild.nfcStep3Short', 'Click Secure Sovereign Checkout and collect Gatepass'),
    verbatim: t('sagesGuild.nfcStep3Verbatim', "Once signed in, the book detail screen will dynamically render the physical copies. Simply click the golden 'Secure Sovereign Checkout' button. The secure ledger updates instantly in the cloud, and a digital Gatepass barcode will be written to your profile. You are now authorized to leave the salon with your physical volume!"),
    tips: t('sagesGuild.nfcStep3Tips', "Your profile will now list this book under your active loans with its live due dates."),
    icon: <CheckCircle2 size={20} />,
    image: instantLoanGuideImg
  }];
  const barcodeSteps = [{
    title: t('sagesGuild.barTitle1', 'Enter Study'),
    headline: t('sagesGuild.barHeadline1', 'Launch Web Portal'),
    short: t('sagesGuild.barShort1', 'Open Study page and click Self-Checkout'),
    verbatim: t('sagesGuild.barVerbatim1', "Open the Royal Book Club website on your mobile browser. Enter the 'Study' tab (Catalog) and locate the prominent 'Self-Checkout' glassmorphic card right at the top. Click 'Barcode Scan' to request camera authorization."),
    tips: t('sagesGuild.barTips1', "Make sure to grant camera permission when prompted by your browser."),
    icon: <BookOpen size={20} />,
    image: null
  }, {
    title: t('sagesGuild.barTitle2', 'Align Viewfinder'),
    headline: t('sagesGuild.barHeadline2', 'Scan Back Cover'),
    short: t('sagesGuild.barShort2', 'Hold camera 4 inches away targeting barcode'),
    verbatim: t('sagesGuild.barVerbatim2', "Flip the physical volume over to find the printed barcode on its back cover. Hold your phone camera parallel to the book, about 4 to 6 inches away. Align the barcode within the glowing golden camera scanner viewfinder box displayed on your screen. The auto-focus lens will instantly capture and parse the ISBN."),
    tips: t('sagesGuild.barTips2', "Avoid scanning in extreme shadows or under heavy glare. Tilt the book slightly if reflection is high."),
    icon: <Smartphone size={20} />,
    image: barcodeScanGuideImg
  }, {
    title: t('sagesGuild.barTitle3', 'Authorize Loan'),
    headline: t('sagesGuild.barHeadline3', 'Confirm Book Loan'),
    short: t('sagesGuild.barShort3', 'Click request checkout to complete transaction'),
    verbatim: t('sagesGuild.barVerbatim3', "As soon as the barcode is captured, a checkout confirmation sheet will slide up. Review the book title, author, and available copies. Select your copy and click 'Confirm Checkout'. The server immediately records your checkout and writes a Gatepass barcode to your ledger."),
    tips: t('sagesGuild.barTips3', "If you are not logged in, a secure signup popup will guide you. Choose Google, LinkedIn, or Email to complete registration."),
    icon: <CheckCircle2 size={20} />,
    image: null
  }];
  const manualSteps = [{
    title: t('sagesGuild.manTitle1', 'Browse Books'),
    headline: t('sagesGuild.manHeadline1', 'Select Your Title'),
    short: t('sagesGuild.manShort1', 'Search catalog and open book details'),
    verbatim: t('sagesGuild.manVerbatim1', "If your device doesn't have an NFC reader or camera scanner, browse our digital catalog in the 'Study' section. Search by title, author, or genre to locate the desired volume. Click on the book card to open its full details."),
    tips: t('sagesGuild.manTips1', "You can use search tags to easily find titles from specific salon houses."),
    icon: <BookOpen size={20} />,
    image: null
  }, {
    title: t('sagesGuild.manTitle2', 'File Loan'),
    headline: t('sagesGuild.manHeadline2', 'Request Curator approval'),
    short: t('sagesGuild.manShort2', 'Click Secure Sovereign Checkout'),
    verbatim: t('sagesGuild.manVerbatim2', "Click the golden 'Secure Sovereign Checkout' button on the book details page. This files a digital loan request to our active desk curator queue. Ensure you are signed in first using Google, LinkedIn, or Email to map this request to your ledger profile."),
    tips: t('sagesGuild.manTips2', "Curators monitor this queue in real-time inside the Entrance Salon."),
    icon: <ClipboardList size={20} />,
    image: null
  }, {
    title: t('sagesGuild.manTitle3', 'Collect Book'),
    headline: t('sagesGuild.manHeadline3', 'Verify & Exit Salon'),
    short: t('sagesGuild.manShort3', 'Wait for approval badge to exit salon'),
    verbatim: t('sagesGuild.manVerbatim3', "The desk curator will verify your request on their console instantly. Once approved, the book's stock is locked, and your Gatepass is immediately generated. You can collect your book and exit securely."),
    tips: t('sagesGuild.manTips3', "You will receive a notification badge once your loan request is approved."),
    icon: <CheckCircle2 size={20} />,
    image: null
  }];
  const gpsSteps = [{
    title: t('sagesGuild.gpsTitle1', 'Stand in Salon'),
    headline: t('sagesGuild.gpsHeadline1', 'Enable Phone GPS'),
    short: t('sagesGuild.gpsShort1', 'Stand inside library and allow location permission'),
    verbatim: t('sagesGuild.gpsVerbatim1', "To perform an instant self-return, you must be physically standing inside the library. Ensure your smartphone's GPS/location services are enabled. When the application prompts for location sharing, click 'Allow' so we can verify your presence."),
    tips: t('sagesGuild.gpsTips1', "Our default geofence coordinates are Latitude 12.8983, Longitude 77.705317 with a 20-meter tolerance radius."),
    icon: <MapPin size={20} />,
    image: null
  }, {
    title: t('sagesGuild.gpsTitle2', 'Initiate Return'),
    headline: t('sagesGuild.gpsHeadline2', 'Select Active Loan'),
    short: t('sagesGuild.gpsShort2', 'Select book from ledger active profile'),
    verbatim: t('sagesGuild.gpsVerbatim2', "Open your Member Profile or go to the Study page. Select the book you are returning from your Active Loans grid, and click 'Initiate Self-Return'. The application will automatically calculate your distance from the geofence center."),
    tips: t('sagesGuild.gpsTips2', "If GPS signal is weak, you can instantly bypass using the QR Scan tab."),
    icon: <ClipboardList size={20} />,
    image: null
  }, {
    title: t('sagesGuild.gpsTitle3', 'Submit Proof'),
    headline: t('sagesGuild.gpsHeadline3', 'Submit GPS coordinates'),
    short: t('sagesGuild.gpsShort3', 'Click return to instantly clear book stock'),
    verbatim: t('sagesGuild.gpsVerbatim3', "Click the 'Confirm Return' button. The application submits your current coordinates directly to our backend server. Once verified inside bounds, the book's stock updates immediately, and you can place the book back onto its respective shelf!"),
    tips: t('sagesGuild.gpsTips3', "No admin mediation required. The book is instantly available for other scholars to enjoy."),
    icon: <CheckCircle2 size={20} />,
    image: null
  }];
  const qrReturnSteps = [{
    title: t('sagesGuild.qrTitle1', 'Spot Placard'),
    headline: t('sagesGuild.qrHeadline1', 'Find Return QR Placard'),
    short: t('sagesGuild.qrShort1', 'Find Return QR placard on main desk'),
    verbatim: t('sagesGuild.qrVerbatim1', "If your GPS is failing, or coordinates verify as outside bounds, look at the main check-in counter desk in the library. Find the physical printed Return Validator QR placard. This placard contains a specialized security signature confirming physical desk presence."),
    tips: t('sagesGuild.qrTips1', "Only physical printed placards inside the salon are valid for return verification."),
    icon: <MapPin size={20} />,
    image: null
  }, {
    title: t('sagesGuild.qrTitle2', 'Scan Code'),
    headline: t('sagesGuild.qrHeadline2', 'Scan Desk Validator QR'),
    short: t('sagesGuild.qrShort2', 'Scan QR using mobile camera viewfinder'),
    verbatim: t('sagesGuild.qrVerbatim2', "Select the 'Validator QR' tab on your return screen. Click the camera scanner icon to mount the in-app viewfinder. Focus your lens on the physical desk placard. The app will capture and parse the validator path string dynamically."),
    tips: t('sagesGuild.qrTips2', "You can also scan this QR code directly with your phone's native camera app; it will open the Royal Guide and immediately process your return."),
    icon: <QrCode size={20} />,
    image: null
  }, {
    title: t('sagesGuild.qrTitle3', 'Verify Return'),
    headline: t('sagesGuild.qrHeadline3', 'Instant Ledger Clearance'),
    short: t('sagesGuild.qrShort3', 'Instant catalog clearance, no curator delay'),
    verbatim: t('sagesGuild.qrVerbatim3', "The system matches the scanned security signature with our ledger credentials. Once validated, your return request is completed instantly, clearing the book back into catalog availability and updating your active loans ledger."),
    tips: t('sagesGuild.qrTips3', "This serves as a high-security manual fallback, ensuring a seamless self-checkout experience."),
    icon: <CheckCircle2 size={20} />,
    image: null
  }];
  const faqItems = [{
    q: t('sagesGuild.faqQ1', "What is Web NFC?"),
    a: t('sagesGuild.faqA1', "Web NFC allows our library web application to read electronic tags attached to books in real-time, completely within the browser. Simply unlock your phone, turn on NFC, and tap.")
  }, {
    q: t('sagesGuild.faqQ2', "Do I need to download a separate app?"),
    a: t('sagesGuild.faqA2', "No! The Royal Book Club leverages advanced modern browser APIs. All checkout and return options occur completely on the browser, without app store downloads.")
  }, {
    q: t('sagesGuild.faqQ3', "What happens if geofencing return fails?"),
    a: t('sagesGuild.faqA3', "If location coordinates fail due to bad indoor reception, use our QR Validator Bypass. Simply scan the physical QR placard sitting on the main salon desk to instantly finalize the return.")
  }];
  const handlePrint = () => {
    window.print();
  };

  // Helper to render Train Hops
  const renderTrainHops = (steps, activeHop, setActiveHop) => {
    return <div className="train-hops-wrapper">
        {/* Track Line */}
        <div className="train-track-line">
          <div className="train-track-active" style={{
          width: `${activeHop / (steps.length - 1) * 100}%`
        }}></div>
        </div>

        {/* Train Nodes */}
        <div className="train-nodes-container">
          {steps.map((item, index) => {
          const isCompleted = index < activeHop;
          const isActive = index === activeHop;
          return <button key={index} className={`train-hop-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`} onClick={() => setActiveHop(index)} aria-label={`Hop ${index + 1}: ${item.title}`}>
                <div className="train-node-circle">
                  {isCompleted ? <CheckCircle2 size={16} /> : <span>{index + 1}</span>}
                </div>
                <div className="train-node-text-wrapper">
                  <span className="train-node-title">{item.title}</span>
                  <p className="train-node-short-text">{item.short}</p>
                </div>
              </button>;
        })}
        </div>
      </div>;
  };

  // Helper to render Active Hop detail
  const renderHopDetail = item => {
    return <div className="hop-detail-panel fade-in">
        <div className="hop-detail-header">
          <span className="hop-detail-badge">{t('auto_3520', 'STEP-BY-STEP DETAIL')}</span>
          <h2>{item.headline}</h2>
        </div>

        <div className="hop-detail-layout">
          <div className="hop-detail-info">
            <div className="verbatim-explanation">
              {item.verbatim.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
            </div>

            {item.tips && <div className="hop-tips-alert">
                <AlertCircle size={18} className="tips-icon" />
                <div className="tips-content">
                  <strong>{t('auto_3521', 'PRO TIPS & GUIDANCE')}</strong>
                  <p>{item.tips}</p>
                </div>
              </div>}
          </div>

          {item.image && <div className="hop-detail-visual">
              <img src={item.image} alt={item.headline} className="royal-instructional-image" />
              <div className="image-caption">{t('auto_3522', 'Sovereign Library Visual Guide')}</div>
            </div>}
        </div>
      </div>;
  };
  return <div className="sages-help-container">
      {/* Background aesthetic premium glow */}
      <div className="sages-hero-bg-glow"></div>
      
      <header className="sages-help-header">
        <div className="header-top-row">
          <button className="sages-back-btn" onClick={() => navigate(-1)} aria-label={t("str_5407", "Go back")}>
            <ArrowLeft size={20} />
            <span>{t('common.back') || 'Back'}</span>
          </button>

          <button className="print-guide-btn" onClick={handlePrint}>
            <Printer size={16} />
            <span>{t('auto_3523', 'Print Royal Guide')}</span>
          </button>
        </div>
        
        <div className="sages-header-titles">
          <div className="sages-badge">
            <BookOpen size={14} className="sparkle-icon" />
            <span>{t('common.sagesGuild')}</span>
          </div>
          <h1>{t('sagesGuild.title')}</h1>
          <p className="sages-subtitle">{t('sagesGuild.subtitle')}</p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sages-tabs" role="tablist">
        <button role="tab" aria-selected={activeTab === 'checkout'} className={`sages-tab-btn ${activeTab === 'checkout' ? 'active' : ''}`} onClick={() => setActiveTab('checkout')}>
          <Smartphone size={18} />
          <span>{t('sagesGuild.tabCheckout')}</span>
        </button>
        <button role="tab" aria-selected={activeTab === 'return'} className={`sages-tab-btn ${activeTab === 'return' ? 'active' : ''}`} onClick={() => setActiveTab('return')}>
          <QrCode size={18} />
          <span>{t('sagesGuild.tabReturn')}</span>
        </button>
        <button role="tab" aria-selected={activeTab === 'gatepass'} className={`sages-tab-btn ${activeTab === 'gatepass' ? 'active' : ''}`} onClick={() => setActiveTab('gatepass')}>
          <ShieldCheck size={18} />
          <span>{t('sagesGuild.tabGatepass')}</span>
        </button>
        <button role="tab" aria-selected={activeTab === 'faq'} className={`sages-tab-btn ${activeTab === 'faq' ? 'active' : ''}`} onClick={() => setActiveTab('faq')}>
          <HelpCircle size={18} />
          <span>{t('sagesGuild.tabFaq')}</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="sages-content-area">
        {activeTab === 'checkout' && <div className="methods-vertical-layout fade-in">
            {/* Method Selectors */}
            <div className="royal-sub-tabs">
              <button className={`sub-tab-btn ${checkoutMethod === 'nfc' ? 'active' : ''}`} onClick={() => setCheckoutMethod('nfc')}>
                <span>{t('sagesGuild.nfcSubtab', 'NFC Instant Tap')}</span>
              </button>
              <button className={`sub-tab-btn ${checkoutMethod === 'barcode' ? 'active' : ''}`} onClick={() => setCheckoutMethod('barcode')}>
                <span>{t('sagesGuild.barcodeSubtab', 'Barcode Scan')}</span>
              </button>
              <button className={`sub-tab-btn ${checkoutMethod === 'manual' ? 'active' : ''}`} onClick={() => setCheckoutMethod('manual')}>
                <span>{t('sagesGuild.manualSubtab', 'Digital Request')}</span>
              </button>
            </div>

            {/* Train Stepper Container */}
            <div className="train-stepper-panel royal-card glassmorphic-panel">
              <div className="stepper-meta">
                <span className="stepper-title-gradient">{t('auto_3524', 'TRAIN HOPS STEPPER')}</span>
                <p>{t('auto_3525', 'Click on any station hop to unlock detailed verbatim guides, micro-tips, and illustrations.')}</p>
              </div>

              {checkoutMethod === 'nfc' && <>
                  {renderTrainHops(nfcSteps, activeNfcHop, setActiveNfcHop)}
                  {renderHopDetail(nfcSteps[activeNfcHop])}
                </>}

              {checkoutMethod === 'barcode' && <>
                  {renderTrainHops(barcodeSteps, activeBarcodeHop, setActiveBarcodeHop)}
                  {renderHopDetail(barcodeSteps[activeBarcodeHop])}
                </>}

              {checkoutMethod === 'manual' && <>
                  {renderTrainHops(manualSteps, activeManualHop, setActiveManualHop)}
                  {renderHopDetail(manualSteps[activeManualHop])}
                </>}
            </div>
          </div>}

        {activeTab === 'return' && <div className="methods-vertical-layout fade-in">
            {/* Method Selectors */}
            <div className="royal-sub-tabs">
              <button className={`sub-tab-btn ${returnMethod === 'gps' ? 'active' : ''}`} onClick={() => setReturnMethod('gps')}>
                <span>{t('sagesGuild.gpsSubtab', 'Geofenced Self-Return')}</span>
              </button>
              <button className={`sub-tab-btn ${returnMethod === 'qr' ? 'active' : ''}`} onClick={() => setReturnMethod('qr')}>
                <span>{t('sagesGuild.qrSubtab', 'Validator QR Scan')}</span>
              </button>
            </div>

            {/* Train Stepper Container */}
            <div className="train-stepper-panel royal-card glassmorphic-panel">
              <div className="stepper-meta">
                <span className="stepper-title-gradient">{t('auto_3526', 'TRAIN HOPS STEPPER')}</span>
                <p>{t('auto_3527', 'Click on any station hop to unlock detailed location bypass parameters, coordinates, and instructions.')}</p>
              </div>

              {returnMethod === 'gps' && <>
                  {renderTrainHops(gpsSteps, activeGpsHop, setActiveGpsHop)}
                  {renderHopDetail(gpsSteps[activeGpsHop])}
                </>}

              {returnMethod === 'qr' && <>
                  {renderTrainHops(qrReturnSteps, activeQrHop, setActiveQrHop)}
                  {renderHopDetail(qrReturnSteps[activeQrHop])}
                </>}
            </div>
          </div>}

        {activeTab === 'gatepass' && <div className="sages-gatepass-panel fade-in">
            <div className="gatepass-visual-card">
              <div className="gatepass-header">
                <div className="gatepass-logo">{t('auto_3528', 'ROYAL BOOK CLUB')}</div>
                <div className="gatepass-status">{t('auto_3529', 'SECURE')}</div>
              </div>
              <div className="gatepass-body">
                <div className="barcode-mock">
                  <div className="barcode-line w-1"></div>
                  <div className="barcode-line w-2"></div>
                  <div className="barcode-line w-1"></div>
                  <div className="barcode-line w-3"></div>
                  <div className="barcode-line w-1"></div>
                  <div className="barcode-line w-2"></div>
                  <div className="barcode-line w-1"></div>
                  <div className="barcode-line w-3"></div>
                </div>
                <div className="gatepass-token">{t("str_5408", "TOKEN: RBC-GP-827361-VALID")}</div>
              </div>
            </div>
            
            <div className="gatepass-info-text">
              <h3>{t('sagesGuild.gatepassTitle', 'Entrance & Exit Gatepass')}</h3>
              <p>{t('sagesGuild.gatepassDesc', 'When exiting the physical Entrance Salon, open your Gatepass page and scan the generated barcode. This clears the safety gate immediately.')}</p>
              
              <div className="gatepass-bullet-points">
                <div className="gatepass-bullet">
                  <CheckCircle2 size={16} />
                  <span>{t('auto_3530', 'Generates automatically post-approval')}</span>
                </div>
                <div className="gatepass-bullet">
                  <CheckCircle2 size={16} />
                  <span>{t('auto_3531', 'Valid for 15 minutes at exit gateway')}</span>
                </div>
                <div className="gatepass-bullet">
                  <CheckCircle2 size={16} />
                  <span>{t('auto_3532', 'Stored securely on local scholar ledger')}</span>
                </div>
              </div>
            </div>
          </div>}

        {activeTab === 'faq' && <div className="sages-faq-accordion fade-in">
            {faqItems.map((item, index) => <div key={index} className="faq-item">
                <div className="faq-question">
                  <HelpCircle size={20} className="faq-q-icon" />
                  <h4>{item.q}</h4>
                </div>
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>)}
          </div>}
      </main>

      {/* Hidden Print Layout (Expanded sequentially) */}
      <div className="print-only-layout">
        <div className="print-header">
          <h1>{t('auto_3533', 'Sovereign Library - Comprehensive Royal Guide')}</h1>
          <p>{t('auto_3534', 'Official instructional document for physical-digital circulation gateway')}</p>
        </div>

        <section className="print-section">
          <h2>{t('auto_3535', '1. NFC INSTANT CHECKOUT')}</h2>
          {nfcSteps.map((step, idx) => <div key={idx} className="print-step">
              <h3>{t("str_5409", "Step")} {idx + 1}: {step.title} — {step.short}</h3>
              <p className="print-verbatim">{step.verbatim}</p>
              <p className="print-tip"><strong>{t("str_5410", "Tips:")}</strong> {step.tips}</p>
              {step.image && <div className="print-image-container">
                  <img src={step.image} alt={step.title} className="print-img" />
                </div>}
            </div>)}
        </section>

        <section className="print-section">
          <h2>{t('auto_3536', '2. BARCODE SCAN CHECKOUT')}</h2>
          {barcodeSteps.map((step, idx) => <div key={idx} className="print-step">
              <h3>{t("str_5411", "Step")} {idx + 1}: {step.title} — {step.short}</h3>
              <p className="print-verbatim">{step.verbatim}</p>
              <p className="print-tip"><strong>{t("str_5412", "Tips:")}</strong> {step.tips}</p>
              {step.image && <div className="print-image-container">
                  <img src={step.image} alt={step.title} className="print-img" />
                </div>}
            </div>)}
        </section>

        <section className="print-section">
          <h2>{t('auto_3537', '3. GEOFENCED SELF-RETURN')}</h2>
          {gpsSteps.map((step, idx) => <div key={idx} className="print-step">
              <h3>{t("str_5413", "Step")} {idx + 1}: {step.title} — {step.short}</h3>
              <p className="print-verbatim">{step.verbatim}</p>
              <p className="print-tip"><strong>{t("str_5414", "Tips:")}</strong> {step.tips}</p>
            </div>)}
        </section>

        <section className="print-section">
          <h2>{t("str_5415", "4. RETURN QR VALIDATOR (BYPASS)")}</h2>
          {qrReturnSteps.map((step, idx) => <div key={idx} className="print-step">
              <h3>{t("str_5416", "Step")} {idx + 1}: {step.title} — {step.short}</h3>
              <p className="print-verbatim">{step.verbatim}</p>
              <p className="print-tip"><strong>{t("str_5417", "Tips:")}</strong> {step.tips}</p>
            </div>)}
        </section>
      </div>
    </div>;
};
export default HelpPage;