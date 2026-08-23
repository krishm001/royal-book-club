import { useLanguage } from '../i18n/LanguageContext';
import React from 'react';
import { Link } from 'react-router-dom';
import './PolicyPage.css';
export default function PrivacyNotice() {
  const {
    t
  } = useLanguage();
  return <div className="policy-page">
      <div className="policy-card">
        <h1>{t('auto_3135', 'Privacy Notice for royalbookclub.com')}</h1>
        <p><strong>{t("str_5084", "Last Updated:")}</strong> {t('auto_3136', 'June 2026')}</p>
        <p>{t('auto_3137', 'Welcome to')} <strong>{t('auto_3138', 'royalbookclub.com')}</strong> {t("str_5085", "(\"we,\" \"our,\" or \"us\"). We are an independent group of book enthusiasts operating this website from")} <strong>{t('auto_3139', 'India')}</strong>{t('auto_3140', '. We respect your privacy and are committed to protecting your personal data.')}</p>
        <p>{t('auto_3141', 'This Privacy Notice explains how we collect, use, and safeguard your information when you sign up on our website.')}</p>

        <h2>{t('auto_3142', '1. Information We Collect')}</h2>
        <p>{t('auto_3143', 'We only collect personal information that you voluntarily provide to us.')}</p>
        <ul>
          <li><strong>{t("str_5086", "Current Requirements:")}</strong> {t('auto_3144', 'To create an account, you must provide your')} <strong>{t('auto_3145', 'email address')}</strong> {t('auto_3146', 'and a')} <strong>{t('auto_3147', 'password')}</strong>.</li>
          <li><strong>{t("str_5087", "Member Profiles & Address Registry:")}</strong> {t('auto_3148', 'For members, there is a way to provide your')} <strong>{t('auto_3149', 'phone number')}</strong> {t('auto_3150', 'and')} <strong>{t("str_5088", "postal address (including house number)")}</strong>{t('auto_3151', '. These may be made mandatory for certain active features such as checking out scholarly volumes from our library.')}</li>
          <li><strong>{t("str_5089", "Future Requirements:")}</strong> {t('auto_3152', 'We may ask you for additional details to improve your experience in the future, including a')} <strong>{t('auto_3153', 'profile photo')}</strong>.</li>
        </ul>

        <h2>{t('auto_3154', '2. How We Use Your Information')}</h2>
        <ul>
          <li>{t('auto_3155', 'To create, maintain, and secure your book club account.')}</li>
          <li>{t('auto_3156', 'To communicate club updates, newsletter mailings, and event notifications.')}</li>
          <li>{t('auto_3157', 'To support and process library book checkouts.')}</li>
          <li>{t("str_5090", "To reach out and contact you in case a borrowed library book's return is overdue.")}</li>
        </ul>

        <h2>{t("str_5091", "3. Legal Basis for Processing (India DPDP Act)")}</h2>
        <p>{t("str_5092", "By filling out the sign-up form and clicking \"Register\" or \"Sign Up,\" you give us your")} <strong>{t('auto_3158', 'explicit consent')}</strong> {t('auto_3159', 'to process your data for the purposes listed above. You have the right to withdraw your consent at any time.')}</p>

        <h2>{t('auto_3160', '4. Data Storage and Security')}</h2>
        <ul>
          <li><strong>{t("str_5093", "No Commercial Sharing:")}</strong> {t('auto_3161', 'We do not sell, rent, or trade your personal data with third-party companies.')}</li>
          <li><strong>{t("str_5094", "Security Measures:")}</strong> {t("str_5095", "We use standard security protocols (like HTTPS encryption) to protect your login credentials. However, please remember that no method of transmission over the internet is 100% secure.")}</li>
        </ul>

        <h2>{t('auto_3162', '5. Your Rights')}</h2>
        <p>{t("str_5096", "Under applicable Indian data protection laws, you have the right to:")}</p>
        <ul>
          <li><strong>{t("str_5097", "Access and Review:")}</strong> {t('auto_3163', 'See what data we hold about you.')}</li>
          <li><strong>{t("str_5098", "Correct or Update:")}</strong> {t('auto_3164', 'Fix any inaccurate or outdated information.')}</li>
          <li><strong>{t("str_5099", "Erasure (\"Right to be Forgotten\"):")}</strong> {t('auto_3165', 'Request that we delete your account and remove all your personal data from our database.')}</li>
        </ul>

        <h2>{t('auto_3166', '6. Contact Us')}</h2>
        <p>{t("str_5100", "If you have any questions, wish to update your details, or want your data completely deleted from our system, please contact our team lead at:")}</p>
        <ul>
          <li><strong>{t("str_5101", "Email:")}</strong> {t('auto_3167', 'my_krs@yahoo.com')}</li>
        </ul>

        <div className="policy-return">
          <Link to="/auth/signup">{t('auto_3168', 'Return to Sign Up')}</Link>
        </div>
      </div>
    </div>;
}