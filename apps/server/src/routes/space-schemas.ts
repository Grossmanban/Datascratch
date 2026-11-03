import {
  createInvitationRequestSchema,
  incomingInvitationSchema,
  sharedByMeItemSchema,
  sharedItemSchema,
  uuidSchema,
  wrappedKeySchema,
  key32Schema,
} from '@datascratch/shared/contracts';
import { z } from 'zod';

/**
 * Shared spaces (D-62, api.md «Общие пространства») until @datascratch/shared carries them: the
 * D-54 schemas with `space` as a target kind, and the bodies of /v1/spaces. Same shapes as the
 * contract; to be replaced by the shared schemas once core publishes them.
 */
export const spaceTargetSchema = z.object({ kind: z.enum(['note', 'notebook', 'space']), id: uuidSchema });

export const invitationRequestSchema = createInvitationRequestSchema.extend({ target: spaceTargetSchema });
export const incomingInvitationWithSpaceSchema = incomingInvitationSchema.extend({ target: spaceTargetSchema });
export const sharedItemWithSpaceSchema = sharedItemSchema.extend({ target: spaceTargetSchema });
export const sharedByMeItemWithSpaceSchema = sharedByMeItemSchema.extend({ target: spaceTargetSchema });

const keyVersion = z.number().int().positive();

export const spaceSchema = z
  .object({
    id: uuidSchema,
    ownerUserId: uuidSchema,
    keyVersion,
    keyRotationPending: z.boolean(),
    pendingSinceVersion: keyVersion.nullable(),
    createdAt: z.string(),
  })
  .meta({ id: 'Space' });

export const createSpaceRequestSchema = z.object({ spaceId: uuidSchema, wrappedKey: wrappedKeySchema });

export const spaceKeyResponseSchema = z.object({
  version: keyVersion,
  wrappedKey: wrappedKeySchema,
  keyChain: z.array(wrappedKeySchema),
  keyRotationPending: z.boolean(),
  pendingSinceVersion: keyVersion.nullable(),
});

export const spaceNotebookSchema = z.object({
  notebookId: uuidSchema,
  version: keyVersion,
  spaceWrappedKey: wrappedKeySchema,
  keyChain: z.array(wrappedKeySchema),
  mode: z.enum(['private', 'agent']),
});

export const moveInRequestSchema = z.object({ version: keyVersion, spaceWrappedKey: wrappedKeySchema });

export const moveOutRequestSchema = z.object({
  version: keyVersion.min(2),
  ownerWrappedKey: wrappedKeySchema,
  previousKeyWrap: wrappedKeySchema,
  notebookKey: key32Schema.optional(),
});

export const spaceRotateRequestSchema = z
  .object({
    version: keyVersion.min(2),
    ownerWrappedKey: wrappedKeySchema,
    previousKeyWrap: wrappedKeySchema,
    memberKeys: z.array(z.object({ userId: uuidSchema, wrappedKey: wrappedKeySchema })).max(50),
    notebooks: z
      .array(
        z.object({
          notebookId: uuidSchema,
          version: keyVersion.min(2),
          spaceWrappedKey: wrappedKeySchema,
          previousKeyWrap: wrappedKeySchema,
          notebookKey: key32Schema.optional(),
        }),
      )
      .max(10_000),
  })
  .refine((b) => new Set(b.memberKeys.map((m) => m.userId)).size === b.memberKeys.length, {
    message: 'duplicate userId in memberKeys',
    path: ['memberKeys'],
  })
  .refine((b) => new Set(b.notebooks.map((n) => n.notebookId)).size === b.notebooks.length, {
    message: 'duplicate notebookId in notebooks',
    path: ['notebooks'],
  });
