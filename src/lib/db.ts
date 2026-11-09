// Stockage local (IndexedDB) : fonctionne dans le navigateur et dans Electron.
const DB_NAME = 'louange';
const DB_VERSION = 1;
export const STORES = ['songs', 'media', 'blobs', 'presentations', 'themes', 'schedules', 'kv'] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).get(key)) as Promise<T | undefined>;
}

export async function dbPut<T>(store: StoreName, key: string, value: T): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value, key);
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

export async function dbDelete(store: StoreName, key: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function dbAll<T>(store: StoreName): Promise<T[]> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).getAll()) as Promise<T[]>;
}

export async function dbKeys(store: StoreName): Promise<string[]> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).getAllKeys()) as Promise<string[]>;
}

export async function dbClear(store: StoreName): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).clear();
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// Cache d'URL d'objets pour les médias
const urlCache = new Map<string, Promise<string | null>>();

export function mediaUrl(id: string | undefined): Promise<string | null> {
  if (!id) return Promise.resolve(null);
  let p = urlCache.get(id);
  if (!p) {
    p = dbGet<Blob>('blobs', id).then((b) => (b ? URL.createObjectURL(b) : null));
    urlCache.set(id, p);
  }
  return p;
}

export function forgetMediaUrl(id: string) {
  const p = urlCache.get(id);
  if (p) p.then((u) => u && URL.revokeObjectURL(u));
  urlCache.delete(id);
}
