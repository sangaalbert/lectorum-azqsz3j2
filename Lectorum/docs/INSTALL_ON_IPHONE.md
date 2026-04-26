# Instalar Lectorum en el iPhone

Lectorum no está en la App Store. Se instala desde Safari como una "Web App". Tarda 30 segundos.

## Pasos en el iPhone

1. **Abre Safari** (debe ser Safari, no Chrome ni Firefox; iOS solo permite instalar PWAs desde Safari).
2. Entra en la URL que te ha pasado Albert. Algo como `https://albert-sanchez.github.io/lectorum/`.
3. Una vez cargada la página, toca el **icono de compartir** (el cuadrado con la flecha hacia arriba, en la parte inferior central).
4. Desliza hacia abajo en el menú y toca **Añadir a pantalla de inicio**.
5. Le sale un previsualización del icono. Puedes editar el nombre si quieres ("Lectorum" por defecto).
6. Toca **Añadir** (esquina superior derecha).
7. Cierra Safari. En la pantalla de inicio del iPhone aparece el icono de Lectorum.

A partir de ahora se abre como una app: pantalla completa, sin barra de Safari, con su propio icono.

## Permisos necesarios

La primera vez que uses el escáner ISBN, iOS te pedirá permiso para usar la cámara. Acepta. Si lo rechazas:

- Abre **Ajustes** (la app gris de iOS).
- Busca **Safari** > **Cámara** y selecciona "Permitir".

(Aunque la PWA está instalada como app, los permisos los gestiona Safari por debajo.)

## Cosas a saber

- **Los datos viven solo en este iPhone**. Si la desinstalas, pierdes los libros guardados (a menos que hayas exportado un backup desde Ajustes → Exportar).
- **Funciona sin internet** una vez cargada la primera vez. Las búsquedas de libros nuevos sí necesitan conexión, pero la app y tu biblioteca son accesibles offline.
- **Sin notificaciones**: las PWAs en iOS no soportan notificaciones push fiables, así que no te llegará ningún recordatorio.
- **Sin sync entre dispositivos**: si tu pareja también la instala en un iPad, será una biblioteca diferente. Para sincronizar habría que exportar JSON e importar manualmente.

## Cómo desinstalarla

Igual que cualquier app: mantén pulsado el icono > Eliminar app > Eliminar.

## Cómo actualizarla

Cuando Albert publique una nueva versión:

1. Cierra la app (deslizándola hacia arriba en el selector de apps).
2. Vuelve a abrirla. El service worker detecta cambios y descarga la nueva versión.
3. Si no se actualiza después de un par de aperturas: desinstala y vuelve a "Añadir a pantalla de inicio". Como los datos están en IndexedDB, **no se borran** al reinstalar.

## Si Lectorum se ralentiza con muchos libros

A partir de ~1000 libros la lista puede empezar a notarse. Si llega ese momento, dilo y se optimiza con paginación.
