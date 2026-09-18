import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import * as translationService from '../services/translationService';

/**
 * A wrapper component for simple text translation.
 * Use it for individual words/headings like: <TranslatedText>Welcome</TranslatedText>
 */
const TranslatedText = ({ children, sourceLang = 'en' }) => {
    const { currentCode } = useLanguage();
    const [translated, setTranslated] = useState(children);
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        const translate = async () => {
            if (!children || currentCode === sourceLang) {
                setTranslated(children);
                return;
            }

            try {
                setIsTranslating(true);
                const result = await translationService.translateText(children, currentCode, sourceLang);
                setTranslated(result);
            } catch (err) {
                setTranslated(children);
            } finally {
                setIsTranslating(false);
            }
        };

        translate();
    }, [children, currentCode, sourceLang]);

    return (
        <span className={isTranslating ? 'animate-pulse opacity-50' : 'transition-opacity opacity-100'}>
            {translated}
        </span>
    );
};

export default TranslatedText;
