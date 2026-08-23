import { useLanguage } from '../i18n/LanguageContext';
import React from 'react';
import { Link } from 'react-router-dom';
import './PolicyPage.css';
export default function TermsAndConditions() {
  const {
    t
  } = useLanguage();
  return <div className="policy-page">
      <div className="policy-card">
        <h1>{t('auto_3169', 'Terms and Conditions for royalbookclub.com')}</h1>
        <p><strong>{t("str_5102", "Last Updated:")}</strong> {t('auto_3170', 'June 2026')}</p>
        <p>{t('auto_3171', 'Welcome to')} <strong>{t('auto_3172', 'royalbookclub.com')}</strong> {t("str_5103", "(\"Website\"). This Website is owned and operated by an independent, unincorporated group of book enthusiasts based in India (\"we,\" \"us,\" or \"our\").")}</p>
        <p>{t("str_5104", "By accessing or signing up for an account on this Website, you (\"User,\" \"Member,\" or \"Data Principal\") agree to comply with and be bound by the following Terms and Conditions. If you do not agree, please do not use this Website.")}</p>

        <h2>{t('auto_3173', '1. Eligibility & Registration')}</h2>
        <ul>
          <li>{t('auto_3174', 'You must provide a valid email address and a secure password to create an account.')}</li>
          <li>{t('auto_3175', 'You agree to provide accurate, truthful, and authentic information. Impersonating someone else or using a fake email is strictly prohibited.')}</li>
          <li>{t('auto_3176', 'Accounts are for personal, non-commercial use only.')}</li>
        </ul>

        <h2>{t('auto_3177', '2. Community Code of Conduct')}</h2>
        <p>{t("str_5105", "As a member of royalbookclub.com, you agree to interact respectfully with other members. You are strictly prohibited from posting content that is:")}</p>
        <ul>
          <li>{t('auto_3178', 'Defamatory, abusive, obscene, hateful, or harassing.')}</li>
          <li>{t("str_5106", "Infringing on third-party intellectual property or copyrights (e.g., sharing pirated PDFs of books).")}</li>
          <li>{t('auto_3179', 'Spam, commercial advertisements, or unauthorized links.')}</li>
        </ul>

        <h2>{t('auto_3180', '3. User-Generated Content')}</h2>
        <ul>
          <li>{t("str_5107", "Anything you post (reviews, comments, forum posts, or profile photos) remains your intellectual property.")}</li>
          <li>{t('auto_3181', 'However, by posting on our Website, you grant royalbookclub.com a non-exclusive, royalty-free, worldwide license to display your content to other members within the club.')}</li>
        </ul>

        <h2>{t('auto_3182', '4. Limitation of Liability')}</h2>
        <p>{t("str_5108", "This Website is provided on an \"as-is\" and \"as-available\" basis for informational and community building purposes.")}</p>
        <p>{t('auto_3183', 'Because we are an independent, non-corporate group, we are not liable for any direct, indirect, or accidental damages resulting from your use of the Website, data transmission glitches, or interactions with other members.')}</p>

        <h2>{t('auto_3184', '5. Account Termination')}</h2>
        <ul>
          <li>{t('auto_3185', 'We reserve the right to suspend or terminate your account at any time, without prior notice, if you violate these Terms or disrupt the book club community.')}</li>
          <li>{t('auto_3186', 'You may delete your account and request data erasure at any time by contacting us.')}</li>
        </ul>

        <h2>{t('auto_3187', '6. Intellectual Property Protection & Anti-Scraping Policy')}</h2>
        <p>{t('auto_3188', 'All content present on this Website, including but not limited to scholastic book catalogs, reviews, literary critiques, discussion threads, custom graphics, and layout, is protected under intellectual property and copyright laws of India.')}</p>
        <ul>
          <li>{t("str_5109", "Automated harvesting, data mining, scraping, or crawling of this website by any AI training models, large language models (LLMs), machine learning systems, or unauthorized automated agents is strictly prohibited without our prior written consent.")}</li>
          <li>{t('auto_3189', 'Violating this policy constitutes a material breach of these Terms, and we reserve the right to block offending IP addresses, terminate accounts without warning, and pursue legal remedies under the Information Technology Act, 2000, and other applicable laws of India.')}</li>
        </ul>

        <h2>{t('auto_3190', '7. Governing Law')}</h2>
        <p>{t('auto_3191', 'These Terms are governed by and construed in accordance with the laws of')} <strong>{t('auto_3192', 'India')}</strong>{t('auto_3193', '. Any disputes arising out of your use of this website shall be handled through mutual discussion, or failing that, under the jurisdiction of local courts where our team leads operate.')}</p>

        <div className="policy-return">
          <Link to="/auth/signup">{t('auto_3194', 'Return to Sign Up')}</Link>
        </div>
      </div>
    </div>;
}