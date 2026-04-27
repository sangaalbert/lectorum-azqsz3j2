// Lectorum v0.7 - vistas con estética editorial profesional
// Hero "Leyendo ahora", búsqueda local, compartir, sin foco en páginas.

import * as db from './db.js';
import * as api from './api.js';
import { startScanner, stopScanner, isScannerSupported, preloadScanner } from './scanner.js';

const STATUS_LABELS = {
  reading: 'Leyendo',
  read: 'Leído',
  wishlist: 'Quiero leer',
  abandoned: 'Abandonado'
};

const STATUS_ORDER = ['reading', 'wishlist', 'read', 'abandoned'];

// === Iconos SVG inline ===
const Icons = {
  status: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2M7 12h10"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5v13z"/></svg>',
  star_outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>',
  trending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M20 21H4a1 1 0 01-1-1v-8"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l10 6-10 6L2 8l10-6z"/><path d="M2 16l10 6 10-6M2 12l10 6 10-6"/></svg>'
};

// === Helpers ===

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function bookCover(book, sizeClass = 'book-row-cover') {
  const fallback = `<div class="book-row-cover-fallback">${escape(book.title || '')}</div>`;
  if (book.coverUrl) {
    return `<div class="${sizeClass}">
      <img src="${escape(book.coverUrl)}" alt="" loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="book-row-cover-fallback" style="display:none">${escape(book.title || '')}</div>
    </div>`;
  }
  return `<div class="${sizeClass}">${fallback}</div>`;
}

function bookRow(book) {
  const authors = (book.authors || []).join(', ') || 'Sin autor';
  const status = book.status || 'wishlist';

  return `
    <div class="book-row" data-book-id="${escape(book.id)}">
      ${bookCover(book)}
      <div class="book-row-info">
        <p class="book-row-title">${escape(book.title)}</p>
        <p class="book-row-author">${escape(authors)}</p>
      </div>
      <div class="book-row-status">
        <button class="status-pill ${status}" data-book-id="${escape(book.id)}" data-current-status="${status}" aria-label="Cambiar estado">
          <span class="status-dot"></span>
          ${STATUS_LABELS[status]}
        </button>
      </div>
    </div>
  `;
}

function emptyState(iconKey, title, subtitle, ctaLabel, ctaHandler) {
  const id = `cta-${Math.random().toString(36).slice(2, 8)}`;
  setTimeout(() => {
    const btn = document.getElementById(id);
    if (btn && ctaHandler) btn.onclick = ctaHandler;
  }, 0);

  return `
    <div class="empty-state">
      <div class="empty-state-illustration">${Icons[iconKey] || Icons.book}</div>
      <h2>${escape(title)}</h2>
      <p>${escape(subtitle)}</p>
      ${ctaLabel ? `<button class="btn-primary" id="${id}">${escape(ctaLabel)}</button>` : ''}
    </div>
  `;
}

function showToast(message) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function loadingHTML(text = 'Cargando…') {
  return `<div class="loading"><div class="loading-spinner"></div><span>${escape(text)}</span></div>`;
}

function daysSince(timestamp) {
  if (!timestamp) return 0;
  const ms = Date.now() - timestamp;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
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

// === Hero "Leyendo ahora" ===

function renderNowReadingHero(book) {
  const authors = (book.authors || []).join(', ') || 'Sin autor';
  const days = daysSince(book.startedAt);
  const dayText = days === 0 ? 'Empezado hoy' : days === 1 ? 'Llevas 1 día leyendo' : `Llevas ${days} días leyendo`;

  const bgImage = book.coverUrl
    ? `<div class="now-reading-hero-bg" style="background: url('${escape(book.coverUrl)}') center/cover no-repeat;"></div>`
    : '';

  return `
    <div class="now-reading-hero" data-book-id="${escape(book.id)}">
      ${bgImage}
      <div class="now-reading-hero-overlay"></div>
      <div class="now-reading-content">
        <div class="now-reading-cover">
          ${book.coverUrl
            ? `<img src="${escape(book.coverUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">`
            : `<div class="book-row-cover-fallback" style="font-size:11px">${escape(book.title)}</div>`}
        </div>
        <div class="now-reading-info">
          <p class="now-reading-eyebrow">Leyendo ahora</p>
          <h2 class="now-reading-title">${escape(book.title)}</h2>
          <p class="now-reading-author">${escape(authors)}</p>
          <p class="now-reading-meta">${escape(dayText)}</p>
        </div>
      </div>
    </div>
  `;
}

// === Vista: Biblioteca ===

let librarySearchQuery = '';

export async function renderLibrary(container) {
  document.getElementById('page-title').textContent = 'Biblioteca';

  const allBooks = await db.getAllBooks();

  if (allBooks.length === 0) {
    container.innerHTML = emptyState(
      'book',
      'Tu biblioteca está vacía',
      'Empieza por el libro que tienes entre manos o uno que te apetezca leer pronto.',
      'Añadir mi primer libro',
      openAddBookModal
    );
    return;
  }

  // Filtro local
  const q = librarySearchQuery.trim().toLowerCase();
  const books = q
    ? allBooks.filter((b) =>
        b.title.toLowerCase().includes(q) ||
        (b.authors || []).join(' ').toLowerCase().includes(q))
    : allBooks;

  books.sort((a, b) => {
    if (a.status === 'reading' && b.status !== 'reading') return -1;
    if (b.status === 'reading' && a.status !== 'reading') return 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const reading = books.filter((b) => b.status === 'reading');
  const wishlist = books.filter((b) => b.status === 'wishlist');
  const read = books.filter((b) => b.status === 'read');
  const abandoned = books.filter((b) => b.status === 'abandoned');

  let html = '';

  // Hero solo si NO hay búsqueda activa y hay libros leyendo
  if (!q && reading.length > 0) {
    html += renderNowReadingHero(reading[0]);
    if (reading.length > 1) {
      html += `<div class="section-title">Otros libros activos</div>`;
      html += `<div class="book-list">${reading.slice(1).map(bookRow).join('')}</div>`;
    }
  } else if (reading.length > 0) {
    html += `<div class="section-title">Leyendo · ${reading.length}</div>`;
    html += `<div class="book-list">${reading.map(bookRow).join('')}</div>`;
  }

  // Search bar (si hay >5 libros)
  if (allBooks.length >= 5) {
    html = `
      <div class="library-search">
        ${Icons.search}
        <input type="search" id="lib-search" placeholder="Buscar en mi biblioteca…" value="${escape(librarySearchQuery)}" autocomplete="off">
      </div>
    ` + html;
  }

  if (wishlist.length) {
    html += `<div class="section-title">Quiero leer · ${wishlist.length}</div>`;
    html += `<div class="book-list">${wishlist.map(bookRow).join('')}</div>`;
  }
  if (read.length) {
    html += `<div class="section-title">Leídos · ${read.length}</div>`;
    html += `<div class="book-list">${read.map(bookRow).join('')}</div>`;
  }
  if (abandoned.length) {
    html += `<div class="section-title">Abandonados · ${abandoned.length}</div>`;
    html += `<div class="book-list">${abandoned.map(bookRow).join('')}</div>`;
  }

  if (q && books.length === 0) {
    html += `
      <div class="empty-state" style="padding:36px 20px">
        <div class="empty-state-illustration">${Icons.search}</div>
        <h2>Nada coincide</h2>
        <p>Prueba con otras palabras o añade un libro nuevo.</p>
      </div>
    `;
  }

  container.innerHTML = html;
  attachLibraryHandlers(container);
}

function attachLibraryHandlers(container) {
  // Search
  const searchInput = container.querySelector('#lib-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      librarySearchQuery = e.target.value;
      // Re-render manteniendo el foco
      renderLibrary(container).then(() => {
        const newInput = container.querySelector('#lib-search');
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(librarySearchQuery.length, librarySearchQuery.length);
        }
      });
    });
  }

  // Hero click
  const hero = container.querySelector('.now-reading-hero');
  if (hero) hero.addEventListener('click', () => openBookDetail(hero.dataset.bookId));

  // Book rows click
  container.querySelectorAll('.book-row').forEach((el) => {
    el.addEventListener('click', (e) => {
      // Si han clicado el status pill, no abrir detalle
      if (e.target.closest('.status-pill')) return;
      openBookDetail(el.dataset.bookId);
    });
  });

  // Status pill quick toggle
  container.querySelectorAll('.status-pill[data-book-id]').forEach((pill) => {
    pill.addEventListener('click', async (e) => {
      e.stopPropagation();
      openQuickStatusModal(pill.dataset.bookId, pill.dataset.currentStatus);
    });
  });
}

function openQuickStatusModal(bookId, currentStatus) {
  openModal(`
    <h2 class="modal-title">Cambiar estado</h2>
    <div class="action-list">
      ${STATUS_ORDER.map((s) => `
        <button class="action-item" data-status="${s}">
          <span class="action-item-icon">
            <span class="status-dot" style="background: var(--status-${s}-fg); width: 10px; height: 10px;"></span>
          </span>
          <div class="action-item-content">
            <p class="action-item-title">${STATUS_LABELS[s]}${s === currentStatus ? ' · actual' : ''}</p>
          </div>
        </button>
      `).join('')}
    </div>
  `);

  document.querySelectorAll('.action-item[data-status]').forEach((el) => {
    el.onclick = async () => {
      const newStatus = el.dataset.status;
      const book = await db.getBook(bookId);
      if (!book) return;
      const updates = { ...book, status: newStatus };
      if (newStatus === 'reading' && !book.startedAt) updates.startedAt = Date.now();
      if (newStatus === 'read' && !book.finishedAt) updates.finishedAt = Date.now();
      await db.saveBook(updates);
      closeModal();
      showToast(`Marcado como "${STATUS_LABELS[newStatus]}"`);
      renderLibrary(document.getElementById('view-container'));
    };
  });
}

// === Vista: Wishlist ===

export async function renderWishlist(container) {
  document.getElementById('page-title').textContent = 'Lista de deseos';

  const books = await db.getBooksByStatus('wishlist');

  if (books.length === 0) {
    container.innerHTML = emptyState(
      'star_outline',
      'Sin libros en tu wishlist',
      'Marca libros como "Quiero leer" para ir construyendo tu próxima lectura.',
      'Buscar un libro',
      openAddBookModal
    );
    return;
  }

  books.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  container.innerHTML = `<div class="book-list">${books.map(bookRow).join('')}</div>`;
  attachLibraryHandlers(container);
}

// === Vista: Colecciones ===

export async function renderCollections(container) {
  document.getElementById('page-title').textContent = 'Listas';

  const collections = await db.getAllCollections();

  if (collections.length === 0) {
    container.innerHTML = emptyState(
      'layers',
      'Aún no tienes listas',
      'Las listas son colecciones temáticas como "Verano 2026" o "Club de lectura".',
      'Crear una lista',
      openNewCollectionModal
    );
    return;
  }

  container.innerHTML = `
    <div class="book-list">
      ${collections.map((c) => `
        <div class="book-row">
          <div class="book-row-info">
            <p class="book-row-title">${escape(c.name)}</p>
            <p class="book-row-author">${(c.bookIds || []).length} libros</p>
          </div>
        </div>
      `).join('')}
    </div>
    <button class="btn-secondary mt-16" id="btn-new-collection">Nueva lista</button>
  `;
  document.getElementById('btn-new-collection').onclick = openNewCollectionModal;
}

function openNewCollectionModal() {
  openModal(`
    <h2 class="modal-title">Nueva lista</h2>
    <p class="modal-subtitle">Agrupa libros bajo un nombre temático.</p>
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="collection-name" placeholder="Ej. Verano 2026" autofocus>
    </div>
    <button class="btn-primary" id="btn-save-collection">Crear lista</button>
    <button class="btn-secondary" id="btn-cancel-collection">Cancelar</button>
  `);

  document.getElementById('btn-cancel-collection').onclick = closeModal;
  document.getElementById('btn-save-collection').onclick = async () => {
    const name = document.getElementById('collection-name').value.trim();
    if (!name) { showToast('Falta el nombre'); return; }
    await db.saveCollection({ name, bookIds: [] });
    closeModal();
    showToast('Lista creada');
    renderCollections(document.getElementById('view-container'));
  };
}

// === Vista: Dashboard (sin foco en páginas) ===

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

  // Top autores leídos
  const authorCount = {};
  for (const b of readBooks) {
    for (const a of b.authors || []) {
      authorCount[a] = (authorCount[a] || 0) + 1;
    }
  }
  const topAuthors = Object.entries(authorCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Rating medio
  const rated = readBooks.filter((b) => typeof b.rating === 'number' && b.rating > 0);
  const avgRating = rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : '—';

  // Mejor valorado del año
  const ratedThisYear = readThisYear.filter((b) => typeof b.rating === 'number' && b.rating > 0);
  const topRatedThisYear = ratedThisYear.length
    ? ratedThisYear.reduce((best, b) => (b.rating > (best?.rating || 0) ? b : best), null)
    : null;

  // Días en racha (libros terminados en últimos 30 días)
  const last30Days = readBooks.filter((b) => b.finishedAt && (Date.now() - b.finishedAt) < 30 * 24 * 60 * 60 * 1000).length;

  container.innerHTML = `
    <div class="section-title">Este año · ${currentYear}</div>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card-label">${Icons.book}<span>Libros leídos</span></div>
        <div class="stat-card-value">${readThisYear.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">${Icons.star}<span>Rating medio</span></div>
        <div class="stat-card-value">${avgRating}</div>
        <div class="stat-card-sub">${rated.length} valoraciones</div>
      </div>
    </div>

    <div class="section-title">Total</div>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card-label">${Icons.book}<span>Total leídos</span></div>
        <div class="stat-card-value">${readBooks.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">${Icons.trending}<span>Leyendo ahora</span></div>
        <div class="stat-card-value">${reading.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">${Icons.star_outline}<span>Wishlist</span></div>
        <div class="stat-card-value">${wishlist.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">${Icons.calendar}<span>Últimos 30 días</span></div>
        <div class="stat-card-value">${last30Days}</div>
        <div class="stat-card-sub">terminados</div>
      </div>
    </div>

    ${topRatedThisYear ? `
      <div class="section-title">Lo mejor del año</div>
      <div class="book-list">
        ${bookRow(topRatedThisYear)}
      </div>
    ` : ''}

    ${topAuthors.length > 0 ? `
      <div class="section-title">Autores más leídos</div>
      <div>
        ${topAuthors.map(([name, count]) => `
          <div class="author-row">
            <span class="author-row-name">${escape(name)}</span>
            <span class="author-row-count">${count} libro${count > 1 ? 's' : ''}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  // Bind handlers para el "Lo mejor del año"
  attachLibraryHandlers(container);
}

// === Vista: Ajustes ===

export async function renderSettings(container) {
  document.getElementById('page-title').textContent = 'Ajustes';

  const books = await db.getAllBooks();
  const collections = await db.getAllCollections();

  container.innerHTML = `
    <div class="section-title">Datos</div>
    <div class="settings-section">
      <div class="settings-row">
        <span class="settings-row-label">Libros guardados</span>
        <span class="settings-row-value">${books.length}</span>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">Listas</span>
        <span class="settings-row-value">${collections.length}</span>
      </div>
    </div>

    <div class="section-title">Backup</div>
    <button class="btn-secondary" id="btn-export">Exportar todo (JSON)</button>
    <button class="btn-secondary" id="btn-import">Importar desde JSON</button>
    <input type="file" id="import-file" accept="application/json" style="display:none">
    <p class="tertiary mt-8">Recomendado: exporta cada mes y guárdalo en iCloud Drive o envíatelo por email.</p>

    <div class="section-title">Acerca de</div>
    <div class="settings-section">
      <div class="settings-row">
        <span class="settings-row-label">Versión</span>
        <span class="settings-row-value">v0.7</span>
      </div>
    </div>
    <p class="tertiary mt-8">Tus datos viven solo en este iPhone. Si desinstalas la app, los pierdes (a menos que hayas exportado un backup).</p>
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
      showToast('Error al importar: ' + e.message);
      console.error(e);
    }
  };
}

// === Modal: añadir libro ===

export function openAddBookModal() {
  preloadScanner().catch(() => {});

  openModal(`
    <h2 class="modal-title">Añadir libro</h2>
    <p class="modal-subtitle">Busca por título, escanea el código de barras o introduce manualmente.</p>
    <div class="action-list">
      <button class="action-item" id="opt-search">
        <span class="action-item-icon">${Icons.search}</span>
        <div class="action-item-content">
          <p class="action-item-title">Buscar por título o autor</p>
          <p class="action-item-desc">Resultados en línea con portadas</p>
        </div>
      </button>
      <button class="action-item" id="opt-scan">
        <span class="action-item-icon">${Icons.scan}</span>
        <div class="action-item-content">
          <p class="action-item-title">Escanear ISBN</p>
          <p class="action-item-desc">Apunta a la contraportada del libro</p>
        </div>
      </button>
      <button class="action-item" id="opt-manual">
        <span class="action-item-icon">${Icons.edit}</span>
        <div class="action-item-content">
          <p class="action-item-title">Añadir manualmente</p>
          <p class="action-item-desc">Introduce los datos a mano</p>
        </div>
      </button>
    </div>
  `);

  document.getElementById('opt-search').onclick = openSearchModal;
  document.getElementById('opt-scan').onclick = openScannerModal;
  document.getElementById('opt-manual').onclick = () => openManualEntryModal();
}

function openSearchModal() {
  openModal(`
    <h2 class="modal-title">Buscar libro</h2>
    <div class="search-input-wrapper">
      ${Icons.search}
      <input type="search" id="search-input" placeholder="Título, autor o ISBN" autofocus autocomplete="off" autocapitalize="none">
    </div>
    <div id="search-results"></div>
  `);

  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let timer = null;
  let lastQuery = '';

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { results.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      if (q === lastQuery) return;
      lastQuery = q;
      results.innerHTML = loadingHTML('Buscando…');
      try {
        const books = await api.searchBooks(q);
        if (q !== lastQuery) return;
        if (books.length === 0) {
          results.innerHTML = `
            <div class="empty-state" style="padding:32px 20px">
              <div class="empty-state-illustration">${Icons.search}</div>
              <h2>Sin resultados</h2>
              <p>Prueba con otras palabras o añade el libro manualmente.</p>
            </div>
          `;
          return;
        }
        results.innerHTML = `<div class="search-results">${books.map((b, i) => `
          <div class="search-result" data-idx="${i}">
            <div class="search-result-cover">
              ${b.coverUrl ? `<img src="${escape(b.coverUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
            </div>
            <div class="search-result-info">
              <h3 class="search-result-title">${escape(b.title)}</h3>
              <p class="search-result-author">${escape((b.authors || []).join(', ') || 'Sin autor')}</p>
              <p class="search-result-meta">${[b.publishedYear, b.publisher, b.language === 'es' ? 'Español' : (b.language === 'en' ? 'Inglés' : null)].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
        `).join('')}</div>`;

        results.querySelectorAll('.search-result').forEach((el, i) => {
          el.addEventListener('click', () => openSaveBookModal(books[i]));
        });
      } catch (e) {
        results.innerHTML = `<p class="muted text-center mt-16">Error de conexión: ${escape(e.message)}</p>`;
      }
    }, 350);
  });
}

function openScannerModal() {
  if (!isScannerSupported()) {
    openModal(`
      <h2 class="modal-title">Cámara no disponible</h2>
      <p class="modal-subtitle">Tu navegador no permite acceso a la cámara. Añade el libro manualmente o usa la búsqueda.</p>
      <button class="btn-primary" id="btn-back">Volver</button>
    `);
    document.getElementById('btn-back').onclick = openAddBookModal;
    return;
  }

  openModal(`
    <h2 class="modal-title">Escanear ISBN</h2>
    <p class="modal-subtitle">Apunta al código de barras de la contraportada del libro.</p>
    <div id="scanner-container"></div>
    <div id="scanner-status"></div>
    <button class="btn-secondary mt-16" id="btn-cancel-scan">Cancelar</button>
  `);

  document.getElementById('btn-cancel-scan').onclick = closeModal;

  const status = document.getElementById('scanner-status');

  startScanner('scanner-container',
    async (isbn) => {
      await stopScanner();
      status.innerHTML = loadingHTML('Buscando datos del libro…');
      try {
        const book = await api.searchByISBN(isbn);
        if (book) {
          openSaveBookModal(book);
        } else {
          openManualEntryModal({ isbn });
          showToast('Libro no encontrado, completa los datos');
        }
      } catch (e) {
        openManualEntryModal({ isbn });
        showToast('Error al buscar, completa los datos');
      }
    },
    (err, errorType) => {
      console.error('Scanner error:', errorType, err);
      let html = '';
      if (errorType === 'permission') {
        html = `
          <div class="scanner-error">
            <strong>Permiso de cámara denegado.</strong><br><br>
            Para activarlo: <strong>Ajustes iOS → Safari → Cámara → Permitir</strong>. Después cierra la app y vuelve a abrirla.
          </div>
          <button class="btn-secondary mt-16" id="btn-manual-fallback">Añadir manualmente</button>
        `;
      } else if (errorType === 'no-camera') {
        html = `
          <div class="scanner-error">
            <strong>No se ha encontrado cámara.</strong><br>
            Esto puede pasar si abres la app en un dispositivo sin cámara o si el navegador la bloquea.
          </div>
          <button class="btn-secondary mt-16" id="btn-manual-fallback">Añadir manualmente</button>
        `;
      } else if (errorType === 'lib') {
        html = `
          <div class="scanner-error">
            <strong>Error al cargar el escáner.</strong><br>
            Comprueba tu conexión a internet y vuelve a intentarlo.
          </div>
          <button class="btn-secondary mt-16" id="btn-manual-fallback">Añadir manualmente</button>
        `;
      } else {
        html = `
          <div class="scanner-error">
            <strong>Error al iniciar la cámara.</strong><br>
            ${escape(err?.message || 'Error desconocido')}
          </div>
          <button class="btn-secondary mt-16" id="btn-manual-fallback">Añadir manualmente</button>
        `;
      }
      status.innerHTML = html;
      const fallback = document.getElementById('btn-manual-fallback');
      if (fallback) fallback.onclick = () => openManualEntryModal();
    }
  );
}

function openManualEntryModal(prefill = {}) {
  openModal(`
    <h2 class="modal-title">Añadir manualmente</h2>
    <div class="form-group">
      <label>Título</label>
      <input type="text" id="m-title" value="${escape(prefill.title || '')}" autofocus>
    </div>
    <div class="form-group">
      <label>Autor / Autores</label>
      <input type="text" id="m-author" value="${escape((prefill.authors || []).join(', '))}" placeholder="Separados por comas">
    </div>
    <div class="form-group">
      <label>Año</label>
      <input type="number" id="m-year" value="${prefill.publishedYear || ''}" inputmode="numeric">
    </div>
    <div class="form-group">
      <label>ISBN</label>
      <input type="text" id="m-isbn" value="${escape(prefill.isbn || '')}" inputmode="numeric">
    </div>
    <div class="form-group">
      <label>Estado inicial</label>
      <select id="m-status">
        <option value="wishlist" selected>Quiero leer</option>
        <option value="reading">Leyendo</option>
        <option value="read">Leído</option>
      </select>
    </div>
    <button class="btn-primary" id="btn-save-manual">Guardar libro</button>
    <button class="btn-secondary" id="btn-cancel-manual">Cancelar</button>
  `);

  document.getElementById('btn-cancel-manual').onclick = closeModal;
  document.getElementById('btn-save-manual').onclick = async () => {
    const title = document.getElementById('m-title').value.trim();
    if (!title) { showToast('Falta el título'); return; }
    const status = document.getElementById('m-status').value;
    const book = {
      title,
      authors: document.getElementById('m-author').value.split(',').map((s) => s.trim()).filter(Boolean),
      publishedYear: parseInt(document.getElementById('m-year').value) || prefill.publishedYear || null,
      pageCount: prefill.pageCount || null,
      isbn: document.getElementById('m-isbn').value.trim() || null,
      status,
      coverUrl: prefill.coverUrl || null,
      description: prefill.description || null,
      startedAt: status === 'reading' ? Date.now() : null,
      finishedAt: status === 'read' ? Date.now() : null
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
    <p class="modal-subtitle">${escape((bookData.authors || []).join(', ') || 'Sin autor')}</p>
    ${bookCover(bookData, 'book-detail-cover')}
    <div class="form-group">
      <label>Estado</label>
      <select id="save-status">
        <option value="wishlist" selected>Quiero leer</option>
        <option value="reading">Leyendo</option>
        <option value="read">Leído</option>
      </select>
    </div>
    <button class="btn-primary" id="btn-confirm-save">Añadir a mi biblioteca</button>
    <button class="btn-secondary" id="btn-cancel-save">Cancelar</button>
  `);

  document.getElementById('btn-cancel-save').onclick = closeModal;
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

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const stars = (rating) => {
    let html = '<div class="star-rating" id="star-rating">';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star ${i <= (rating || 0) ? 'filled' : ''}" data-value="${i}">★</span>`;
    }
    html += '</div>';
    return html;
  };

  const heroBg = book.coverUrl
    ? `<div class="book-detail-hero-bg" style="background: url('${escape(book.coverUrl)}') center/cover no-repeat;"></div>
       <div class="book-detail-hero-overlay"></div>`
    : '';

  openModal(`
    <div class="book-detail">
      ${heroBg}
      ${bookCover(book, 'book-detail-cover')}
      <h2>${escape(book.title)}</h2>
      <p class="book-detail-author">${escape((book.authors || []).join(', ') || 'Sin autor')}</p>

      <div class="properties">
        <div class="property-row">
          <div class="property-key">${Icons.status}<span>Estado</span></div>
          <div class="property-value">
            <select id="d-status">
              ${STATUS_ORDER.map((s) =>
                `<option value="${s}" ${book.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="property-row">
          <div class="property-key">${Icons.star}<span>Valoración</span></div>
          <div class="property-value">${stars(book.rating)}</div>
        </div>

        ${book.publishedYear ? `
        <div class="property-row">
          <div class="property-key">${Icons.calendar}<span>Año</span></div>
          <div class="property-value">${book.publishedYear}</div>
        </div>` : ''}

        ${book.startedAt ? `
        <div class="property-row">
          <div class="property-key">${Icons.calendar}<span>Empezado</span></div>
          <div class="property-value">${formatDate(book.startedAt)}</div>
        </div>` : ''}

        ${book.finishedAt ? `
        <div class="property-row">
          <div class="property-key">${Icons.calendar}<span>Terminado</span></div>
          <div class="property-value">${formatDate(book.finishedAt)}</div>
        </div>` : ''}

        ${book.isbn ? `
        <div class="property-row">
          <div class="property-key">${Icons.hash}<span>ISBN</span></div>
          <div class="property-value property-value-tertiary">${escape(book.isbn)}</div>
        </div>` : ''}
      </div>

      <div class="notes-section">
        <div class="section-title">Notas</div>
        <textarea class="notes-textarea" id="d-notes" placeholder="Lo que pensaste, citas favoritas, reseña...">${escape(book.notes || '')}</textarea>
      </div>

      <button class="btn-primary mt-16" id="btn-save-detail">Guardar cambios</button>
      <div class="detail-actions">
        <button class="btn-secondary" id="btn-share">Compartir</button>
        <button class="btn-secondary" id="btn-close-detail">Cerrar</button>
      </div>
      <button class="btn-danger" id="btn-delete">Eliminar libro</button>
    </div>
  `);

  let currentRating = book.rating || 0;
  document.querySelectorAll('#star-rating .star').forEach((star) => {
    star.addEventListener('click', () => {
      const v = parseInt(star.dataset.value);
      currentRating = currentRating === v ? 0 : v;
      document.querySelectorAll('#star-rating .star').forEach((s) => {
        s.classList.toggle('filled', parseInt(s.dataset.value) <= currentRating);
      });
    });
  });

  document.getElementById('btn-close-detail').onclick = closeModal;

  document.getElementById('btn-share').onclick = async () => {
    const authors = (book.authors || []).join(', ') || 'Sin autor';
    const stars = currentRating ? '★'.repeat(currentRating) + '☆'.repeat(5 - currentRating) : '';
    const statusText = STATUS_LABELS[book.status] || '';
    const text = `📖 ${book.title}\n${authors}${stars ? '\n' + stars : ''}${statusText ? '\n' + statusText : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: book.title, text });
      } catch (e) {
        if (e.name !== 'AbortError') showToast('No se pudo compartir');
      }
    } else {
      // Fallback: copiar al clipboard
      try {
        await navigator.clipboard.writeText(text);
        showToast('Copiado al portapapeles');
      } catch {
        showToast('Compartir no disponible');
      }
    }
  };

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
    showToast('Cambios guardados');
    renderLibrary(document.getElementById('view-container'));
  };

  document.getElementById('btn-delete').onclick = async () => {
    if (confirm(`¿Eliminar "${book.title}"? No se puede deshacer.`)) {
      await db.deleteBook(bookId);
      closeModal();
      showToast('Libro eliminado');
      renderLibrary(document.getElementById('view-container'));
    }
  };
}
