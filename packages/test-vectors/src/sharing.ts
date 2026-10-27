// Vectors for account key pairs and member key wrapping (crypto.md §10, D-54).
import {
  AD,
  generateBoxKeyPair,
  memberWrapKey,
  safetyCode,
  unwrapKeyChain,
  wrapBoxSecretKey,
  wrapKey,
  wrapKeyForMember,
  wrapPreviousKey,
  type MemberKeyRef,
} from "@datascratch/shared/crypto";
import { det, hex, vid } from "./util.js";

export function sharingVectors() {
  const ownerId = vid(101);
  const memberId = vid(102);
  const notebookId = vid(103);
  const noteId = vid(104);
  const owner = generateBoxKeyPair(det("share|owner-seed", 32));
  const member = generateBoxKeyPair(det("share|member-seed", 32));
  const masterKey = det("share|owner-master", 32);
  const nbKeys = [1, 2, 3].map((v) => det(`share|notebook-key|${v}`, 32));
  const noteKeys = [1, 2].map((v) => det(`share|note-key|${v}`, 32));
  const nonce = (label: string) => ({ nonce: det(`share|nonce|${label}`, 24) });

  const ref: MemberKeyRef = {
    kind: "notebook",
    targetId: notebookId,
    version: 3,
    fromUserId: ownerId,
    toUserId: memberId,
  };
  // chain[i]: key of version (3 - i - 1) wrapped by key of version (3 - i).
  const chain = [
    wrapPreviousKey(nbKeys[2]!, nbKeys[1]!, "notebook", notebookId, 3, nonce("prev3")),
    wrapPreviousKey(nbKeys[1]!, nbKeys[0]!, "notebook", notebookId, 2, nonce("prev2")),
  ];
  const unwound = unwrapKeyChain(nbKeys[2]!, 3, chain, "notebook", notebookId);
  if (unwound.map(hex).join() !== [...nbKeys].reverse().map(hex).join())
    throw new Error("key chain does not unwind");
  const noteRef: MemberKeyRef = {
    kind: "note",
    targetId: noteId,
    version: 2,
    fromUserId: ownerId,
    toUserId: memberId,
  };

  return {
    "crypto/sharing.json": {
      description:
        "Account sharing (crypto.md §10, D-54). Key pairs: crypto_box_seed_keypair(seed). memberWrapKey = crypto_generichash(32, 'ds1|member-wrap', key = crypto_box_beforenm(peerPk, mySk)) — equal from both sides. Envelopes use the fixed nonces given (never in production). keyChain[i] wraps the key of version (current - i - 1) with the key of version (current - i). Safety code: 6 groups of 5 digits.",
      accounts: {
        owner: {
          userId: ownerId,
          seed: hex(det("share|owner-seed", 32)),
          publicKey: hex(owner.publicKey),
          secretKey: hex(owner.secretKey),
          masterKey: hex(masterKey),
          wrapNonce: hex(nonce("box-secret").nonce),
          wrappedSecretKey: wrapBoxSecretKey(
            owner.secretKey,
            masterKey,
            ownerId,
            nonce("box-secret"),
          ),
          ad: AD.accountBoxKey(ownerId),
        },
        member: {
          userId: memberId,
          seed: hex(det("share|member-seed", 32)),
          publicKey: hex(member.publicKey),
          secretKey: hex(member.secretKey),
        },
      },
      memberWrapKey: hex(memberWrapKey(owner.secretKey, member.publicKey)),
      notebook: {
        notebookId,
        keys: nbKeys.map((k, i) => ({ version: i + 1, key: hex(k) })),
        ownerWrap: {
          version: 3,
          ad: AD.notebookKeyVersion(notebookId, 3),
          nonce: hex(nonce("owner-wrap").nonce),
          wrappedKey: wrapKey(
            masterKey,
            nbKeys[2]!,
            AD.notebookKeyVersion(notebookId, 3),
            nonce("owner-wrap"),
          ),
        },
        legacyAdVersion1: AD.notebookKeyVersion(notebookId, 1),
        memberWrap: {
          ...ref,
          ad: AD.memberKey("notebook", notebookId, 3, ownerId, memberId),
          nonce: hex(nonce("member-wrap").nonce),
          wrappedKey: wrapKeyForMember(
            nbKeys[2]!,
            owner.secretKey,
            member.publicKey,
            ref,
            nonce("member-wrap"),
          ),
        },
        keyChain: chain,
        keyChainAds: [
          AD.previousKey("notebook", notebookId, 3),
          AD.previousKey("notebook", notebookId, 2),
        ],
      },
      note: {
        noteId,
        keys: noteKeys.map((k, i) => ({ version: i + 1, key: hex(k) })),
        wrappedByNotebookKey: {
          version: 2,
          ad: AD.noteKeyVersion(noteId, 2),
          nonce: hex(nonce("note-wrap").nonce),
          wrappedKey: wrapKey(
            nbKeys[2]!,
            noteKeys[1]!,
            AD.noteKeyVersion(noteId, 2),
            nonce("note-wrap"),
          ),
        },
        keyChain: [
          wrapPreviousKey(noteKeys[1]!, noteKeys[0]!, "note", noteId, 2, nonce("note-prev2")),
        ],
        memberWrap: {
          ...noteRef,
          ad: AD.memberKey("note", noteId, 2, ownerId, memberId),
          nonce: hex(nonce("note-member").nonce),
          wrappedKey: wrapKeyForMember(
            noteKeys[1]!,
            owner.secretKey,
            member.publicKey,
            noteRef,
            nonce("note-member"),
          ),
        },
      },
      safetyCode: safetyCode(
        { userId: ownerId, publicKey: owner.publicKey },
        { userId: memberId, publicKey: member.publicKey },
      ),
      invalid: [
        {
          reason: "member wrap opened with the ad of another version",
          ad: AD.memberKey("notebook", notebookId, 2, ownerId, memberId),
        },
        {
          reason: "member wrap opened with owner and member swapped in the ad",
          ad: AD.memberKey("notebook", notebookId, 3, memberId, ownerId),
        },
      ],
    },
  };
}
