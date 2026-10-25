import {
  emailSchema,
  isoDateTimeSchema,
  kdfParamsSchema,
  key32Schema,
  saltSchema,
  uuidSchema,
  wrappedKeySchema,
} from '@datascratch/shared/contracts';
import { z } from 'zod';
import { b64 } from '../lib/encoding.js';

/** Client-generated UUIDv7 (document-model.md §1). */
export const id = () => uuidSchema;

export const ErrorBody = z
  .object({ error: z.object({ code: z.string(), message: z.string() }) })
  .meta({ id: 'Error' });

export const Kdf = kdfParamsSchema.meta({ id: 'Kdf' });
export const Email = emailSchema;
export const Key32 = key32Schema;
export const Salt = saltSchema;
/** An encrypted envelope (crypto.md §3) holding a small key. */
export const WrappedKey = wrappedKeySchema.max(2048);
export const DeviceName = z.string().trim().min(1).max(100);
/** Accepts any ISO 8601 timestamp with offset (clients send `…Z` from toISOString). */
export const IsoDate = z.iso.datetime({ offset: true });
export { isoDateTimeSchema };

export const Session = z
  .object({
    userId: id(),
    deviceId: id(),
    accessToken: z.string(),
    refreshToken: z.string(),
    accessExpiresAt: z.string(),
    wrappedMasterKeyPassword: z.string(),
    accountDocId: id(),
  })
  .meta({ id: 'Session' });

export const errorResponses = {
  400: ErrorBody,
  401: ErrorBody,
  403: ErrorBody,
  404: ErrorBody,
  409: ErrorBody,
  413: ErrorBody,
  429: ErrorBody,
};

export { b64 };
