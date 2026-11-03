// Typed calls of the account sharing endpoints (api.md «Совместный доступ», D-54).
import { z } from "zod";
import {
  accountIncomingInvitationSchema,
  accountSharedByMeItemSchema,
  accountSharedItemSchema,
  boxKeySchema,
  memberSchema,
  notebookKeyResponseSchema,
  outgoingInvitationSchema,
  publicKeyResponseSchema,
  shareSchema,
  sharedNoteKeyResponseSchema,
  sharedSpaceSchema,
  spaceKeyResponseSchema,
  spaceNotebookSchema,
  type CreateSpaceRequest,
  type MoveOutNotebookRequest,
  type PutSpaceNotebookRequest,
  type RotateSpaceRequest,
  type AccountCreateInvitationRequest,
  type AccountTarget,
  type BoxKey,
  type CreateShareRequest,
  type CreateInvitationRequest,
  type MemberRole,
  type PutMemberKeyRequest,
  type RotateKeyRequest,
  type ShareTarget,
} from "../contracts/api.js";
import type { HttpClient } from "./http.js";

const target = (t: AccountTarget) => ({ kind: t.kind, id: t.id });
const isD54 = <T extends { target: AccountTarget }>(i: T): i is T & { target: ShareTarget } =>
  i.target.kind !== "space";

export function createSharingApi(http: HttpClient) {
  return {
    /** null when the account has no key pair yet (404). */
    getBoxKey: () =>
      http("getBoxKey", { schema: boxKeySchema, nullOn: [404] }) as Promise<BoxKey | null>,
    putBoxKey: (body: BoxKey) => http("putBoxKey", { body }),
    /** null when the account is not related to the caller (404, D-54). */
    getPublicKey: (userId: string) =>
      http("getPublicKey", {
        params: { userId },
        schema: publicKeyResponseSchema,
        nullOn: [404],
      }) as Promise<z.infer<typeof publicKeyResponseSchema> | null>,

    /** Spaces too (D-62): `target.kind = "space"`. */
    createInvitation: (body: CreateInvitationRequest | AccountCreateInvitationRequest) =>
      http("createInvitation", { body }),
    listInvitations: (t: AccountTarget) =>
      http("listInvitations", {
        query: { target: `${t.kind}:${t.id}` },
        schema: z.array(outgoingInvitationSchema),
      }),
    deleteInvitation: (id: string) => http("deleteInvitation", { params: { id } }),
    /** Invitations to notebooks and notes (D-54); spaces: `incomingInvitationsAll`. */
    incomingInvitations: async () =>
      (
        await http("incomingInvitations", { schema: z.array(accountIncomingInvitationSchema) })
      ).filter(isD54),
    incomingInvitationsAll: () =>
      http("incomingInvitations", { schema: z.array(accountIncomingInvitationSchema) }),
    /** The accepted resource — a space too (D-62). */
    acceptInvitation: (id: string) =>
      http("acceptInvitation", { params: { id }, body: {}, schema: accountSharedItemSchema }),
    declineInvitation: (id: string) => http("declineInvitation", { params: { id }, body: {} }),

    listMembers: (t: AccountTarget) =>
      http("listMembers", { params: target(t), schema: z.array(memberSchema) }),
    setMemberRole: (t: AccountTarget, userId: string, role: MemberRole) =>
      http("patchMember", { params: { ...target(t), userId }, body: { role } }),
    /** The owner removes a member; with the caller's own userId — «Выйти». */
    removeMember: (t: AccountTarget, userId: string) =>
      http("deleteMember", { params: { ...target(t), userId } }),
    putMemberKey: (t: AccountTarget, userId: string, body: PutMemberKeyRequest) =>
      http("putMemberKey", { params: { ...target(t), userId }, body }),
    rotateKey: (t: AccountTarget, body: RotateKeyRequest) =>
      http("rotateKey", { params: target(t), body }),
    rotateKeyDone: (t: AccountTarget) => http("rotateKeyDone", { params: target(t), body: {} }),
    getSharedNoteKey: (noteId: string) =>
      http("getSharedNoteKey", { params: { id: noteId }, schema: sharedNoteKeyResponseSchema }),
    /** Notebooks and notes shared with me (D-54); shared spaces are left out. */
    sharedWithMe: async () =>
      (await http("sharedWithMe", { schema: z.array(accountSharedItemSchema) })).filter(isD54),
    sharedByMe: async () =>
      (await http("sharedByMe", { schema: z.array(accountSharedByMeItemSchema) })).filter(isD54),
    /** Everything, shared spaces included (D-62). */
    sharedWithMeAll: () => http("sharedWithMe", { schema: z.array(accountSharedItemSchema) }),
    sharedByMeAll: () => http("sharedByMe", { schema: z.array(accountSharedByMeItemSchema) }),

    listShares: () => http("listShares", { schema: z.array(shareSchema) }),
    createShare: (body: CreateShareRequest) => http("createShare", { body, schema: shareSchema }),
    deleteShare: (id: string) => http("deleteShare", { params: { id } }),

    // Shared spaces (D-62).
    createSpace: (body: CreateSpaceRequest) =>
      http("createSpace", { body, schema: sharedSpaceSchema }),
    listSpaces: () => http("listSpaces", { schema: z.array(sharedSpaceSchema) }),
    getSpaceKey: (spaceId: string) =>
      http("getSpaceKey", { params: { id: spaceId }, schema: spaceKeyResponseSchema }),
    listSpaceNotebooks: (spaceId: string) =>
      http("listSpaceNotebooks", {
        params: { id: spaceId },
        schema: z.array(spaceNotebookSchema),
      }),
    putSpaceNotebook: (spaceId: string, notebookId: string, body: PutSpaceNotebookRequest) =>
      http("putSpaceNotebook", { params: { id: spaceId, notebookId }, body }),
    moveOutSpaceNotebook: (spaceId: string, notebookId: string, body: MoveOutNotebookRequest) =>
      http("moveOutSpaceNotebook", { params: { id: spaceId, notebookId }, body }),
    rotateSpace: (spaceId: string, body: RotateSpaceRequest) =>
      http("rotateSpace", { params: { id: spaceId }, body }),
    rotateSpaceDone: (spaceId: string) =>
      http("rotateSpaceDone", { params: { id: spaceId }, body: {} }),
    deleteSpace: (spaceId: string) => http("deleteSpace", { params: { id: spaceId } }),

    getNotebookKey: (notebookId: string) =>
      http("getNotebookKey", { params: { id: notebookId }, schema: notebookKeyResponseSchema }),
  };
}
export type SharingApi = ReturnType<typeof createSharingApi>;
