# Desplegar Lectorum en GitHub Pages (repo privado, URL invisible)

Esta guía despliega la app en una URL pública pero **imposible de adivinar**, con el código fuente privado. Tiempo estimado: 15-20 minutos la primera vez.

## Privacidad final que conseguimos

- **Código fuente**: solo tú lo ves (repo privado).
- **URL del sitio**: pública vía HTTPS, pero con un slug aleatorio que nadie va a adivinar.
- **Buscadores**: bloqueados por `robots.txt` y meta `noindex` (Google, Bing, etc. no la encontrarán).
- **Datos de tu pareja**: solo en su iPhone (IndexedDB local). Nunca se suben a GitHub ni a nadie.

## Slug recomendado

Usa este nombre para tu repo (te lo generé aleatorio): **`lectorum-azqsz3j2`**

Si prefieres otro, genera uno random de 8 caracteres alfanuméricos. **NO uses nombres descriptivos** (`lectorum`, `mi-app`, `libros`) porque son adivinables.

## Paso a paso

### 1. Crear cuenta GitHub (si no la tienes)

1. Entra en [github.com/signup](https://github.com/signup).
2. Email + contraseña + nombre de usuario. **No piden tarjeta**, no piden datos personales más allá del email. El plan Free es ilimitado.
3. Verifica el email cuando te llegue el correo.

### 2. Crear el repositorio (privado)

1. Una vez dentro de GitHub, haz clic en **New** (esquina superior izquierda) o ve a [github.com/new](https://github.com/new).
2. Rellena:
   - **Repository name**: `lectorum-azqsz3j2` (o el slug que hayas elegido).
   - **Description**: déjalo vacío (no queremos meta info pública).
   - **Visibility**: **Private** ← MUY IMPORTANTE.
   - **Add a README file**: NO lo marques.
   - **gitignore / license**: NO añadas.
3. Pulsa **Create repository**.

### 3. Subir los archivos

1. En la página del repo recién creado, busca el link "**uploading an existing file**" (link azul abajo del cuadro "Quick setup").
2. Arrastra **toda la carpeta** `Lectorum/` desde tu Mac al navegador. GitHub procesará la subida y mantendrá la jerarquía de carpetas.
3. Abajo, en **Commit changes**, escribe `v0.1 inicial` y pulsa **Commit changes** (botón verde).

### 4. Activar GitHub Pages (en repo privado)

1. En el repo, pestaña **Settings** (arriba a la derecha).
2. Menú lateral izquierdo → **Pages**.
3. En **Source**:
   - Branch: `main`
   - Folder: `/ (root)`
4. Pulsa **Save**.
5. Espera 1-2 minutos. Refresca la página de Pages. Verás:

   > Your site is live at `https://TU_USUARIO.github.io/lectorum-azqsz3j2/`

   **Esa URL es la definitiva**. Apúntala.

### 5. Verificar privacidad

Abre la URL en una ventana privada/incógnito. Debes ver la app cargando con "Tu biblioteca está vacía". Bien.

Para verificar que los buscadores no la indexarán:
- Abre `https://TU_USUARIO.github.io/lectorum-azqsz3j2/robots.txt` y debe mostrar:
  ```
  User-agent: *
  Disallow: /
  ```
- En el HTML de la home (View Source) debe aparecer `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">`.

Combinado con el slug aleatorio, **es prácticamente invisible para terceros**.

### 6. Compartir con tu pareja

Pásale la URL por WhatsApp/iMessage. Ella sigue [INSTALL_ON_IPHONE.md](INSTALL_ON_IPHONE.md). El link es funcionalmente privado: solo quien lo conozca puede abrirlo.

**Buena práctica**: cuando le mandes el link a una amiga, pídele que NO lo comparta en redes sociales ni lo mencione en grupos públicos. Si saliera a buscadores, el slug sigue protegiendo, pero por higiene.

## Actualizar la app después

Cuando recibas una nueva versión:

1. En el repo, navega al archivo a cambiar.
2. Pulsa el lápiz (editar) o sube un reemplazo arrastrando.
3. Commit changes.
4. En 1-2 minutos la nueva versión está en la URL.

Tu pareja tendrá que cerrar la app y volver a abrirla para que el service worker descargue la nueva versión.

## Problemas comunes

**"404 - Page not found"** después de activar Pages: espera 5 minutos más. La primera publicación tarda.

**"GitHub Pages no me deja activar en repo privado"**: si te dice algo de upgrade, asegúrate de que estás en plan Free y que el repo es de tu cuenta personal (no de una organización). Plan Free permite Pages en repos privados desde 2023.

**"Dame la URL"**: Settings → Pages → ahí siempre aparece.

**"Quiero rotar el slug porque alguien la compartió"**: rename el repo. La URL nueva será `tu-usuario.github.io/nuevo-slug/`. Pásasela a quienes confíes y olvida la antigua.
