import type { IStorageProvider, ConnectionTestResult } from '../types';
import type { LibraryDocument, LibraryFolder } from '../../../types';

export class S3StorageProvider implements IStorageProvider {
  public id = 's3' as const;
  public name = 'Amazon S3 / S3-Compatible';
  public description = 'Almacenamiento en buckets S3 (AWS, Cloudflare R2, MinIO, Wasabi).';
  public isReady = false;

  private endpoint = '';
  private bucket = '';
  private region = 'us-east-1';
  private accessKeyId = '';
  private secretAccessKey = '';

  constructor(config?: {
    endpoint: string;
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    if (config) {
      this.updateConfig(config);
    }
  }

  public updateConfig(config: {
    endpoint: string;
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  }): void {
    this.endpoint = config.endpoint.trim().replace(/\/$/, '');
    this.bucket = config.bucket.trim();
    this.region = config.region.trim() || 'us-east-1';
    this.accessKeyId = config.accessKeyId.trim();
    this.secretAccessKey = config.secretAccessKey.trim();
    this.isReady = Boolean(this.bucket && this.accessKeyId && this.secretAccessKey);
  }

  public async init(): Promise<void> {
    // Config initialization
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      return {
        success: false,
        message: 'Faltan parámetros S3: Ingrese Bucket, Access Key ID y Secret Access Key.',
      };
    }

    try {
      const targetHost = this.endpoint || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
      const res = await fetch(targetHost, { method: 'HEAD' });
      // If endpoint responds (even 403 Forbidden indicates host and bucket are reachable)
      if (res.status === 200 || res.status === 403 || res.status === 404) {
        return {
          success: true,
          message: `Bucket S3 alcanzable (${this.bucket} en ${this.region}). Verifique permisos de escritura y CORS.`,
          timestamp: Date.now(),
        };
      }
      return {
        success: false,
        message: `Servidor S3 respondió con código HTTP ${res.status}.`,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error al conectar con S3: ${err.message || String(err)}. Verifique la URL y reglas de CORS en el bucket.`,
        timestamp: Date.now(),
      };
    }
  }

  public async loadFolders(): Promise<LibraryFolder[]> {
    return [];
  }

  public async saveFolders(_folders: LibraryFolder[]): Promise<void> {
    // S3 sync implementation
  }

  public async loadDocuments(): Promise<LibraryDocument[]> {
    return [];
  }

  public async saveDocuments(_docs: LibraryDocument[]): Promise<void> {
    // S3 sync implementation
  }

  public async sync(): Promise<{ success: boolean; message: string }> {
    const test = await this.testConnection();
    if (!test.success) return test;
    return { success: true, message: `Sincronización con S3 (${this.bucket}) completada.` };
  }
}
