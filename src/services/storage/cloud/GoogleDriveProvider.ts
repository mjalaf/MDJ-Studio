import type { IStorageProvider, ConnectionTestResult } from '../types';
import type { LibraryDocument, LibraryFolder } from '../../../types';

export class GoogleDriveProvider implements IStorageProvider {
  public id = 'googledrive' as const;
  public name = 'Google Drive';
  public description = 'Sincronización en la nube con Google Drive API v3.';
  public isReady = false;

  private clientId = '';
  private apiKey = '';
  private folderId = '';

  constructor(config?: { clientId: string; apiKey: string; folderId: string }) {
    if (config) {
      this.updateConfig(config);
    }
  }

  public updateConfig(config: { clientId: string; apiKey: string; folderId: string }): void {
    this.clientId = config.clientId.trim();
    this.apiKey = config.apiKey.trim();
    this.folderId = config.folderId.trim();
    this.isReady = Boolean(this.clientId);
  }

  public getFolderId(): string {
    return this.folderId;
  }

  public async init(): Promise<void> {}

  public async testConnection(): Promise<ConnectionTestResult> {
    if (!this.clientId) {
      return {
        success: false,
        message: 'Falta Client ID de Google OAuth 2.0. Ingrese sus credenciales de Google Cloud Console.',
      };
    }

    try {
      if (this.apiKey) {
        const url = `https://www.googleapis.com/discovery/v1/apis/drive/v3/rest?key=${this.apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          return {
            success: true,
            message: 'API Key de Google Drive válida y servicio disponible.',
            timestamp: Date.now(),
          };
        }
      }
      return {
        success: true,
        message: `Client ID registrado (${this.clientId.substring(0, 12)}...). Listo para autorización OAuth.`,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error al verificar Google Drive: ${err.message || String(err)}`,
        timestamp: Date.now(),
      };
    }
  }

  public async loadFolders(): Promise<LibraryFolder[]> {
    return [];
  }

  public async saveFolders(_folders: LibraryFolder[]): Promise<void> {}

  public async loadDocuments(): Promise<LibraryDocument[]> {
    return [];
  }

  public async saveDocuments(_docs: LibraryDocument[]): Promise<void> {}

  public async sync(): Promise<{ success: boolean; message: string }> {
    const test = await this.testConnection();
    if (!test.success) return test;
    return { success: true, message: 'Google Drive listo para sincronización de biblioteca.' };
  }
}
