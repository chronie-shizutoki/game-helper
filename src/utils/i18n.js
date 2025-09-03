// Internationalization utility

// Default language
let currentLanguage = 'en';

// Translation data store
const translations = {};

// Available languages
const availableLanguages = ['en', 'zh-CN', 'zh-TW', 'ja'];

/**
 * Load translations from JSON files
 */
async function loadTranslations() {
  for (const lang of availableLanguages) {
    try {
      const response = await import(`../locales/${lang}.json`);
      translations[lang] = response.default;
    } catch (error) {
      console.error(`Failed to load translations for language: ${lang}`, error);
      translations[lang] = {};
    }
  }
}

/**
 * Set the current language
 * @param {string} language - The language code (e.g., 'en', 'zh')
 */
export const setLanguage = (language) => {
  if (translations[language]) {
    currentLanguage = language;
    // Emit an event to notify components of language change
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
    return true;
  }
  return false;
};

/**
 * Get the current language
 * @returns {string} The current language code
 */
export const getCurrentLanguage = () => {
  return currentLanguage;
};

/**
 * Translate a key to the current language
 * @param {string} key - The translation key
 * @param {string} fallback - Optional fallback text if key is not found
 * @returns {string} The translated text
 */
export const t = (key, fallback = key) => {
  const translation = translations[currentLanguage]?.[key];
  return translation !== undefined ? translation : fallback;
};

/**
 * Get all available languages
 * @returns {string[]} Array of language codes
 */
export const getAvailableLanguages = () => {
  return availableLanguages;
};

/**
 * Add new translations for a language
 * @param {string} language - The language code
 * @param {object} newTranslations - Object with new translation key-value pairs
 */
export const addTranslations = (language, newTranslations) => {
  if (!translations[language]) {
    translations[language] = {};
  }
  Object.assign(translations[language], newTranslations);
};

/**
 * Initialize the i18n system
 * @param {string} initialLanguage - Optional initial language code
 * @returns {Promise<void>} Promise that resolves when initialization is complete
 */
export const initialize = async (initialLanguage) => {
  // Load translations from JSON files
  await loadTranslations();
  
  // Try to use browser language if initialLanguage is not provided
  if (!initialLanguage) {
    const browserLang = navigator.language;
    // Check for exact match first
    if (translations[browserLang]) {
      currentLanguage = browserLang;
    } else {
      // Check for language-only match (e.g., 'zh' for 'zh-CN')
      const languageOnly = browserLang.split('-')[0];
      const matchedLang = availableLanguages.find(lang => lang.startsWith(languageOnly));
      if (matchedLang) {
        currentLanguage = matchedLang;
      }
    }
  } else if (translations[initialLanguage]) {
    currentLanguage = initialLanguage;
  }
  
  // Initialize game name translations
  try {
    import('../types/supportedGame').then(({ default: SupportedGame }) => {
      Object.values(SupportedGame).forEach(game => {
        if (game && typeof game === 'object') {
          game.localizedDescription = t(`game.${game.value}`);
        }
      });
    });
  } catch (error) {
    console.error('Failed to initialize game name translations', error);
  }
};

export default {
  t,
  setLanguage,
  getCurrentLanguage,
  getAvailableLanguages,
  addTranslations,
  initialize
};