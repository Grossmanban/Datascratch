// Keys of shared spaces (crypto.md §11, D-62): the spaceKey under the owner's masterKey, and the
// keys of the space's notebooks under the spaceKey. A member's copy of the spaceKey is a member
// wrap (sharing.ts, kind = "space").
import { AD } from "../contracts/crypto.js";
import type { EncryptOptions } from "./envelope.js";
import { unwrapKey, wrapKey } from "./keys.js";

export const wrapSpaceKey = (
  masterKey: Uint8Array,
  spaceKey: Uint8Array,
  spaceId: string,
  version: number,
  options?: EncryptOptions,
) => wrapKey(masterKey, spaceKey, AD.spaceKey(spaceId, version), options);

export const unwrapSpaceKey = (
  masterKey: Uint8Array,
  wrapped: string,
  spaceId: string,
  version: number,
) => unwrapKey(masterKey, wrapped, AD.spaceKey(spaceId, version));

/** A notebookKey (of `version`) of a space's notebook, wrapped by the spaceKey. */
export const wrapNotebookKeyForSpace = (
  spaceKey: Uint8Array,
  notebookKey: Uint8Array,
  spaceId: string,
  notebookId: string,
  version: number,
  options?: EncryptOptions,
) => wrapKey(spaceKey, notebookKey, AD.spaceNotebookKey(spaceId, notebookId, version), options);

export const unwrapNotebookKeyFromSpace = (
  spaceKey: Uint8Array,
  wrapped: string,
  spaceId: string,
  notebookId: string,
  version: number,
) => unwrapKey(spaceKey, wrapped, AD.spaceNotebookKey(spaceId, notebookId, version));
