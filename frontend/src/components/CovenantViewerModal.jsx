import { useLanguage } from '../i18n/LanguageContext';
import React from 'react';
import { ShieldCheck, FileText, X } from 'lucide-react';
import './CovenantViewerModal.css';

export default function CovenantViewerModal({ type, onAccept, onDecline, onClose }) {
  const { t } = useLanguage();

  const isTerms = type === 'terms';

  const TermsContent = () => (
    <div className="covenant-text-body">
      <p className="covenant-meta"><strong>Last Updated:</strong> {t('auto_3022', 'June 2026')}</p>
      <p>{t('auto_3023', 'Welcome to')} <strong>{t('auto_3024', 'royalbookclub.com')}</strong> ("Website"). This Website is owned and operated by an independent, unincorporated group of book enthusiasts based in India ("we," "us," or "our").</p>
      <p>By accessing or signing up for an account on this Website, you ("User," "Member," or "Data Principal") agree to comply with and be bound by the following Terms and Conditions. If you do not agree, please do not use this Website.</p>

      <h3>{t('auto_3025', '1. Eligibility & Registration')}</h3>
      <ul>
        <li>{t('auto_3026', 'You must provide a valid email address and a secure password to create an account.')}</li>
        <li>{t('auto_3027', 'You agree to provide accurate, truthful, and authentic information. Impersonating someone else or using a fake email is strictly prohibited.')}</li>
        <li>{t('auto_3028', 'Accounts are for personal, non-commercial use only.')}</li>
      </ul>

      <h3>{t('auto_3029', '2. Community Code of Conduct')}</h3>
      <p>As a member of royalbookclub.com, you agree to interact respectfully with other members. You are strictly prohibited from posting content that is:</p>
      <ul>
        <li>{t('auto_3030', 'Defamatory, abusive, obscene, hateful, or harassing.')}</li>
        <li>Infringing on third-party intellectual property or copyrights (e.g., sharing pirated PDFs of books).</li>
        <li>{t('auto_3031', 'Spam, commercial advertisements, or unauthorized links.')}</li>
      </ul>

      <h3>{t('auto_3032', '3. User-Generated Content')}</h3>
      <ul>
        <li>Anything you post (reviews, comments, forum posts, or profile photos) remains your intellectual property.</li>
        <li>{t('auto_3033', 'However, by posting on our Website, you grant royalbookclub.com a non-exclusive, royalty-free, worldwide license to display your content to other members within the club.')}</li>
      </ul>

      <h3>{t('auto_3034', '4. Limitation of Liability')}</h3>
      <p>This Website is provided on an "as-is" and "as-available" basis for informational and community building purposes.</p>
      <p>{t('auto_3035', 'Because we are an independent, non-corporate group, we are not liable for any direct, indirect, or accidental damages resulting from your use of the Website, data transmission glitches, or interactions with other members.')}</p>

      <h3>{t('auto_3036', '5. Account Termination')}</h3>
      <ul>
        <li>{t('auto_3037', 'We reserve the right to suspend or terminate your account at any time, without prior notice, if you violate these Terms or disrupt the book club community.')}</li>
        <li>{t('auto_3038', 'You may delete your account and request data erasure at any time by contacting us.')}</li>
      </ul>

      <h3>{t('auto_3039', '6. Intellectual Property Protection & Anti-Scraping Policy')}</h3>
      <p>{t('auto_3040', 'All content present on this Website, including but not limited to scholastic book catalogs, reviews, literary critiques, discussion threads, custom graphics, and layout, is protected under intellectual property and copyright laws of India.')}</p>
      <ul>
        <li>Automated harvesting, data mining, scraping, or crawling of this website by any AI training models, large language models (LLMs), machine learning systems, or unauthorized automated agents is strictly prohibited without our prior written consent.</li>
        <li>{t('auto_3041', 'Violating this policy constitutes a material breach of these Terms, and we reserve the right to block offending IP addresses, terminate accounts without warning, and pursue legal remedies under the Information Technology Act, 2000, and other applicable laws of India.')}</li>
      </ul>

      <h3>{t('auto_3042', '7. Governing Law')}</h3>
      <p>{t('auto_3043', 'These Terms are governed by and construed in accordance with the laws of')} <strong>{t('auto_3044', 'India')}</strong>{t('auto_3045', '. Any disputes arising out of your use of this website shall be handled through mutual discussion, or failing that, under the jurisdiction of local courts where our team leads operate.')}</p>
    </div>
  );

  const PrivacyContent = () => (
    <div className="covenant-text-body">
      <p className="covenant-meta"><strong>Last Updated:</strong> {t('auto_3046', 'June 2026')}</p>
      <p>{t('auto_3047', 'Welcome to')} <strong>{t('auto_3048', 'royalbookclub.com')}</strong> ("we," "our," or "us"). We are an independent group of book enthusiasts operating this website from <strong>{t('auto_3049', 'India')}</strong>{t('auto_3050', '. We respect your privacy and are committed to protecting your personal data.')}</p>
      <p>{t('auto_3051', 'This Privacy Notice explains how we collect, use, and safeguard your information when you sign up on our website.')}</p>

      <h3>{t('auto_3052', '1. Information We Collect')}</h3>
      <p>{t('auto_3053', 'We only collect personal information that you voluntarily provide to us.')}</p>
      <ul>
        <li><strong>Current Requirements:</strong> {t('auto_3054', 'To create an account, you must provide your')} <strong>{t('auto_3055', 'email address')}</strong> {t('auto_3056', 'and a')} <strong>{t('auto_3057', 'password')}</strong>.</li>
        <li><strong>Member Profiles & Address Registry:</strong> {t('auto_3058', 'For members, there is a way to provide your')} <strong>{t('auto_3059', 'phone number')}</strong> {t('auto_3060', 'and')} <strong>postal address (including house number)</strong>{t('auto_3061', '. These may be made mandatory for certain active features such as checking out scholarly volumes from our library.')}</li>
        <li><strong>Future Requirements:</strong> {t('auto_3062', 'We may ask you for additional details to improve your experience in the future, including a')} <strong>{t('auto_3063', 'profile photo')}</strong>.</li>
      </ul>

      <h3>{t('auto_3064', '2. How We Use Your Information')}</h3>
      <ul>
        <li>{t('auto_3065', 'To create, maintain, and secure your book club account.')}</li>
        <li>{t('auto_3066', 'To communicate club updates, newsletter mailings, and event notifications.')}</li>
        <li>{t('auto_3067', 'To support and process library book checkouts.')}</li>
        <li>To reach out and contact you in case a borrowed library book's return is overdue.</li>
      </ul>

      <h3>3. Legal Basis for Processing (India DPDP Act)</h3>
      <p>By filling out the sign-up form and clicking "Register" or "Sign Up," you give us your <strong>{t('auto_3068', 'explicit consent')}</strong> {t('auto_3069', 'to process your data for the purposes listed above. You have the right to withdraw your consent at any time.')}</p>

      <h3>{t('auto_3070', '4. Data Storage and Security')}</h3>
      <ul>
        <li><strong>No Commercial Sharing:</strong> {t('auto_3071', 'We do not sell, rent, or trade your personal data with third-party companies.')}</li>
        <li><strong>Security Measures:</strong> We use standard security protocols (like HTTPS encryption) to protect your login credentials. However, please remember that no method of transmission over the internet is 100% secure.</li>
      </ul>

      <h3>{t('auto_3072', '5. Your Rights')}</h3>
      <p>Under applicable Indian data protection laws, you have the right to:</p>
      <ul>
        <li><strong>Access and Review:</strong> {t('auto_3073', 'See what data we hold about you.')}</li>
        <li><strong>Correct or Update:</strong> {t('auto_3074', 'Fix any inaccurate or outdated information.')}</li>
        <li><strong>Erasure ("Right to be Forgotten"):</strong> {t('auto_3075', 'Request that we delete your account and remove all your personal data from our database.')}</li>
      </ul>

      <h3>{t('auto_3076', '6. Contact Us')}</h3>
      <p>If you have any questions, wish to update your details, or want your data completely deleted from our system, please contact our team lead at:</p>
      <ul>
        <li><strong>Email:</strong> {t('auto_3077', 'my_krs@yahoo.com')}</li>
      </ul>
    </div>
  );

  return (
    <div className="covenant-viewer-overlay">
      <div className="covenant-viewer-modal animate-scale-up">
        <div className="covenant-viewer-header">
          <div className="covenant-viewer-title-group">
            {isTerms ? (
              <FileText className="gold-glow-icon" size={24} />
            ) : (
              <ShieldCheck className="gold-glow-icon" size={24} />
            )}
            <h2>
              {isTerms ? 'Covenant Terms & Conditions' : 'Privacy Notice & Data Shield'}
            </h2>
          </div>
          <button className="covenant-close-btn" onClick={onClose} aria-label="Close covenant viewer">
            <X size={18} />
          </button>
        </div>

        <div className="covenant-viewer-scrollable">
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </div>

        <div className="covenant-viewer-footer">
          <button 
            type="button" 
            className="covenant-decline-btn" 
            onClick={onDecline}
          >
            {t('auto_3078', 'Decline')}
          </button>
          <button 
            type="button" 
            className="covenant-accept-btn" 
            onClick={onAccept}
          >
            {t('auto_3079', 'Accept Covenant')}
          </button>
        </div>
      </div>
    </div>
  );
}
