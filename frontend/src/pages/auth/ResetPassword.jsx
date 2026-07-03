import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import './Auth.css';

export default function ResetPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(t('auth.resetLinkSent'));
    } catch (err) {
      setError(err.message || t('auth.resetLinkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>{t('auth.resetPassword')}</h2>
        <label>{t('auth.email')}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your.email@example.com"
        />

        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="royal-btn" disabled={loading}>
          {loading ? t('auth.sending') : t('auth.sendResetLink')}
        </button>

        <div>
          <span>{t('auth.rememberedPassword')}</span>
          <Link to="/auth/signin">{t('auth.signIn')}</Link>
        </div>
        <div>
          <span>{t('auth.needAccount')}</span>
          <Link to="/auth/signup">{t('auth.signUp')}</Link>
        </div>
      </form>
    </div>
  );
}
