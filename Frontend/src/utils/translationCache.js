/**
 * Translation Cache System
 * Uses IndexedDB as primary storage (50MB limit)
 * and localStorage as fallback.
 * Items expire every 24 hours.
 */

const DB_NAME = 'AgroyiltTranslationCache';
const STORE_NAME = 'translations';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Hours

/**
 * Initialize IndexedDB
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

/**
 * Get item from cache (IndexedDB or localStorage)
 */
export const getFromCache = async (sourceLang, targetLang, text) => {
    if (!text) return null;
    const cacheKey = `${sourceLang}_${targetLang}_${btoa(unescape(encodeURIComponent(text.substring(0, 100))))}`;
    
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(cacheKey);
            
            request.onsuccess = () => {
                const item = request.result;
                if (item && (Date.now() - item.timestamp < CACHE_TTL)) {
                    resolve(item.translation);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => {
                // Fallback to localStorage
                const localItem = JSON.parse(localStorage.getItem(`tr_${cacheKey}`));
                if (localItem && (Date.now() - localItem.timestamp < CACHE_TTL)) {
                    resolve(localItem.translation);
                } else {
                    resolve(null);
                }
            };
        });
    } catch (err) {
        console.warn('IndexedDB not available, using localStorage');
        const localItem = JSON.parse(localStorage.getItem(`tr_${cacheKey}`));
        if (localItem && (Date.now() - localItem.timestamp < CACHE_TTL)) {
            return localItem.translation;
        }
        return null;
    }
};

/**
 * Save item to cache
 */
export const saveToCache = async (sourceLang, targetLang, text, translation) => {
    if (!text || !translation || text === translation) return;
    const cacheKey = `${sourceLang}_${targetLang}_${btoa(unescape(encodeURIComponent(text.substring(0, 100))))}`;
    
    const item = {
        translation,
        timestamp: Date.now()
    };

    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(item, cacheKey);
    } catch (err) {
        localStorage.setItem(`tr_${cacheKey}`, JSON.stringify(item));
    }
};

/**
 * Cleanup expired entries
 */
export const cleanupExpiredCache = async () => {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();
        
        request.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                if (Date.now() - cursor.value.timestamp > CACHE_TTL) {
                    store.delete(cursor.key);
                }
                cursor.continue();
            }
        };
    } catch (err) {
        // localStorage cleanup
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('tr_')) {
                const item = JSON.parse(localStorage.getItem(key));
                if (Date.now() - item.timestamp > CACHE_TTL) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
};
