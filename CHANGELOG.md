# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.2] - 2026-10-04

### Añadido
- **Subcarpetas anidadas:** Botón para crear subcarpetas directamente en cualquier carpeta del árbol lateral, resolviendo la jerarquía recursiva en disco en Electron y en base de datos en Web.
- **Sincronización con archivos locales en disco:**
  - Escaneo recursivo del sistema de archivos (`fs:scanDirectory`) en Electron.
  - Botón de sincronización manual con animación de giro (`RefreshCw`) en la barra lateral.
  - Sincronización automática de biblioteca al enfocar la ventana de la aplicación (`focus`).
- **Almacenamiento Web avanzado con SQLite Local (WASM + IndexedDB):**
  - Motor relacional SQLite (`sql.js`) ejecutado en el navegador como almacenamiento por defecto para la versión Web, superando los límites de cuota de 5MB de `localStorage`.
  - Migración transparente y automática de documentos existentes en `localStorage` a tablas SQLite en el primer arranque.
  - Herramientas de copia de seguridad: **Exportar Base de Datos (.sqlite)** e **Importar Base de Datos (.sqlite)** con recarga instantánea.
- **Conectores de Almacenamiento en la Nube (Cloud Storage):**
  - Arquitectura modular desacoplada basada en proveedores (`src/services/storage/`).
  - Conector para **Microsoft Azure Storage Account** (Blob Storage) mediante SAS Token con prueba de conexión en vivo.
  - Conector para **Amazon S3 / S3-Compatible** (Cloudflare R2, MinIO, Wasabi) con endpoints y credenciales configurables.
  - Conectores para **Google Drive** y **Microsoft OneDrive**.
- **Barra de inserción rápida de secciones (`+ Añadir nueva sección`):** Control flotante en el Live Reader para insertar con un clic párrafos, títulos H1/H2/H3, viñetas, citas y diagramas Mermaid sin salir del modo visual.

### Corregido
- **Comportamiento de Enter en títulos:** Al pulsar `Enter` dentro de un encabezado (`H1`-`H6`), ahora se inserta un bloque de párrafo estándar `<p>` debajo, permitiendo continuar la redacción normalmente sin quedar atrapado en el tipo de letra del título.
- **Formateo in-situ en Live Reader:** La selección de botones de encabezado (H1, H2, H3) y formato en la cinta Ribbon transforma el bloque directamente en el editor visual sin expulsar al usuario a la vista de Markdown.
- **Renombrado de carpetas y documentos en Electron:** Implementada edición en línea (*inline rename*) con teclado (`Enter` para confirmar, `Escape` para cancelar, o desenfocar) en sustitución de `window.prompt` que no respondía en Electron.
- **Icono del instalador de Windows:** Integración de `build/icon.png` en la configuración NSIS para visualización nítida del logotipo en el asistente de instalación, escritorio y menú de inicio.
- **Privacidad:** Eliminación completa de datos personales de correo electrónico en la ventana *Acerca de* (`AboutModal.tsx`).

---

## [1.0.1] - 2026-10-04

### Añadido
- Generador de paquetes de instalación NSIS para Windows x64 (`MDJ-Studio-Setup-1.0.1.exe`).
- Registro centralizado de incidencias y especificaciones pendientes en `docs/ISSUES_PENDING.md`.

---

## [1.0.0] - 2026-10-03

### Añadido
- Lanzamiento inicial de **MDJ Studio** (*Markdown Jot Studio*).
- Modo de lectura y edición en vivo (*Live Reader*) con renderizado interactivo de diagramas Mermaid.
- Editor dividido (*Split Editor*) con sincronización de desplazamiento bidireccional.
- Soporte para directivas enriquecidas MDJ (colores de texto, bloques destacados, acordeones colapsables y notas cifradas con AES-256-GCM).
- Motor de exportación a PDF y HTML auto-contenido.
- Soporte multilingüe completo (Español, Inglés y Portugués).
- Sistema de temas visuales modernos (Dark Fintech Obsidian, White Modern, Nord Midnight, Sepia Editorial, Cyberpunk Neon y System Auto).
