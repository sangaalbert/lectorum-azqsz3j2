// API de búsqueda de libros: Google Books primero, OpenLibrary como fallback.
// Sin API key. Sin tracking. Solo queries anónimas.
// v0.5: quitamos restricción rígida de idioma; rankeamos español al primer puesto si lo hay.

const GOOGLE_BOOKS = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_COVER = 'https://covers.openlibrary.org/b';

/**
 * Resultado normalizado:
 * { isbn, title, subtitle, authors[], publisher, publishedYear, pageCount, description, coverUrl, language, source }
 */

export async function searchBooks(query, { maxResults = 12 } = {}) {
  if (!query || query.trim().length < 2) return [];

  const errors = [];

  // 1. Google Books sin restricción de idioma (mejor cobertura general)
  try {
    const results = await searchGoogleBooks(query, { maxResults });
    if (results.length > 0) {
      return rankByLanguage(results, 'es');
    }
  } catch (e) {
    errors.push('google: ' + e.message);
    console.warn('Google Books fallback:', e);
  }

  // 2. Fallback Open Library
  try {
    const results = await searchOpenLibrary(query, { maxResults });
    if (results.length > 0) {
      return rankByLanguage(results, 'es');
    }
  } catch (e) {
    errors.push('openlib: ' + e.message);
    console.error('OpenLibrary fallback:', e);
  }

  // 3. Si todo falla, devolvemos vacío (la UI muestra "sin resultados")
  if (errors.length > 0) {
    console.warn('Búsqueda terminó sin resultados. Errores:', errors);
  }
  return [];
}

export async function searchByISBN(isbn) {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
  if (!cleanIsbn) return null;

  // Google Books soporta query "isbn:..."
  try {
    const results = await searchGoogleBooks(`isbn:${cleanIsbn}`, { maxResults: 1 });
    if (results.length > 0) return results[0];
  } catch (e) {
    console.warn('Google Books ISBN error:', e);
  }

  // Fallback Open Library: endpoint /isbn/{isbn}.json
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

async function searchGoogleBooks(query, { maxResults = 12 } = {}) {
  // Sin langRestrict: cobertura mucho mejor. Usamos printType=books para evitar revistas.
  const url = `${GOOGLE_BOOKS}?q=${encodeURIComponent(query)}&maxResults=${maxResults}&printType=books`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
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
    // Google sirve por http en algunos casos: forzar https + zoom mejor
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

async function searchOpenLibrary(query, { maxResults = 12 } = {}) {
  const url = `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(query)}&limit=${maxResults}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
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

  // Open Library devuelve language como ['spa', 'eng'] (códigos MARC)
  const langMap = { spa: 'es', eng: 'en', fre: 'fr', ger: 'de', ita: 'it', cat: 'ca', por: 'pt' };
  const lang = doc.language && doc.language[0] ? (langMap[doc.language[0]] || doc.language[0]) : null;

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
    language: lang,
    source: 'openlibrary'
  };
}

async function normalizeOpenLibraryEdition(data, isbn) {
  return {
    isbn,
    title: data.title || 'Sin título',
    subtitle: data.subtitle || null,
    authors: [],
    publisher: (data.publishers && data.publishers[0]) || null,
    publishedYear: data.publish_date ? parseInt(data.publish_date.match(/\d{4}/)?.[0] || '0') || null : null,
    pageCount: data.number_of_pages || null,
    description: typeof data.description === 'string' ? data.description : data.description?.value || null,
    coverUrl: data.covers && data.covers[0] ? `${OPEN_LIBRARY_COVER}/id/${data.covers[0]}-M.jpg` : null,
    language: (data.languages && data.languages[0]?.key?.replace('/languages/', '')) || null,
    source: 'openlibrary'
  };
}

/**
 * Rankea: primero los del idioma preferido, luego el resto en orden original.
 * Útil cuando hay edición española y francesa del mismo libro.
 */
function rankByLanguage(results, preferredLang) {
  const preferred = results.filter((r) => r.language === preferredLang);
  const others = results.filter((r) => r.language !== preferredLang);
  return [...preferred, ...others];
}
