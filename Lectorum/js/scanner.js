// Scanner ISBN con html5-qrcode (CDN).
// v0.5: pre-carga al arrancar la app, mejor gestión de permisos y errores.

let scanner = null;
let libLoadPromise = null;
let libLoaded = false;

const CDN_URL = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.10/html5-qrcode.min.js';

/**
 * Pre-carga la librería en background. Llamar al arranque para que el primer
 * tap en "Escanear" sea instantáneo.
 */
export function preloadScanner() {
  if (libLoaded || libLoadPromise) return libLoadPromise;
  libLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN_URL;
    s.async = true;
    s.onload = () => { libLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('No se pudo cargar la librería de scanner'));
    document.head.appendChild(s);
  });
  return libLoadPromise;
}

export function isScannerSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Inicia el scanner.
 *  - elementId: id del div contenedor.
 *  - onDetect(isbn): callback con el ISBN-13 detectado.
 *  - onError(err, errorType): callback de error. errorType ∈ { 'lib', 'permission', 'no-camera', 'unknown' }
 */
export async function startScanner(elementId, onDetect, onError) {
  if (!isScannerSupported()) {
    onError(new Error('Tu navegador no soporta acceso a la cámara'), 'no-camera');
    return;
  }

  try {
    await preloadScanner();
  } catch (e) {
    onError(e, 'lib');
    return;
  }

  if (!window.Html5Qrcode) {
    onError(new Error('Librería no inicializada'), 'lib');
    return;
  }

  const formats = [];
  if (window.Html5QrcodeSupportedFormats) {
    formats.push(
      window.Html5QrcodeSupportedFormats.EAN_13,
      window.Html5QrcodeSupportedFormats.EAN_8,
      window.Html5QrcodeSupportedFormats.UPC_A,
      window.Html5QrcodeSupportedFormats.UPC_E
    );
  }

  scanner = new window.Html5Qrcode(elementId, {
    formatsToSupport: formats.length ? formats : undefined,
    verbose: false
  });

  const config = {
    fps: 10,
    qrbox: (vw, vh) => {
      const minEdge = Math.min(vw, vh);
      return { width: Math.floor(minEdge * 0.8), height: Math.floor(minEdge * 0.5) };
    },
    aspectRatio: 4 / 3
  };

  let detected = false;

  try {
    await scanner.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        if (detected) return;
        // Validar ISBN-13: empieza por 978 o 979
        if (/^97[89]\d{10}$/.test(decodedText)) {
          detected = true;
          onDetect(decodedText);
        }
      },
      () => { /* errores de frame, ignorar */ }
    );
  } catch (e) {
    const msg = (e && e.message) || String(e);
    if (/permission|denied|NotAllowed/i.test(msg)) {
      onError(e, 'permission');
    } else if (/NotFound|no camera|NotReadable/i.test(msg)) {
      onError(e, 'no-camera');
    } else {
      onError(e, 'unknown');
    }
  }
}

export async function stopScanner() {
  if (scanner) {
    try { await scanner.stop(); } catch {}
    try { scanner.clear(); } catch {}
    scanner = null;
  }
}
