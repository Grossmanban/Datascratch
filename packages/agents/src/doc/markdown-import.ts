/**
 * Markdown from an agent → block specs of the document schema
 * (contracts/document-model.md §4.2). Specs are plain data; `build.ts` turns
 * them into Yjs elements.
 */
import type * as Mdast from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";

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

const CALLOUT_RE = /^\[!(note|info|success|warning|danger|tip|important|caution)\]\s*(\S+)?\s*/i;
const CALLOUT_TONE: Record<string, string> = { tip: "success", important: "info", caution: "warning" };

export function markdownToBlocks(markdown: string, options: ImportOptions = {}): BlockSpec[] {
  const tree = fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  return new Importer(options).blocks(tree.children);
}

class Importer {
  constructor(private readonly opts: ImportOptions) {}

  blocks(nodes: Mdast.RootContent[]): BlockSpec[] {
    const out: BlockSpec[] = [];
    for (const n of nodes) out.push(...this.block(n));
    return out;
  }

  block(node: Mdast.RootContent): BlockSpec[] {
    switch (node.type) {
      case "heading":
        return [{ type: "heading", attrs: { level: Math.min(3, node.depth) }, inline: this.inline(node.children) }];
      case "paragraph": {
        const text = node.children.length === 1 && node.children[0]!.type === "text" ? node.children[0]!.value : null;
        const math = text ? /^\$\$\s*([\s\S]*?)\s*\$\$$/.exec(text) : null;
        if (math) return [{ type: "mathBlock", attrs: { latex: math[1]! } }];
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
      case "definition":
      case "footnoteDefinition":
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
        const raw = m[1]!.toLowerCase();
        const tone = CALLOUT_TONE[raw] ?? raw;
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
    // Dates written the way read_note prints them: 📅 2026-10-25 ⏰ 2026-10-30
    let scheduled: string | null = null;
    let deadline: string | null = null;
    const last = inl[inl.length - 1];
    if (last && "text" in last) {
      let t = last.text;
      t = t.replace(/\s*⏰\s*(\d{4}-\d{2}-\d{2})\s*$/u, (_, d: string) => ((deadline = d), ""));
      t = t.replace(/\s*📅\s*(\d{4}-\d{2}-\d{2})\s*$/u, (_, d: string) => ((scheduled = d), ""));
      t = t.replace(/\s*⏰\s*(\d{4}-\d{2}-\d{2})\s*$/u, (_, d: string) => ((deadline = d), ""));
      inl[inl.length - 1] = { ...last, text: t };
    }
    first.inline = inl.filter((i) => !("text" in i) || i.text.length > 0);
    return {
      type: "taskItem",
      attrs: { state, scheduled, deadline, completedAt: null },
      children,
    };
  }

  private table(node: Mdast.Table): BlockSpec {
    return {
      type: "table",
      attrs: {},
      children: node.children.map((row, r) => ({
        type: "tableRow",
        attrs: {},
        children: row.children.map((cell) => ({
          type: r === 0 ? "tableHeader" : "tableCell",
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          children: [{ type: "paragraph", attrs: {}, inline: this.inline(cell.children) }],
        })),
      })),
    };
  }

  inline(nodes: Mdast.PhrasingContent[], marks: Record<string, unknown> = {}): InlineSpec[] {
    const out: InlineSpec[] = [];
    for (const n of nodes) {
      switch (n.type) {
        case "text":
          out.push(...this.text(n.value, marks));
          break;
        case "strong":
          out.push(...this.inline(n.children, { ...marks, bold: true }));
          break;
        case "emphasis":
          out.push(...this.inline(n.children, { ...marks, italic: true }));
          break;
        case "delete":
          out.push(...this.inline(n.children, { ...marks, strike: true }));
          break;
        case "inlineCode":
          out.push({ text: n.value, marks: { ...marks, code: true } });
          break;
        case "break":
          out.push({ atom: "hardBreak", attrs: {} });
          break;
        case "link": {
          const m = /^note:([0-9a-f-]{36})$/.exec(n.url);
          if (m) {
            const label = n.children.map((c) => ("value" in c ? c.value : "")).join("");
            out.push({ atom: "noteLink", attrs: { noteId: m[1]!, label } });
          } else out.push(...this.inline(n.children, { ...marks, link: { href: n.url } }));
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
    return mergeUnderline(out);
  }

  /** Splits text into runs, turning `[[Title]]`, `==highlight==` and `#tag` into nodes/marks. */
  private text(value: string, marks: Record<string, unknown>): InlineSpec[] {
    const out: InlineSpec[] = [];
    const re = /\[\[([^\]\n]+)\]\]|==([^=\n]+)==|(^|[\s(])#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;
    let last = 0;
    for (let m = re.exec(value); m; m = re.exec(value)) {
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
    if (underline && "text" in it) out.push({ text: it.text, marks: { ...it.marks, underline: true } });
    else out.push(it);
  }
  return out;
}
