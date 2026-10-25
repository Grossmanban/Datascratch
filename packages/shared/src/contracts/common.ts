// Primitive value formats shared by every contract (document-model.md §1, api.md "Общее").
import { z } from "zod";

/** Lowercase, hyphenated UUIDv7 (document-model.md §1). */
export const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** ISO 8601 UTC timestamp with milliseconds: `2026-10-25T12:00:00.000Z`. */
export const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Calendar date in the user's local calendar: `YYYY-MM-DD`. */
export const DATE_ONLY_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** base64url alphabet without padding (all binary fields in JSON and URLs). */
export const BASE64URL_REGEX = /^[A-Za-z0-9_-]*$/;

export type Uuid = string;
export type IsoDateTime = string;
export type DateOnly = string;
export type Base64Url = string;

export const uuidSchema = z.string().regex(UUID_V7_REGEX, "expected lowercase UUIDv7");
export const isoDateTimeSchema = z
  .string()
  .regex(ISO_DATE_TIME_REGEX, "expected ISO 8601 UTC timestamp with milliseconds")
  .refine((s) => !Number.isNaN(Date.parse(s)), "invalid timestamp");
export const dateOnlySchema = z.string().regex(DATE_ONLY_REGEX, "expected YYYY-MM-DD");
export const base64UrlSchema = z
  .string()
  .regex(BASE64URL_REGEX, "expected base64url without padding");

/** Length of the base64url (no padding) encoding of `n` bytes. */
export function base64UrlLength(n: number): number {
  return Math.ceil((n * 4) / 3);
}

/** Number of bytes encoded by a base64url (no padding) string of length `len`. */
export function base64UrlDecodedLength(len: number): number {
  return Math.floor((len * 3) / 4);
}

/** base64url string that must decode to exactly `n` bytes. */
export function base64UrlBytesSchema(n: number) {
  return base64UrlSchema.length(base64UrlLength(n), `expected base64url of ${n} bytes`);
}

/** A 32-byte key or derived secret in base64url (43 characters). */
export const key32Schema = base64UrlBytesSchema(32);

/** Author of a stroke or comment (document-model.md §4.4, strokes.md §2). */
export const AUTHOR_KINDS = ["user", "guest", "agent"] as const;
export type AuthorKind = (typeof AUTHOR_KINDS)[number];
export const authorKindSchema = z.enum(AUTHOR_KINDS);

/** Kinds of synchronized Yjs documents (document-model.md §1). */
export const DOC_KINDS = ["account", "notebook", "note"] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export const docKindSchema = z.enum(DOC_KINDS);

/** Notebook encryption mode (D-04, crypto.md §8). */
export const NOTEBOOK_MODES = ["private", "agent"] as const;
export type NotebookMode = (typeof NOTEBOOK_MODES)[number];
export const notebookModeSchema = z.enum(NOTEBOOK_MODES);
