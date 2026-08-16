import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Smartphone, QrCode, ClipboardList, Key, HelpCircle, ShieldCheck, HelpCircle as FaqIcon, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import './HelpPage.css';

const HelpPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('checkout'); // checkout | return | gatepass | faq

  const faqItems = [
    { q: t('sagesGuild.faqQ1'), a: t('sagesGuild.faqA1') },
    { q: t('sagesGuild.faqQ2'), a: t('sagesGuild.faqA2') },
    { q: t('sagesGuild.faqQ3'), a: t('sagesGuild.faqA3') },
  ];

  return (
    <div className="sages-help-container">
      {/* Premium Header background blob */}
      <div className="sages-hero-bg-glow"></div>
      
      <header className="sages-help-header">
        <button className="sages-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
          <span>{t('common.back') || 'Back'}</span>
        </button>
        
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
        <button
          role="tab"
          aria-selected={activeTab === 'checkout'}
          className={`sages-tab-btn ${activeTab === 'checkout' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkout')}
        >
          <Smartphone size={18} />
          <span>{t('sagesGuild.tabCheckout')}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'return'}
          className={`sages-tab-btn ${activeTab === 'return' ? 'active' : ''}`}
          onClick={() => setActiveTab('return')}
        >
          <QrCode size={18} />
          <span>{t('sagesGuild.tabReturn')}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'gatepass'}
          className={`sages-tab-btn ${activeTab === 'gatepass' ? 'active' : ''}`}
          onClick={() => setActiveTab('gatepass')}
        >
          <ShieldCheck size={18} />
          <span>{t('sagesGuild.tabGatepass')}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'faq'}
          className={`sages-tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
          onClick={() => setActiveTab('faq')}
        >
          <FaqIcon size={18} />
          <span>{t('sagesGuild.tabFaq')}</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="sages-content-area">
        {activeTab === 'checkout' && (
          <div className="sages-card-grid fade-in">
            <div className="sages-info-card">
              <div className="sages-card-icon-wrapper nfc-gold">
                <Smartphone size={24} />
              </div>
              <h3>{t('sagesGuild.nfcTitle')}</h3>
              <p>{t('sagesGuild.nfcDesc')}</p>
              <div className="card-micro-tag">NFC NTAG213</div>
            </div>

            <div className="sages-info-card">
              <div className="sages-card-icon-wrapper scan-teal">
                <QrCode size={24} />
              </div>
              <h3>{t('sagesGuild.barcodeTitle')}</h3>
              <p>{t('sagesGuild.barcodeDesc')}</p>
              <div className="card-micro-tag">Barcode</div>
            </div>

            <div className="sages-info-card">
              <div className="sages-card-icon-wrapper manual-blue">
                <ClipboardList size={24} />
              </div>
              <h3>{t('sagesGuild.manualTitle')}</h3>
              <p>{t('sagesGuild.manualDesc')}</p>
              <div className="card-micro-tag">Curator Approval</div>
            </div>
          </div>
        )}

        {activeTab === 'return' && (
          <div className="sages-card-grid fade-in">
            <div className="sages-info-card">
              <div className="sages-card-icon-wrapper location-emerald">
                <Smartphone size={24} />
              </div>
              <h3>{t('sagesGuild.geofenceTitle')}</h3>
              <p>{t('sagesGuild.geofenceDesc')}</p>
              <div className="card-micro-tag">GPS Verification</div>
            </div>

            <div className="sages-info-card">
              <div className="sages-card-icon-wrapper qr-purple">
                <QrCode size={24} />
              </div>
              <h3>{t('sagesGuild.qrTitle')}</h3>
              <p>{t('sagesGuild.qrDesc')}</p>
              <div className="card-micro-tag">Physical QR Scan</div>
            </div>

            <div className="sages-info-card">
              <div className="sages-card-icon-wrapper curator-orange">
                <ClipboardList size={24} />
              </div>
              <h3>{t('sagesGuild.curatorTitle')}</h3>
              <p>{t('sagesGuild.curatorDesc')}</p>
              <div className="card-micro-tag">Drop Box Override</div>
            </div>
          </div>
        )}

        {activeTab === 'gatepass' && (
          <div className="sages-gatepass-panel fade-in">
            <div className="gatepass-visual-card">
              <div className="gatepass-header">
                <div className="gatepass-logo">ROYAL BOOK CLUB</div>
                <div className="gatepass-status">SECURE</div>
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
                <div className="gatepass-token">TOKEN: RBC-GP-827361-VALID</div>
              </div>
            </div>
            
            <div className="gatepass-info-text">
              <h3>{t('sagesGuild.gatepassTitle')}</h3>
              <p>{t('sagesGuild.gatepassDesc')}</p>
              
              <div className="gatepass-bullet-points">
                <div className="gatepass-bullet">
                  <CheckCircle2 size={16} />
                  <span>Generates automatically post-approval</span>
                </div>
                <div className="gatepass-bullet">
                  <CheckCircle2 size={16} />
                  <span>Valid for 15 minutes at exit gateway</span>
                </div>
                <div className="gatepass-bullet">
                  <CheckCircle2 size={16} />
                  <span>Stored securely on local scholar ledger</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="sages-faq-accordion fade-in">
            {faqItems.map((item, index) => (
              <div key={index} className="faq-item">
                <div className="faq-question">
                  <HelpCircle size={20} className="faq-q-icon" />
                  <h4>{item.q}</h4>
                </div>
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HelpPage;
