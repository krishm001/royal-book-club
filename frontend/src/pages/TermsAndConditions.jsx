import React from 'react';
import { Link } from 'react-router-dom';
import './PolicyPage.css';

export default function TermsAndConditions() {
  return (
    <div className="policy-page">
      <div className="policy-card">
        <h1>Terms and Conditions for royalbookclub.com</h1>
        <p><strong>Last Updated:</strong> June 2026</p>
        <p>Welcome to <strong>royalbookclub.com</strong> ("Website"). This Website is owned and operated by an independent, unincorporated group of book enthusiasts based in India ("we," "us," or "our").</p>
        <p>By accessing or signing up for an account on this Website, you ("User," "Member," or "Data Principal") agree to comply with and be bound by the following Terms and Conditions. If you do not agree, please do not use this Website.</p>

        <h2>1. Eligibility & Registration</h2>
        <ul>
          <li>You must provide a valid email address and a secure password to create an account.</li>
          <li>You agree to provide accurate, truthful, and authentic information. Impersonating someone else or using a fake email is strictly prohibited.</li>
          <li>Accounts are for personal, non-commercial use only.</li>
        </ul>

        <h2>2. Community Code of Conduct</h2>
        <p>As a member of royalbookclub.com, you agree to interact respectfully with other members. You are strictly prohibited from posting content that is:</p>
        <ul>
          <li>Defamatory, abusive, obscene, hateful, or harassing.</li>
          <li>Infringing on third-party intellectual property or copyrights (e.g., sharing pirated PDFs of books).</li>
          <li>Spam, commercial advertisements, or unauthorized links.</li>
        </ul>

        <h2>3. User-Generated Content</h2>
        <ul>
          <li>Anything you post (reviews, comments, forum posts, or profile photos) remains your intellectual property.</li>
          <li>However, by posting on our Website, you grant royalbookclub.com a non-exclusive, royalty-free, worldwide license to display your content to other members within the club.</li>
        </ul>

        <h2>4. Limitation of Liability</h2>
        <p>This Website is provided on an "as-is" and "as-available" basis for informational and community building purposes.</p>
        <p>Because we are an independent, non-corporate group, we are not liable for any direct, indirect, or accidental damages resulting from your use of the Website, data transmission glitches, or interactions with other members.</p>

        <h2>5. Account Termination</h2>
        <ul>
          <li>We reserve the right to suspend or terminate your account at any time, without prior notice, if you violate these Terms or disrupt the book club community.</li>
          <li>You may delete your account and request data erasure at any time by contacting us.</li>
        </ul>

        <h2>6. Governing Law</h2>
        <p>These Terms are governed by and construed in accordance with the laws of <strong>India</strong>. Any disputes arising out of your use of this website shall be handled through mutual discussion, or failing that, under the jurisdiction of local courts where our team leads operate.</p>

        <div className="policy-return">
          <Link to="/auth/signup">Return to Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
