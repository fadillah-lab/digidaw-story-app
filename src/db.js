const DATABASE_NAME = "digidaw-story-database";
const DATABASE_VERSION = 1;
const STORIES_STORE = "saved-stories";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Browser ini belum mendukung IndexedDB."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORIES_STORE)) {
        database.createObjectStore(STORIES_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Database gagal dibuka."));
  });
}

async function withStore(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORIES_STORE, mode);
    const store = transaction.objectStore(STORIES_STORE);
    let request;
    try {
      request = operation(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {
      database.close();
      resolve(request?.result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || request?.error || new Error("Operasi database gagal."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("Operasi database dibatalkan."));
    };
  });
}

export function saveStory(story) {
  return withStore("readwrite", (store) => store.put({ ...story, savedAt: new Date().toISOString() }));
}

export async function getSavedStories() {
  const stories = await withStore("readonly", (store) => store.getAll());
  return (stories || []).sort((a, b) => new Date(b.savedAt || b.createdAt) - new Date(a.savedAt || a.createdAt));
}

export function deleteSavedStory(id) {
  return withStore("readwrite", (store) => store.delete(id));
}

export async function isStorySaved(id) {
  const story = await withStore("readonly", (store) => store.get(id));
  return Boolean(story);
}
