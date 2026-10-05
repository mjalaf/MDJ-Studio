# Registro de Correcciones y Tareas Pendientes (MDJ Studio)

Este documento registra los errores y mejoras reportados por el usuario para su posterior implementación.
**Estado general:** Documentado — Ningún cambio de código ha sido aplicado aún, a la espera de confirmación y posibles nuevos puntos a incluir.

---

## Índice de Tareas

1. [Bug #1: Creación de carpetas fuera de Library Location en Electron](#1-creación-de-carpetas-fuera-de-library-location-en-electron)
2. [Bug #2: Imposibilidad de renombrar carpetas en Electron](#2-imposibilidad-de-renombrar-carpetas-en-electron)
3. [Tarea #3: Eliminación de correo electrónico personal](#3-eliminación-de-correo-electrónico-personal)
4. [Bug #4: Selección de H1/H2 en Live Reader fuerza salto a pestaña Markdown](#4-selección-de-h1h2-en-live-reader-fuerza-salto-a-pestaña-markdown)
5. [Mejora #5: Cambio de tipo de bloque en Live Reader y botón '+' de nueva sección](#5-cambio-de-tipo-de-bloque-en-live-reader-y-botón--de-nueva-sección)
6. [Mejora #6: Change Tracking por release y sincronización de versión](#6-change-tracking-por-release-y-sincronización-de-versión)
7. [Mejora #7: Almacenamiento Web avanzado — SQLite por defecto y conectores Cloud (Google Drive, OneDrive, Azure Blob, S3)](#7-almacenamiento-web-avanzado--sqlite-por-defecto-y-conectores-cloud-google-drive-onedrive-azure-blob-s3)
8. [Mejora #8: Creación de subcarpetas anidadas en Electron](#8-creación-de-subcarpetas-anidadas-en-electron)
9. [Mejora #9: Sincronización de archivos y carpetas copiados manualmente en disco](#9-sincronización-de-archivos-y-carpetas-copiados-manualmente-en-disco)

---

### 1. Creación de carpetas fuera de Library Location en Electron

- **Entorno:** Electron Desktop.
- **Descripción:** Cuando el usuario define la ruta de la biblioteca en Ajustes (*Library Location*), la ruta queda guardada (`settings.libraryPath`). Sin embargo, al pulsar "Nueva Carpeta" en el panel lateral, la carpeta solo se crea en memoria / `localStorage`, sin crearse físicamente en la carpeta de la biblioteca en el disco.
- **Causa Raíz Identificada:**
  - `LibraryService` (`src/services/libraryService.ts`) maneja carpetas y documentos exclusivamente en `localStorage` (`mark_mermaid_library_folders`).
  - No existen canales IPC en `electron/main.cts` ni en `electron/preload.cts` para operaciones de sistema de archivos (crear carpetas, listar carpetas, etc.).
- **Archivos Involucrados:**
  - `src/services/libraryService.ts`
  - `src/components/SettingsModal.tsx`
  - `electron/main.cts`
  - `electron/preload.cts`
  - `src/types/index.ts`
- **Solución Propuesta:**
  - Implementar handlers IPC en Electron: `fs:createFolder(path)`, `fs:renameFolder(oldPath, newPath)`, `fs:deleteFolder(path)`.
  - Conectar `LibraryService` para que, si está en modo Electron y `settings.libraryPath` está definido, cree físicamente la carpeta en disco y mantenga sincronizada la vista del árbol.
- **Estado:** `Resuelto` (Implementados handlers IPC `fs:createFolder`, `fs:renameFolder`, `fs:deleteFolder` en Electron y sincronización física con disco en `LibraryService`).

---

### 2. Imposibilidad de renombrar carpetas en Electron

- **Entorno:** Electron Desktop.
- **Descripción:** Al hacer clic en el botón de renombrar de una carpeta en la barra lateral, no se puede cambiar su nombre.
- **Causa Raíz Identificada:**
  - `LibrarySidebar.tsx` utiliza `window.prompt(t.sidebar.promptRename, folder.name)`.
  - En Electron/Chromium, la API `window.prompt()` no está implementada nativamente o retorna `null` de inmediato sin desplegar ningún diálogo en pantalla.
- **Archivos Involucrados:**
  - `src/components/LibrarySidebar.tsx` (métodos `handlePromptRenameFolder` y `handlePromptRenameDoc`)
- **Solución Propuesta:**
  - Reemplazar `window.prompt` por **edición en línea (inline rename)** directamente en el árbol de carpetas (un `<input>` que aparece sobre el nombre de la carpeta con autofocus, confirmable con `Enter` o `blur`, y cancelable con `Esc`).
  - Como respaldo, un modal ligero en React (`RenameDialog`) para renombrar carpetas y documentos.
- **Estado:** `Resuelto` (Implementada edición en línea con `<input className="inline-rename-input">` para carpetas y documentos, con doble clic o botón de editar, soporte para `Enter`, `Escape` y `blur`).

---

### 3. Eliminación de correo electrónico personal

- **Entorno:** Aplicación global (Web & Electron).
- **Descripción:** El correo personal `martinj@microsoft.com` aparece hardcodeado en la pantalla "Acerca de" (`AboutModal.tsx`) con un botón para copiar.
- **Causa Raíz Identificada:**
  - En `src/components/AboutModal.tsx`, línea 20: `const email = 'martinj@microsoft.com';`.
- **Archivos Involucrados:**
  - `src/components/AboutModal.tsx`
- **Solución Propuesta:**
  - Eliminar por completo la variable `email`, el botón de copia y la fila correspondiente del modal.
  - Dejar únicamente el nombre de autor, versión, licencia y enlace al repositorio de GitHub si corresponde.
- **Estado:** `Resuelto` (Correo y botón de copiado eliminados por completo de `AboutModal.tsx`).

---

### 4. Selección de H1/H2 en Live Reader fuerza salto a pestaña Markdown

- **Entorno:** Live Reader (Editor Visual en Vivo).
- **Descripción:** Estando en el modo *Visual (En Vivo)*, al pulsar un botón de encabezado (`H1`, `H2`, `H3`) en la cinta Ribbon, la aplicación cambia forzosamente a la vista de código Markdown crudo (`setLiveMode('writer')`) en lugar de mostrar y formatear el encabezado en el mismo editor visual.
- **Causa Raíz Identificada:**
  - En `src/components/LiveReader.tsx` (`useImperativeHandle -> insertText`), si la selección está colapsada (cursor sin texto seleccionado):
    ```typescript
    const textarea = textareaRef.current;
    if (!textarea) {
      setLiveMode('writer'); // <--- Provoca el cambio no deseado
      ...
    }
    ```
- **Archivos Involucrados:**
  - `src/components/LiveReader.tsx`
  - `src/components/Ribbon.tsx`
  - `src/App.tsx`
- **Solución Propuesta:**
  - Modificar `insertText` en `LiveReader.tsx` para que nunca conmute a `writer` al aplicar estilos de bloque.
  - Si no hay selección, insertar un nodo encabezado (`<h1>Título</h1>`) o transformar el bloque de texto actual mediante `document.execCommand('formatBlock', false, '<hX>')` en el contenedor `contentEditable`, manteniendo al usuario 100% en la experiencia visual.
- **Estado:** `Resuelto` (Se modificó `insertText` en `LiveReader.tsx` para no alternar a `writer` al aplicar estilos de bloque o encabezados; ejecuta `document.execCommand('formatBlock', false, '<hX>')` directamente en el editor visual).

---

### 5. Cambio de tipo de bloque en Live Reader y botón '+' de nueva sección

- **Entorno:** Live Reader (Editor Visual en Vivo).
- **Descripción:** Al escribir dentro de un H1 u otro encabezado y pulsar Enter, el editor continuaba en modo encabezado o no permitía cambiar el tipo de letra/bloque a párrafo normal sin recurrir al Markdown crudo.
- **Solución Implementada:**
  1. **Comportamiento de Enter en encabezados:** Al pulsar `Enter` en cualquier encabezado (`H1`-`H6`), intercepta la tecla y crea limpiamente un párrafo `<p><br></p>` estándar en la siguiente línea, posicionando el cursor en él.
  2. **Botón '+' de inserción de secciones:** Añadido al pie del editor visual una barra de inserción (`+ Añadir nueva sección`) con menú contextual rápido para insertar:
     - Párrafo de texto normal
     - Título H1 / Subtítulo H2 / Sección H3
     - Lista con viñetas
     - Cita destacada
     - Diagrama Mermaid listo para previsualizar
- **Archivos Involucrados:**
  - `src/components/LiveReader.tsx`
  - `src/index.css`
- **Estado:** `Resuelto` (Implementado salto de encabezado a párrafo con Enter, y barra de inserción de secciones visual con selector de bloques).

---

### 8. Creación de subcarpetas anidadas en Electron

- **Entorno:** Electron Desktop / Panel lateral de biblioteca.
- **Descripción:** La aplicación permitía crear carpetas raíz pero no subcarpetas anidadas dentro de una carpeta existente.
- **Solución Implementada:**
  - Añadido botón de crear subcarpeta (`FolderPlus`) directamente en cada fila de carpeta en el árbol de biblioteca.
  - Al crearse, se resuelve recursivamente la ruta física en disco respetando la jerarquía de directorios.
  - La carpeta padre se auto-expande inmediatamente mostrando la nueva subcarpeta con su campo de renombrado inline enfocado.
- **Archivos Involucrados:**
  - `src/components/LibrarySidebar.tsx`
  - `src/services/libraryService.ts`
  - `src/services/fileService.ts`
- **Estado:** `Resuelto`.

---

### 9. Sincronización de archivos y carpetas copiados manualmente en disco

- **Entorno:** Electron Desktop.
- **Descripción:** Si el usuario copia o pega archivos (`.md`, `.mdj`, `.mmd`, `.txt`) directamente en la carpeta de biblioteca desde el Explorador de Windows, la aplicación no los detectaba.
- **Solución Implementada:**
  - Implementado handler IPC `fs:scanDirectory` en Electron para escaneo recursivo del sistema de archivos.
  - Función `syncWithDisk()` en `LibraryService`: importa automáticamente nuevos documentos y subcarpetas, actualiza marcas de tiempo y contenido modificado externamente, y elimina referencias obsoletas.
  - Botón de sincronización manual con animación de giro (`RefreshCw`) en la cabecera de la barra lateral.
  - Sincronización reactiva automática cada vez que la ventana de MDJ Studio recupera el foco (`window.addEventListener('focus')`).
- **Archivos Involucrados:**
  - `electron/main.cts`
  - `electron/preload.cts`
  - `src/services/fileService.ts`
  - `src/services/libraryService.ts`
  - `src/components/LibrarySidebar.tsx`
  - `src/App.tsx`
- **Estado:** `Resuelto`.

---

### 6. Change Tracking por release y sincronización de versión

- **Entorno:** Proyecto general, empaquetado y control de versiones.
- **Descripción:** Implementar un mecanismo de seguimiento de cambios (Change Tracking) por cada release y unificar la fuente de verdad de la versión del sistema (evitando versiones desfasadas como `1.0.0` vs `1.0.1`).
- **Causa Raíz Identificada:**
  - No existe un archivo `CHANGELOG.md`.
  - La versión está escrita a mano en múltiples lugares: `package.json` (`1.0.1`) y `AboutModal.tsx` (`1.0.0`).
- **Archivos Involucrados:**
  - `CHANGELOG.md` (nuevo archivo)
  - `package.json`
  - `vite.config.ts` (para inyectar `__APP_VERSION__`)
  - `src/components/AboutModal.tsx`
- **Solución Propuesta:**
  - Crear `CHANGELOG.md` siguiendo el formato *Keep a Changelog* y *Semantic Versioning*, detallando los cambios de `v1.0.0`, `v1.0.1` y la sección activa `[Unreleased]`.
  - Configurar `vite.config.ts` para exponer la versión de `package.json` globalmente en tiempo de compilación.
  - Consumir esa versión dinámica en `AboutModal.tsx` y en el título de la ventana de Electron.
- **Estado:** `Resuelto` (Creado `CHANGELOG.md` siguiendo estándar Keep a Changelog y Semantic Versioning para v1.0.0, v1.0.1 y v1.0.2, y sincronizada la versión 1.0.2 en package.json y AboutModal.tsx).

---

### 7. Almacenamiento Web avanzado — SQLite por defecto y conectores Cloud (Google Drive, OneDrive, Azure Blob, S3)

- **Entorno:** Versión Web de MDJ Studio (también integrable como motor de base de datos local en Electron).
- **Descripción:** Actualmente la versión Web almacena documentos y carpetas en el `localStorage` del navegador, lo que conlleva limitaciones severas (máximo 5MB de cuota, sin transacciones, riesgo de pérdida por borrado de caché del navegador). Se solicita:
  1. Utilizar **SQLite** como motor de almacenamiento persistente local por defecto en la versión Web.
  2. Implementar una arquitectura desacoplada y configurable que permita al usuario cambiar o sincronizar con proveedores Cloud:
     - Google Drive
     - Microsoft OneDrive
     - Azure Storage Account (Blob Storage)
     - Amazon S3 / S3-compatible (Cloudflare R2, MinIO, Wasabi)
- **Viabilidad Técnica:**
  - **SQLite en el Navegador (100% viable y estándar actual):**
    - Se implementa mediante el paquete oficial `@sqlite.org/sqlite-wasm` junto con **OPFS (Origin Private File System)** o `sql.js` sobre IndexedDB.
    - Ventajas: Soporta bases de datos relacionales reales sin límite práctico de espacio (gigabytes según el disco del usuario), soporte de transacciones ACID, y posibilidad de usar índices **FTS5** (Full-Text Search) para búsquedas instantáneas en el contenido de todos los documentos Markdown.
  - **Conectores Cloud seleccionables:**
    - **Google Drive:** Autenticación OAuth2 PKCE en cliente y uso de Google Drive REST API v3 / Google Picker API.
    - **Microsoft OneDrive:** Autenticación con `@azure/msal-browser` y llamadas a Microsoft Graph API (`/me/drive/root/...`).
    - **Azure Storage Account:** Cliente `@azure/storage-blob` en cliente usando SAS tokens o autenticación Microsoft Entra (Azure AD).
    - **Amazon S3 / S3-compatible:** Cliente `@aws-sdk/client-s3` con credenciales de acceso o URLs prefirmadas (requiere habilitar CORS en el bucket S3).
- **Diseño Arquitectónico Propuesto:**
  - Crear una capa de abstracción basada en el patrón *Provider*:
    ```
    src/services/storage/
    ├── IStorageProvider.ts          <-- Interfaz unificada (init, list, read, write, delete, createFolder, sync)
    ├── SqliteStorageProvider.ts     <-- Proveedor POR DEFECTO en Web (SQLite WASM + OPFS)
    ├── GoogleDriveProvider.ts       <-- Conector Google Drive (OAuth2)
    ├── OneDriveProvider.ts          <-- Conector Microsoft OneDrive (MSAL Graph API)
    ├── AzureBlobProvider.ts         <-- Conector Azure Blob Storage (SAS Token)
    ├── S3StorageProvider.ts         <-- Conector AWS S3 / R2 (API Keys / Presigned)
    └── StorageManager.ts            <-- Orquestador que inicializa el proveedor activo
    ```
  - En la interfaz de Ajustes (`SettingsModal`), agregar una pestaña "Almacenamiento y Nube" donde el usuario pueda ver el estado de su base de datos SQLite local, exportar/importar el archivo `.sqlite` a su PC, o seleccionar y configurar un proveedor Cloud externo.
- **Archivos Involucrados:**
  - `src/services/storage/` (nuevo módulo de adaptadores)
  - `src/services/libraryService.ts` (reemplaza llamadas directas a `localStorage` por la interfaz `IStorageProvider`)
  - `src/components/SettingsModal.tsx` (nueva pestaña de configuración de almacenamiento y nube)
  - `src/types/index.ts` (definición de interfaces y tipos de configuración de proveedores)
- **Estado:** `Resuelto` (Implementada arquitectura en `src/services/storage/` con SQLite WASM e IndexedDB persistente como motor por defecto para Web, conectores Cloud para Azure Blob, Amazon S3, Google Drive y OneDrive, y centro de gestión con exportación/importación `.sqlite` en `SettingsModal.tsx`).

