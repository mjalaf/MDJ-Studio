import type { 
  IStorageProvider, 
  StorageProviderType, 
  StorageConfig, 
  DatabaseStats, 
  ConnectionTestResult 
} from './types';
import type { LibraryDocument, LibraryFolder } from '../../types';
import { SqliteStorageProvider } from './SqliteStorageProvider';
import { AzureBlobProvider } from './cloud/AzureBlobProvider';
import { S3StorageProvider } from './cloud/S3StorageProvider';
import { GoogleDriveProvider } from './cloud/GoogleDriveProvider';
import { OneDriveProvider } from './cloud/OneDriveProvider';

const CONFIG_KEY = 'mdj_storage_config';

const DEFAULT_CONFIG: StorageConfig = {
  activeProvider: 'sqlite',
  azureBlob: {
    accountName: '',
    containerName: 'mdj-documents',
    sasToken: '',
  },
  s3: {
    endpoint: '',
    bucket: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
  },
  googleDrive: {
    clientId: '',
    apiKey: '',
    folderId: '',
  },
  oneDrive: {
    clientId: '',
    folderPath: '/MDJ-Studio',
  },
};

export class StorageManager {
  private static instance: StorageManager;
  private config: StorageConfig = DEFAULT_CONFIG;
  private isInitialized = false;

  public sqliteProvider: SqliteStorageProvider;
  public azureBlobProvider: AzureBlobProvider;
  public s3Provider: S3StorageProvider;
  public googleDriveProvider: GoogleDriveProvider;
  public oneDriveProvider: OneDriveProvider;

  private constructor() {
    this.loadConfig();
    this.sqliteProvider = new SqliteStorageProvider();
    this.azureBlobProvider = new AzureBlobProvider(this.config.azureBlob);
    this.s3Provider = new S3StorageProvider(this.config.s3);
    this.googleDriveProvider = new GoogleDriveProvider(this.config.googleDrive);
    this.oneDriveProvider = new OneDriveProvider(this.config.oneDrive);
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(CONFIG_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[StorageManager] Error loading config:', e);
      this.config = DEFAULT_CONFIG;
    }
  }

  public saveConfig(newConfig: Partial<StorageConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    }

    if (newConfig.azureBlob) {
      this.azureBlobProvider.updateConfig(
        this.config.azureBlob.accountName,
        this.config.azureBlob.containerName,
        this.config.azureBlob.sasToken
      );
    }
    if (newConfig.s3) {
      this.s3Provider.updateConfig(this.config.s3);
    }
    if (newConfig.googleDrive) {
      this.googleDriveProvider.updateConfig(this.config.googleDrive);
    }
    if (newConfig.oneDrive) {
      this.oneDriveProvider.updateConfig(this.config.oneDrive);
    }
  }

  public getConfig(): StorageConfig {
    return { ...this.config };
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await this.sqliteProvider.init();
      this.isInitialized = true;
    } catch (err) {
      console.warn('[StorageManager] SQLite initialization fallback:', err);
    }
  }

  public getActiveProvider(): IStorageProvider {
    switch (this.config.activeProvider) {
      case 'azureblob':
        return this.azureBlobProvider;
      case 's3':
        return this.s3Provider;
      case 'googledrive':
        return this.googleDriveProvider;
      case 'onedrive':
        return this.oneDriveProvider;
      case 'sqlite':
      default:
        return this.sqliteProvider;
    }
  }

  public async loadFolders(): Promise<LibraryFolder[]> {
    await this.init();
    try {
      const folders = await this.sqliteProvider.loadFolders();
      if (folders.length > 0) return folders;
    } catch (err) {
      console.warn('[StorageManager] Could not load folders from SQLite:', err);
    }
    return [];
  }

  public async saveFolders(folders: LibraryFolder[]): Promise<void> {
    await this.init();
    await this.sqliteProvider.saveFolders(folders);

    // If cloud provider is active, sync folders asynchronously
    if (this.config.activeProvider === 'azureblob' && this.azureBlobProvider.isReady) {
      this.azureBlobProvider.saveFolders(folders).catch(console.warn);
    }
  }

  public async loadDocuments(): Promise<LibraryDocument[]> {
    await this.init();
    try {
      const docs = await this.sqliteProvider.loadDocuments();
      if (docs.length > 0) return docs;
    } catch (err) {
      console.warn('[StorageManager] Could not load documents from SQLite:', err);
    }
    return [];
  }

  public async saveDocuments(docs: LibraryDocument[]): Promise<void> {
    await this.init();
    await this.sqliteProvider.saveDocuments(docs);

    // If cloud provider is active, sync documents asynchronously
    if (this.config.activeProvider === 'azureblob' && this.azureBlobProvider.isReady) {
      this.azureBlobProvider.saveDocuments(docs).catch(console.warn);
    }
  }

  public async getDatabaseStats(): Promise<DatabaseStats> {
    await this.init();
    return await this.sqliteProvider.getStats();
  }

  public async exportSqliteFile(): Promise<void> {
    await this.init();
    const binary = await this.sqliteProvider.exportDatabase();
    const blob = new Blob([binary as unknown as BlobPart], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mdj_studio_backup_${new Date().toISOString().slice(0, 10)}.sqlite`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public async importSqliteFile(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    await this.sqliteProvider.importDatabase(uint8);
  }

  public async testProviderConnection(providerType: StorageProviderType): Promise<ConnectionTestResult> {
    switch (providerType) {
      case 'sqlite':
        return await this.sqliteProvider.testConnection();
      case 'azureblob':
        return await this.azureBlobProvider.testConnection();
      case 's3':
        return await this.s3Provider.testConnection();
      case 'googledrive':
        return await this.googleDriveProvider.testConnection();
      case 'onedrive':
        return await this.oneDriveProvider.testConnection();
      default:
        return { success: true, message: 'Proveedor activo.' };
    }
  }
}

export const storageManager = StorageManager.getInstance();
