import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../../services/authApi';
import { useLanguage } from '../../i18n/LanguageContext';
import './Auth.css';

export default function SignUp() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!consentChecked) {
      setError(t('auth.consentError'));
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Create Firestore user record
      await registerUser(user.uid, email, displayName);

      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>{t('auth.signUp')}</h2>
        <label>{t('auth.fullName')}</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        
        <label>{t('auth.email')}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        
        <label>{t('auth.password')}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <div className="checkbox-field">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
            />
            <span>
              {t('auth.consentPart1')}
              <Link to="/terms">{t('common.termsAndConditions')}</Link>
              {t('auth.consentPart2')}
              <Link to="/privacy">{t('common.privacyNotice')}</Link>
              {t('auth.consentPart3')}
            </span>
          </label>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="royal-btn" disabled={loading}>
          {loading ? t('auth.creating') : t('auth.createAccount')}
        </button>
        <div>
          <span>{t('auth.alreadyMember')}</span>
          <Link to="/auth/signin">{t('auth.signIn')}</Link>
        </div>
      </form>
    </div>
  );
}
