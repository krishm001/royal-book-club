import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { 
  Wifi, 
  Battery, 
  Signal, 
  Chrome, 
  Linkedin, 
  Mail, 
  CheckCircle, 
  QrCode, 
  BookOpen,
  User,
  Lock
} from 'lucide-react';
import ContinuousScannerAnimation from '../shared/ContinuousScannerAnimation';
import './HelpSceneAnimation.css';

export default function HelpSceneAnimation({ scene, book, isPaused, onSceneEnd }) {
  const { t } = useLanguage();
  const [deviceEnv, setDeviceEnv] = useState({ isIOS: false, isMobile: false });

  useEffect(() => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    setDeviceEnv({ isIOS, isMobile });
  }, []);

  useEffect(() => {
    // If the scene has a specific duration, we could trigger onSceneEnd here
    // For now, we leave timing control to the parent or specific CSS animation events
  }, [scene, onSceneEnd]);

  const defaultBook = book || {
    title: t('help.sample_book_title', 'The Royal Gardens'),
    author: t('help.sample_book_author', 'A. Hawthorne'),
    coverUrl: 'https://via.placeholder.com/150x220/2c3e50/d4af37?text=Royal+Gardens',
  };

  const renderPhoneStatusBar = () => (
    <div className={`phone-status-bar ${deviceEnv.isIOS ? 'ios' : 'android'}`}>
      <span className="time">9:41</span>
      <div className="status-icons">
        <Signal size={12} />
        <Wifi size={12} />
        <Battery size={12} />
      </div>
    </div>
  );

  const renderLargePhoneScreen = (content) => (
    <div className="large-phone-container">
      <div className={`large-phone-mockup ${deviceEnv.isIOS ? 'ios' : 'android'}`}>
        {deviceEnv.isIOS && <div className="notch" />}
        {renderPhoneStatusBar()}
        <div className="phone-screen-content">
          {content}
        </div>
        {deviceEnv.isIOS && <div className="home-indicator" />}
      </div>
    </div>
  );

  const renderSceneContent = () => {
    switch (scene) {
      case 'welcome':
        return (
          <div className="help-scene-custom welcome-scene">
            <div className="glow-effect golden-glow" />
            <div className="library-shelf">
              <div className="shelf-level top-level">
                <div className="book-spine b1" />
                <div className="book-spine b2" />
                <div className="book-spine b3" />
              </div>
              <div className="shelf-level mid-level">
                <div className="book-spine b4" />
                <div className="book-spine target-book-spine" />
                <div className="book-spine b5" />
              </div>
            </div>
            <div className="person-silhouette standing" />
          </div>
        );

      case 'pickup':
        return (
          <div className="help-scene-custom pickup-scene">
            <div className="library-shelf">
              <div className="shelf-level mid-level">
                <div className="book-spine b4" />
                <div className="book-spine b5" />
              </div>
            </div>
            <div className="person-silhouette reaching">
              <div className="arm-reaching" />
            </div>
            <div className="transitioning-book">
              <div className="spine" />
              <div className="front" style={{ backgroundImage: `url(${defaultBook.coverUrl})` }} />
            </div>
          </div>
        );

      case 'nfc_scan':
      case 'qr_scan':
      case 'return_nfc':
      case 'return_qr': {
        const isNFC = scene.includes('nfc');
        const isReturn = scene.includes('return');
        return (
          <div className="help-scene-scanner-wrapper slow-scan">
            <ContinuousScannerAnimation 
              type={isNFC ? 'nfc' : 'barcode'} 
              action={isReturn ? 'return' : 'checkout'}
              book={defaultBook}
            />
          </div>
        );
      }

      case 'phone_screen_detail':
        return renderLargePhoneScreen(
          <div className="mock-screen-detail">
            <div className="detail-header">
              <BookOpen size={20} />
            </div>
            <div className="detail-cover">
              <img src={defaultBook.coverUrl} alt={defaultBook.title} />
            </div>
            <h3 className="detail-title">{defaultBook.title}</h3>
            <p className="detail-author">{defaultBook.author}</p>
            <div className="detail-actions">
              <button className="btn-gold-mock">{t('action.checkout', 'Checkout')}</button>
            </div>
          </div>
        );

      case 'phone_screen_login':
        return renderLargePhoneScreen(
          <div className="mock-screen-login">
            <div className="login-logo">
              <div className="logo-circle" />
            </div>
            <h3 className="login-title">{t('auth.welcome', 'Welcome')}</h3>
            <div className="login-buttons">
              <div className="btn-social-mock">
                <Chrome size={16} /> {t('auth.google', 'Continue with Google')}
              </div>
              <div className="btn-social-mock">
                <Linkedin size={16} /> {t('auth.linkedin', 'Continue with LinkedIn')}
              </div>
              <div className="divider-mock">
                <span>{t('auth.or', 'or')}</span>
              </div>
              <div className="btn-social-mock outline">
                <Mail size={16} /> {t('auth.email', 'Continue with Email')}
              </div>
            </div>
          </div>
        );

      case 'phone_screen_gatepass':
        return renderLargePhoneScreen(
          <div className="mock-screen-gatepass">
            <h3 className="gatepass-title">{t('gatepass.title', 'Exit Gatepass')}</h3>
            <p className="gatepass-desc">{t('gatepass.scan_at_exit', 'Scan at the exit gates')}</p>
            <div className="gatepass-barcode-box">
              <QrCode size={80} className="barcode-icon" />
              <div className="barcode-bars">
                <div className="bar w-1" />
                <div className="bar w-2" />
                <div className="bar w-1" />
                <div className="bar w-3" />
                <div className="bar w-1" />
                <div className="bar w-2" />
              </div>
            </div>
            <div className="gatepass-status success">
              <CheckCircle size={16} /> {t('gatepass.active', 'Active')}
            </div>
          </div>
        );

      case 'return_complete':
        return (
          <div className="help-scene-custom return-complete-scene">
            <div className="library-shelf blurred">
              <div className="shelf-level mid-level">
                <div className="book-spine b4" />
                <div className="book-spine target-book-spine returned" />
                <div className="book-spine b5" />
              </div>
            </div>
            <div className="completion-overlay">
              <div className="success-badge">
                <CheckCircle size={48} />
              </div>
              <p>{t('return.success', 'Return Complete!')}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`help-scene-container ${isPaused ? 'help-scene-paused' : ''} scene-${scene}`}>
      {renderSceneContent()}
    </div>
  );
}
