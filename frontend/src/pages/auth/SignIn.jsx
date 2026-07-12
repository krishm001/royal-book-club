import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, FacebookAuthProvider, TwitterAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import './Auth.css';

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
const twitterProvider = new TwitterAuthProvider();
const linkedinProvider = new OAuthProvider('linkedin.com');
linkedinProvider.addScope('r_liteprofile');
linkedinProvider.addScope('r_emailaddress');

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

  const handleSocialSignIn = async (provider) => {
    setError(null);
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err) {
      console.error("Social login failed:", err);
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="auth-page">
      <form ref={authFormRef} onSubmit={handleSubmit} className="auth-form">
        <h2>{t('auth.signIn')}</h2>

        {/* Multi-Provider Social Grid Aligned with Checkout Popup */}
        <div className="social-grid">
          <button type="button" className="onboarding-social-btn" onClick={() => handleSocialSignIn(googleProvider)}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '16px', height: '16px' }} />
            Google
          </button>
          <button type="button" className="onboarding-social-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} title="LinkedIn login is currently unconfigured">
            <span style={{ color: '#0077b5', fontWeight: 'bold' }}>in</span> LinkedIn (Unavailable)
          </button>
          <button type="button" className="onboarding-social-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Meta login is currently unconfigured">
            <span style={{ color: '#1877f2', fontWeight: 'bold' }}>f</span> Meta (Unavailable)
          </button>
          <button type="button" className="onboarding-social-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Twitter login is currently unconfigured">
            <span style={{ color: '#1da1f2', fontWeight: 'bold' }}>𝕏</span> Twitter (Unavailable)
          </button>
        </div>

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
