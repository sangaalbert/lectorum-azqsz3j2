// Lectorum - entry point
// Inicializa router de pestañas, registra service worker, conecta UI.

import {
  renderLibrary,
  renderDashboard,
  renderWishlist,
  renderCollections,
  renderSettings,
  openAddBookModal
} from './views.js';

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
  container.innerHTML = '<p class="muted text-center">Cargando…</p>';
  try {
    await VIEWS[viewName](container);
  } catch (e) {
    console.error('Error renderizando vista:', e);
    container.innerHTML = `<p class="muted text-center">Error: ${e.message}</p>`;
  }
}

function init() {
  // Listeners de pestañas
  document.querySelectorAll('.tab-item').forEach((el) => {
    el.addEventListener('click', () => navigate(el.dataset.view));
  });

  // Botón añadir
  document.getElementById('btn-add').addEventListener('click', () => openAddBookModal());

  // Vista inicial
  navigate('library');

  // Registrar service worker (offline)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .catch((e) => console.warn('SW no registrado:', e));
    });
  }
}

init();
