// Typed calls of the account sharing endpoints (api.md «Совместный доступ», D-54).
import { z } from "zod";
import {
  boxKeySchema,
  incomingInvitationSchema,
  memberSchema,
  notebookKeyResponseSchema,
  outgoingInvitationSchema,
  publicKeyResponseSchema,
  sharedByMeItemSchema,
  sharedItemSchema,
  shareSchema,
  sharedNoteKeyResponseSchema,
  type BoxKey,
  type CreateShareRequest,
  type CreateInvitationRequest,
  type MemberRole,
  type PutMemberKeyRequest,
  type RotateKeyRequest,
  type ShareTarget,
} from "../contracts/api.js";
import type { HttpClient } from "./http.js";

const target = (t: ShareTarget) => ({ kind: t.kind, id: t.id });

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

    createInvitation: (body: CreateInvitationRequest) => http("createInvitation", { body }),
    listInvitations: (t: ShareTarget) =>
      http("listInvitations", {
        query: { target: `${t.kind}:${t.id}` },
        schema: z.array(outgoingInvitationSchema),
      }),
    deleteInvitation: (id: string) => http("deleteInvitation", { params: { id } }),
    incomingInvitations: () =>
      http("incomingInvitations", { schema: z.array(incomingInvitationSchema) }),
    acceptInvitation: (id: string) =>
      http("acceptInvitation", { params: { id }, body: {}, schema: sharedItemSchema }),
    declineInvitation: (id: string) => http("declineInvitation", { params: { id }, body: {} }),

    listMembers: (t: ShareTarget) =>
      http("listMembers", { params: target(t), schema: z.array(memberSchema) }),
    setMemberRole: (t: ShareTarget, userId: string, role: MemberRole) =>
      http("patchMember", { params: { ...target(t), userId }, body: { role } }),
    /** The owner removes a member; with the caller's own userId — «Выйти». */
    removeMember: (t: ShareTarget, userId: string) =>
      http("deleteMember", { params: { ...target(t), userId } }),
    putMemberKey: (t: ShareTarget, userId: string, body: PutMemberKeyRequest) =>
      http("putMemberKey", { params: { ...target(t), userId }, body }),
    rotateKey: (t: ShareTarget, body: RotateKeyRequest) =>
      http("rotateKey", { params: target(t), body }),
    rotateKeyDone: (t: ShareTarget) => http("rotateKeyDone", { params: target(t), body: {} }),
    getSharedNoteKey: (noteId: string) =>
      http("getSharedNoteKey", { params: { id: noteId }, schema: sharedNoteKeyResponseSchema }),
    sharedWithMe: () => http("sharedWithMe", { schema: z.array(sharedItemSchema) }),
    sharedByMe: () => http("sharedByMe", { schema: z.array(sharedByMeItemSchema) }),

    listShares: () => http("listShares", { schema: z.array(shareSchema) }),
    createShare: (body: CreateShareRequest) => http("createShare", { body, schema: shareSchema }),
    deleteShare: (id: string) => http("deleteShare", { params: { id } }),

    getNotebookKey: (notebookId: string) =>
      http("getNotebookKey", { params: { id: notebookId }, schema: notebookKeyResponseSchema }),
  };
}
export type SharingApi = ReturnType<typeof createSharingApi>;
