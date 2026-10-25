// Note → Markdown export (Obsidian-flavoured: [[links]], #tags, callouts,
// Tasks-plugin dates). Handwriting is exported as placeholder links.
import type * as Y from "yjs";
import type { PMMark, PMNode } from "../contracts/document.js";
import { noteRoots } from "./factories.js";
import { yFragmentToPM } from "./yjs.js";

export interface MarkdownOptions {
  /** URL of an attachment (image/file). Default `attachment:<id>`. */
  attachmentUrl?: (attachmentId: string) => string;
  /** Link of a rendered handwriting placeholder for a block. Default `handwriting:<blockId>`. */
  handwritingUrl?: (blockId: string) => string;
  /** Title for `[[...]]` of a linked note; default the link label or `note:<id>`. */
  noteTitle?: (noteId: string) => string | null;
  /** blockIds that carry margin strokes (anchorKind "block"); a placeholder follows each. */
  blocksWithHandwriting?: ReadonlySet<string>;
}

interface Ctx {
  opts: Required<Omit<MarkdownOptions, "noteTitle" | "blocksWithHandwriting">> & MarkdownOptions;
}

const CALLOUT_KIND: Record<string, string> = {
  note: "note",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

/** Export a note document to Markdown. */
export function noteToMarkdown(doc: Y.Doc, options: MarkdownOptions = {}): string {
  return pmDocToMarkdown(yFragmentToPM(noteRoots(doc).content), options);
}

/** Export ProseMirror-style JSON (`{ type: "doc", content }`) to Markdown. */
export function pmDocToMarkdown(root: PMNode, options: MarkdownOptions = {}): string {
  const ctx: Ctx = {
    opts: {
      attachmentUrl: (id) => `attachment:${id}`,
      handwritingUrl: (id) => `handwriting:${id}`,
      ...options,
    },
  };
  const blocks = (root.content ?? []).map((n) => block(n, ctx)).filter((s) => s !== null);
  return (
    blocks
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}

function attr<T = string>(node: PMNode, key: string): T | null {
  const v = node.attrs?.[key];
  return v === undefined || v === null ? null : (v as T);
}

function prefixLines(text: string, first: string, rest: string = first): string {
  return text
    .split("\n")
    .map((line, i) => (i === 0 ? first : rest) + line)
    .join("\n")
    .replace(/[ \t]+$/gm, "");
}

function children(node: PMNode, ctx: Ctx, sep = "\n\n"): string {
  return (node.content ?? [])
    .map((n) => block(n, ctx))
    .filter((s) => s !== null)
    .join(sep);
}

function withHandwriting(node: PMNode, md: string, ctx: Ctx): string {
  const id = attr(node, "blockId");
  if (id && ctx.opts.blocksWithHandwriting?.has(id)) {
    return `${md}\n\n![Рукописная заметка](${ctx.opts.handwritingUrl(id)})`;
  }
  return md;
}

function block(node: PMNode, ctx: Ctx): string | null {
  const md = blockBody(node, ctx);
  return md === null ? null : withHandwriting(node, md, ctx);
}

function blockBody(node: PMNode, ctx: Ctx): string | null {
  switch (node.type) {
    case "title": {
      const t = inline(node.content, ctx);
      return t ? `# ${t}` : null;
    }
    case "paragraph":
      return escapeBlockStart(inline(node.content, ctx));
    case "heading": {
      // The title is the only H1; heading levels 1–3 become ##–####.
      const level = Math.min(Math.max(Number(attr<number>(node, "level") ?? 1), 1), 3);
      return `${"#".repeat(level + 1)} ${inline(node.content, ctx)}`;
    }
    case "bulletList":
      return listItems(node, ctx, () => "- ");
    case "orderedList": {
      const start = Number(attr<number>(node, "start") ?? 1);
      return listItems(node, ctx, (i) => `${start + i}. `);
    }
    case "taskList":
      return listItems(node, ctx, (_, item) => {
        const state = attr(item, "state");
        return `- [${state === "done" ? "x" : state === "cancelled" ? "-" : " "}] `;
      });
    case "listItem":
    case "taskItem":
      return children(node, ctx);
    case "blockquote":
      return prefixLines(children(node, ctx), "> ");
    case "callout": {
      const kind = CALLOUT_KIND[attr(node, "tone") ?? "note"] ?? "note";
      const emoji = attr(node, "emoji");
      const head = `[!${kind}]${emoji ? ` ${emoji}` : ""}`;
      const body = children(node, ctx);
      return prefixLines(body ? `${head}\n${body}` : head, "> ");
    }
    case "codeBlock": {
      const text = plain(node.content);
      const fence = text.includes("```") ? "````" : "```";
      return `${fence}${attr(node, "language") ?? ""}\n${text}\n${fence}`;
    }
    case "mathBlock":
      return `$$\n${attr(node, "latex") ?? ""}\n$$`;
    case "mermaid":
      return "```mermaid\n" + (attr(node, "source") ?? "") + "\n```";
    case "horizontalRule":
      return "---";
    case "table":
      return table(node, ctx);
    case "image": {
      const id = attr(node, "attachmentId");
      const alt = escapeText(attr(node, "alt") ?? "");
      const img = id ? `![${alt}](${ctx.opts.attachmentUrl(id)})` : "";
      const caption = attr(node, "caption");
      return caption ? `${img}\n*${escapeText(caption)}*` : img;
    }
    case "file": {
      const id = attr(node, "attachmentId");
      const name = escapeText(attr(node, "name") ?? "file");
      return id ? `[${name}](${ctx.opts.attachmentUrl(id)})` : name;
    }
    case "drawing": {
      const id = attr(node, "blockId");
      return id ? `![Рисунок](${ctx.opts.handwritingUrl(id)})` : null;
    }
    case "pageCard": {
      const id = attr(node, "noteId");
      return id ? `[[${ctx.opts.noteTitle?.(id) ?? `note:${id}`}]]` : null;
    }
    default: {
      // Unknown node: keep any text it contains, mark it in a comment.
      const body = node.content?.some((c) => c.type === "text" || isInline(c))
        ? inline(node.content, ctx)
        : children(node, ctx);
      return body ? `<!-- ${node.type} -->\n${body}` : `<!-- ${node.type} -->`;
    }
  }
}

function isInline(n: PMNode): boolean {
  return (
    n.type === "noteLink" || n.type === "tag" || n.type === "hardBreak" || n.type === "mention"
  );
}

function listItems(node: PMNode, ctx: Ctx, marker: (i: number, item: PMNode) => string): string {
  return (node.content ?? [])
    .map((item, i) => {
      const m = marker(i, item);
      let body = children(item, ctx, "\n");
      if (item.type === "taskItem") {
        const dates: string[] = [];
        const scheduled = attr(item, "scheduled");
        const deadline = attr(item, "deadline");
        if (scheduled) dates.push(`⏳ ${scheduled}`);
        if (deadline) dates.push(`📅 ${deadline}`);
        if (dates.length > 0) {
          const nl = body.indexOf("\n");
          body =
            nl < 0
              ? `${body} ${dates.join(" ")}`
              : `${body.slice(0, nl)} ${dates.join(" ")}${body.slice(nl)}`;
        }
      }
      return prefixLines(body, m, " ".repeat(m.length));
    })
    .join("\n");
}

function table(node: PMNode, ctx: Ctx): string {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .map((p) => (p.type === "paragraph" ? inline(p.content, ctx) : (block(p, ctx) ?? "")))
        .join("<br>")
        .replace(/\|/g, "\\|")
        .replace(/\n/g, "<br>"),
    ),
  );
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length), 1);
  const line = (cells: string[]) =>
    `| ${Array.from({ length: width }, (_, i) => cells[i] ?? "").join(" | ")} |`;
  return [line(rows[0]!), line(Array(width).fill("---")), ...rows.slice(1).map(line)].join("\n");
}

function plain(content: PMNode[] | undefined): string {
  return (content ?? [])
    .map((n) => (n.type === "text" ? (n.text ?? "") : n.type === "hardBreak" ? "\n" : ""))
    .join("");
}

// ---------------------------------------------------------------------------
// Inline content with properly nested marks
// ---------------------------------------------------------------------------

const MARK_ORDER = ["link", "bold", "italic", "strike", "underline", "highlight", "code"];

function markKey(m: PMMark): string {
  return m.type === "link" ? `link:${String(m.attrs?.href ?? "")}` : m.type;
}

function open(m: PMMark): string {
  switch (m.type) {
    case "bold":
      return "**";
    case "italic":
      return "*";
    case "strike":
      return "~~";
    case "underline":
      return "<u>";
    case "highlight":
      return "==";
    case "code":
      return "`";
    case "link":
      return "[";
    default:
      return "";
  }
}

function close(m: PMMark): string {
  switch (m.type) {
    case "underline":
      return "</u>";
    case "link":
      return `](${String(m.attrs?.href ?? "")})`;
    default:
      return open(m);
  }
}

function rendered(marks: PMMark[] | undefined): PMMark[] {
  return (marks ?? [])
    .filter((m) => MARK_ORDER.includes(m.type))
    .sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type));
}

function inline(content: PMNode[] | undefined, ctx: Ctx): string {
  let out = "";
  let stack: PMMark[] = [];
  const closeTo = (depth: number) => {
    while (stack.length > depth) out += close(stack.pop()!);
  };
  for (const node of content ?? []) {
    const marks = node.type === "text" ? rendered(node.marks) : [];
    const keys = marks.map(markKey);
    // Keep the longest prefix of open marks that the next run also has.
    let keep = 0;
    while (keep < stack.length && keys.includes(markKey(stack[keep]!))) keep++;
    closeTo(keep);
    for (const m of marks) {
      if (!stack.some((s) => markKey(s) === markKey(m))) {
        out += open(m);
        stack = [...stack, m];
      }
    }
    const inCode = stack.some((m) => m.type === "code");
    switch (node.type) {
      case "text":
        out += inCode ? (node.text ?? "") : escapeText(node.text ?? "");
        break;
      case "noteLink": {
        const id = attr(node, "noteId");
        const label =
          attr(node, "label") ?? (id ? ctx.opts.noteTitle?.(id) : null) ?? `note:${id ?? ""}`;
        out += `[[${label}]]`;
        break;
      }
      case "tag":
        out += `#${attr(node, "name") ?? ""}`;
        break;
      case "hardBreak":
        out += "\\\n";
        break;
      case "mention":
        out += String(attr(node, "label") ?? "");
        break;
      default:
        break;
    }
  }
  closeTo(0);
  return out;
}

function escapeText(text: string): string {
  return text.replace(/([\\`*_[\]<>~=#])/g, "\\$1");
}

/** Escape characters that would turn a paragraph into another block. */
function escapeBlockStart(text: string): string {
  return text.replace(
    /^(\s*)([-+]|\d+[.)])(\s)/gm,
    (_, s: string, m: string, sp: string) => `${s}${m.replace(/([-+.)])/, "\\$1")}${sp}`,
  );
}
