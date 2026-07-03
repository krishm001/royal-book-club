import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import './Auth.css';

const googleProvider = new GoogleAuthProvider();

export default function SignIn() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const authFormRef = React.useRef(null);

  React.useEffect(() => {
    if (authFormRef.current) {
      setTimeout(() => {
        authFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Sign in failed');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="auth-page">
      <form ref={authFormRef} onSubmit={handleSubmit} className="auth-form">
        <h2>{t('auth.signIn')}</h2>

        {/* Premium Google Sign-In Highlighted at the Top */}
        <button 
          type="button" 
          className="social-button google-button" 
          onClick={handleGoogleSignIn}
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f6f6f6 100%)',
            border: '2px solid var(--accent)',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)',
            borderRadius: '8px',
            color: '#1a1a1a',
            fontWeight: '700',
            padding: '12px 16px',
            transition: 'all 0.2s ease',
            letterSpacing: '0.02em',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%'
          }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google icon" style={{ width: '20px', height: '20px' }} />
          {t('auth.signInWithGoogle')}
        </button>

        {/* Elegant Gold-Lined Fading Divider */}
        <div className="social-divider" style={{ display: 'flex', alignItems: 'center', margin: '22px 0 18px 0', color: 'var(--text-primary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.35))', marginRight: '12px' }}></span>
          {t('auth.orSignInWithEmail')}
          <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.35), transparent)', marginLeft: '12px' }}></span>
        </div>

        <label>{t('auth.email')}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        
        <label>{t('auth.password')}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="royal-btn">{t('auth.signIn')}</button>

        <div style={{ marginBottom: '12px' }}>
          <Link to="/auth/reset" className="auth-link">{t('auth.forgotPassword')}</Link>
        </div>
        <div>
          <span>{t('auth.newHere')}</span><Link to="/auth/signup">{t('auth.createAccount')}</Link>
        </div>
      </form>
    </div>
  );
}
