/**
 * Language Utilities
 * Handles normalization and mapping of language codes
 */

export const languageCodeMap = {
  'English': 'en',
  'Hindi': 'hi',
  'Marathi': 'mr',
  'Gujarati': 'gu',
  'Punjabi': 'pa',
  'Tamil': 'ta',
  'Telugu': 'te',
  'Kannada': 'kn',
  'Malayalam': 'ml',
  'Bengali': 'bn'
};

export const rtlLanguages = ["ar", "he", "ur", "fa"];

/**
 * Normalizes language codes for API use
 */
export const normalizeLanguageCode = (code) => {
    // If it's a full name like 'Hindi', map it to 'hi'
    if (languageCodeMap[code]) return languageCodeMap[code];
    
    // If it's already 'hi', 'en' etc, return as is
    return code?.toLowerCase() || 'en';
};

/**
 * Checks if a language is RTL
 */
export const isRTLLanguage = (code) => {
    const normalized = normalizeLanguageCode(code);
    return rtlLanguages.includes(normalized);
};
