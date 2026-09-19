import React from 'react';
import { ArrowLeft, BookOpen, Printer, HelpCircle, Wifi, QrCode, MapPin, Smartphone, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import InteractiveHelpGuide from '../../components/help/InteractiveHelpGuide';
import PrintableHelpBanners from '../../components/help/PrintableHelpBanners';
import './HelpPage.css';

const HelpPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [faqOpen, setFaqOpen] = React.useState({});

  const handlePrint = () => {
    window.print();
  };

  const toggleFaq = (idx) => {
    setFaqOpen(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const faqItems = [
    {
      q: t('helpGuide.faqQ1', 'What is NFC and do I need a special app?'),
      a: t('helpGuide.faqA1', 'NFC (Near Field Communication) lets your phone read electronic tags just by touching them. No app download is needed! Your phone\'s browser opens the book page automatically when you tap. iPhones XS and newer do this automatically when the screen is unlocked. Older iPhones (7/8) need you to open the NFC reader from Control Center first. Most Android phones with NFC work automatically.')
    },
    {
      q: t('helpGuide.faqQ2', 'What if my phone doesn\'t have NFC?'),
      a: t('helpGuide.faqA2', 'No problem! Every book also has a QR code sticker on its back cover. Simply open your phone\'s camera app and point it at the QR code. If that doesn\'t work, you can also browse our website directly, find the book, and use the barcode scanner feature.')
    },
    {
      q: t('helpGuide.faqQ3', 'Do I need to create an account?'),
      a: t('helpGuide.faqA3', 'Yes, a free account is required for checkout. You can sign up instantly using your Google or LinkedIn account (one tap!), or create an account with your email. You\'ll need to provide your phone number and address as required by the library.')
    },
    {
      q: t('helpGuide.faqQ4', 'What is a Gatepass?'),
      a: t('helpGuide.faqA4', 'A Gatepass is your digital exit permit. It\'s generated automatically when you complete a checkout. Show it on your phone at the library exit. It contains a barcode that the gate scanner can read to let you through.')
    },
    {
      q: t('helpGuide.faqQ5', 'How do I return a book?'),
      a: t('helpGuide.faqA5', 'Come back to the library with the book. Open your profile on our website, find the book in your Active Loans, and click Return. You can verify your return by tapping NFC, scanning a QR code, or letting the app verify your GPS location inside the library. Then place the book back on the shelf!')
    },
    {
      q: t('helpGuide.faqQ6', 'What if geofencing return fails?'),
      a: t('helpGuide.faqA6', 'If your phone\'s GPS can\'t confirm you\'re in the library (common with indoor reception), just switch to the QR method. Scan the Return Validator QR placard on the library\'s main desk — it works instantly as a physical presence verification.')
    },
    {
      q: t('helpGuide.faqQ7', 'Where exactly should I tap my phone for NFC?'),
      a: t('helpGuide.faqA7', 'Look for the gold NFC badge on the book\'s front cover (top-left area). For iPhones, hold the TOP EDGE of your phone near the badge. For Android phones, hold the CENTER-BACK of your phone flat against the badge and slide slowly up/down until you feel a vibration. You don\'t need to open the book — NFC works through the cover!')
    },
  ];

  return (
    <div className="sages-help-container">
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
            <span>{t('helpGuide.printBanners', 'Print Library Banners')}</span>
          </button>
        </div>
        
        <div className="sages-header-titles">
          <div className="sages-badge">
            <BookOpen size={14} className="sparkle-icon" />
            <span>{t('common.sagesGuild')}</span>
          </div>
          <h1>{t('helpGuide.pageTitle', 'Your Complete Library Guide')}</h1>
          <p className="sages-subtitle">{t('helpGuide.pageSubtitle', 'Follow the interactive walkthrough below. Choose your path and we\'ll guide you step by step — from picking up a book to walking out with your Gatepass.')}</p>
        </div>
      </header>

      {/* Interactive Video Guide */}
      <main className="sages-content-area">
        <InteractiveHelpGuide />
      </main>

      {/* Quick Tips / FAQ Section */}
      <section className="help-faq-section">
        <h2 className="faq-section-title">
          <HelpCircle size={20} />
          <span>{t('helpGuide.faqTitle', 'Frequently Asked Questions')}</span>
        </h2>

        <div className="help-faq-list">
          {faqItems.map((item, idx) => (
            <div key={idx} className={`help-faq-item ${faqOpen[idx] ? 'open' : ''}`}>
              <button className="help-faq-question" onClick={() => toggleFaq(idx)}>
                <span>{item.q}</span>
                <ChevronDown size={18} className="faq-chevron" />
              </button>
              {faqOpen[idx] && (
                <div className="help-faq-answer fade-in">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Reference Cards */}
      <section className="help-quick-ref">
        <h3 className="quick-ref-title">{t('helpGuide.quickRefTitle', 'Quick Reference')}</h3>
        <div className="quick-ref-grid">
          <div className="quick-ref-card">
            <Wifi size={24} className="qr-icon" />
            <div>
              <strong>{t('helpGuide.nfcCard', 'NFC Position')}</strong>
              <p>{t('helpGuide.nfcCardDesc', 'iPhone: top edge • Android: center-back')}</p>
            </div>
          </div>
          <div className="quick-ref-card">
            <QrCode size={24} className="qr-icon" />
            <div>
              <strong>{t('helpGuide.qrCard', 'QR Sticker')}</strong>
              <p>{t('helpGuide.qrCardDesc', 'Back cover of every book • Hold 4-8 inches away')}</p>
            </div>
          </div>
          <div className="quick-ref-card">
            <MapPin size={24} className="qr-icon" />
            <div>
              <strong>{t('helpGuide.gpsCard', 'GPS Return')}</strong>
              <p>{t('helpGuide.gpsCardDesc', 'Stand in library • Allow location • Fallback: scan desk QR')}</p>
            </div>
          </div>
          <div className="quick-ref-card">
            <Smartphone size={24} className="qr-icon" />
            <div>
              <strong>{t('helpGuide.noAppCard', 'No App Needed')}</strong>
              <p>{t('helpGuide.noAppCardDesc', 'Everything works in your phone\'s browser • No downloads')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hidden Print Layout — Printable Banners */}
      <PrintableHelpBanners />
    </div>
  );
};

export default HelpPage;