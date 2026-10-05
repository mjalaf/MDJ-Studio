import type { LibraryDocument, LibraryFolder } from '../../types';

export type StorageProviderType = 'sqlite' | 'azureblob' | 's3' | 'googledrive' | 'onedrive' | 'localstorage';

export interface StorageConfig {
  activeProvider: StorageProviderType;
  azureBlob: {
    accountName: string;
    containerName: string;
    sasToken: string;
  };
  s3: {
    endpoint: string;
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  googleDrive: {
    clientId: string;
    apiKey: string;
    folderId: string;
  };
  oneDrive: {
    clientId: string;
    folderPath: string;
  };
}

export interface DatabaseStats {
  documentCount: number;
  folderCount: number;
  sizeBytes: number;
  lastSavedAt: number;
  engine: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  timestamp?: number;
}

export interface IStorageProvider {
  id: StorageProviderType;
  name: string;
  description: string;
  isReady: boolean;

  init(): Promise<void>;
  loadFolders(): Promise<LibraryFolder[]>;
  saveFolders(folders: LibraryFolder[]): Promise<void>;
  loadDocuments(): Promise<LibraryDocument[]>;
  saveDocuments(docs: LibraryDocument[]): Promise<void>;

  exportDatabase?(): Promise<Uint8Array>;
  importDatabase?(data: Uint8Array): Promise<void>;
  getStats?(): Promise<DatabaseStats>;
  testConnection?(): Promise<ConnectionTestResult>;
  sync?(): Promise<{ success: boolean; message: string; addedDocs?: number }>;
}
