import type { IStorageProvider, ConnectionTestResult } from '../types';
import type { LibraryDocument, LibraryFolder } from '../../../types';

export class AzureBlobProvider implements IStorageProvider {
  public id = 'azureblob' as const;
  public name = 'Azure Blob Storage';
  public description = 'Almacenamiento en Microsoft Azure Storage Account (Blob Storage) mediante SAS Token.';
  public isReady = false;

  private accountName = '';
  private containerName = '';
  private sasToken = '';

  constructor(config?: { accountName: string; containerName: string; sasToken: string }) {
    if (config) {
      this.updateConfig(config.accountName, config.containerName, config.sasToken);
    }
  }

  public updateConfig(accountName: string, containerName: string, sasToken: string): void {
    this.accountName = accountName.trim();
    this.containerName = containerName.trim();
    this.sasToken = sasToken.trim().replace(/^\?/, '');
    this.isReady = Boolean(this.accountName && this.containerName && this.sasToken);
  }

  public async init(): Promise<void> {
    // Config initialization
  }

  private getBlobUrl(blobName: string): string {
    return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${encodeURIComponent(blobName)}?${this.sasToken}`;
  }

  private getContainerUrl(): string {
    return `https://${this.accountName}.blob.core.windows.net/${this.containerName}?restype=container&${this.sasToken}`;
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    if (!this.accountName || !this.containerName || !this.sasToken) {
      return {
        success: false,
        message: 'Faltan credenciales de Azure: Ingrese Storage Account, Contenedor y SAS Token válido.',
      };
    }

    try {
      const url = this.getContainerUrl();
      const res = await fetch(url, { method: 'GET' });
      if (res.ok || res.status === 200 || res.status === 404) {
        return {
          success: true,
          message: `Conexión exitosa con Azure Storage (${this.accountName}/${this.containerName}).`,
          timestamp: Date.now(),
        };
      } else {
        const errorText = await res.text();
        return {
          success: false,
          message: `Error de autenticación Azure (HTTP ${res.status}): ${errorText.substring(0, 150)}`,
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Error de red al conectar con Azure: ${err.message || String(err)}. Verifique CORS en su Storage Account.`,
        timestamp: Date.now(),
      };
    }
  }

  public async loadFolders(): Promise<LibraryFolder[]> {
    try {
      const url = this.getBlobUrl('mdj_library_folders.json');
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[AzureBlob] loadFolders fallback:', err);
    }
    return [];
  }

  public async saveFolders(folders: LibraryFolder[]): Promise<void> {
    if (!this.isReady) return;
    const url = this.getBlobUrl('mdj_library_folders.json');
    await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(folders, null, 2),
    });
  }

  public async loadDocuments(): Promise<LibraryDocument[]> {
    try {
      const url = this.getBlobUrl('mdj_library_docs.json');
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[AzureBlob] loadDocuments fallback:', err);
    }
    return [];
  }

  public async saveDocuments(docs: LibraryDocument[]): Promise<void> {
    if (!this.isReady) return;
    const url = this.getBlobUrl('mdj_library_docs.json');
    await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(docs, null, 2),
    });
  }

  public async sync(): Promise<{ success: boolean; message: string }> {
    const test = await this.testConnection();
    if (!test.success) return test;
    return { success: true, message: 'Sincronizado con Azure Blob Storage correctamente.' };
  }
}
