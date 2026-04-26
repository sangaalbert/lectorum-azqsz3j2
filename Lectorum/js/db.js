// IndexedDB wrapper para Lectorum
// Una BD "lectorum" con dos object stores: "books" y "collections".

const DB_NAME = 'lectorum';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('books')) {
        const booksStore = db.createObjectStore('books', { keyPath: 'id' });
        booksStore.createIndex('status', 'status', { unique: false });
        booksStore.createIndex('isbn', 'isbn', { unique: false });
      }

      if (!db.objectStoreNames.contains('collections')) {
        db.createObjectStore('collections', { keyPath: 'id' });
      }
    };
  });
}

function tx(storeName, mode = 'readonly') {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

// === Books ===

export async function getAllBooks() {
  const store = await tx('books');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getBook(id) {
  const store = await tx('books');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getBooksByStatus(status) {
  const store = await tx('books');
  const index = store.index('status');
  return new Promise((resolve, reject) => {
    const req = index.getAll(status);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBook(book) {
  const store = await tx('books', 'readwrite');
  if (!book.id) {
    book.id = crypto.randomUUID();
  }
  if (!book.createdAt) {
    book.createdAt = Date.now();
  }
  book.updatedAt = Date.now();
  return new Promise((resolve, reject) => {
    const req = store.put(book);
    req.onsuccess = () => resolve(book);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBook(id) {
  const store = await tx('books', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// === Collections ===

export async function getAllCollections() {
  const store = await tx('collections');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCollection(collection) {
  const store = await tx('collections', 'readwrite');
  if (!collection.id) collection.id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const req = store.put(collection);
    req.onsuccess = () => resolve(collection);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCollection(id) {
  const store = await tx('collections', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// === Export / Import (para backup manual) ===

export async function exportAll() {
  const books = await getAllBooks();
  const collections = await getAllCollections();
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    books,
    collections
  }, null, 2);
}

export async function importAll(jsonString) {
  const data = JSON.parse(jsonString);
  if (data.version !== 1) throw new Error('Versión de backup no soportada');

  for (const book of data.books || []) {
    await saveBook(book);
  }
  for (const col of data.collections || []) {
    await saveCollection(col);
  }
  return { books: (data.books || []).length, collections: (data.collections || []).length };
}
