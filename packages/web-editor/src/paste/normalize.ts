// Rich paste (spec/04 «Вставка»): HTML from web pages, Google Docs, Word, Apple Notes and Notion is
// tidied into what the schema parses — headings, marks, links, code, nested lists, task lists,
// quotes, code blocks, tables with cell alignment, rules — and images become upload placeholders.
// Fonts, colours, sizes and other styling are dropped quietly (the schema has no rule for them).
// The block mapping is the same as the iOS editor's (DSEditorModel paste).
import { Fragment, Slice, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import { uuidv7 } from "@datascratch/shared/ids";

/** A pasted image waiting to become an attachment: `src` is a data: or http(s) URL. */
export interface PastedImage {
  src: string;
  alt: string;
}

const ALIGNS = new Set(["center", "right"]);

/** At most this many images of one paste become attachments; the rest are dropped. */
export const MAX_PASTED_IMAGES = 50;
/** A data: image larger than this (decoded) is dropped. */
export const MAX_DATA_IMAGE_BYTES = 20 * 1024 * 1024;

/** Decoded size of a data: URL without decoding it. */
export function dataUrlBytes(src: string): number {
  const comma = src.indexOf(",");
  const body = comma < 0 ? "" : src.slice(comma + 1);
  return /;base64/i.test(src.slice(0, Math.max(comma, 0))) ? Math.floor((body.replace(/=+$/, "").length * 3) / 4) : body.length;
}

function unwrap(el: Element): void {
  el.replaceWith(...Array.from(el.childNodes));
}

function rename(el: Element, tag: string): Element {
  const next = el.ownerDocument.createElement(tag);
  for (const a of Array.from(el.attributes)) next.setAttribute(a.name, a.value);
  next.append(...Array.from(el.childNodes));
  el.replaceWith(next);
  return next;
}

function styleOf(el: Element): string {
  return (el.getAttribute("style") ?? "").toLowerCase();
}

/** Word lists: runs of paragraphs with `mso-list:lN levelM` become nested ul/ol. */
function wordLists(root: HTMLElement): void {
  const paras = Array.from(root.querySelectorAll("p")).filter((p) => /mso-list:\s*l\d+\s+level\d+/.test(styleOf(p)));
  if (!paras.length) return;
  const doc = root.ownerDocument;
  // Consecutive list paragraphs form one list.
  const runs: HTMLElement[][] = [];
  for (const p of paras) {
    const run = runs[runs.length - 1];
    if (run && p.previousElementSibling === run[run.length - 1]) run.push(p);
    else runs.push([p]);
  }
  for (const run of runs) {
    const stack: { level: number; list: HTMLElement }[] = [];
    const roots: HTMLElement[] = [];
    for (const p of run) {
      const level = Number(/level(\d+)/.exec(styleOf(p))![1]);
      // The marker Word writes before the text (a bullet glyph or "1.") tells the list type.
      const marker = p.querySelector('[style*="mso-list:ignore" i], [style*="mso-list: ignore" i]');
      const markerText = (marker?.textContent ?? "").replace(/\u00a0/g, " ").trim();
      marker?.remove();
      const ordered = /^[0-9a-zа-я]{1,3}[.)]$/i.test(markerText);
      while (stack.length && stack[stack.length - 1]!.level > level) stack.pop();
      let top = stack[stack.length - 1];
      if (!top || top.level < level) {
        const list = doc.createElement(ordered ? "ol" : "ul");
        if (top) (top.list.lastElementChild ?? top.list).append(list);
        else roots.push(list);
        top = { level, list };
        stack.push(top);
      }
      const li = doc.createElement("li");
      const content = doc.createElement("p");
      content.append(...Array.from(p.childNodes));
      li.append(content);
      top.list.append(li);
    }
    run[0]!.before(...roots);
    run.forEach((p) => p.remove());
  }
}

/** Lists: nested lists written as siblings of items (Google Docs) go into the previous item. */
function nestLists(root: HTMLElement): void {
  for (const list of Array.from(root.querySelectorAll("ul, ol"))) {
    for (const child of Array.from(list.children)) {
      if ((child.tagName === "UL" || child.tagName === "OL") && child.previousElementSibling?.tagName === "LI") {
        child.previousElementSibling.append(child);
      }
    }
  }
}

/** Lists whose every item starts with a check box (GitHub, Notion, Markdown `- [ ]`) become task lists. */
function taskLists(root: HTMLElement): void {
  const boxOf = (li: Element) =>
    li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"], :scope > label > input[type="checkbox"]') ?? li.querySelector(":scope > .checkbox, :scope > div > .checkbox");
  for (const list of Array.from(root.querySelectorAll("ul, ol"))) {
    const items = Array.from(list.children).filter((c) => c.tagName === "LI");
    if (!items.length || !items.every((li) => boxOf(li))) continue;
    for (const li of items) {
      const box = boxOf(li)!;
      const done = box instanceof HTMLInputElement ? box.hasAttribute("checked") || box.checked : /checkbox-on/.test(box.className);
      const state = box.getAttribute("data-state") ?? (done ? "done" : "open");
      box.remove();
      li.setAttribute("data-type", "taskItem");
      li.setAttribute("data-state", state);
    }
    (list.tagName === "OL" ? rename(list, "ul") : list).setAttribute("data-type", "taskList");
  }
}

/**
 * Column alignment lives on the cell (`align`), not on the paragraphs inside it. Left is the
 * default and dropped — except a Markdown `:---` column (`keepLeft`), which the agents' importer
 * keeps as `left`. Column widths of the source (px from Docs or Word) are dropped.
 */
function cellAlign(root: HTMLElement, keepLeft: boolean): void {
  root.querySelectorAll("colgroup, col").forEach((e) => e.remove());
  for (const cell of Array.from(root.querySelectorAll("td, th"))) {
    cell.removeAttribute("width");
    cell.removeAttribute("colwidth");
    cell.removeAttribute("data-colwidth");
    const own = (cell.getAttribute("align") ?? "").toLowerCase();
    let align = own || /text-align:\s*(\w+)/.exec(styleOf(cell))?.[1] || "";
    const paras = Array.from(cell.querySelectorAll("p, div"));
    if (!align && paras.length) {
      const aligns = paras.map((p) => (p.getAttribute("align") ?? "").toLowerCase() || /text-align:\s*(\w+)/.exec(styleOf(p))?.[1] || "");
      if (aligns.every((a) => a === aligns[0])) align = aligns[0]!;
    }
    for (const p of paras) {
      p.removeAttribute("align");
      p.setAttribute("style", styleOf(p).replace(/text-align:\s*\w+;?/g, ""));
    }
    if (ALIGNS.has(align) || (keepLeft && own === "left")) cell.setAttribute("align", align);
    else cell.removeAttribute("align");
    cell.setAttribute("style", styleOf(cell).replace(/text-align:\s*\w+;?/g, ""));
  }
}

const INLINE_WRAPPERS = new Set(["P", "SPAN", "A", "B", "I", "EM", "STRONG", "U", "S", "FONT", "PICTURE", "FIGURE", "H1", "H2", "H3", "H4", "H5", "H6"]);

/**
 * An image is a block: lift its placeholder out of paragraphs, spans and page figures, splitting
 * them around it (otherwise the browser's parser breaks the paragraph and leaves empty ones).
 */
function hoist(figure: Element): void {
  for (let parent = figure.parentElement; parent && INLINE_WRAPPERS.has(parent.tagName) && parent.tagName !== "BODY"; parent = figure.parentElement) {
    const before = parent.cloneNode(false) as Element;
    const after = parent.cloneNode(false) as Element;
    let seen = false;
    for (const child of Array.from(parent.childNodes)) {
      if (child === figure) seen = true;
      else (seen ? after : before).append(child);
    }
    const keep = (e: Element) => (e.textContent ?? "").trim() !== "" || e.querySelector("figure, img, br") !== null;
    parent.replaceWith(...[...(keep(before) ? [before] : []), figure, ...(keep(after) ? [after] : [])]);
  }
}

const BLOCK_TAGS = new Set(["ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "DL", "FIELDSET", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "UL"]);

const BLOCK_SELECTOR = [...BLOCK_TAGS].join(",").toLowerCase();
const isBlock = (n: Node) => n.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((n as Element).tagName);
const blank = (n: Node) => (n.nodeType === Node.TEXT_NODE && !(n.textContent ?? "").trim()) || n.nodeName === "BR";

/**
 * Lines that are not in a paragraph (Apple Notes' `<div>` per line, text and `<br>` between
 * blocks) become paragraphs; an empty line (`<div><br></div>`, a lone `<br>`) is dropped. Left to
 * ProseMirror, bare inline content at the top of the note would be wrapped in the note's first
 * text block type — the title.
 */
function looseLines(root: HTMLElement): void {
  for (const div of Array.from(root.querySelectorAll("div:not([data-type])")).reverse()) {
    if (Array.from(div.childNodes).some(isBlock)) continue;
    if (Array.from(div.childNodes).every(blank) && !div.querySelector("img, figure")) div.remove();
    else rename(div, "p");
  }
  const flush = (run: Node[]) => {
    // A wrapper around blocks (some apps put the whole selection in a <span>) is not a line.
    if (run.some((n) => n.nodeType === Node.ELEMENT_NODE && (n as Element).querySelector(BLOCK_SELECTOR))) return;
    if (run.every(blank)) return run.forEach((n) => n.nodeName === "BR" && n.parentNode?.removeChild(n));
    const p = root.ownerDocument.createElement("p");
    run[0]!.parentNode!.insertBefore(p, run[0]!);
    p.append(...run);
  };
  for (const container of [root, ...Array.from(root.querySelectorAll("div:not([data-type])"))]) {
    let run: Node[] = [];
    for (const child of Array.from(container.childNodes)) {
      if (isBlock(child) || child.nodeType === Node.COMMENT_NODE) {
        if (run.length) flush(run);
        run = [];
      } else run.push(child);
    }
    if (run.length) flush(run);
  }
}

/** A code block copied with its final line break does not end in an empty line. */
function trimCode(root: HTMLElement): void {
  for (const pre of Array.from(root.querySelectorAll("pre"))) {
    let last: Node | null = pre;
    while (last?.lastChild) last = last.lastChild;
    if (last?.nodeType === Node.TEXT_NODE) last.textContent = last.textContent!.replace(/\r?\n$/, "");
  }
}

/**
 * Tidies pasted HTML. Images with a data: or http(s) source become image placeholders with a fresh
 * blockId; their sources are returned for the upload (other sources — file:, cid: — cannot be read
 * and are dropped).
 */
export function normalizePastedHtml(html: string, opts: { markdown?: boolean } = {}): { html: string; images: Map<string, PastedImage> } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.body;
  const images = new Map<string, PastedImage>();

  // Noise: styles, scripts, Word's o:p, conditional comments, list markers. Active content and
  // event handlers never reach the editor (defence in depth: the app's CSP blocks them too).
  root.querySelectorAll("style, script, noscript, template, meta, link, base, title, xml, o\\:p, iframe, frame, frameset, object, embed, applet, svg, math, form, button, select, textarea").forEach((e) => e.remove());
  root.querySelectorAll("*").forEach((e) => {
    for (const a of Array.from(e.attributes)) if (/^on/i.test(a.name) || a.name === "srcdoc" || a.name === "formaction") e.removeAttribute(a.name);
  });
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) comments.push(n);
  wordLists(root);
  comments.forEach((c) => c.parentNode?.removeChild(c));
  root.querySelectorAll('[style*="mso-list:ignore" i], [style*="mso-list: ignore" i]').forEach((e) => e.remove());
  root.querySelectorAll("*").forEach((e) => {
    if (e.tagName.includes(":")) unwrap(e);
  });

  // Google Docs wraps everything in <b style="font-weight:normal" id="docs-internal-guid-…">.
  root.querySelectorAll('b[id^="docs-internal-guid"]').forEach(unwrap);
  // Our own title copied from another note is a heading here.
  root.querySelectorAll('h1[data-type="title"]').forEach((h) => h.removeAttribute("data-type"));
  // h4–h6 → h3 (the note has three heading levels).
  root.querySelectorAll("h4, h5, h6").forEach((h) => rename(h, "h3"));
  // Default alignment is noise (Google Docs writes text-align:left everywhere).
  root.querySelectorAll("[style]").forEach((e) => {
    const s = e.getAttribute("style")!;
    if (/text-align:\s*(left|start|justify)/i.test(s)) e.setAttribute("style", s.replace(/text-align:\s*(left|start|justify);?/gi, ""));
  });

  nestLists(root);
  taskLists(root);
  cellAlign(root, !!opts.markdown);
  trimCode(root);

  for (const img of Array.from(root.querySelectorAll("img"))) {
    const src = img.getAttribute("src") ?? "";
    if (img.closest('figure[data-type="image"]')) continue;
    const tooBig = /^data:/i.test(src) && dataUrlBytes(src) > MAX_DATA_IMAGE_BYTES;
    if (!/^(data:image\/|https?:)/i.test(src) || tooBig || images.size >= MAX_PASTED_IMAGES) {
      img.remove();
      continue;
    }
    const blockId = uuidv7();
    const alt = img.getAttribute("alt") ?? "";
    images.set(blockId, { src, alt });
    const figure = doc.createElement("figure");
    figure.setAttribute("data-type", "image");
    figure.setAttribute("data-block-id", blockId);
    if (alt) figure.setAttribute("alt", alt);
    // A page's <figure> caption becomes the image caption.
    const wrapper = img.closest("figure");
    const caption = wrapper?.querySelector("figcaption");
    if (caption?.textContent?.trim()) figure.setAttribute("data-caption", caption.textContent.trim());
    caption?.remove();
    // A link around a pasted image keeps the image, not an empty link.
    const link = img.closest("a");
    (link && link.textContent?.trim() === "" ? link : img).replaceWith(figure);
    hoist(figure);
  }
  looseLines(root);
  // Check boxes became tasks; any other input goes.
  root.querySelectorAll("input").forEach((e) => e.remove());
  return { html: root.innerHTML, images };
}

/** Plain text that reads as Markdown (headings, lists, quotes, fences, tables, emphasis, links). */
export function looksLikeMarkdown(text: string): boolean {
  if (/^(#{1,6}\s|\s*[-*+]\s+\S|\s*\d+[.)]\s+\S|>\s|```|\|.+\|\s*$)/m.test(text)) return true;
  return /(\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\([^)\s]+\)|`[^`\n]+`|~~[^~\n]+~~|!\[[^\]\n]*\]\([^)\s]+\))/.test(text);
}

/**
 * Safety net: a pasted slice never carries a title. Our own copied title arrives as a heading
 * (normalizePastedHtml); anything else that ProseMirror wrapped in the note's first text block type
 * is a plain paragraph.
 */
export function untitleSlice(slice: Slice, schema: Schema): Slice {
  const map = (fragment: Fragment): Fragment => {
    const nodes: PMNode[] = [];
    fragment.forEach((node) => {
      if (node.type.name === "title") nodes.push(schema.nodes.paragraph!.create(null, node.content, node.marks));
      else nodes.push(node.isLeaf ? node : node.copy(map(node.content)));
    });
    return Fragment.from(nodes);
  };
  let found = false;
  slice.content.descendants((n) => {
    if (n.type.name === "title") found = true;
    return !found;
  });
  return found ? new Slice(map(slice.content), slice.openStart, slice.openEnd) : slice;
}
