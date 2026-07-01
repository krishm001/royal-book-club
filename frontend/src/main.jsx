import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './style.css';
import { LanguageProvider } from './i18n/LanguageContext';

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
