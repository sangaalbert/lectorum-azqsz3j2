// Scanner de ISBN usando html5-qrcode (cargado vía CDN bajo demanda)
// La librería funciona en Safari iOS 15+ y soporta EAN_13 (formato ISBN).

let scanner = null;
let libLoaded = false;

const CDN_URL = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.10/html5-qrcode.min.js';

function loadLibrary() {
  if (libLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN_URL;
    s.onload = () => { libLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('No se pudo cargar la librería de scanner'));
    document.head.appendChild(s);
  });
}

/**
 * Inicia el scanner en el elemento con id=elementId.
 * onDetect(isbn) se llama cuando se detecta un ISBN válido.
 * onError(err) se llama si hay error.
 */
export async function startScanner(elementId, onDetect, onError) {
  try {
    await loadLibrary();
  } catch (e) {
    onError(e);
    return;
  }

  if (!window.Html5Qrcode) {
    onError(new Error('Librería no disponible'));
    return;
  }

  scanner = new window.Html5Qrcode(elementId);
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 150 },
    formatsToSupport: [
      window.Html5QrcodeSupportedFormats?.EAN_13,
      window.Html5QrcodeSupportedFormats?.EAN_8
    ].filter(Boolean)
  };

  try {
    await scanner.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        // Validar que sea un ISBN-13 (empieza por 978 o 979)
        if (/^97[89]\d{10}$/.test(decodedText)) {
          onDetect(decodedText);
        }
      },
      () => { /* errores de frame, ignorar */ }
    );
  } catch (e) {
    onError(e);
  }
}

export async function stopScanner() {
  if (scanner) {
    try { await scanner.stop(); } catch {}
    try { scanner.clear(); } catch {}
    scanner = null;
  }
}
