/**
 * Note document → Markdown for agents (read_note).
 *
 * Differences from a plain export: every block carries its blockId in an HTML
 * comment (agents need it for edit_note), tasks carry their taskId, and in
 * place of handwriting there is an image link plus a text note of what it is
 * attached to (D-11).
 *
 * The plain export (@datascratch/shared noteToMarkdown) has no block ids and
 * no per-span handwriting notes, so the agent dialect is rendered here; the
 * dialect stays compatible with it (Obsidian callouts, Tasks-style dates).
 */
import * as Y from "yjs";
import type { HandwritingItem } from "./handwriting.js";
import { attr, blockIdOf, childElements, contentOf, inlineOf, markName, plainText, type Marks } from "./model.js";

export interface MarkdownOptions {
  /** Emit `<!-- block:ID -->` markers (default true). */
  blockIds?: boolean;
  handwriting?: HandwritingItem[];
  /** Title of a linked note for pageCard blocks. */
  noteTitle?: (noteId: string) => string | null;
}

const MARK_ORDER = ["link", "bold", "italic", "strike", "underline", "highlight"] as const;

const WORD = /[\p{L}\p{N}]/u;

/**
 * Backslash-escapes characters that would otherwise turn plain text into
 * Markdown syntax (emphasis, code, links, tags, highlights, math, HTML), so
 * that read_note → edit/create_note round-trips literally. `lineStart`
 * additionally escapes block markers (`>`, `#`, `-`, `1.`) at the start of a line.
 */
/**
 * Spans copied verbatim: inline math (`$…$`, `$$…$$`, LaTeX backslashes are not
 * Markdown escapes), wiki links `[[…]]` (the link syntax agents use) and
 * footnote references `[^1]`.
 */
export const VERBATIM_RE = /\$\$[^$]+?\$\$|\$(?=[^\s$])[^$\n]*?[^\s$\\]\$|\$[^\s$]\$|\[\[[^\]\n]{1,300}\]\]|\[\^[^\]\s]{1,100}\]/g;

function escapePlain(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    const prev = text[i - 1];
    const next = text[i + 1];
    // A backslash is literal in Markdown unless it precedes ASCII punctuation.
    if (c === "\\") out += next === undefined || /[!-/:-@[-`{-~]/.test(next) ? "\\\\" : "\\";
    else if ("`*[]<".includes(c)) out += "\\" + c;
    else if (c === "_" && !(prev && WORD.test(prev) && next && WORD.test(next))) out += "\\_";
    else if ((c === "~" || c === "=" || c === "$") && (next === c || prev === c)) out += "\\" + c;
    else if (c === "#" && next && /[\p{L}\p{N}_]/u.test(next) && (!prev || /[\s(]/.test(prev))) out += "\\#";
    // Entities are short: look at a bounded window, never the whole rest of the text.
    else if (c === "&" && /^&#?\w{1,32};/.test(text.slice(i, i + 36))) out += "\\&";
    else out += c;
  }
  return out;
}

/**
 * Backslash-escapes characters that would otherwise turn plain text into
 * Markdown syntax (emphasis, code, links, tags, highlights, HTML), so that
 * read_note → edit/create_note round-trips literally. `lineStart`
 * additionally escapes block markers (`>`, `#`, `-`, `1.`) at the start of a line.
 */
export function escapeText(text: string, lineStart: boolean): string {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(VERBATIM_RE)) {
    out += escapePlain(text.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  out += escapePlain(text.slice(last));
  if (lineStart) {
    out = out
      .replace(/^(\s*)([>#+-])(?=\s|$)/, "$1\\$2")
      .replace(/^(\s*)(\d+)([.)])(?=\s|$)/, "$1$2\\$3");
  }
  return out;
}

function codeSpan(text: string): string {
  let longest = 0;
  for (let i = 0, run = 0; i < text.length; i++) longest = Math.max(longest, (run = text[i] === "`" ? run + 1 : 0));
  const fence = "`".repeat(longest + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

function wrapMarks(text: string, marks: Marks, lineStart: boolean): string {
  if (text.length === 0) return "";
  const names = new Map<string, unknown>();
  for (const [k, v] of Object.entries(marks)) if (v !== null && v !== undefined && v !== false) names.set(markName(k), v);
  if (names.has("code")) return codeSpan(text);
  text = escapeText(text, lineStart);
  // Keep surrounding whitespace outside of emphasis markers (`** bold**` is not bold in Markdown).
  // Index loops, not a regex: `/^(\s*)(.*?)(\s*)$/s` is quadratic on long whitespace runs.
  let a = 0;
  while (a < text.length && /\s/.test(text[a]!)) a++;
  if (a === text.length) return text;
  let b = text.length;
  while (b > a && /\s/.test(text[b - 1]!)) b--;
  const lead = text.slice(0, a);
  const trail = text.slice(b);
  let core = text.slice(a, b);
  for (const name of [...MARK_ORDER].reverse()) {
    if (!names.has(name)) continue;
    switch (name) {
      case "bold":
        core = `**${core}**`;
        break;
      case "italic":
        core = `*${core}*`;
        break;
      case "strike":
        core = `~~${core}~~`;
        break;
      case "underline":
        core = `<u>${core}</u>`;
        break;
      case "highlight":
        core = `==${core}==`;
        break;
      case "link": {
        const v = names.get("link") as { href?: string } | true;
        const href = typeof v === "object" && v?.href ? v.href : "";
        core = `[${core}](${href})`;
        break;
      }
    }
  }
  return lead + core + trail;
}

/** Inline content; hard breaks become `\\` + newline. `lineStart` = the text starts a Markdown line. */
export function inlineMarkdown(block: Y.XmlElement, lineStart = false): string {
  let out = "";
  let atStart = lineStart;
  for (const item of inlineOf(block)) {
    if (item.kind === "text") out += wrapMarks(item.text, item.marks, atStart);
    else if (item.name === "noteLink") out += `[[${String(item.attrs.label ?? "")}]]`;
    else if (item.name === "tag") out += `#${String(item.attrs.name ?? "")}`;
    else if (item.name === "hardBreak") {
      out += "\\\n";
      atStart = true;
      continue;
    }
    atStart = false;
  }
  return out;
}

const TONES = new Set(["note", "info", "success", "warning", "danger"]);

class Writer {
  private readonly hw = new Map<string, HandwritingItem[]>();
  constructor(private readonly opts: MarkdownOptions) {
    for (const h of opts.handwriting ?? []) {
      if (!h.blockId) continue;
      this.hw.set(h.blockId, [...(this.hw.get(h.blockId) ?? []), h]);
    }
  }

  private idComment(el: Y.XmlElement, extra = ""): string {
    if (this.opts.blockIds === false) return "";
    const id = blockIdOf(el);
    return id ? ` <!-- block:${id}${extra} -->` : "";
  }

  private readonly emitted = new Set<string>();

  private handwritingLines(el: Y.XmlElement): string[] {
    const id = blockIdOf(el);
    const list = id ? this.hw.get(id) : undefined;
    if (!list) return [];
    const fresh = list.filter((h) => !this.emitted.has(h.id));
    for (const h of fresh) this.emitted.add(h.id);
    return fresh.map((h) => `![✍️ ${h.description}](handwriting:${h.id})`);
  }

  /** Handwriting of a top-level block that no inner block showed (table cells, quotes…). */
  leftoverHandwriting(top: Y.XmlElement): string[] {
    const id = blockIdOf(top);
    const rest = (this.opts.handwriting ?? []).filter((h) => h.topBlockId === id && !this.emitted.has(h.id));
    for (const h of rest) this.emitted.add(h.id);
    return rest.map((h) => `![✍️ ${h.description}](handwriting:${h.id})`);
  }

  /** Lines of a block (without trailing blank line); multi-line strings are split. */
  block(el: Y.XmlElement): string[] {
    return this.blockLines(el).flatMap((l) => l.split("\n"));
  }

  private blockLines(el: Y.XmlElement): string[] {
    const name = el.nodeName;
    const idc = this.idComment(el);
    switch (name) {
      case "title":
        return [`# ${inlineMarkdown(el)}`];
      case "paragraph":
        return [inlineMarkdown(el, true) + idc, ...this.handwritingLines(el)];
      case "heading": {
        const level = Math.min(3, Math.max(1, Number(attr(el, "level") ?? 1)));
        return ["#".repeat(level) + " " + inlineMarkdown(el) + idc, ...this.handwritingLines(el)];
      }
      case "bulletList":
      case "orderedList":
      case "taskList": {
        const start = Number(attr(el, "start") ?? 1);
        const lines: string[] = [];
        childElements(el).forEach((item, i) => {
          const marker =
            name === "orderedList" ? `${start + i}.` : name === "taskList" ? "-" : "-";
          lines.push(...this.listItem(item, marker));
        });
        return lines.length ? lines : [`-${idc}`];
      }
      case "blockquote":
        return this.quoted(this.children(el), idc ? [`>${idc}`] : []);
      case "callout": {
        const tone = String(attr(el, "tone") ?? "note");
        const emoji = attr<string | null>(el, "emoji");
        const head = `> [!${TONES.has(tone) ? tone : "note"}]${emoji ? " " + emoji : ""}${idc}`;
        return [head, ...this.quoted(this.children(el), []).map((l) => l)];
      }
      case "codeBlock": {
        const lang = attr<string | null>(el, "language") ?? "";
        const text = plainText(el);
        const fence = text.includes("```") ? "````" : "```";
        return [`${fence}${lang}${idc}`, ...text.split("\n"), fence, ...this.handwritingLines(el)];
      }
      case "mathBlock":
        return [`$$${idc}`, String(attr(el, "latex") ?? ""), "$$"];
      case "mermaid":
        return ["```mermaid" + idc, ...String(attr(el, "source") ?? "").split("\n"), "```"];
      case "horizontalRule":
        return ["---" + idc];
      case "table":
        return this.table(el, idc);
      case "image": {
        const alt = String(attr(el, "alt") ?? "");
        const caption = attr<string | null>(el, "caption");
        const id = String(attr(el, "attachmentId") ?? "");
        return [`![${alt}](attachment:${id}${caption ? ` "${caption.replace(/"/g, "'")}"` : ""})${idc}`, ...this.handwritingLines(el)];
      }
      case "file":
        return [`[📎 ${String(attr(el, "name") ?? "file")}](attachment:${String(attr(el, "attachmentId") ?? "")})${idc}`];
      case "drawing": {
        const lines = this.handwritingLines(el);
        return lines.length ? lines.map((l, i) => (i === 0 ? l + idc : l)) : [`*(пустой рисунок)*${idc}`];
      }
      case "pageCard": {
        const noteId = String(attr(el, "noteId") ?? "");
        const title = this.opts.noteTitle?.(noteId) ?? "документ";
        return [`📄 [[${title}]]${this.idComment(el, ` note:${noteId}`)}`];
      }
      default:
        return [`*(неподдерживаемый блок: ${name})*${idc}`];
    }
  }

  private children(el: Y.XmlElement): string[] {
    const out: string[] = [];
    childElements(el).forEach((c, i) => {
      if (i > 0) out.push("");
      out.push(...this.block(c));
    });
    return out;
  }

  private quoted(lines: string[], head: string[]): string[] {
    return [...head, ...lines.map((l) => (l.length ? `> ${l}` : ">"))];
  }

  private listItem(item: Y.XmlElement, marker: string): string[] {
    let prefix = marker;
    let extra = "";
    if (item.nodeName === "taskItem") {
      const state = String(attr(item, "state") ?? "open");
      prefix = `${marker} [${state === "done" ? "x" : state === "cancelled" ? "-" : " "}]`;
      const taskId = attr<string>(item, "taskId");
      if (taskId) extra = ` task:${taskId}`;
    }
    const kids = childElements(item);
    const first = kids[0];
    const firstText = first && first.nodeName === "paragraph" ? inlineMarkdown(first) : "";
    const dates: string[] = [];
    if (item.nodeName === "taskItem") {
      const scheduled = attr<string | null>(item, "scheduled");
      const deadline = attr<string | null>(item, "deadline");
      if (scheduled) dates.push(`⏳ ${scheduled}`);
      if (deadline) dates.push(`📅 ${deadline}`);
    }
    const indent = " ".repeat(marker.length + 1);
    // A hard break inside the first paragraph continues the item on an indented line.
    const [firstLine, ...moreLines] = firstText.split("\n");
    const head = `${prefix} ${firstLine}${dates.length ? " " + dates.join(" ") : ""}${this.idComment(item, extra)}`;
    const rest: string[] = [...moreLines];
    if (first && first.nodeName === "paragraph") rest.push(...this.handwritingLines(first));
    const tail = first && first.nodeName === "paragraph" ? kids.slice(1) : kids;
    for (const c of tail) rest.push(...this.block(c));
    return [head, ...rest.map((l) => (l.length ? indent + l : l))];
  }

  private table(el: Y.XmlElement, idc: string): string[] {
    const rows = childElements(el).map((row) =>
      childElements(row).map((cell) =>
        childElements(cell)
          .map((p) => inlineMarkdown(p).replace(/\\\n/g, "<br>"))
          .join("<br>")
          .replace(/\|/g, "\\|"),
      ),
    );
    if (rows.length === 0) return [`|  |${idc}`];
    const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
    const line = (r: string[]) => "| " + Array.from({ length: width }, (_, i) => r[i] ?? "").join(" | ") + " |";
    // Column alignment: the `align` attribute of the cells of the first row.
    const firstRow = childElements(childElements(el)[0]!);
    const align = Array.from({ length: width }, (_, i) => {
      const a = firstRow[i] ? attr<string>(firstRow[i]!, "align") : undefined;
      return a === "center" ? " :---: |" : a === "right" ? " ---: |" : a === "left" ? " :--- |" : " --- |";
    });
    const out = [line(rows[0]!), "|" + align.join("")];
    for (const r of rows.slice(1)) out.push(line(r));
    if (idc) out.unshift(idc.trim());
    return out;
  }
}

/** Markdown body of a note (title is not included; see `getTitle` in @datascratch/shared). */
export function noteToMarkdown(doc: Y.Doc, options: MarkdownOptions = {}): string {
  const w = new Writer(options);
  const out: string[] = [];
  for (const el of childElements(contentOf(doc))) {
    if (el.nodeName === "title") continue;
    out.push(...w.block(el), ...w.leftoverHandwriting(el), "");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
