// Lectorum - entry point
// Inicializa router de pestañas, registra service worker, conecta UI.
// v0.5: pre-carga scanner lib en background.

import {
  renderLibrary,
  renderDashboard,
  renderWishlist,
  renderCollections,
  renderSettings,
  openAddBookModal
} from './views.js';
import { preloadScanner } from './scanner.js';

const VIEWS = {
  library: renderLibrary,
  dashboard: renderDashboard,
  wishlist: renderWishlist,
  collections: renderCollections,
  settings: renderSettings
};

let currentView = 'library';

async function navigate(viewName) {
  if (!VIEWS[viewName]) return;
  currentView = viewName;

  document.querySelectorAll('.tab-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });

  const container = document.getElementById('view-container');
  container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><span>Cargando…</span></div>';
  try {
    await VIEWS[viewName](container);
  } catch (e) {
    console.error('Error renderizando vista:', e);
    container.innerHTML = `<div class="empty-state"><h2>Algo se rompió</h2><p>${e.message}</p></div>`;
  }
}

function init() {
  document.querySelectorAll('.tab-item').forEach((el) => {
    el.addEventListener('click', () => navigate(el.dataset.view));
  });

  document.getElementById('btn-add').addEventListener('click', () => openAddBookModal());

  // Vista inicial
  navigate('library');

  // Pre-cargar scanner library en background tras el primer paint
  setTimeout(() => {
    preloadScanner().catch((e) => console.warn('Scanner preload failed:', e));
  }, 1500);

  // Service Worker para offline
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .catch((e) => console.warn('SW no registrado:', e));
    });
  }
}

init();
