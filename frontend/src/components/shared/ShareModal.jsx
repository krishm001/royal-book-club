import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Mail, 
  Sparkles 
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './ShareModal.css';

const ShareModal = ({ 
  isOpen, 
  onClose, 
  title = 'Royal Book Club', 
  text = '', 
  url = window.location.href,
  type = 'book' // 'book' or 'discourse'
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const encodedUrl = encodeURIComponent(url);
  const shareText = text || title;
  const encodedText = encodeURIComponent(`${shareText}\n${url}`);
  const encodedEmailBody = encodeURIComponent(`${shareText}\n\nRead more at: ${url}`);
  const encodedEmailSubject = encodeURIComponent(`[Royal Book Club] ${title}`);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url
        });
        onClose();
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Native share error:', err);
        }
      }
    }
  };

  const shareChannels = [
    {
      name: 'WhatsApp',
      href: `https://api.whatsapp.com/send?text=${encodedText}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.539 1.771.815 2.802.815 3.18 0 5.767-2.587 5.768-5.766.001-3.181-2.585-5.767-5.768-5.767zm3.397 8.163c-.145.409-.844.757-1.168.807-.323.05-.724.084-2.18-.521-1.636-.68-2.677-2.348-2.759-2.457-.082-.109-.661-.88-.661-1.679 0-.799.418-1.192.564-1.353.146-.161.32-.202.427-.202.106 0 .213.001.306.006.098.005.23-.037.36.275.134.321.458 1.116.498 1.198.04.082.067.177.014.283-.054.106-.081.171-.161.265-.08.094-.168.21-.24.282-.08.08-.163.167-.07.327.093.16.415.685.89 1.109.611.545 1.127.714 1.287.795.16.08.254.068.348-.041.094-.109.4-.467.507-.627.107-.16.214-.134.361-.08.147.054.935.441 1.096.521.161.08.268.12.308.187.04.067.04.388-.105.797z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.178L2 22l4.966-1.398A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.633 0-3.15-.494-4.417-1.341l-.317-.213-2.946.828.842-2.868-.234-.336A8.136 8.136 0 013.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z" />
        </svg>
      ),
      color: '#25D366'
    },
    {
      name: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: '#1DA1F2'
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      color: '#1877F2'
    },
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
      color: '#0A66C2'
    },
    {
      name: 'Email',
      href: `mailto:?subject=${encodedEmailSubject}&body=${encodedEmailBody}`,
      icon: <Mail size={20} />,
      color: '#EA4335'
    }
  ];

  return (
    <div className="share-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <div className="share-title-wrap">
            <Sparkles size={18} className="gold-glow-icon" />
            <h3>
              {type === 'discourse' 
                ? t('share.shareDiscourse', 'Share Philosophical Discourse') 
                : t('share.shareTitle', 'Share with Scholars')}
            </h3>
          </div>
          <button className="share-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="share-subtitle">
          {type === 'discourse' 
            ? t('share.shareDiscourseSubtitle', 'Spread this intellectual chronicle and spark enlightened dialogue across the realms.')
            : t('share.shareSubtitle', 'Disseminate this volume and its scholarly wisdom across social channels.')}
        </p>

        {/* Preview Card */}
        <div className="share-preview-card">
          <div className="share-preview-title">{title}</div>
          <div className="share-preview-url">{url}</div>
        </div>

        {/* Native Web Share Button (if supported) */}
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button onClick={handleNativeShare} className="royal-btn-gold native-share-btn">
            <Share2 size={16} />
            <span>{t('share.nativeShare', 'Share via System Dialog')}</span>
          </button>
        )}

        {/* Social Channels Row */}
        <div className="share-channels-grid">
          {shareChannels.map((channel) => (
            <a
              key={channel.name}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="share-channel-btn"
              title={`Share on ${channel.name}`}
            >
              <span className="channel-icon" style={{ color: channel.color }}>
                {channel.icon}
              </span>
              <span className="channel-name">{channel.name}</span>
            </a>
          ))}
        </div>

        {/* Copy Link Input Bar */}
        <div className="share-copy-row">
          <input 
            type="text" 
            readOnly 
            value={url} 
            className="share-url-input" 
            onClick={(e) => e.target.select()}
          />
          <button 
            onClick={handleCopyLink} 
            className={`share-copy-btn ${copied ? 'copied' : ''}`}
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>{t('share.copied', 'Copied!')}</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>{t('share.copyLink', 'Copy Link')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
