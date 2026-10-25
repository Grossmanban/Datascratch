import type { Config } from '../config.js';
import { DiskStorage } from './disk.js';
import type { BlobStorage } from './types.js';

export type { BlobStorage } from './types.js';
export { chunkKey } from './types.js';

export async function createStorage(config: Config): Promise<BlobStorage> {
  if (config.STORAGE_DRIVER === 's3') {
    const { S3Storage } = await import('./s3.js');
    return new S3Storage({
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION,
      bucket: config.S3_BUCKET!,
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      prefix: config.S3_PREFIX,
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
    });
  }
  return new DiskStorage(config.STORAGE_DIR);
}
