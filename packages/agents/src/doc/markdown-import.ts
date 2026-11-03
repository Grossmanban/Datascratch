/**
 * Markdown from an agent → block specs of the document schema
 * (contracts/document-model.md §4.2). Specs are plain data; `build.ts` turns
 * them into Yjs elements.
 */
import type * as Mdast from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { AgentError } from "../errors.js";

/** Deeper quotes/lists/emphasis are refused: deep trees cost stack and render time and no note needs them. */
export const MAX_NESTING = 50;

/** Link targets kept on import; anything else (javascript:, data:, vbscript:, file:…) loses the link, keeps the text. */
const SAFE_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

export function safeHref(url: string): string | null {
  // Browsers ignore control characters and spaces inside the scheme («java\tscript:»).
  const compact = url.replace(/[\u0000-\u0020\u007f]/g, "");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1]?.toLowerCase();
  if (scheme === undefined) return url; // relative link or #anchor
  return SAFE_SCHEMES.has(scheme) ? url : null;
}

export type InlineSpec =
  | { text: string; marks: Record<string, unknown> }
  | { atom: "noteLink"; attrs: { noteId: string; label: string } }
  | { atom: "tag"; attrs: { name: string } }
  | { atom: "hardBreak"; attrs: Record<string, never> };

export interface BlockSpec {
  type: string;
  attrs: Record<string, unknown>;
  /** Child blocks, or inline content for text blocks. */
  children?: BlockSpec[];
  inline?: InlineSpec[];
  /** Raw text for codeBlock. */
  text?: string;
}

export interface ImportOptions {
  /** Resolves `[[Title]]` to a note id among notes the agent can see. */
  resolveNoteLink?: (label: string) => string | null;
}

/**
 * Callout tones are the five of the document schema; Obsidian / GitHub callout
 * names map onto the closest tone (`tip` → `success`, `important` → `info`, …).
 */
export const CALLOUT_TONE: Record<string, string> = {
  note: "note",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  tip: "success",
  hint: "success",
  check: "success",
  done: "success",
  important: "info",
  abstract: "info",
  summary: "info",
  tldr: "info",
  todo: "info",
  question: "info",
  help: "info",
  faq: "info",
  caution: "warning",
  attention: "warning",
  error: "danger",
  failure: "danger",
  fail: "danger",
  missing: "danger",
  bug: "danger",
  example: "note",
  quote: "note",
  cite: "note",
};
const CALLOUT_RE = /^\[!([a-z]+)\][+-]?[ \t]*([^\s]+)?[ \t]*/i;

/**
 * The Markdown parser (micromark) is quadratic inside one paragraph for some
 * inputs («*a*a*a…», very long «a_a_a…» words): 20 000 such characters take
 * ~1.5 s and would stall the single server process for everyone. The cost of a
 * paragraph is estimated as its length squared; the sum over the text is
 * capped. Code fences are not inline-parsed and table rows are parsed cell by
 * cell, so each of them counts on its own. Normal notes stay far below.
 */
export const MAX_PARAGRAPH_COST = 2.5e8; // ≈ one 15 800-character paragraph, or 1 000 of 500

export function markdownCost(markdown: string): number {
  let cost = 0;
  let run = 0;
  let fence: string | null = null;
  const end = () => {
    cost += run * run;
    run = 0;
  };
  for (const line of markdown.split("\n")) {
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence !== null) {
      if (f && f[0] === fence[0] && f.length >= fence.length) fence = null;
      continue;
    }
    if (f) {
      end();
      fence = f;
    } else if (line.trim() === "") end();
    else if (/^\s*\|/.test(line)) {
      end();
      run = line.length;
      end();
    } else run += line.length + 1;
  }
  end();
  return cost;
}

export function markdownToBlocks(markdown: string, options: ImportOptions = {}): BlockSpec[] {
  if (markdownCost(markdown) > MAX_PARAGRAPH_COST)
    throw new AgentError(
      "payload_too_large",
      "The Markdown has very long paragraphs. Split them with blank lines (keep each paragraph under about 10 000 characters).",
    );
  const tree = fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  const blocks = new Importer(options, markdown).blocks(tree.children);
  // An empty paragraph at the end is noise (e.g. a trailing image without alt text).
  while (blocks.length > 1 && isEmptyParagraph(blocks[blocks.length - 1]!)) blocks.pop();
  return blocks;
}

function isEmptyParagraph(b: BlockSpec): boolean {
  return b.type === "paragraph" && (b.inline ?? []).every((i) => "text" in i && i.text.trim() === "");
}

const ASCII_PUNCT = /[!-/:-@[-`{-~]/;

/**
 * Which characters of a text node's value came from backslash escapes, so
 * `\#tag` stays literal text. Null when the raw source does not decode to the
 * value one-to-one (entities etc.): then nothing is treated as escaped.
 */
function escapeMask(raw: string, value: string): boolean[] | null {
  const chars: string[] = [];
  const mask: boolean[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "\\" && i + 1 < raw.length && ASCII_PUNCT.test(raw[i + 1]!)) {
      chars.push(raw[i + 1]!);
      mask.push(true);
      i++;
    } else {
      chars.push(raw[i]!);
      mask.push(false);
    }
  }
  return chars.join("") === value ? mask : null;
}

class Importer {
  constructor(
    private readonly opts: ImportOptions,
    private readonly src: string,
  ) {}

  /** Source text of a node (for verbatim math and escape detection). */
  private raw(node: Mdast.Node): string | null {
    const a = node.position?.start.offset;
    const b = node.position?.end.offset;
    return a === undefined || b === undefined ? null : this.src.slice(a, b);
  }

  private depth = 0;

  private nested<T>(run: () => T): T {
    if (++this.depth > MAX_NESTING) {
      this.depth = 0;
      throw new AgentError("bad_request", `Markdown is nested deeper than ${MAX_NESTING} levels (quotes, lists or emphasis). Flatten the structure.`);
    }
    try {
      return run();
    } finally {
      this.depth = Math.max(0, this.depth - 1);
    }
  }

  blocks(nodes: Mdast.RootContent[]): BlockSpec[] {
    return this.nested(() => {
      const out: BlockSpec[] = [];
      for (const n of nodes) out.push(...this.block(n));
      return out;
    });
  }

  block(node: Mdast.RootContent): BlockSpec[] {
    switch (node.type) {
      case "heading":
        return [{ type: "heading", attrs: { level: Math.min(3, node.depth) }, inline: this.inline(node.children) }];
      case "paragraph": {
        // $$…$$ is math, taken verbatim from the source (backslashes are LaTeX, not Markdown escapes).
        const raw = this.raw(node)?.replace(/\n[ \t]*>[ \t]?/g, "\n").trim();
        const math = raw ? /^\$\$([\s\S]*?)\$\$$/.exec(raw) : null;
        if (math) return [{ type: "mathBlock", attrs: { latex: math[1]!.trim() } }];
        if (node.children.length === 1 && node.children[0]!.type === "image") {
          const img = node.children[0]!;
          const m = /^attachment:([0-9a-f-]{36})$/.exec(img.url);
          if (m) return [{ type: "image", attrs: { attachmentId: m[1], width: null, alt: img.alt ?? "", caption: img.title ?? null } }];
        }
        return [{ type: "paragraph", attrs: {}, inline: this.inline(node.children) }];
      }
      case "thematicBreak":
        return [{ type: "horizontalRule", attrs: { style: "line" } }];
      case "code": {
        const lang = (node.lang ?? "").toLowerCase();
        if (lang === "mermaid") return [{ type: "mermaid", attrs: { source: node.value } }];
        if (lang === "math" || lang === "latex" || lang === "tex") return [{ type: "mathBlock", attrs: { latex: node.value } }];
        return [{ type: "codeBlock", attrs: { language: node.lang ?? null }, text: node.value }];
      }
      case "math" as never:
        return [{ type: "mathBlock", attrs: { latex: (node as unknown as { value: string }).value } }];
      case "blockquote":
        return [this.blockquote(node)];
      case "list":
        return this.list(node);
      case "table":
        return [this.table(node)];
      case "html":
        return [{ type: "paragraph", attrs: {}, inline: [{ text: node.value, marks: {} }] }];
      case "footnoteDefinition":
        return this.footnote(node);
      case "definition":
      case "yaml" as never:
        return [];
      default:
        return [];
    }
  }

  private blockquote(node: Mdast.Blockquote): BlockSpec {
    const first = node.children[0];
    if (first && first.type === "paragraph" && first.children[0]?.type === "text") {
      const t = first.children[0];
      const m = CALLOUT_RE.exec(t.value);
      if (m) {
        const tone = CALLOUT_TONE[m[1]!.toLowerCase()] ?? "note";
        const rest = t.value.slice(m[0].length);
        const emoji = m[2] && /\p{Extended_Pictographic}/u.test(m[2]) ? m[2] : null;
        const restText = emoji ? rest : (m[2] ? m[2] + " " : "") + rest;
        const firstChildren: Mdast.PhrasingContent[] = [
          ...(restText.trim() ? [{ ...t, value: restText.replace(/^\n/, "") }] : []),
          ...first.children.slice(1),
        ];
        const children = this.blocks([
          ...(firstChildren.length ? [{ ...first, children: firstChildren } as Mdast.Paragraph] : []),
          ...node.children.slice(1),
        ]);
        return {
          type: "callout",
          attrs: { tone, emoji },
          children: children.length ? children : [{ type: "paragraph", attrs: {}, inline: [] }],
        };
      }
    }
    const children = this.blocks(node.children);
    return { type: "blockquote", attrs: {}, children: children.length ? children : [{ type: "paragraph", attrs: {}, inline: [] }] };
  }

  /** A Markdown list; runs of task items and plain items become separate taskList / list blocks. */
  private list(node: Mdast.List): BlockSpec[] {
    const out: BlockSpec[] = [];
    let run: Mdast.ListItem[] = [];
    let runTask = false;
    const flush = () => {
      if (run.length === 0) return;
      const items = run.map((item) => this.listItem(item, runTask));
      if (runTask) out.push({ type: "taskList", attrs: {}, children: items });
      else if (node.ordered) out.push({ type: "orderedList", attrs: { start: node.start ?? 1 }, children: items });
      else out.push({ type: "bulletList", attrs: {}, children: items });
      run = [];
    };
    for (const item of node.children) {
      const isTask = typeof item.checked === "boolean" || this.cancelledMarker(item);
      if (run.length && isTask !== runTask) flush();
      runTask = isTask;
      run.push(item);
    }
    flush();
    return out;
  }

  /** `- [-] task` (cancelled) is not GFM; detect it on the raw text. */
  private cancelledMarker(item: Mdast.ListItem): boolean {
    const p = item.children[0];
    return p?.type === "paragraph" && p.children[0]?.type === "text" && /^\[-\]\s/.test(p.children[0].value);
  }

  private listItem(item: Mdast.ListItem, task: boolean): BlockSpec {
    let children = this.blocks(item.children);
    if (children.length === 0 || children[0]!.type !== "paragraph") children = [{ type: "paragraph", attrs: {}, inline: [] }, ...children];
    if (!task) return { type: "listItem", attrs: {}, children };
    let state = item.checked ? "done" : "open";
    const first = children[0]!;
    const inl = first.inline ?? [];
    const head = inl[0];
    if (head && "text" in head && /^\[-\]\s/.test(head.text)) {
      state = "cancelled";
      inl[0] = { ...head, text: head.text.replace(/^\[-\]\s/, "") };
    }
    // Dates in the Obsidian Tasks style that read_note prints: ⏳ scheduled, 📅 deadline (any order).
    let scheduled: string | null = null;
    let deadline: string | null = null;
    const last = inl[inl.length - 1];
    if (last && "text" in last) {
      let t = last.text;
      // Look only at the end of the text: an unanchored `\s*…$` regex is quadratic on long whitespace.
      for (;;) {
        const end = t.trimEnd();
        const tail = end.slice(-32);
        const m = /(⏳|📅)[ \t]{0,8}(\d{4}-\d{2}-\d{2})$/u.exec(tail);
        if (!m) break;
        if (m[1] === "⏳") scheduled = m[2]!;
        else deadline = m[2]!;
        t = end.slice(0, end.length - tail.length + m.index).trimEnd();
      }
      inl[inl.length - 1] = { ...last, text: t };
    }
    first.inline = inl.filter((i) => !("text" in i) || i.text.length > 0);
    return {
      type: "taskItem",
      attrs: { state, scheduled, deadline, completedAt: null },
      children,
    };
  }

  /** Column alignment (`:---`, `:---:`, `---:`) is the cell's `align` attribute (document-model.md, tableHeader/tableCell). */
  private table(node: Mdast.Table): BlockSpec {
    return {
      type: "table",
      attrs: {},
      children: node.children.map((row, r) => ({
        type: "tableRow",
        attrs: {},
        children: row.children.map((cell, c) => {
          const align = node.align?.[c] ?? null;
          return {
            type: r === 0 ? "tableHeader" : "tableCell",
            attrs: align ? { colspan: 1, rowspan: 1, colwidth: null, align } : { colspan: 1, rowspan: 1, colwidth: null },
            children: [{ type: "paragraph", attrs: {}, inline: this.inline(cell.children) }],
          };
        }),
      })),
    };
  }

  /** Footnotes have no node in the schema: keep the definition as a paragraph «[^1]: …». */
  private footnote(node: Mdast.FootnoteDefinition): BlockSpec[] {
    const [first, ...rest] = this.blocks(node.children);
    const head: InlineSpec = { text: `[^${node.label ?? node.identifier}]: `, marks: {} };
    if (first && first.type === "paragraph") return [{ ...first, inline: [head, ...(first.inline ?? [])] }, ...rest];
    return [{ type: "paragraph", attrs: {}, inline: [head] }, ...(first ? [first] : []), ...rest];
  }

  inline(nodes: Mdast.PhrasingContent[], marks: Record<string, unknown> = {}): InlineSpec[] {
    return this.nested(() => this.inlineFlat(nodes, marks));
  }

  private inlineFlat(nodes: Mdast.PhrasingContent[], marks: Record<string, unknown>): InlineSpec[] {
    const out: InlineSpec[] = [];
    for (const n of nodes) {
      switch (n.type) {
        case "text": {
          const raw = this.raw(n);
          const mask = raw === null ? null : escapeMask(raw, n.value);
          if (raw !== null && mask !== null && raw.includes("$")) {
            const m = withVerbatimMath(raw);
            out.push(...this.text(m.value, marks, m.escaped));
          } else out.push(...this.text(n.value, marks, mask));
          break;
        }
        case "strong":
          out.push(...this.inline(n.children, { ...marks, bold: {} }));
          break;
        case "emphasis":
          out.push(...this.inline(n.children, { ...marks, italic: {} }));
          break;
        case "delete":
          out.push(...this.inline(n.children, { ...marks, strike: {} }));
          break;
        case "inlineCode":
          out.push({ text: n.value, marks: { ...marks, code: {} } });
          break;
        case "break":
          out.push({ atom: "hardBreak", attrs: {} });
          break;
        case "footnoteReference":
          out.push({ text: `[^${n.label ?? n.identifier}]`, marks });
          break;
        case "link": {
          const m = /^note:([0-9a-f-]{36})$/.exec(n.url);
          if (m) {
            const label = n.children.map((c) => ("value" in c ? c.value : "")).join("");
            out.push({ atom: "noteLink", attrs: { noteId: m[1]!, label } });
          } else {
            const href = safeHref(n.url);
            out.push(...this.inline(n.children, href === null ? marks : { ...marks, link: { href } }));
          }
          break;
        }
        case "image":
          out.push({ text: n.alt ?? "", marks });
          break;
        case "html": {
          // <u>…</u> is the only inline HTML we understand; the rest is kept as text.
          out.push({ text: n.value, marks });
          break;
        }
        default:
          if ("value" in n && typeof n.value === "string") out.push({ text: n.value, marks });
          else if ("children" in n) out.push(...this.inline(n.children as Mdast.PhrasingContent[], marks));
      }
    }
    return softBreaks(mergeUnderline(out));
  }

  /**
   * Splits text into runs, turning `[[Title]]`, `==highlight==` and `#tag`
   * into nodes/marks — unless their first character was backslash-escaped.
   */
  private text(value: string, marks: Record<string, unknown>, escaped: boolean[] | null): InlineSpec[] {
    const out: InlineSpec[] = [];
    // Bounded repetitions: `[[[[…` or `==…` without a closing pair must not rescan the rest of the text from every start.
    const re = /\[\[([^\]\n]{1,300})\]\]|==([^=\n]{1,1000})==|(^|[\s(])#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;
    let last = 0;
    for (let m = re.exec(value); m; m = re.exec(value)) {
      const trigger = m[3] !== undefined ? m.index + m[3].length : m.index;
      if (escaped?.[trigger]) {
        re.lastIndex = trigger + 1;
        continue;
      }
      if (m[1] !== undefined) {
        const noteId = this.opts.resolveNoteLink?.(m[1]) ?? null;
        if (!noteId) continue; // unknown note → keep literal text
        if (m.index > last) out.push({ text: value.slice(last, m.index), marks });
        out.push({ atom: "noteLink", attrs: { noteId, label: m[1] } });
        last = m.index + m[0].length;
      } else if (m[2] !== undefined) {
        if (m.index > last) out.push({ text: value.slice(last, m.index), marks });
        out.push({ text: m[2], marks: { ...marks, highlight: { color: "highlight.yellow" } } });
        last = m.index + m[0].length;
      } else {
        const start = m.index + m[3]!.length;
        if (start > last) out.push({ text: value.slice(last, start), marks });
        out.push({ atom: "tag", attrs: { name: m[4]! } });
        last = m.index + m[0].length;
      }
    }
    if (last < value.length) out.push({ text: value.slice(last), marks });
    return out;
  }
}

const INLINE_MATH_RE = /\$\$[^$]+?\$\$|\$(?=[^\s$])[^$\n]*?[^\s$\\]\$|\$[^\s$]\$/y;

/**
 * Decodes Markdown escapes of a text node's source but keeps inline math
 * (`$…$`, `$$…$$`) verbatim: `$\sqrt{x}\,dx$` must keep its backslashes.
 * Math characters are flagged as escaped so no tag/link/highlight is made inside.
 */
function withVerbatimMath(raw: string): { value: string; escaped: boolean[] } {
  let value = "";
  const escaped: boolean[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "$" && (i === 0 || raw[i - 1] !== "\\")) {
      INLINE_MATH_RE.lastIndex = i;
      const m = INLINE_MATH_RE.exec(raw);
      if (m) {
        value += m[0];
        for (let k = 0; k < m[0].length; k++) escaped.push(true);
        i += m[0].length - 1;
        continue;
      }
    }
    if (raw[i] === "\\" && i + 1 < raw.length && ASCII_PUNCT.test(raw[i + 1]!)) {
      value += raw[i + 1];
      escaped.push(true);
      i++;
    } else {
      value += raw[i];
      escaped.push(false);
    }
  }
  return { value, escaped };
}

/**
 * Line breaks inside a paragraph become hard breaks: agents (like Obsidian
 * users) mean a new line when they write one.
 */
function softBreaks(items: InlineSpec[]): InlineSpec[] {
  const out: InlineSpec[] = [];
  for (const it of items) {
    if (!("text" in it) || !it.text.includes("\n") || "code" in it.marks) {
      out.push(it);
      continue;
    }
    it.text.split("\n").forEach((part, i) => {
      if (i > 0) out.push({ atom: "hardBreak", attrs: {} });
      if (part) out.push({ text: part, marks: it.marks });
    });
  }
  return out;
}

/** Applies `<u>`…`</u>` html pairs produced by read_note as the underline mark. */
function mergeUnderline(items: InlineSpec[]): InlineSpec[] {
  const out: InlineSpec[] = [];
  let underline = false;
  for (const it of items) {
    if ("text" in it && it.text === "<u>") {
      underline = true;
      continue;
    }
    if ("text" in it && it.text === "</u>") {
      underline = false;
      continue;
    }
    if (underline && "text" in it) out.push({ text: it.text, marks: { ...it.marks, underline: {} } });
    else out.push(it);
  }
  return out;
}
