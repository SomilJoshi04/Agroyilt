import React, { createContext, useContext, useState, useEffect } from 'react';
import { normalizeLanguageCode, isRTLLanguage } from '../utils/languageUtils';

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within LanguageProvider');
    return context;
};

export const LanguageProvider = ({ children }) => {
    // Current Language State (Default English)
    const [language, setLanguage] = useState(localStorage.getItem('userLanguage') || 'English');
    const [isChangingLanguage, setIsChangingLanguage] = useState(false);

    // List of Supported Languages for Agroyilt
    const languages = {
        'English': { label: 'English', code: 'en', flag: '🇬🇧' },
        'Hindi': { label: 'Hindi', code: 'hi', flag: '🇮🇳' },
        'Marathi': { label: 'Marathi', code: 'mr', flag: '🇮🇳' },
        'Gujarati': { label: 'Gujarati', code: 'gu', flag: '🇮🇳' },
        'Punjabi': { label: 'Punjabi', code: 'pa', flag: '🇮🇳' },
        'Tamil': { label: 'Tamil', code: 'ta', flag: '🇮🇳' },
        'Telugu': { label: 'Telugu', code: 'te', flag: '🇮🇳' },
        'Kannada': { label: 'Kannada', code: 'kn', flag: '🇮🇳' },
        'Malayalam': { label: 'Malayalam', code: 'ml', flag: '🇮🇳' },
        'Bengali': { label: 'Bengali', code: 'bn', flag: '🇮🇳' }
    };

    /**
     * Change Current Language
     */
    const changeLanguage = (newLang) => {
        if (!languages[newLang]) return;
        setIsChangingLanguage(true);
        setLanguage(newLang);
        localStorage.setItem('userLanguage', newLang);
        
        // Let everything re-render before flipping the loading state
        setTimeout(() => setIsChangingLanguage(false), 200);
    };

    /**
     * Set RTL support based on language change
     */
    useEffect(() => {
        const code = normalizeLanguageCode(language);
        document.documentElement.lang = code;
        document.documentElement.dir = isRTLLanguage(code) ? 'rtl' : 'ltr';
    }, [language]);

    const value = {
        language,
        languages,
        changeLanguage,
        isChangingLanguage,
        currentCode: normalizeLanguageCode(language)
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
