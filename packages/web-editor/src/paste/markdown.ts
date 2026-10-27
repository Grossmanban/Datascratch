// Plain text that reads as Markdown is pasted as Markdown: it goes through the same HTML path as a
// rich paste (normalize.ts), so both map to blocks the same way.
import { marked } from "marked";

/** Markdown → HTML (GFM: tables, task lists, strikethrough); `==text==` becomes a highlight. */
export function markdownToHtml(text: string): string {
  const withMarks = text.replace(/(^|[^=])==([^=\n]+)==(?!=)/g, "$1<mark>$2</mark>");
  return marked.parse(withMarks, { gfm: true, breaks: false, async: false }) as string;
}
