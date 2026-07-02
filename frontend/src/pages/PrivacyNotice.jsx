import React from 'react';
import { Link } from 'react-router-dom';
import './PolicyPage.css';

export default function PrivacyNotice() {
  return (
    <div className="policy-page">
      <div className="policy-card">
        <h1>Privacy Notice for royalbookclub.com</h1>
        <p><strong>Last Updated:</strong> June 2026</p>
        <p>Welcome to <strong>royalbookclub.com</strong> ("we," "our," or "us"). We are an independent group of book enthusiasts operating this website from <strong>India</strong>. We respect your privacy and are committed to protecting your personal data.</p>
        <p>This Privacy Notice explains how we collect, use, and safeguard your information when you sign up on our website.</p>

        <h2>1. Information We Collect</h2>
        <p>We only collect personal information that you voluntarily provide to us.</p>
        <ul>
          <li><strong>Current Requirements:</strong> To create an account, you must provide your <strong>email address</strong> and a <strong>password</strong>.</li>
          <li><strong>Member Profiles & Address Registry:</strong> For members, there is a way to provide your <strong>phone number</strong> and <strong>postal address (including house number)</strong>. These may be made mandatory for certain active features such as checking out scholarly volumes from our library.</li>
          <li><strong>Future Requirements:</strong> We may ask you for additional details to improve your experience in the future, including a <strong>profile photo</strong>.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To create, maintain, and secure your book club account.</li>
          <li>To communicate club updates, newsletter mailings, and event notifications.</li>
          <li>To support and process library book checkouts.</li>
          <li>To reach out and contact you in case a borrowed library book's return is overdue.</li>
        </ul>

        <h2>3. Legal Basis for Processing (India DPDP Act)</h2>
        <p>By filling out the sign-up form and clicking "Register" or "Sign Up," you give us your <strong>explicit consent</strong> to process your data for the purposes listed above. You have the right to withdraw your consent at any time.</p>

        <h2>4. Data Storage and Security</h2>
        <ul>
          <li><strong>No Commercial Sharing:</strong> We do not sell, rent, or trade your personal data with third-party companies.</li>
          <li><strong>Security Measures:</strong> We use standard security protocols (like HTTPS encryption) to protect your login credentials. However, please remember that no method of transmission over the internet is 100% secure.</li>
        </ul>

        <h2>5. Your Rights</h2>
        <p>Under applicable Indian data protection laws, you have the right to:</p>
        <ul>
          <li><strong>Access and Review:</strong> See what data we hold about you.</li>
          <li><strong>Correct or Update:</strong> Fix any inaccurate or outdated information.</li>
          <li><strong>Erasure ("Right to be Forgotten"):</strong> Request that we delete your account and remove all your personal data from our database.</li>
        </ul>

        <h2>6. Contact Us</h2>
        <p>If you have any questions, wish to update your details, or want your data completely deleted from our system, please contact our team lead at:</p>
        <ul>
          <li><strong>Email:</strong> my_krs@yahoo.com</li>
        </ul>

        <div className="policy-return">
          <Link to="/auth/signup">Return to Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
