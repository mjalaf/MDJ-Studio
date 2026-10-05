import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data: { filePath?: string; content: string }) => ipcRenderer.invoke('file:save', data),
  exportPDF: (htmlContent: string) => ipcRenderer.invoke('pdf:export', htmlContent),
  exportHTML: (data: { defaultFilename?: string; htmlContent: string }) => ipcRenderer.invoke('html:export', data),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  openPath: (targetPath: string) => ipcRenderer.invoke('shell:openPath', targetPath),
  createFolder: (folderPath: string) => ipcRenderer.invoke('fs:createFolder', folderPath),
  renameFolder: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renameFolder', { oldPath, newPath }),
  deleteFolder: (folderPath: string) => ipcRenderer.invoke('fs:deleteFolder', folderPath),
  scanDirectory: (rootPath: string) => ipcRenderer.invoke('fs:scanDirectory', rootPath),
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on('menu-action', handler);
    return () => {
      ipcRenderer.removeListener('menu-action', handler);
    };
  },
  updateTheme: (theme: string) => ipcRenderer.invoke('theme:update', theme),
  updateLanguage: (lang: string) => ipcRenderer.invoke('language:update', lang),
});
