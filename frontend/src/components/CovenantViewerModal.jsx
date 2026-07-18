import React from 'react';
import { ShieldCheck, FileText, X } from 'lucide-react';
import './CovenantViewerModal.css';

export default function CovenantViewerModal({ type, onAccept, onDecline, onClose }) {
  const isTerms = type === 'terms';

  const TermsContent = () => (
    <div className="covenant-text-body">
      <p className="covenant-meta"><strong>Last Updated:</strong> June 2026</p>
      <p>Welcome to <strong>royalbookclub.com</strong> ("Website"). This Website is owned and operated by an independent, unincorporated group of book enthusiasts based in India ("we," "us," or "our").</p>
      <p>By accessing or signing up for an account on this Website, you ("User," "Member," or "Data Principal") agree to comply with and be bound by the following Terms and Conditions. If you do not agree, please do not use this Website.</p>

      <h3>1. Eligibility & Registration</h3>
      <ul>
        <li>You must provide a valid email address and a secure password to create an account.</li>
        <li>You agree to provide accurate, truthful, and authentic information. Impersonating someone else or using a fake email is strictly prohibited.</li>
        <li>Accounts are for personal, non-commercial use only.</li>
      </ul>

      <h3>2. Community Code of Conduct</h3>
      <p>As a member of royalbookclub.com, you agree to interact respectfully with other members. You are strictly prohibited from posting content that is:</p>
      <ul>
        <li>Defamatory, abusive, obscene, hateful, or harassing.</li>
        <li>Infringing on third-party intellectual property or copyrights (e.g., sharing pirated PDFs of books).</li>
        <li>Spam, commercial advertisements, or unauthorized links.</li>
      </ul>

      <h3>3. User-Generated Content</h3>
      <ul>
        <li>Anything you post (reviews, comments, forum posts, or profile photos) remains your intellectual property.</li>
        <li>However, by posting on our Website, you grant royalbookclub.com a non-exclusive, royalty-free, worldwide license to display your content to other members within the club.</li>
      </ul>

      <h3>4. Limitation of Liability</h3>
      <p>This Website is provided on an "as-is" and "as-available" basis for informational and community building purposes.</p>
      <p>Because we are an independent, non-corporate group, we are not liable for any direct, indirect, or accidental damages resulting from your use of the Website, data transmission glitches, or interactions with other members.</p>

      <h3>5. Account Termination</h3>
      <ul>
        <li>We reserve the right to suspend or terminate your account at any time, without prior notice, if you violate these Terms or disrupt the book club community.</li>
        <li>You may delete your account and request data erasure at any time by contacting us.</li>
      </ul>

      <h3>6. Governing Law</h3>
      <p>These Terms are governed by and construed in accordance with the laws of <strong>India</strong>. Any disputes arising out of your use of this website shall be handled through mutual discussion, or failing that, under the jurisdiction of local courts where our team leads operate.</p>
    </div>
  );

  const PrivacyContent = () => (
    <div className="covenant-text-body">
      <p className="covenant-meta"><strong>Last Updated:</strong> June 2026</p>
      <p>Welcome to <strong>royalbookclub.com</strong> ("we," "our," or "us"). We are an independent group of book enthusiasts operating this website from <strong>India</strong>. We respect your privacy and are committed to protecting your personal data.</p>
      <p>This Privacy Notice explains how we collect, use, and safeguard your information when you sign up on our website.</p>

      <h3>1. Information We Collect</h3>
      <p>We only collect personal information that you voluntarily provide to us.</p>
      <ul>
        <li><strong>Current Requirements:</strong> To create an account, you must provide your <strong>email address</strong> and a <strong>password</strong>.</li>
        <li><strong>Member Profiles & Address Registry:</strong> For members, there is a way to provide your <strong>phone number</strong> and <strong>postal address (including house number)</strong>. These may be made mandatory for certain active features such as checking out scholarly volumes from our library.</li>
        <li><strong>Future Requirements:</strong> We may ask you for additional details to improve your experience in the future, including a <strong>profile photo</strong>.</li>
      </ul>

      <h3>2. How We Use Your Information</h3>
      <ul>
        <li>To create, maintain, and secure your book club account.</li>
        <li>To communicate club updates, newsletter mailings, and event notifications.</li>
        <li>To support and process library book checkouts.</li>
        <li>To reach out and contact you in case a borrowed library book's return is overdue.</li>
      </ul>

      <h3>3. Legal Basis for Processing (India DPDP Act)</h3>
      <p>By filling out the sign-up form and clicking "Register" or "Sign Up," you give us your <strong>explicit consent</strong> to process your data for the purposes listed above. You have the right to withdraw your consent at any time.</p>

      <h3>4. Data Storage and Security</h3>
      <ul>
        <li><strong>No Commercial Sharing:</strong> We do not sell, rent, or trade your personal data with third-party companies.</li>
        <li><strong>Security Measures:</strong> We use standard security protocols (like HTTPS encryption) to protect your login credentials. However, please remember that no method of transmission over the internet is 100% secure.</li>
      </ul>

      <h3>5. Your Rights</h3>
      <p>Under applicable Indian data protection laws, you have the right to:</p>
      <ul>
        <li><strong>Access and Review:</strong> See what data we hold about you.</li>
        <li><strong>Correct or Update:</strong> Fix any inaccurate or outdated information.</li>
        <li><strong>Erasure ("Right to be Forgotten"):</strong> Request that we delete your account and remove all your personal data from our database.</li>
      </ul>

      <h3>6. Contact Us</h3>
      <p>If you have any questions, wish to update your details, or want your data completely deleted from our system, please contact our team lead at:</p>
      <ul>
        <li><strong>Email:</strong> my_krs@yahoo.com</li>
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
            Decline
          </button>
          <button 
            type="button" 
            className="covenant-accept-btn" 
            onClick={onAccept}
          >
            Accept Covenant
          </button>
        </div>
      </div>
    </div>
  );
}
