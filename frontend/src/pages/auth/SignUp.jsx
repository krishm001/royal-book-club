import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../../services/authApi';
import './Auth.css';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Create Firestore user record
      await registerUser(user.uid, email, displayName);

      navigate('/');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Sign Up</h2>
        <label>Full Name</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="royal-btn" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        <div>
          <span>Already a member? </span><Link to="/auth/signin">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
