# Lectorum

App PWA (Progressive Web App) de tracking de lectura. 100% gratuita, sin servidor, hospedada en GitHub Pages. Tu pareja la añade a la pantalla de inicio del iPhone y se ve y funciona casi como una app nativa.

## Por qué PWA y no app iOS nativa

Presupuesto 0€. Apple Developer Program cuesta $99/año, sin él no hay TestFlight ni App Store. PWA es la única vía gratuita que cumple los requisitos:
- Funciona en cualquier iPhone con Safari (iOS 16.4+ recomendado).
- Las amigas pueden instalarla con un link, sin App Store.
- Datos guardados localmente en cada dispositivo (IndexedDB).
- Look inspirado en iOS 26 Liquid Glass (imitación CSS, no nativo).

**Lo que pierdes vs app nativa**: Liquid Glass real al 100%, scanner ISBN ultra-rápido nativo, widgets de pantalla de inicio, sync iCloud automático, push notifications.

## Stack

- HTML + CSS + JavaScript vanilla (sin frameworks, sin build step)
- IndexedDB para persistencia local
- Google Books API + Open Library (búsqueda y metadatos, gratis)
- `html5-qrcode` cargado vía CDN (scanner ISBN)
- Service Worker para offline
- Manifest PWA para instalación

## Estructura

```
Lectorum/
├── README.md                       ← este archivo
├── index.html                      ← entry point HTML
├── manifest.json                   ← config PWA
├── service-worker.js               ← cache offline
├── styles/
│   └── main.css                    ← todos los estilos (Liquid Glass approx)
├── js/
│   ├── app.js                      ← entry, init, router
│   ├── db.js                       ← IndexedDB wrapper
│   ├── api.js                      ← búsqueda libros
│   ├── scanner.js                  ← scanner ISBN
│   └── views.js                    ← renderizado de vistas
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── docs/
    ├── DEPLOY_GITHUB_PAGES.md      ← cómo subir a GitHub Pages (paso a paso)
    └── INSTALL_ON_IPHONE.md        ← cómo instalar en el iPhone
```

## Quickstart

1. Crea una cuenta gratis en [github.com](https://github.com) si no la tienes.
2. Lee [`docs/DEPLOY_GITHUB_PAGES.md`](docs/DEPLOY_GITHUB_PAGES.md) y publica la app.
3. Pasa la URL a tu pareja. Ella sigue [`docs/INSTALL_ON_IPHONE.md`](docs/INSTALL_ON_IPHONE.md) para instalar.
4. Lo mismo si algún día las amigas la quieren instalar: solo necesitan la URL.

## Cosas que no hace v0.1 (y por qué)

- **Sync entre dispositivos**: cada iPhone tiene su propia base de datos local. Para sincronizar habría que pagar un backend (Firebase free tier funcionaría, pero cuenta como dependencia externa).
- **Notificaciones de "cuánto llevas leyendo hoy"**: iOS Safari no soporta web push fiable.
- **Widget en pantalla de inicio**: no existe en PWA.
- **Apple Watch**: no aplicable a PWA.

## Roadmap

- **v0.1 (esta entrega)**: añadir libros (búsqueda + manual + ISBN scan), 4 estados, lista, detalle, dashboard básico, wishlist, persistencia IndexedDB, look Liquid Glass approx.
- **v0.5**: Color extraction de portadas, animaciones más pulidas, estadísticas avanzadas, export/import JSON para backup.
- **v1.0**: Compartir wishlist por WhatsApp como imagen, página "ahora leyendo" para enviar a amigas.

## Limitaciones a tener en cuenta

- **Datos locales**: si tu pareja borra Safari o desinstala la app, pierde los datos. Mitigación v0.5: botón "exportar todo" a archivo JSON.
- **Scanner ISBN**: html5-qrcode funciona bien en iPhones modernos pero requiere permisos de cámara y a veces falla con luz pobre. Siempre habrá fallback a búsqueda manual.
- **Cobertura libros en español**: Google Books a veces no tiene portada o metadatos completos. Caemos a Open Library; si tampoco, edición manual.
