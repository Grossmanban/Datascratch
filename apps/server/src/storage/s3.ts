import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { BlobStorage } from './types.js';

export interface S3Options {
  endpoint?: string | undefined;
  region: string;
  bucket: string;
  accessKeyId?: string | undefined;
  secretAccessKey?: string | undefined;
  prefix: string;
  forcePathStyle: boolean;
}

/** External S3-compatible storage (Hetzner Object Storage, R2, B2, ...), D-26. */
export class S3Storage implements BlobStorage {
  readonly #client: S3Client;

  constructor(readonly opts: S3Options) {
    this.#client = new S3Client({
      region: opts.region,
      ...(opts.endpoint ? { endpoint: opts.endpoint } : {}),
      forcePathStyle: opts.forcePathStyle,
      ...(opts.accessKeyId && opts.secretAccessKey
        ? { credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey } }
        : {}),
    });
  }

  #key(key: string) {
    return this.opts.prefix + key;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    await this.#client.send(
      new PutObjectCommand({
        Bucket: this.opts.bucket,
        Key: this.#key(key),
        Body: data,
        ContentType: 'application/octet-stream',
      }),
    );
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const res = await this.#client.send(new GetObjectCommand({ Bucket: this.opts.bucket, Key: this.#key(key) }));
      return res.Body ? await res.Body.transformToByteArray() : new Uint8Array(0);
    } catch (e) {
      if (e instanceof NoSuchKey || (e as { name?: string }).name === 'NoSuchKey') return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.opts.bucket, Key: this.#key(key) }));
  }

  async check(): Promise<void> {
    await this.#client.send(new HeadBucketCommand({ Bucket: this.opts.bucket }));
  }
}
