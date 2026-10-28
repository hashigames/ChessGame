const DB_NAME = 'Chess3DModelDatabase';
const STORE_NAME = 'game_settings';
const DB_VERSION = 1;
const FALLBACK_STORAGE_KEY = 'chess_game_settings_backup';

let isIndexedDBAvailable: boolean | null = null;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      isIndexedDBAvailable = false;
      return reject(new Error('IndexedDB not supported'));
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        isIndexedDBAvailable = false;
        reject(new Error('IndexedDB open timed out'));
      }
    }, 1500);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: any) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          isIndexedDBAvailable = true;
          resolve(event.target.result);
        }
      };

      request.onerror = (event: any) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          isIndexedDBAvailable = false;
          reject(event.target.error || new Error('IndexedDB open error'));
        }
      };

      request.onblocked = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          isIndexedDBAvailable = false;
          reject(new Error('IndexedDB blocked'));
        }
      };
    } catch (e) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        isIndexedDBAvailable = false;
        reject(e);
      }
    }
  });
}

export async function saveSettingsToDB(settings: any): Promise<void> {
  // Always mirror to localStorage as an instant synchronous fallback
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Create a lightweight copy without massive dataUrls if quota exceeded
      try {
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(settings));
      } catch (localErr) {
        // Quota exceeded (likely huge custom 3D files), save basic settings
        const sanitized = { ...settings, pieceModels: {} };
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(sanitized));
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  if (isIndexedDBAvailable === false) return;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(settings, 'current_settings');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve(); // Non-blocking
      } catch (e) {
        resolve();
      }
    });
  } catch (err) {
    // Non-blocking fallback already stored in localStorage
  }
}

export async function loadSettingsFromDB(): Promise<any | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get('current_settings');
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            resolve(getLocalStorageFallback());
          }
        };
        request.onerror = () => resolve(getLocalStorageFallback());
      } catch (e) {
        resolve(getLocalStorageFallback());
      }
    });
  } catch (err) {
    return getLocalStorageFallback();
  }
}

function getLocalStorageFallback(): any | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    // Ignore fallback parse error
  }
  return null;
}

