import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './locales/en';
import hi from './locales/hi';
import kn from './locales/kn';
import { updateUserProfile } from '../services/userApi';

const LanguageContext = createContext();

const translations = { en, hi, kn };

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('royal-lang') || 'en';
  });

  // Dynamic nested key lookup with automatic fallbacks and string interpolation
  const t = (keyPath, defaultValOrOptions, optionsArg) => {
    if (!keyPath) return '';
    const keys = keyPath.split('.');
    
    let defaultVal = undefined;
    let options = {};
    if (typeof defaultValOrOptions === 'string') {
      defaultVal = defaultValOrOptions;
      if (typeof optionsArg === 'object') options = optionsArg;
    } else if (typeof defaultValOrOptions === 'object' && defaultValOrOptions !== null) {
      options = defaultValOrOptions;
      if (options.defaultValue !== undefined) defaultVal = options.defaultValue;
    }

    // Helper to resolve string interpolation
    const interpolate = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, p1) => {
        return options[p1] !== undefined ? options[p1] : match;
      });
    };
    
    // 1. Try active language
    let activeDict = translations[language] || translations.en;
    let result = activeDict;
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        result = null;
        break;
      }
    }

    if (result !== null && typeof result === 'string') {
      return interpolate(result);
    }

    // 2. Try English fallback
    let englishDict = translations.en;
    let fallbackResult = englishDict;
    for (const key of keys) {
      if (fallbackResult && fallbackResult[key] !== undefined) {
        fallbackResult = fallbackResult[key];
      } else {
        fallbackResult = null;
        break;
      }
    }

    if (fallbackResult !== null && typeof fallbackResult === 'string') {
      return interpolate(fallbackResult);
    }

    // 3. Last fallback: return defaultVal if provided, otherwise the raw key path
    return interpolate(defaultVal !== undefined ? defaultVal : keyPath);
  };

  const changeLanguage = async (newLang, currentUser = null) => {
    if (!translations[newLang]) return;
    setLanguageState(newLang);
    localStorage.setItem('royal-lang', newLang);

    // If user is authenticated, automatically synchronize their preference with the Royal Archives (Firestore)
    if (currentUser && currentUser.uid) {
      try {
        await updateUserProfile({ language: newLang });
        console.log(`Synchronized language preference (${newLang}) with Firestore for user ${currentUser.uid}`);
      } catch (err) {
        console.warn('Unable to synchronize language preference with Firestore:', err);
      }
    }
  };

  const getLocalized = (object, field) => {
    if (!object) return (field === 'options' || field === 'featuredQuotes') ? [] : '';
    if (field === 'options' || field === 'featuredQuotes') {
      return object.translations?.[language]?.[field] || object[field] || [];
    }
    return object.translations?.[language]?.[field] || object[field] || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, getLocalized }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
