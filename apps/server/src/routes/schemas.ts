import { z } from 'zod';
import { b64, id } from '../lib/encoding.js';

export const ErrorBody = z
  .object({ error: z.object({ code: z.string(), message: z.string() }) })
  .meta({ id: 'Error' });

export const Kdf = z
  .object({
    alg: z.literal('argon2id13'),
    ops: z.number().int().min(3).max(20),
    mem: z.number().int().min(67_108_864).max(1_073_741_824),
  })
  .meta({ id: 'Kdf' });

export const Email = z.string().trim().toLowerCase().email().max(320);
export const Key32 = b64({ min: 32, max: 32 });
export const Salt = b64({ min: 16, max: 16 });
/** An encrypted envelope (crypto.md §3): small key wrappings. */
export const WrappedKey = b64({ min: 41, max: 1024 });
export const DeviceName = z.string().trim().min(1).max(100);
export const IsoDate = z.iso.datetime({ offset: true });

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

export { b64, id };
