// Clipboard fixtures of the shared paste vectors (packages/test-vectors/vectors/paste/cases.json).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface PasteCase {
  name: string;
  source: string;
  description: string;
  html?: string;
  text?: string;
  expected?: { blocks: unknown[]; images: { src: string; alt: string }[] };
}

export const VECTORS_PATH = fileURLToPath(new URL("../../test-vectors/vectors/paste/cases.json", import.meta.url));

export const pasteVectors = (): { cases: PasteCase[] } & Record<string, unknown> => JSON.parse(readFileSync(VECTORS_PATH, "utf8"));

const input = (name: string) => {
  const c = pasteVectors().cases.find((k) => k.name === name)!;
  return (c.html ?? c.text)!;
};

export const GOOGLE_DOCS = input("google-docs");
export const WORD = input("word");
export const WEB_PAGE = input("web-page-images");
export const MARKDOWN = input("markdown");
