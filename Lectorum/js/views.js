// Lectorum - renderizado de vistas
// Cada función exportada renderiza una vista en el contenedor proporcionado.

import * as db from './db.js';
import * as api from './api.js';
import { startScanner, stopScanner } from './scanner.js';

const STATUS_LABELS = {
  reading: 'Leyendo',
  read: 'Leído',
  wishlist: 'Quiero leer',
  abandoned: 'Abandonado'
};

const STATUS_ORDER = ['reading', 'read', 'wishlist', 'abandoned'];

// === Helpers ===

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function bookCard(book) {
  const cover = book.coverUrl
    ? `<img src="${escape(book.coverUrl)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div class="book-cover-fallback" style="display:none">${escape(book.title)}</div>`
    : `<div class="book-cover-fallback">${escape(book.title)}</div>`;

  const authors = (book.authors || []).join(', ') || 'Sin autor';
  const status = book.status || 'wishlist';

  return `
    <article class="book-card" data-book-id="${escape(book.id)}">
      <div class="book-cover">${cover}</div>
      <h3 class="book-title">${escape(book.title)}</h3>
      <p class="book-author">${escape(authors)}</p>
      <span class="status-pill ${status}">${STATUS_LABELS[status]}</span>
    </article>
  `;
}

function emptyState(emoji, title, subtitle) {
  return `
    <div class="empty-state">
      <span class="emoji">${emoji}</span>
      <h2>${escape(title)}</h2>
      <p>${escape(subtitle)}</p>
    </div>
  `;
}

function showToast(message) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// === Modal ===

function openModal(content) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-sheet" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      ${content}
    </div>
  `;
  root.classList.remove('hidden');
  root.onclick = closeModal;
}

function closeModal() {
  const root = document.getElementById('modal-root');
  root.classList.add('hidden');
  root.innerHTML = '';
  stopScanner().catch(() => {});
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// === Vista: Biblioteca ===

export async function renderLibrary(container) {
  document.getElementById('page-title').textContent = 'Biblioteca';

  const books = await db.getAllBooks();
  // Ordenar por updatedAt desc, dejando reading primero
  books.sort((a, b) => {
    if (a.status === 'reading' && b.status !== 'reading') return -1;
    if (b.status === 'reading' && a.status !== 'reading') return 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  if (books.length === 0) {
    container.innerHTML = emptyState('📚', 'Tu biblioteca está vacía', 'Toca el + arriba para añadir tu primer libro.');
    return;
  }

  container.innerHTML = `<div class="book-grid">${books.map(bookCard).join('')}</div>`;

  container.querySelectorAll('.book-card').forEach((el) => {
    el.addEventListener('click', () => openBookDetail(el.dataset.bookId));
  });
}

// === Vista: Wishlist ===

export async function renderWishlist(container) {
  document.getElementById('page-title').textContent = 'Lista de deseos';

  const books = await db.getBooksByStatus('wishlist');

  if (books.length === 0) {
    container.innerHTML = emptyState('⭐', 'Sin libros en tu wishlist', 'Marca libros como "Quiero leer" para verlos aquí.');
    return;
  }

  container.innerHTML = `<div class="book-grid">${books.map(bookCard).join('')}</div>`;
  container.querySelectorAll('.book-card').forEach((el) => {
    el.addEventListener('click', () => openBookDetail(el.dataset.bookId));
  });
}

// === Vista: Colecciones ===

export async function renderCollections(container) {
  document.getElementById('page-title').textContent = 'Listas';

  const collections = await db.getAllCollections();

  if (collections.length === 0) {
    container.innerHTML = `
      ${emptyState('🏷️', 'Aún no tienes listas', 'Crea listas como "Verano 2026" o "Club de lectura".')}
      <button class="btn-primary" id="btn-new-collection">Nueva lista</button>
    `;
    document.getElementById('btn-new-collection').onclick = openNewCollectionModal;
    return;
  }

  container.innerHTML = `
    ${collections.map((c) => `
      <div class="search-result">
        <div class="search-result-info">
          <h3 class="search-result-title">${escape(c.name)}</h3>
          <p class="search-result-meta">${(c.bookIds || []).length} libros</p>
        </div>
      </div>
    `).join('')}
    <button class="btn-primary mt-16" id="btn-new-collection">Nueva lista</button>
  `;
  document.getElementById('btn-new-collection').onclick = openNewCollectionModal;
}

function openNewCollectionModal() {
  openModal(`
    <h2 class="modal-title">Nueva lista</h2>
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="collection-name" placeholder="Ej. Verano 2026">
    </div>
    <button class="btn-primary" id="btn-save-collection">Crear</button>
    <button class="btn-secondary" onclick="document.getElementById('modal-root').click()">Cancelar</button>
  `);

  document.getElementById('btn-save-collection').onclick = async () => {
    const name = document.getElementById('collection-name').value.trim();
    if (!name) return;
    await db.saveCollection({ name, bookIds: [] });
    closeModal();
    showToast('Lista creada');
    renderCollections(document.getElementById('view-container'));
  };
}

// === Vista: Dashboard ===

export async function renderDashboard(container) {
  document.getElementById('page-title').textContent = 'Stats';

  const books = await db.getAllBooks();
  const currentYear = new Date().getFullYear();

  const readBooks = books.filter((b) => b.status === 'read');
  const readThisYear = readBooks.filter((b) => {
    if (!b.finishedAt) return false;
    return new Date(b.finishedAt).getFullYear() === currentYear;
  });
  const reading = books.filter((b) => b.status === 'reading');
  const wishlist = books.filter((b) => b.status === 'wishlist');

  const pagesThisYear = readThisYear.reduce((sum, b) => sum + (b.pageCount || 0), 0);
  const totalPages = readBooks.reduce((sum, b) => sum + (b.pageCount || 0), 0);

  // Top autores leídos
  const authorCount = {};
  for (const b of readBooks) {
    for (const a of b.authors || []) {
      authorCount[a] = (authorCount[a] || 0) + 1;
    }
  }
  const topAuthors = Object.entries(authorCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Rating promedio
  const rated = readBooks.filter((b) => typeof b.rating === 'number');
  const avgRating = rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : '—';

  container.innerHTML = `
    <div class="section-title">Este año (${currentYear})</div>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card-label">Libros leídos</div>
        <div class="stat-card-value">${readThisYear.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Páginas</div>
        <div class="stat-card-value">${pagesThisYear}</div>
      </div>
    </div>

    <div class="section-title">Total</div>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card-label">Total leídos</div>
        <div class="stat-card-value">${readBooks.length}</div>
        <div class="stat-card-sub">${totalPages} páginas en total</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Leyendo ahora</div>
        <div class="stat-card-value">${reading.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Wishlist</div>
        <div class="stat-card-value">${wishlist.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Rating medio</div>
        <div class="stat-card-value">${avgRating}</div>
        <div class="stat-card-sub">de ${rated.length} valoraciones</div>
      </div>
    </div>

    ${topAuthors.length > 0 ? `
      <div class="section-title">Autores más leídos</div>
      ${topAuthors.map(([name, count]) => `
        <div class="search-result">
          <div class="search-result-info">
            <h3 class="search-result-title">${escape(name)}</h3>
            <p class="search-result-meta">${count} libro${count > 1 ? 's' : ''}</p>
          </div>
        </div>
      `).join('')}
    ` : ''}
  `;
}

// === Vista: Ajustes ===

export async function renderSettings(container) {
  document.getElementById('page-title').textContent = 'Ajustes';

  const books = await db.getAllBooks();
  const collections = await db.getAllCollections();

  container.innerHTML = `
    <div class="section-title">Datos</div>
    <div class="stat-card mb-16">
      <div class="stat-card-label">Tu biblioteca</div>
      <div class="stat-card-value">${books.length}</div>
      <div class="stat-card-sub">${collections.length} listas</div>
    </div>

    <button class="btn-secondary" id="btn-export">Exportar todo (JSON)</button>
    <button class="btn-secondary" id="btn-import">Importar desde JSON</button>
    <input type="file" id="import-file" accept="application/json" style="display:none">

    <div class="section-title mt-16">Acerca de</div>
    <p class="muted">Lectorum v0.1 · 2026</p>
    <p class="muted">Tus datos viven solo en este iPhone. Haz exports periódicos para no perderlos.</p>
  `;

  document.getElementById('btn-export').onclick = async () => {
    const json = await db.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lectorum-backup-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup descargado');
  };

  const importInput = document.getElementById('import-file');
  document.getElementById('btn-import').onclick = () => importInput.click();
  importInput.onchange = async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await db.importAll(text);
      showToast(`Importados ${result.books} libros`);
      renderSettings(container);
    } catch (e) {
      showToast('Error al importar');
      console.error(e);
    }
  };
}

// === Modal: añadir libro ===

export function openAddBookModal() {
  openModal(`
    <h2 class="modal-title">Añadir libro</h2>
    <button class="btn-primary" id="btn-search">🔍 Buscar por título o autor</button>
    <button class="btn-secondary" id="btn-scan">📷 Escanear ISBN</button>
    <button class="btn-secondary" id="btn-manual">✍️ Añadir manualmente</button>
  `);

  document.getElementById('btn-search').onclick = openSearchModal;
  document.getElementById('btn-scan').onclick = openScannerModal;
  document.getElementById('btn-manual').onclick = openManualEntryModal;
}

function openSearchModal() {
  openModal(`
    <h2 class="modal-title">Buscar libro</h2>
    <div class="form-group">
      <input type="text" id="search-input" placeholder="Título, autor o ISBN" autofocus>
    </div>
    <div id="search-results"></div>
  `);

  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let timer = null;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { results.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      results.innerHTML = '<p class="muted text-center">Buscando…</p>';
      const books = await api.searchBooks(q);
      if (books.length === 0) {
        results.innerHTML = '<p class="muted text-center">Sin resultados</p>';
        return;
      }
      results.innerHTML = books.map((b, i) => `
        <div class="search-result" data-idx="${i}">
          <div class="search-result-cover">
            ${b.coverUrl ? `<img src="${escape(b.coverUrl)}" alt="" loading="lazy">` : ''}
          </div>
          <div class="search-result-info">
            <h3 class="search-result-title">${escape(b.title)}</h3>
            <p class="search-result-author">${escape((b.authors || []).join(', '))}</p>
            <p class="search-result-meta">${b.publishedYear || ''} · ${b.pageCount ? b.pageCount + ' págs' : ''}</p>
          </div>
        </div>
      `).join('');

      results.querySelectorAll('.search-result').forEach((el, i) => {
        el.addEventListener('click', () => openSaveBookModal(books[i]));
      });
    }, 350);
  });
}

function openScannerModal() {
  openModal(`
    <h2 class="modal-title">Escanear ISBN</h2>
    <div id="scanner-container"></div>
    <p class="scanner-hint">Apunta al código de barras del libro</p>
  `);

  startScanner('scanner-container', async (isbn) => {
    await stopScanner();
    showToast('ISBN detectado');
    const book = await api.searchByISBN(isbn);
    if (book) {
      openSaveBookModal(book);
    } else {
      showToast('Libro no encontrado, añádelo manualmente');
      openManualEntryModal({ isbn });
    }
  }, (err) => {
    console.error(err);
    showToast('Error con la cámara');
  });
}

function openManualEntryModal(prefill = {}) {
  openModal(`
    <h2 class="modal-title">Añadir manualmente</h2>
    <div class="form-group">
      <label>Título *</label>
      <input type="text" id="m-title" value="${escape(prefill.title || '')}">
    </div>
    <div class="form-group">
      <label>Autor</label>
      <input type="text" id="m-author" value="${escape((prefill.authors || []).join(', '))}">
    </div>
    <div class="form-group">
      <label>Páginas</label>
      <input type="number" id="m-pages" value="${prefill.pageCount || ''}">
    </div>
    <div class="form-group">
      <label>ISBN</label>
      <input type="text" id="m-isbn" value="${escape(prefill.isbn || '')}">
    </div>
    <button class="btn-primary" id="btn-save-manual">Guardar</button>
  `);

  document.getElementById('btn-save-manual').onclick = async () => {
    const title = document.getElementById('m-title').value.trim();
    if (!title) { showToast('Falta el título'); return; }
    const book = {
      title,
      authors: document.getElementById('m-author').value.split(',').map((s) => s.trim()).filter(Boolean),
      pageCount: parseInt(document.getElementById('m-pages').value) || null,
      isbn: document.getElementById('m-isbn').value.trim() || null,
      status: 'wishlist',
      coverUrl: prefill.coverUrl || null,
      description: prefill.description || null,
      publishedYear: prefill.publishedYear || null
    };
    await db.saveBook(book);
    closeModal();
    showToast('Libro añadido');
    renderLibrary(document.getElementById('view-container'));
  };
}

function openSaveBookModal(bookData) {
  openModal(`
    <h2 class="modal-title">${escape(bookData.title)}</h2>
    <p class="muted text-center mb-16">${escape((bookData.authors || []).join(', '))}</p>
    ${bookData.coverUrl ? `<div class="book-detail-cover"><img src="${escape(bookData.coverUrl)}" alt=""></div>` : ''}
    <div class="form-group">
      <label>Estado</label>
      <select id="save-status">
        <option value="wishlist" selected>Quiero leer</option>
        <option value="reading">Leyendo</option>
        <option value="read">Leído</option>
      </select>
    </div>
    <button class="btn-primary" id="btn-confirm-save">Añadir a mi biblioteca</button>
  `);

  document.getElementById('btn-confirm-save').onclick = async () => {
    const status = document.getElementById('save-status').value;
    const book = {
      ...bookData,
      status,
      startedAt: status === 'reading' ? Date.now() : null,
      finishedAt: status === 'read' ? Date.now() : null
    };
    await db.saveBook(book);
    closeModal();
    showToast('Libro añadido');
    renderLibrary(document.getElementById('view-container'));
  };
}

// === Detalle de libro ===

async function openBookDetail(bookId) {
  const book = await db.getBook(bookId);
  if (!book) return;

  const cover = book.coverUrl
    ? `<div class="book-detail-cover"><img src="${escape(book.coverUrl)}" alt=""></div>`
    : `<div class="book-detail-cover"><div class="book-cover-fallback" style="display:flex;height:100%">${escape(book.title)}</div></div>`;

  const stars = (rating) => {
    let html = '<div class="star-rating" id="star-rating">';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star ${i <= (rating || 0) ? 'filled' : ''}" data-value="${i}">★</span>`;
    }
    html += '</div>';
    return html;
  };

  openModal(`
    <div class="book-detail">
      ${cover}
      <h2>${escape(book.title)}</h2>
      <p class="book-detail-author">${escape((book.authors || []).join(', '))}</p>

      <div class="form-group">
        <label>Estado</label>
        <select id="d-status">
          ${STATUS_ORDER.map((s) =>
            `<option value="${s}" ${book.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Valoración</label>
        ${stars(book.rating)}
      </div>

      <div class="form-group">
        <label>Notas</label>
        <textarea id="d-notes" placeholder="Lo que pensaste, citas, reseñas...">${escape(book.notes || '')}</textarea>
      </div>

      <div class="book-detail-meta">
        ${book.pageCount ? `<div class="meta-card"><div class="meta-card-label">Páginas</div><div class="meta-card-value">${book.pageCount}</div></div>` : ''}
        ${book.publishedYear ? `<div class="meta-card"><div class="meta-card-label">Año</div><div class="meta-card-value">${book.publishedYear}</div></div>` : ''}
      </div>

      <button class="btn-primary" id="btn-save-detail">Guardar</button>
      <button class="btn-secondary" id="btn-delete">Eliminar libro</button>
    </div>
  `);

  // Star rating
  let currentRating = book.rating || 0;
  document.querySelectorAll('#star-rating .star').forEach((star) => {
    star.addEventListener('click', () => {
      currentRating = parseInt(star.dataset.value);
      document.querySelectorAll('#star-rating .star').forEach((s) => {
        s.classList.toggle('filled', parseInt(s.dataset.value) <= currentRating);
      });
    });
  });

  document.getElementById('btn-save-detail').onclick = async () => {
    const newStatus = document.getElementById('d-status').value;
    const updates = {
      ...book,
      status: newStatus,
      rating: currentRating,
      notes: document.getElementById('d-notes').value
    };
    if (newStatus === 'reading' && !book.startedAt) updates.startedAt = Date.now();
    if (newStatus === 'read' && !book.finishedAt) updates.finishedAt = Date.now();

    await db.saveBook(updates);
    closeModal();
    showToast('Guardado');
    renderLibrary(document.getElementById('view-container'));
  };

  document.getElementById('btn-delete').onclick = async () => {
    if (confirm('¿Eliminar este libro? No se puede deshacer.')) {
      await db.deleteBook(bookId);
      closeModal();
      showToast('Libro eliminado');
      renderLibrary(document.getElementById('view-container'));
    }
  };
}
