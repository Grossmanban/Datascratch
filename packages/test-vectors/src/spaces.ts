// Vectors for shared spaces (crypto.md §11, D-62): the spaceKey under the owner's masterKey and
// for a member, its rotation chain, and a notebook key under the spaceKey.
import {
  AD,
  generateBoxKeyPair,
  unwrapKeyChain,
  wrapKeyForMember,
  wrapNotebookKeyForSpace,
  wrapPreviousKey,
  wrapSpaceKey,
  type MemberKeyRef,
} from "@datascratch/shared/crypto";
import { det, hex, vid } from "./util.js";

export function spaceVectors() {
  const ownerId = vid(101);
  const memberId = vid(102);
  const spaceId = vid(201);
  const notebookId = vid(202);
  // Same accounts as crypto/sharing.json.
  const owner = generateBoxKeyPair(det("share|owner-seed", 32));
  const member = generateBoxKeyPair(det("share|member-seed", 32));
  const masterKey = det("share|owner-master", 32);
  const spaceKeys = [1, 2].map((v) => det(`space|space-key|${v}`, 32));
  const nbKeys = [1, 2].map((v) => det(`space|notebook-key|${v}`, 32));
  const nonce = (label: string) => ({ nonce: det(`space|nonce|${label}`, 24) });

  const memberRef: MemberKeyRef = {
    kind: "space",
    targetId: spaceId,
    version: 2,
    fromUserId: ownerId,
    toUserId: memberId,
  };
  const spaceChain = [
    wrapPreviousKey(spaceKeys[1]!, spaceKeys[0]!, "space", spaceId, 2, nonce("prev2")),
  ];
  const nbChain = [
    wrapPreviousKey(nbKeys[1]!, nbKeys[0]!, "notebook", notebookId, 2, nonce("nb-prev2")),
  ];
  if (
    unwrapKeyChain(spaceKeys[1]!, 2, spaceChain, "space", spaceId).map(hex).join() !==
    [...spaceKeys].reverse().map(hex).join()
  )
    throw new Error("space key chain does not unwind");

  return {
    "crypto/spaces.json": {
      description:
        "Shared spaces (crypto.md §11, D-62). Accounts as in crypto/sharing.json (owner/member seeds and owner masterKey). Owner: spaceKey under the masterKey, ad ds1|key|space|<spaceId> for version 1 and ds1|key|space|<spaceId>|<v> from 2. Member: wrap §10.2 with kind = space. keyChain[i] wraps the spaceKey of version (current - i - 1) with that of (current - i), ad ds1|key|prev|space|<spaceId>|<v>. Notebook of the space: notebookKey under the spaceKey, ad ds1|key|space-notebook|<spaceId>|<notebookId>|<notebook key version>; its own chain as in crypto/sharing.json (kind notebook). Fixed nonces, never in production.",
      ownerId,
      memberId,
      spaceId,
      spaceKeys: spaceKeys.map((k, i) => ({ version: i + 1, key: hex(k) })),
      ownerWraps: [1, 2].map((v) => ({
        version: v,
        ad: AD.spaceKey(spaceId, v),
        nonce: hex(nonce(`owner|${v}`).nonce),
        wrappedKey: wrapSpaceKey(masterKey, spaceKeys[v - 1]!, spaceId, v, nonce(`owner|${v}`)),
      })),
      memberWrap: {
        ...memberRef,
        ad: AD.memberKey("space", spaceId, 2, ownerId, memberId),
        nonce: hex(nonce("member").nonce),
        wrappedKey: wrapKeyForMember(
          spaceKeys[1]!,
          owner.secretKey,
          member.publicKey,
          memberRef,
          nonce("member"),
        ),
      },
      keyChain: spaceChain,
      keyChainAds: [AD.previousKey("space", spaceId, 2)],
      notebook: {
        notebookId,
        keys: nbKeys.map((k, i) => ({ version: i + 1, key: hex(k) })),
        /** GET /spaces/:id/notebooks entry: notebook key v2 under spaceKey v2. */
        entry: {
          notebookId,
          version: 2,
          spaceWrappedKey: wrapNotebookKeyForSpace(
            spaceKeys[1]!,
            nbKeys[1]!,
            spaceId,
            notebookId,
            2,
            nonce("nb"),
          ),
          keyChain: nbChain,
          mode: "private",
        },
        ad: AD.spaceNotebookKey(spaceId, notebookId, 2),
        nonce: hex(nonce("nb").nonce),
        /** The same notebook key v1 under spaceKey v1 (an entry not yet re-wrapped). */
        olderEntry: {
          notebookId,
          version: 1,
          spaceWrappedKey: wrapNotebookKeyForSpace(
            spaceKeys[0]!,
            nbKeys[0]!,
            spaceId,
            notebookId,
            1,
            nonce("nb-old"),
          ),
          keyChain: [],
          mode: "private",
        },
      },
      invalid: [
        {
          reason: "owner wrap v2 opened with the version-1 ad",
          wrap: "ownerWraps[1]",
          ad: AD.spaceKey(spaceId, 1),
        },
        {
          reason: "member wrap opened with kind notebook",
          wrap: "memberWrap",
          ad: AD.memberKey("notebook", spaceId, 2, ownerId, memberId),
        },
        {
          reason: "space notebook wrap opened with another notebookId",
          wrap: "notebook.entry",
          ad: AD.spaceNotebookKey(spaceId, vid(203), 2),
        },
      ],
    },
  };
}
