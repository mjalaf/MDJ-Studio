import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let currentLanguage = 'en';

interface MenuStrings {
  file: string;
  newDoc: string;
  openDoc: string;
  save: string;
  saveAs: string;
  preferences: string;
  quit: string;
  edit: string;
  undo: string;
  redo: string;
  cut: string;
  copy: string;
  paste: string;
  selectAll: string;
  find: string;
  replace: string;
  view: string;
  toggleLibrary: string;
  toggleMetadata: string;
  modeLive: string;
  modeEditor: string;
  modeSplit: string;
  modeReader: string;
  reload: string;
  devTools: string;
  export: string;
  exportPdf: string;
  exportHtml: string;
  help: string;
  about: string;
}

const MENU_I18N: Record<string, MenuStrings> = {
  en: {
    file: 'File',
    newDoc: 'New Document',
    openDoc: 'Open File...',
    save: 'Save',
    saveAs: 'Save As...',
    preferences: 'Preferences...',
    quit: 'Quit',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    find: 'Find...',
    replace: 'Replace...',
    view: 'View',
    toggleLibrary: 'Toggle Library Panel',
    toggleMetadata: 'Toggle Front Matter',
    modeLive: 'Live Reader Mode (Default)',
    modeEditor: 'Editor Only Mode',
    modeSplit: 'Split View Mode',
    modeReader: 'Pure Reader Mode',
    reload: 'Reload',
    devTools: 'Toggle Developer Tools',
    export: 'Export',
    exportPdf: 'Export to PDF...',
    exportHtml: 'Export to HTML...',
    help: 'Help',
    about: 'About MDJ Studio...',
  },
  es: {
    file: 'Archivo',
    newDoc: 'Nuevo Documento',
    openDoc: 'Abrir Archivo...',
    save: 'Guardar',
    saveAs: 'Guardar como...',
    preferences: 'Preferencias...',
    quit: 'Salir',
    edit: 'Edición',
    undo: 'Deshacer',
    redo: 'Rehacer',
    cut: 'Cortar',
    copy: 'Copiar',
    paste: 'Pegar',
    selectAll: 'Seleccionar todo',
    find: 'Buscar...',
    replace: 'Reemplazar...',
    view: 'Ver',
    toggleLibrary: 'Alternar Biblioteca',
    toggleMetadata: 'Alternar Metadados',
    modeLive: 'Modo Lector Interactivo (Por defecto)',
    modeEditor: 'Modo Solo Editor',
    modeSplit: 'Modo Vista Dividida',
    modeReader: 'Modo Solo Lector',
    reload: 'Recargar',
    devTools: 'Herramientas de Desarrollador',
    export: 'Exportar',
    exportPdf: 'Exportar a PDF...',
    exportHtml: 'Exportar a HTML...',
    help: 'Ayuda',
    about: 'Acerca de MDJ Studio...',
  },
  pt: {
    file: 'Arquivo',
    newDoc: 'Novo Documento',
    openDoc: 'Abrir Arquivo...',
    save: 'Salvar',
    saveAs: 'Salvar como...',
    preferences: 'Preferências...',
    quit: 'Sair',
    edit: 'Editar',
    undo: 'Desfazer',
    redo: 'Refazer',
    cut: 'Recortar',
    copy: 'Copiar',
    paste: 'Colar',
    selectAll: 'Selecionar tudo',
    find: 'Localizar...',
    replace: 'Substituir...',
    view: 'Exibir',
    toggleLibrary: 'Alternar Biblioteca',
    toggleMetadata: 'Alternar Metadados',
    modeLive: 'Modo Leitor Interativo (Padrão)',
    modeEditor: 'Modo Apenas Editor',
    modeSplit: 'Modo Visualização Dividida',
    modeReader: 'Modo Apenas Leitor',
    reload: 'Recarregar',
    devTools: 'Ferramentas do Desenvolvedor',
    export: 'Exportar',
    exportPdf: 'Exportar para PDF...',
    exportHtml: 'Exportar para HTML...',
    help: 'Ajuda',
    about: 'Sobre o MDJ Studio...',
  },
};

function setupNativeMenu(lang: string = 'en') {
  currentLanguage = lang;
  const m = MENU_I18N[lang] || MENU_I18N.en;
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: m.file,
      submenu: [
        {
          label: m.newDoc,
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-action', 'new-file'),
        },
        {
          label: m.openDoc,
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-action', 'open-file'),
        },
        {
          label: m.save,
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save-file'),
        },
        {
          label: m.saveAs,
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save-as-file'),
        },
        { type: 'separator' },
        {
          label: m.preferences,
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu-action', 'open-preferences'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: m.quit },
      ],
    },
    {
      label: m.edit,
      submenu: [
        {
          label: m.undo,
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu-action', 'undo'),
        },
        {
          label: m.redo,
          accelerator: 'CmdOrCtrl+Y',
          click: () => mainWindow?.webContents.send('menu-action', 'redo'),
        },
        { type: 'separator' },
        { role: 'cut', label: m.cut },
        { role: 'copy', label: m.copy },
        { role: 'paste', label: m.paste },
        { role: 'selectAll', label: m.selectAll },
        { type: 'separator' },
        {
          label: m.find,
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('menu-action', 'find'),
        },
        {
          label: m.replace,
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow?.webContents.send('menu-action', 'replace'),
        },
      ],
    },
    {
      label: m.view,
      submenu: [
        {
          label: m.toggleLibrary,
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow?.webContents.send('menu-action', 'toggle-library'),
        },
        {
          label: m.toggleMetadata,
          click: () => mainWindow?.webContents.send('menu-action', 'toggle-metadata'),
        },
        { type: 'separator' },
        {
          label: m.modeLive,
          click: () => mainWindow?.webContents.send('menu-action', 'view-live'),
        },
        {
          label: m.modeSplit,
          click: () => mainWindow?.webContents.send('menu-action', 'view-split'),
        },
        {
          label: m.modeEditor,
          click: () => mainWindow?.webContents.send('menu-action', 'view-editor'),
        },
        {
          label: m.modeReader,
          click: () => mainWindow?.webContents.send('menu-action', 'view-preview'),
        },
        { type: 'separator' },
        { role: 'reload', label: m.reload },
        { role: 'toggleDevTools', label: m.devTools },
      ],
    },
    {
      label: m.export,
      submenu: [
        {
          label: m.exportPdf,
          click: () => mainWindow?.webContents.send('menu-action', 'export-pdf'),
        },
        {
          label: m.exportHtml,
          click: () => mainWindow?.webContents.send('menu-action', 'export-html'),
        },
      ],
    },
    {
      label: m.help,
      submenu: [
        {
          label: m.about,
          click: () => mainWindow?.webContents.send('menu-action', 'open-about'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  // In the packaged app `public/` is not shipped; Vite copies it into `dist/`.
  const iconCandidates = [
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../build/icon.png'),
  ];
  const iconPath = iconCandidates.find((p) => fs.existsSync(p)) || iconCandidates[0];
  
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setIcon(iconPath);
    } catch (e) {
      // ignore in environments without dock support
    }
  }

  mainWindow = new BrowserWindow({
    title: 'MDJ Studio',
    icon: iconPath,
    width: 1380,
    height: 860,
    minWidth: 850,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#242933',
      symbolColor: '#eceff4',
      height: 54,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    backgroundColor: '#2e3440',
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const startUrl = isDev
    ? (process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupNativeMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for File, Directory & PDF/HTML operations
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown & MDJ & Mermaid', extensions: ['md', 'mdj', 'mmd', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  restoreWindowFocus();
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);
  
  return { filePath, filename, content };
});

// Native dialogs on Windows can leave the renderer without keyboard focus,
// which makes contentEditable areas stop accepting input. Restore it.
function restoreWindowFocus() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.blur();
    mainWindow.focus();
    mainWindow.webContents.focus();
  }, 50);
}

ipcMain.handle('file:save', async (_, { filePath, content }: { filePath?: string; content: string }) => {
  if (!mainWindow) return null;

  let targetPath = filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar Archivo',
      defaultPath: 'documento.md',
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'MDJ Document', extensions: ['mdj'] },
        { name: 'Mermaid Diagram', extensions: ['mmd'] },
        { name: 'Text File', extensions: ['txt'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      restoreWindowFocus();
      return null;
    }
    targetPath = result.filePath;
  }

  fs.writeFileSync(targetPath, content, 'utf-8');
  restoreWindowFocus();
  return { filePath: targetPath, filename: path.basename(targetPath) };
});

ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Seleccionar Carpeta de Biblioteca'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('shell:openPath', async (_, targetPath: string) => {
  if (!targetPath) return false;
  await shell.openPath(targetPath);
  return true;
});

ipcMain.handle('fs:createFolder', async (_, folderPath: string) => {
  if (!folderPath) return { success: false, error: 'Path is required' };
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return { success: true, folderPath };
  } catch (err: any) {
    console.error('Failed to create folder on disk:', err);
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('fs:renameFolder', async (_, { oldPath, newPath }: { oldPath: string; newPath: string }) => {
  if (!oldPath || !newPath) return { success: false, error: 'Both paths are required' };
  try {
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    } else {
      fs.mkdirSync(newPath, { recursive: true });
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to rename folder on disk:', err);
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('fs:deleteFolder', async (_, folderPath: string) => {
  if (!folderPath) return { success: false, error: 'Path is required' };
  try {
    if (fs.existsSync(folderPath)) {
      try {
        await shell.trashItem(folderPath);
      } catch {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete folder on disk:', err);
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('fs:scanDirectory', async (_, rootPath: string) => {
  if (!rootPath || !fs.existsSync(rootPath)) {
    return { success: false, folders: [], documents: [] };
  }

  interface ScannedFolder {
    name: string;
    path: string;
    relativePath: string;
    parentRelativePath?: string;
  }

  interface ScannedDoc {
    name: string;
    path: string;
    relativePath: string;
    parentRelativePath?: string;
    content: string;
    modifiedAt: number;
  }

  const folders: ScannedFolder[] = [];
  const documents: ScannedDoc[] = [];

  function walk(currentDir: string, parentRel?: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '$RECYCLE.BIN') continue;
      const fullPath = path.join(currentDir, entry.name);
      const relPath = parentRel ? `${parentRel}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        folders.push({
          name: entry.name,
          path: fullPath,
          relativePath: relPath,
          parentRelativePath: parentRel,
        });
        walk(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.md', '.mdj', '.mmd', '.markdown', '.txt'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const stat = fs.statSync(fullPath);
            documents.push({
              name: entry.name,
              path: fullPath,
              relativePath: relPath,
              parentRelativePath: parentRel,
              content,
              modifiedAt: stat.mtimeMs,
            });
          } catch (err) {
            console.warn(`Could not read ${fullPath}:`, err);
          }
        }
      }
    }
  }

  try {
    walk(rootPath);
    return { success: true, folders, documents };
  } catch (err: any) {
    console.error('Failed to scan directory:', err);
    return { success: false, error: err?.message || String(err), folders: [], documents: [] };
  }
});

ipcMain.handle('html:export', async (_, { defaultFilename, htmlContent }: { defaultFilename: string; htmlContent: string }) => {
  if (!mainWindow) return false;
  const saveDialogResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar Documento a HTML',
    defaultPath: defaultFilename || 'documento.html',
    filters: [{ name: 'HTML Document', extensions: ['html', 'htm'] }]
  });

  if (saveDialogResult.canceled || !saveDialogResult.filePath) {
    return false;
  }

  fs.writeFileSync(saveDialogResult.filePath, htmlContent, 'utf-8');
  return true;
});

ipcMain.handle('pdf:export', async (_, htmlContent: string) => {
  if (!mainWindow) return false;

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  const saveDialogResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar Documento a PDF',
    defaultPath: 'documento.pdf',
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  });

  if (saveDialogResult.canceled || !saveDialogResult.filePath) {
    printWindow.close();
    return false;
  }

  try {
    const pdfData = await printWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
    });

    fs.writeFileSync(saveDialogResult.filePath, pdfData);
    printWindow.close();
    return true;
  } catch (err) {
    console.error('Failed to export PDF:', err);
    printWindow.close();
    return false;
  }
});

ipcMain.handle('theme:update', async (_, theme: string) => {
  if (!mainWindow) return true;
  let bg = '#242933';
  let fg = '#eceff4';
  if (theme === 'github-light') {
    bg = '#ffffff';
    fg = '#181c32';
  } else if (theme === 'sepia') {
    bg = '#f4ecd8';
    fg = '#433422';
  } else if (theme === 'dark-glass') {
    bg = '#151624';
    fg = '#ffffff';
  } else if (theme === 'cyberpunk') {
    bg = '#120726';
    fg = '#00f0ff';
  } else if (theme === 'nord-midnight' || theme === 'system') {
    bg = '#242933';
    fg = '#eceff4';
  }
  try {
    mainWindow.setTitleBarOverlay({
      color: bg,
      symbolColor: fg,
      height: 54,
    });
  } catch {
    // If not supported on current platform, ignore
  }
  return true;
});

ipcMain.handle('language:update', async (_, lang: string) => {
  setupNativeMenu(lang);
  return true;
});
