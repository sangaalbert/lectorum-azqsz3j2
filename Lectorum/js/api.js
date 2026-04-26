// API de búsqueda de libros: Google Books primero, OpenLibrary como fallback.
// Sin API key. Sin tracking. Solo queries anónimas.

const GOOGLE_BOOKS = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_COVER = 'https://covers.openlibrary.org/b';

/**
 * Resultado normalizado de un libro:
 * { isbn, title, authors[], publisher, publishedYear, pageCount, description, coverUrl, language, source }
 */

export async function searchBooks(query, { maxResults = 10, lang = 'es' } = {}) {
  if (!query || query.trim().length < 2) return [];

  // Intentar Google Books primero
  try {
    const results = await searchGoogleBooks(query, { maxResults, lang });
    if (results.length > 0) return results;
  } catch (e) {
    console.warn('Google Books fallback:', e);
  }

  // Fallback: Open Library
  try {
    return await searchOpenLibrary(query, { maxResults, lang });
  } catch (e) {
    console.error('Búsqueda fallida en ambos:', e);
    return [];
  }
}

export async function searchByISBN(isbn) {
  // Limpiar ISBN
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
  if (!cleanIsbn) return null;

  // Google Books admite isbn: query
  const results = await searchGoogleBooks(`isbn:${cleanIsbn}`, { maxResults: 1 });
  if (results.length > 0) return results[0];

  // Fallback Open Library: busca por ISBN
  try {
    const url = `https://openlibrary.org/isbn/${cleanIsbn}.json`;
    const r = await fetch(url);
    if (r.ok) {
      const data = await r.json();
      return await normalizeOpenLibraryEdition(data, cleanIsbn);
    }
  } catch (e) {
    console.warn('OpenLibrary ISBN error:', e);
  }

  return null;
}

async function searchGoogleBooks(query, { maxResults = 10, lang = 'es' } = {}) {
  const url = `${GOOGLE_BOOKS}?q=${encodeURIComponent(query)}&maxResults=${maxResults}&langRestrict=${lang}&printType=books`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Google Books HTTP ${r.status}`);
  const data = await r.json();
  if (!data.items) return [];
  return data.items.map(normalizeGoogleBook).filter(Boolean);
}

function normalizeGoogleBook(item) {
  const v = item.volumeInfo || {};
  const ids = v.industryIdentifiers || [];
  const isbn13 = ids.find((i) => i.type === 'ISBN_13')?.identifier;
  const isbn10 = ids.find((i) => i.type === 'ISBN_10')?.identifier;
  const isbn = isbn13 || isbn10 || null;

  let coverUrl = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || null;
  if (coverUrl) {
    // Google sirve por http en algunos casos, forzar https y mejorar zoom
    coverUrl = coverUrl.replace(/^http:/, 'https:').replace('zoom=1', 'zoom=2');
  }

  return {
    isbn,
    title: v.title || 'Sin título',
    subtitle: v.subtitle || null,
    authors: v.authors || [],
    publisher: v.publisher || null,
    publishedYear: v.publishedDate ? parseInt(v.publishedDate.substring(0, 4)) : null,
    pageCount: v.pageCount || null,
    description: v.description || null,
    coverUrl,
    language: v.language || null,
    source: 'google'
  };
}

async function searchOpenLibrary(query, { maxResults = 10, lang = 'es' } = {}) {
  const url = `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(query)}&limit=${maxResults}&language=${lang}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`OpenLibrary HTTP ${r.status}`);
  const data = await r.json();
  if (!data.docs) return [];
  return data.docs.map(normalizeOpenLibraryDoc);
}

function normalizeOpenLibraryDoc(doc) {
  const isbn = (doc.isbn && doc.isbn[0]) || null;
  let coverUrl = null;
  if (doc.cover_i) {
    coverUrl = `${OPEN_LIBRARY_COVER}/id/${doc.cover_i}-M.jpg`;
  } else if (isbn) {
    coverUrl = `${OPEN_LIBRARY_COVER}/isbn/${isbn}-M.jpg`;
  }

  return {
    isbn,
    title: doc.title || 'Sin título',
    subtitle: doc.subtitle || null,
    authors: doc.author_name || [],
    publisher: (doc.publisher && doc.publisher[0]) || null,
    publishedYear: doc.first_publish_year || null,
    pageCount: doc.number_of_pages_median || null,
    description: null,
    coverUrl,
    language: (doc.language && doc.language[0]) || null,
    source: 'openlibrary'
  };
}

async function normalizeOpenLibraryEdition(data, isbn) {
  return {
    isbn,
    title: data.title || 'Sin título',
    subtitle: data.subtitle || null,
    authors: [], // requeriría una segunda llamada para resolver authors
    publisher: (data.publishers && data.publishers[0]) || null,
    publishedYear: data.publish_date ? parseInt(data.publish_date.substring(data.publish_date.length - 4)) : null,
    pageCount: data.number_of_pages || null,
    description: typeof data.description === 'string' ? data.description : data.description?.value || null,
    coverUrl: data.covers && data.covers[0] ? `${OPEN_LIBRARY_COVER}/id/${data.covers[0]}-M.jpg` : null,
    language: (data.languages && data.languages[0]?.key?.replace('/languages/', '')) || null,
    source: 'openlibrary'
  };
}
