import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import { BookOpen, Calendar, BookText, Home, User, Compass, Sparkles, LogOut, Menu, X, Shield, Palette } from 'lucide-react';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import api from './api/apiClient';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/catalog/CatalogPage';
import BookDetailPage from './pages/catalog/BookDetailPage';
import EventsPage from './pages/events/EventsPage';
import EventDetailPage from './pages/events/EventDetailPage';
import ArticlesPage from './pages/articles/ArticlesPage';
import ArticleDetailPage from './pages/articles/ArticleDetailPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import BookIngestionConsole from './pages/admin/BookIngestionConsole';
import UserManagementPage from './pages/admin/UserManagementPage';
import AdminRequests from './pages/admin/AdminRequests';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('royal-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('royal-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'academic' : 'dark'));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Fetch backend profile (roles, names) using ID token via apiClient
        (async () => {
          try {
            const res = await api.get('/api/v1/auth/me');
            const backendUser = res?.data?.data;

            setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || `${backendUser?.firstName || ''} ${backendUser?.lastName || ''}`.trim() || 'Royal Patron',
              email: firebaseUser.email || backendUser?.email || 'patron@royalbook.club',
              photoURL: firebaseUser.photoURL || backendUser?.photoUrl || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=150&q=80',
              tier: backendUser?.role === 'ADMIN' ? 'Curator' : 'Sovereign Reader',
              role: backendUser?.role || 'MEMBER'
            });
          } catch (err) {
            console.error('Failed to fetch backend profile', err);
            setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Royal Patron',
              email: firebaseUser.email || 'patron@royalbook.club',
              photoURL: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=150&q=80',
              tier: 'Sovereign Reader'
            });
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    // keep anonymous fallback
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in: ", error);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <Router>
      <div className="app-container">
        {/* Top Decorative Border */}
        <div className="royal-top-border"></div>

        {/* Header navigation */}
        <header className="royal-header">
          <div className="header-content">
            <Link to="/" className="brand-logo" onClick={closeMobileMenu}>
              <Sparkles className="brand-icon gold-glow" />
              <div className="brand-text">
                <span className="brand-title gold-gradient-text">Royal Book Club</span>
                <span className="brand-tagline">Exquisite Literary Salon</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="desktop-nav">
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                <Home size={16} /> Home
              </NavLink>
              <NavLink to="/catalog" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BookOpen size={16} /> Library Catalog
              </NavLink>
              <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Calendar size={16} /> Meetups & Litfests
              </NavLink>
              <NavLink to="/articles" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BookText size={16} /> Articles
              </NavLink>
            </nav>

            {/* Theme Toggle & Profile / Auth Section */}
            <div className="theme-toggle-btn-container desktop-nav">
              <button 
                onClick={toggleTheme} 
                className="theme-toggle-btn icon-only"
                title={`Switch to ${theme === 'dark' ? 'Academic Theme (Beige & Maroon)' : 'Salon Theme (Gold & Blue)'}`}
                id="theme-switcher-btn"
              >
                <Palette size={16} />
              </button>
            </div>

            <div className="auth-section">
              {loading ? (
                <div className="loader-mini"></div>
              ) : user ? (
                <div className="user-profile-widget">
                  <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                  <div className="user-info-dropdown">
                    <div className="user-name">{user.displayName}</div>
                    <div className="user-tier">{user.tier}</div>
                    <Link to="/admin" className="admin-portal-link" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                      <Shield size={12} /> Curator Console
                    </Link>
                    <button onClick={handleSignOut} className="sign-out-btn" id="logout-btn">
                      <LogOut size={14} /> Leave Salon
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/auth/signin" className="royal-btn header-btn" id="login-btn">
                  <User size={14} /> Enter Salon
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button className="mobile-toggle-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="mobile-nav-overlay animate-fade-in">
              <nav className="mobile-nav">
                <NavLink to="/" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu} end>
                  <Home size={20} /> Home
                </NavLink>
                <NavLink to="/catalog" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <BookOpen size={20} /> Library Catalog
                </NavLink>
                <NavLink to="/events" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <Calendar size={20} /> Meetups & Litfests
                </NavLink>
                <NavLink to="/articles" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <BookText size={20} /> Articles
                </NavLink>

                <div className="mobile-theme-section">
                  <button 
                    onClick={toggleTheme} 
                    className="theme-toggle-btn"
                    style={{ width: '100%', justifyContent: 'center' }}
                    id="mobile-theme-switcher-btn"
                  >
                    <Palette size={16} />
                    <span>Theme: {theme === 'dark' ? 'Salon (Gold)' : 'Academic (Maroon)'}</span>
                  </button>
                </div>

                <div className="mobile-auth">
                  {user ? (
                    <div className="mobile-user-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src={user.photoURL} alt={user.displayName} className="mobile-user-avatar" />
                        <div>
                          <div className="mobile-user-name">{user.displayName}</div>
                          <div className="mobile-user-tier">{user.tier}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Link to="/admin" onClick={closeMobileMenu} className="royal-btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '6px 12px' }}>
                          Curator Console
                        </Link>
                        <button onClick={() => { handleSignOut(); closeMobileMenu(); }} className="sign-out-btn" style={{ flex: 1, padding: '6px 12px' }}>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { handleSignIn(); closeMobileMenu(); }} className="royal-btn mobile-login-btn">
                      Enter Salon
                    </button>
                  )}
                </div>
              </nav>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage user={user} onSignIn={handleSignIn} />} />
            <Route path="/catalog" element={<CatalogPage user={user} />} />
            <Route path="/catalog/:id" element={<BookDetailPage user={user} />} />
            <Route path="/events" element={<EventsPage user={user} />} />
            <Route path="/events/:id" element={<EventDetailPage user={user} />} />
            <Route path="/articles" element={<ArticlesPage user={user} />} />
            <Route path="/articles/:id" element={<ArticleDetailPage user={user} />} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
            <Route path="/admin/books" element={<BookIngestionConsole user={user} />} />
            <Route path="/admin/users" element={<UserManagementPage user={user} />} />
            <Route path="/admin/requests" element={<AdminRequests user={user} />} />

            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
          </Routes>
        </main>

        {/* Royal Footer */}
        <footer className="royal-footer">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <Sparkles className="gold-glow" size={20} />
                <span className="gold-gradient-text">The Royal Book Club</span>
              </div>
              <p>Curating exceptional literature and foster refined intellectual community since 2026.</p>
            </div>
            <div className="footer-links">
              <h4>The Library</h4>
              <Link to="/catalog">Browse Catalog</Link>
              <Link to="/events">Upcoming Litfests</Link>
              <Link to="/articles">Intellectual Essays</Link>
            </div>
            <div className="footer-motto">
              <blockquote>
                "A truly great book should be read in youth, again in maturity and once more in old age."
                <cite>— Sovereign Reader Guild</cite>
              </blockquote>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} The Royal Book Club. All rights reserved. Created for premium aesthetic readers.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
