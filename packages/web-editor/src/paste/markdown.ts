// Plain text that reads as Markdown is pasted as Markdown: it goes through the same HTML path as a
// rich paste (normalize.ts), so both map to blocks the same way. The Markdown rules are the agents'
// importer's (packages/agents/src/doc/markdown-import.ts, also the iOS editor's): a line break is a
// hard break, `==x==` a highlight, `#tag` a tag, `- [-]` a cancelled task, `⏳`/`📅` dates on tasks,
// `> [!tone]` a callout, `$$…$$` and ```math a formula, ```mermaid a diagram. `[[Title]]` stays text
// (the editor links it on tap).
import { Marked, type TokenizerAndRendererExtension } from "marked";

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** `#tag` after the start of a text run, whitespace or `(` (an escaped `\#` stays text). */
const tag: TokenizerAndRendererExtension = {
  name: "dsTag",
  level: "inline",
  start(src) {
    const m = /(^|[\s(])#[\p{L}\p{N}_]/u.exec(src);
    return m ? m.index + m[1]!.length : undefined;
  },
  tokenizer(src) {
    const m = /^#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/u.exec(src);
    return m ? { type: "dsTag", raw: m[0], name: m[1] } : undefined;
  },
  renderer: (t) => `<span data-type="tag" data-name="${escapeAttr(t.name as string)}">#${escapeAttr(t.name as string)}</span>`,
};

/** `==highlight==` (not inside code: marked never runs inline extensions there). */
const highlight: TokenizerAndRendererExtension = {
  name: "dsHighlight",
  level: "inline",
  start(src) {
    const i = src.indexOf("==");
    return i >= 0 ? i : undefined;
  },
  tokenizer(src) {
    const m = /^==([^=\n]+)==(?!=)/.exec(src);
    return m ? { type: "dsHighlight", raw: m[0], tokens: this.lexer.inlineTokens(m[1]!) } : undefined;
  },
  renderer(t) {
    return `<mark>${this.parser.parseInline(t.tokens!)}</mark>`;
  },
};

/** A paragraph that is `$$…$$` is a formula, taken verbatim. */
const mathBlock: TokenizerAndRendererExtension = {
  name: "dsMathBlock",
  level: "block",
  start(src) {
    const m = /(^|\n)\$\$/.exec(src);
    return m ? m.index + m[1]!.length : undefined;
  },
  tokenizer(src) {
    const m = /^\$\$([\s\S]*?)\$\$[ \t]*(?:\n+|$)/.exec(src);
    return m ? { type: "dsMathBlock", raw: m[0], latex: m[1]!.trim() } : undefined;
  },
  renderer: (t) => `<div data-type="mathBlock" data-latex="${escapeAttr(t.latex as string)}"></div>`,
};

/** Inline `$…$` stays verbatim text (no emphasis, tags or highlights inside the formula). */
const inlineMath: TokenizerAndRendererExtension = {
  name: "dsInlineMath",
  level: "inline",
  start(src) {
    const i = src.indexOf("$");
    return i >= 0 ? i : undefined;
  },
  tokenizer(src) {
    const m = /^(?:\$\$[^$]+?\$\$|\$(?=[^\s$])[^$\n]*?[^\s$\\]\$|\$[^\s$]\$)/.exec(src);
    return m ? { type: "dsInlineMath", raw: m[0] } : undefined;
  },
  renderer: (t) => escapeAttr(t.raw).replace(/>/g, "&gt;"),
};

const marked = new Marked({
  gfm: true,
  breaks: true,
  async: false,
  extensions: [inlineMath, tag, highlight, mathBlock],
  renderer: {
    code({ text, lang }) {
      const l = (lang ?? "").trim().toLowerCase();
      if (l === "mermaid") return `<div data-type="mermaid" data-source="${escapeAttr(text)}"></div>`;
      if (l === "math" || l === "latex" || l === "tex") return `<div data-type="mathBlock" data-latex="${escapeAttr(text)}"></div>`;
      return false;
    },
  },
});

const CALLOUT_RE = /^\[!([a-z]+)\][+-]?[ \t]*([^\s]+)?[ \t]*/i;
const CALLOUT_TONE: Record<string, string> = {
  note: "note", info: "info", success: "success", warning: "warning", danger: "danger",
  tip: "success", hint: "success", check: "success", done: "success",
  important: "info", abstract: "info", summary: "info", tldr: "info", todo: "info", question: "info", help: "info", faq: "info",
  caution: "warning", attention: "warning",
  error: "danger", failure: "danger", fail: "danger", missing: "danger", bug: "danger",
};

/** First text node of an element (depth-first), skipping nothing. */
function firstText(el: Node): Text | null {
  for (let n = el.firstChild; n; n = n.firstChild) if (n.nodeType === Node.TEXT_NODE) return n as Text;
  return null;
}

function lastText(el: Node): Text | null {
  for (let n = el.lastChild; n; n = n.lastChild) if (n.nodeType === Node.TEXT_NODE) return n as Text;
  return null;
}

/** Callouts, cancelled tasks and task dates: what plain GFM has no syntax for. */
function obsidianBlocks(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const quote of Array.from(doc.querySelectorAll("blockquote"))) {
    const p = quote.firstElementChild;
    const t = p?.tagName === "P" ? p.firstChild : null;
    if (!t || t.nodeType !== Node.TEXT_NODE) continue;
    const m = CALLOUT_RE.exec(t.textContent!);
    if (!m) continue;
    const aside = doc.createElement("aside");
    aside.setAttribute("data-type", "callout");
    aside.setAttribute("data-tone", CALLOUT_TONE[m[1]!.toLowerCase()] ?? "note");
    const emoji = m[2] && /\p{Extended_Pictographic}/u.test(m[2]) ? m[2] : null;
    if (emoji) aside.setAttribute("data-emoji", emoji);
    t.textContent = (m[2] && !emoji ? m[2] + " " : "") + t.textContent!.slice(m[0].length);
    if (!t.textContent!.trim()) {
      const next = t.nextSibling;
      t.remove();
      if (next?.nodeName === "BR") next.remove();
    }
    if (!(p!.textContent ?? "").trim() && !p!.querySelector("img, span[data-type]")) p!.remove();
    aside.append(...Array.from(quote.childNodes));
    quote.replaceWith(aside);
  }
  for (const li of Array.from(doc.querySelectorAll("li"))) {
    const head = firstText(li);
    if (head && !li.querySelector(':scope > input, :scope > p > input') && /^\[-\]\s/.test(head.textContent!)) {
      head.textContent = head.textContent!.replace(/^\[-\]\s/, "");
      const box = doc.createElement("input");
      box.type = "checkbox";
      box.setAttribute("data-state", "cancelled");
      head.before(box);
    }
    if (!li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]')) continue;
    // ⏳ scheduled, 📅 deadline at the end of the item's own text (any order).
    const own = li.querySelector(":scope > p") ?? li;
    const tail = lastText(own.lastChild?.nodeName === "UL" || own.lastChild?.nodeName === "OL" ? (own.lastChild.previousSibling ?? own) : own);
    if (!tail) continue;
    let text = tail.textContent!;
    for (let m = /\s*(⏳|📅)\s*(\d{4}-\d{2}-\d{2})\s*$/u.exec(text); m; m = /\s*(⏳|📅)\s*(\d{4}-\d{2}-\d{2})\s*$/u.exec(text)) {
      li.setAttribute(m[1] === "⏳" ? "data-scheduled" : "data-deadline", m[2]!);
      text = text.slice(0, m.index);
    }
    tail.textContent = text;
  }
  return doc.body.innerHTML;
}

/** Markdown → HTML for normalizePastedHtml (the agents' Markdown rules, see above). */
export function markdownToHtml(text: string): string {
  return obsidianBlocks(marked.parse(text) as string);
}
