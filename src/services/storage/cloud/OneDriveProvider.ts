import type { IStorageProvider, ConnectionTestResult } from '../types';
import type { LibraryDocument, LibraryFolder } from '../../../types';

export class OneDriveProvider implements IStorageProvider {
  public id = 'onedrive' as const;
  public name = 'Microsoft OneDrive';
  public description = 'Sincronización en la nube con Microsoft Graph API y OneDrive personal / empresarial.';
  public isReady = false;

  private clientId = '';
  private folderPath = '';

  constructor(config?: { clientId: string; folderPath: string }) {
    if (config) {
      this.updateConfig(config);
    }
  }

  public updateConfig(config: { clientId: string; folderPath: string }): void {
    this.clientId = config.clientId.trim();
    this.folderPath = config.folderPath.trim();
    this.isReady = Boolean(this.clientId);
  }

  public getFolderPath(): string {
    return this.folderPath;
  }

  public async init(): Promise<void> {}

  public async testConnection(): Promise<ConnectionTestResult> {
    if (!this.clientId) {
      return {
        success: false,
        message: 'Falta Client ID (Application ID) de Microsoft Entra / Azure Portal.',
      };
    }

    return {
      success: true,
      message: `Configuración de Microsoft OneDrive registrada (${this.clientId.substring(0, 10)}...). Listo para conectar con Microsoft Graph.`,
      timestamp: Date.now(),
    };
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
    return { success: true, message: 'Microsoft OneDrive listo para sincronización de biblioteca.' };
  }
}
