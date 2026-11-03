import { InputRule, Node, mergeAttributes, nodeInputRule, type Editor } from "@tiptap/core";
import { removeUpload, retryUpload, uploads, type UploadState } from "../uploads";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { NodeViewRendererProps } from "@tiptap/core";
import type { HostRef } from "../host";
import type { CalloutTone } from "@datascratch/shared/contracts";

export interface HostOptions {
  host: HostRef;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: { setCallout: (attrs?: { tone?: CalloutTone; emoji?: string | null }) => ReturnType; toggleCallout: () => ReturnType };
    mathBlock: { insertMathBlock: (latex?: string) => ReturnType };
    mermaid: { insertMermaid: (source?: string) => ReturnType };
    image: { insertImage: (attrs: { attachmentId: string; alt?: string | null; width?: number | null }) => ReturnType };
    file: { insertFile: (attrs: { attachmentId: string; name: string; size: number; mime: string }) => ReturnType };
    drawing: { insertDrawing: (height?: number) => ReturnType };
    pageCard: { insertPageCard: (noteId: string, style?: "card" | "link") => ReturnType };
  }
}

export const CALLOUT_TONES: { tone: CalloutTone; emoji: string; label: string }[] = [
  { tone: "note", emoji: "💡", label: "Заметка" },
  { tone: "info", emoji: "ℹ️", label: "Инфо" },
  { tone: "success", emoji: "✅", label: "Успех" },
  { tone: "warning", emoji: "⚠️", label: "Внимание" },
  { tone: "danger", emoji: "⛔", label: "Опасно" },
];

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      tone: { default: "note", parseHTML: (el) => el.getAttribute("data-tone") ?? "note" },
      emoji: { default: null, parseHTML: (el) => el.getAttribute("data-emoji") },
    };
  },
  parseHTML: () => [{ tag: "aside[data-type=callout]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "aside",
    mergeAttributes(HTMLAttributes, { "data-type": "callout", "data-tone": node.attrs.tone, "data-emoji": node.attrs.emoji, class: "ds-callout" }),
    0,
  ],
  addCommands() {
    return {
      setCallout:
        (attrs = {}) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { tone: attrs.tone ?? "note", emoji: attrs.emoji ?? null }),
      toggleCallout:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { tone: "note" }),
    };
  },
  addInputRules() {
    // "!> " at the start of a paragraph wraps it into a callout.
    return [
      new InputRule({
        find: /^!>\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).setCallout().run();
        },
      }),
    ];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let current = node;
      const dom = document.createElement("aside");
      dom.className = "ds-callout";
      dom.dataset.type = "callout";
      const icon = document.createElement("button");
      icon.type = "button";
      icon.contentEditable = "false";
      icon.className = "ds-callout-icon";
      const content = document.createElement("div");
      content.className = "ds-callout-content";
      dom.append(icon, content);
      const render = () => {
        dom.dataset.tone = current.attrs.tone;
        if (current.attrs.blockId) dom.dataset.blockId = current.attrs.blockId;
        const tone = CALLOUT_TONES.find((t) => t.tone === current.attrs.tone) ?? CALLOUT_TONES[0]!;
        icon.textContent = current.attrs.emoji ?? tone.emoji;
        icon.title = `${tone.label} — нажмите, чтобы сменить`;
      };
      render();
      icon.addEventListener("mousedown", (e) => e.preventDefault());
      icon.addEventListener("click", () => {
        const pos = getPos();
        if (typeof pos !== "number" || !editor.isEditable) return;
        const i = CALLOUT_TONES.findIndex((t) => t.tone === current.attrs.tone);
        const next = CALLOUT_TONES[(i + 1) % CALLOUT_TONES.length]!;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, tone: next.tone, emoji: null }));
      });
      return {
        dom,
        contentDOM: content,
        update: (n) => {
          if (n.type !== current.type) return false;
          current = n;
          render();
          return true;
        },
        stopEvent: (e) => e.target === icon,
        ignoreMutation: (m) => !content.contains(m.target),
      };
    };
  },
});

/** Shared node view for source-backed atoms (math, mermaid): rendered preview + inline source editor. */
function sourceAtomView(
  props: NodeViewRendererProps,
  attr: "latex" | "source",
  className: string,
  placeholder: string,
  renderPreview: (source: string, el: HTMLElement) => void | Promise<void>,
) {
  const { editor, getPos } = props;
  let current: PMNode = props.node;
  const dom = document.createElement("div");
  dom.className = `ds-atom ${className}`;
  dom.contentEditable = "false";
  const preview = document.createElement("div");
  preview.className = "ds-atom-preview";
  const editorEl = document.createElement("textarea");
  editorEl.className = "ds-atom-source";
  editorEl.placeholder = placeholder;
  editorEl.spellcheck = false;
  editorEl.hidden = true;
  dom.append(preview, editorEl);

  let lastRendered: string | null = null;
  const render = () => {
    const src = (current.attrs[attr] as string) ?? "";
    if (src === lastRendered) return;
    lastRendered = src;
    if (!src.trim()) {
      preview.textContent = placeholder;
      preview.classList.add("is-empty");
      return;
    }
    preview.classList.remove("is-empty");
    void renderPreview(src, preview);
  };
  render();

  const open = () => {
    if (!editor.isEditable) return;
    editorEl.hidden = false;
    editorEl.value = (current.attrs[attr] as string) ?? "";
    dom.classList.add("is-editing");
    requestAnimationFrame(() => {
      editorEl.focus();
      editorEl.style.height = "auto";
      editorEl.style.height = `${editorEl.scrollHeight}px`;
    });
  };
  const close = () => {
    editorEl.hidden = true;
    dom.classList.remove("is-editing");
  };
  preview.addEventListener("click", open);
  editorEl.addEventListener("input", () => {
    editorEl.style.height = "auto";
    editorEl.style.height = `${editorEl.scrollHeight}px`;
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, attr, editorEl.value));
  });
  editorEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      close();
      const pos = getPos();
      if (typeof pos === "number") editor.chain().focus().setTextSelection(pos + current.nodeSize).run();
    }
  });
  editorEl.addEventListener("blur", close);

  return {
    dom,
    update: (n: PMNode) => {
      if (n.type !== current.type) return false;
      current = n;
      render();
      return true;
    },
    selectNode: () => {
      dom.classList.add("is-selected");
    },
    deselectNode: () => {
      dom.classList.remove("is-selected");
    },
    stopEvent: (e: Event) => e.target === editorEl,
    ignoreMutation: () => true,
    open,
  };
}

let katexPromise: Promise<typeof import("katex")> | null = null;
export function loadKatex() {
  katexPromise ??= import("katex");
  return katexPromise;
}

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return { latex: { default: "", parseHTML: (el) => el.getAttribute("data-latex") ?? el.textContent ?? "" } };
  },
  parseHTML: () => [{ tag: "div[data-type=mathBlock]" }],
  renderHTML: ({ node, HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "mathBlock", "data-latex": node.attrs.latex }), node.attrs.latex],
  addCommands() {
    return {
      insertMathBlock:
        (latex = "") =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { latex } }),
    };
  },
  addInputRules() {
    return [nodeInputRule({ find: /^\$\$\s$/, type: this.type })];
  },
  addNodeView() {
    return (props) => {
      const view = sourceAtomView(props, "latex", "ds-math", "Формула LaTeX, например E = mc^2", async (src, el) => {
        const katex = (await loadKatex()).default;
        try {
          katex.render(src, el, { displayMode: true, throwOnError: false, output: "htmlAndMathml" });
        } catch (err) {
          el.textContent = String(err);
        }
      });
      if (!props.node.attrs.latex) queueMicrotask(view.open);
      return view;
    };
  },
});

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
let mermaidSeq = 0;
/** Mermaid is ~1 MB; it is loaded only when a diagram is first shown. */
export function loadMermaid() {
  mermaidPromise ??= import("mermaid").then((m) => {
    m.default.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral", fontFamily: "Inter, system-ui, sans-serif" });
    return m.default;
  });
  return mermaidPromise;
}

export const Mermaid = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return { source: { default: "", parseHTML: (el) => el.getAttribute("data-source") ?? el.textContent ?? "" } };
  },
  parseHTML: () => [{ tag: "div[data-type=mermaid]" }],
  renderHTML: ({ node, HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "mermaid", "data-source": node.attrs.source }), node.attrs.source],
  addCommands() {
    return {
      insertMermaid:
        (source = "graph TD\n  A[Идея] --> B[Заметка]") =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { source } }),
    };
  },
  addNodeView() {
    return (props) =>
      sourceAtomView(props, "source", "ds-mermaid", "Диаграмма Mermaid", async (src, el) => {
        el.classList.add("is-loading");
        try {
          const mermaid = await loadMermaid();
          const { svg } = await mermaid.render(`ds-mermaid-${++mermaidSeq}`, src);
          el.innerHTML = svg;
        } catch (err) {
          el.textContent = `Ошибка в диаграмме: ${(err as Error).message ?? err}`;
          el.classList.add("is-error");
        } finally {
          el.classList.remove("is-loading");
        }
      });
  },
});

function formatSize(size: number): string {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}


/**
 * The upload state of a placeholder block (uploads.ts): a quiet progress ring while the file is
 * being stored, «Повторить» / «Удалить» when it failed. Local to this client.
 */
function uploadOverlay(editor: Editor, blockId: () => string | null, onState: (state: UploadState | null) => void) {
  const el = document.createElement("div");
  el.className = "ds-upload";
  el.contentEditable = "false";
  el.hidden = true;
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  ring.setAttribute("viewBox", "0 0 24 24");
  ring.classList.add("ds-upload-ring");
  ring.innerHTML = '<circle cx="12" cy="12" r="9" class="ds-upload-track"/><circle cx="12" cy="12" r="9" class="ds-upload-bar" pathLength="100"/>';
  const failed = document.createElement("div");
  failed.className = "ds-upload-failed";
  const label = document.createElement("span");
  label.textContent = "Не удалось загрузить";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Повторить";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Удалить";
  failed.append(label, retry, remove);
  el.append(ring, failed);
  for (const b of [retry, remove]) b.addEventListener("mousedown", (e) => e.preventDefault());
  retry.addEventListener("click", () => {
    const id = blockId();
    if (id) retryUpload(id);
  });
  remove.addEventListener("click", () => {
    const id = blockId();
    if (id) removeUpload(editor, id);
  });
  let unsubscribe: (() => void) | null = null;
  let subscribed: string | null = null;
  const show = (state: UploadState | null) => {
    el.hidden = !state;
    el.dataset.status = state?.status ?? "";
    ring.classList.toggle("is-indeterminate", !!state && state.progress === null);
    const bar = ring.querySelector<SVGCircleElement>(".ds-upload-bar")!;
    bar.style.strokeDashoffset = String(100 - Math.round((state?.progress ?? 0.25) * 100));
    el.setAttribute("aria-label", state?.status === "failed" ? "Не удалось загрузить" : `Загрузка${state?.progress != null ? ` ${Math.round(state.progress * 100)}%` : ""}`);
    onState(state);
  };
  return {
    el,
    /** (Re)subscribes when the block id is known or changes. */
    sync() {
      const id = blockId();
      if (id === subscribed) return;
      unsubscribe?.();
      subscribed = id;
      unsubscribe = id ? uploads.subscribe(id, show) : null;
      show(id ? uploads.get(id) : null);
    },
    destroy() {
      unsubscribe?.();
    },
  };
}

export const Image = Node.create<HostOptions>({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addOptions: () => ({ host: { current: {} } }),
  addAttributes() {
    return {
      attachmentId: { default: null, parseHTML: (el) => el.getAttribute("data-attachment-id") },
      width: { default: null, parseHTML: (el) => Number(el.getAttribute("data-width")) || null },
      alt: { default: null, parseHTML: (el) => el.getAttribute("alt") },
      caption: { default: null, parseHTML: (el) => el.getAttribute("data-caption") },
    };
  },
  parseHTML: () => [{ tag: "figure[data-type=image]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "figure",
    mergeAttributes(HTMLAttributes, { "data-type": "image", "data-attachment-id": node.attrs.attachmentId, "data-width": node.attrs.width, "data-caption": node.attrs.caption }),
  ],
  addCommands() {
    return {
      insertImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
  addNodeView() {
    const host = this.options.host;
    return ({ node, getPos, editor }) => {
      let current = node;
      const dom = document.createElement("figure");
      dom.className = "ds-image";
      dom.contentEditable = "false";
      const frame = document.createElement("div");
      frame.className = "ds-image-frame";
      // The pen layer draws image strokes in coordinates of this element (strokes.md, anchorKind "image").
      frame.dataset.strokeSurface = "image";
      const img = document.createElement("img");
      img.draggable = false;
      const handle = document.createElement("span");
      handle.className = "ds-resize-handle";
      frame.append(img, handle);
      // Placeholder while the file is stored: local preview + progress ring / retry (uploads.ts).
      let uploading = false;
      const overlay = uploadOverlay(
        editor,
        () => current.attrs.blockId ?? null,
        (state) => {
          uploading = !!state;
          frame.classList.toggle("is-uploading", state?.status === "uploading");
          frame.classList.toggle("is-failed", state?.status === "failed");
          if (state?.previewUrl && !current.attrs.attachmentId) img.src = state.previewUrl;
        },
      );
      frame.append(overlay.el);
      const caption = document.createElement("input");
      caption.className = "ds-image-caption";
      caption.placeholder = "Подпись";
      dom.append(frame, caption);

      let resolvedFor: string | null = null;
      const render = () => {
        frame.dataset.blockId = current.attrs.blockId ?? "";
        dom.style.setProperty("--ds-image-width", current.attrs.width ? `${current.attrs.width * 100}%` : "100%");
        img.alt = current.attrs.alt ?? "";
        if (document.activeElement !== caption) caption.value = current.attrs.caption ?? "";
        caption.hidden = !editor.isEditable && !current.attrs.caption;
        overlay.sync();
        const id = current.attrs.attachmentId as string | null;
        frame.classList.toggle("is-empty", !id && !uploading);
        if (id && id !== resolvedFor) {
          resolvedFor = id;
          frame.classList.add("is-loading");
          void (host.current.resolveAttachment?.(id) ?? Promise.resolve(null)).then((url) => {
            if (resolvedFor !== id) return;
            frame.classList.remove("is-loading");
            if (url) img.src = url;
            else frame.classList.add("is-missing");
          });
        }
      };
      render();
      img.addEventListener("load", () => editor.view.dom.dispatchEvent(new CustomEvent("ds-layout", { bubbles: true })));

      caption.addEventListener("input", () => {
        const pos = getPos();
        if (typeof pos === "number") editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, "caption", caption.value || null));
      });
      handle.addEventListener("pointerdown", (e) => {
        if (!editor.isEditable) return;
        e.preventDefault();
        e.stopPropagation();
        const parentWidth = dom.getBoundingClientRect().width;
        const startX = e.clientX;
        const startWidth = frame.getBoundingClientRect().width;
        handle.setPointerCapture(e.pointerId);
        const move = (ev: PointerEvent) => {
          const w = Math.min(1, Math.max(0.15, (startWidth + ev.clientX - startX) / parentWidth));
          dom.style.setProperty("--ds-image-width", `${w * 100}%`);
        };
        const up = (ev: PointerEvent) => {
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", up);
          const w = Math.min(1, Math.max(0.15, (startWidth + ev.clientX - startX) / parentWidth));
          const pos = getPos();
          if (typeof pos === "number") editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, "width", Math.round(w * 1000) / 1000));
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up);
      });

      return {
        dom,
        update: (n) => {
          if (n.type !== current.type) return false;
          current = n;
          render();
          return true;
        },
        selectNode: () => dom.classList.add("is-selected"),
        deselectNode: () => dom.classList.remove("is-selected"),
        stopEvent: (e) => e.target === caption || e.target === handle || (e.target instanceof globalThis.Node && overlay.el.contains(e.target)),
        ignoreMutation: () => true,
        destroy: () => overlay.destroy(),
      };
    };
  },
});

export const FileBlock = Node.create<HostOptions>({
  name: "file",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addOptions: () => ({ host: { current: {} } }),
  addAttributes() {
    return {
      attachmentId: { default: null, parseHTML: (el) => el.getAttribute("data-attachment-id") },
      name: { default: "", parseHTML: (el) => el.getAttribute("data-name") ?? "" },
      size: { default: 0, parseHTML: (el) => Number(el.getAttribute("data-size")) || 0 },
      mime: { default: "application/octet-stream", parseHTML: (el) => el.getAttribute("data-mime") ?? "application/octet-stream" },
    };
  },
  parseHTML: () => [{ tag: "div[data-type=file]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-type": "file",
      "data-attachment-id": node.attrs.attachmentId,
      "data-name": node.attrs.name,
      "data-size": node.attrs.size,
      "data-mime": node.attrs.mime,
    }),
    node.attrs.name,
  ],
  addCommands() {
    return {
      insertFile:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
  addNodeView() {
    const host = this.options.host;
    return ({ node, editor }) => {
      let current = node;
      const dom = document.createElement("div");
      dom.className = "ds-file";
      dom.contentEditable = "false";
      const icon = document.createElement("span");
      icon.className = "ds-file-icon";
      const name = document.createElement("span");
      name.className = "ds-file-name";
      const meta = document.createElement("span");
      meta.className = "ds-file-meta";
      // Placeholder while the file is stored: progress ring / retry (uploads.ts).
      const overlay = uploadOverlay(
        editor,
        () => current.attrs.blockId ?? null,
        (state) => {
          dom.classList.toggle("is-uploading", state?.status === "uploading");
          dom.classList.toggle("is-failed", state?.status === "failed");
        },
      );
      dom.append(icon, name, meta, overlay.el);
      const render = () => {
        overlay.sync();
        const mime = String(current.attrs.mime);
        icon.textContent = mime === "application/pdf" ? "PDF" : (mime.split("/")[1] ?? "file").slice(0, 4).toUpperCase();
        name.textContent = current.attrs.name || "Файл";
        meta.textContent = formatSize(Number(current.attrs.size) || 0);
      };
      render();
      dom.addEventListener("dblclick", () => {
        if (current.attrs.attachmentId) host.current.onOpenAttachment?.({ attachmentId: current.attrs.attachmentId, name: current.attrs.name, mime: current.attrs.mime });
      });
      return {
        dom,
        update: (n) => {
          if (n.type !== current.type) return false;
          current = n;
          render();
          return true;
        },
        selectNode: () => dom.classList.add("is-selected"),
        deselectNode: () => dom.classList.remove("is-selected"),
        stopEvent: (e) => e.target instanceof globalThis.Node && overlay.el.contains(e.target),
        ignoreMutation: () => true,
        destroy: () => overlay.destroy(),
      };
    };
  },
});

/** Reference column width for `drawing.height` (pt at column width 1.0, see web-editor notes in spec/03). */
export const DRAWING_REFERENCE_WIDTH = 600;

export const Drawing = Node.create({
  name: "drawing",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { height: { default: 240, parseHTML: (el) => Number(el.getAttribute("data-height")) || 240 } };
  },
  parseHTML: () => [{ tag: "div[data-type=drawing]" }],
  renderHTML: ({ node, HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "drawing", "data-height": node.attrs.height })],
  addCommands() {
    return {
      insertDrawing:
        (height = 240) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { height } }),
    };
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let current = node;
      const dom = document.createElement("div");
      dom.className = "ds-drawing";
      dom.contentEditable = "false";
      dom.dataset.strokeSurface = "drawing";
      const handle = document.createElement("div");
      handle.className = "ds-drawing-handle";
      handle.title = "Потяните, чтобы изменить высоту";
      dom.append(handle);
      const render = () => {
        dom.dataset.blockId = current.attrs.blockId ?? "";
        // Height scales with the block width so drawings keep their proportions (points use width units).
        dom.style.setProperty("--ds-drawing-ratio", String(current.attrs.height / DRAWING_REFERENCE_WIDTH));
      };
      render();
      handle.addEventListener("pointerdown", (e) => {
        if (!editor.isEditable) return;
        e.preventDefault();
        e.stopPropagation();
        handle.setPointerCapture(e.pointerId);
        const width = dom.getBoundingClientRect().width;
        const startY = e.clientY;
        const startH = current.attrs.height as number;
        const scale = DRAWING_REFERENCE_WIDTH / width;
        const next = (ev: PointerEvent) => Math.max(80, Math.round(startH + (ev.clientY - startY) * scale));
        const move = (ev: PointerEvent) => dom.style.setProperty("--ds-drawing-ratio", String(next(ev) / DRAWING_REFERENCE_WIDTH));
        const up = (ev: PointerEvent) => {
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", up);
          const pos = getPos();
          if (typeof pos === "number") editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, "height", next(ev)));
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up);
      });
      return {
        dom,
        update: (n) => {
          if (n.type !== current.type) return false;
          current = n;
          render();
          return true;
        },
        selectNode: () => dom.classList.add("is-selected"),
        deselectNode: () => dom.classList.remove("is-selected"),
        stopEvent: (e) => e.target === handle,
        ignoreMutation: () => true,
      };
    };
  },
});

export const PageCard = Node.create<HostOptions>({
  name: "pageCard",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addOptions: () => ({ host: { current: {} } }),
  addAttributes() {
    return {
      noteId: { default: null, parseHTML: (el) => el.getAttribute("data-note-id") },
      style: { default: "card", parseHTML: (el) => el.getAttribute("data-style") ?? "card" },
    };
  },
  parseHTML: () => [{ tag: "div[data-type=pageCard]" }],
  renderHTML: ({ node, HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "pageCard", "data-note-id": node.attrs.noteId, "data-style": node.attrs.style })],
  addCommands() {
    return {
      insertPageCard:
        (noteId, style = "card") =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { noteId, style } }),
    };
  },
  addNodeView() {
    const host = this.options.host;
    return ({ node }) => {
      let current = node;
      const dom = document.createElement("div");
      dom.className = "ds-page-card";
      dom.contentEditable = "false";
      const cover = document.createElement("div");
      cover.className = "ds-page-card-cover";
      const icon = document.createElement("span");
      icon.className = "ds-page-card-icon";
      const title = document.createElement("span");
      title.className = "ds-page-card-title";
      const chevron = document.createElement("span");
      chevron.className = "ds-page-card-chevron";
      chevron.textContent = "›";
      dom.append(cover, icon, title, chevron);
      let loadedFor: string | null = null;
      const render = () => {
        dom.dataset.style = current.attrs.style;
        const id = current.attrs.noteId as string | null;
        if (id === loadedFor) return;
        loadedFor = id;
        title.textContent = "…";
        icon.textContent = "📄";
        if (!id) return;
        void (host.current.resolveNote?.(id) ?? Promise.resolve(null)).then((summary) => {
          if (loadedFor !== id) return;
          title.textContent = summary?.title || "Без названия";
          icon.textContent = summary?.icon ?? "📄";
          cover.style.backgroundImage = summary?.coverUrl ? `url("${summary.coverUrl}")` : "";
          cover.classList.toggle("has-cover", Boolean(summary?.coverUrl));
        });
      };
      render();
      dom.addEventListener("click", () => {
        if (current.attrs.noteId) host.current.onOpenNote?.(current.attrs.noteId);
      });
      return {
        dom,
        update: (n) => {
          if (n.type !== current.type) return false;
          current = n;
          render();
          return true;
        },
        selectNode: () => dom.classList.add("is-selected"),
        deselectNode: () => dom.classList.remove("is-selected"),
        ignoreMutation: () => true,
      };
    };
  },
});

export const NoteLink = Node.create<HostOptions>({
  name: "noteLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addOptions: () => ({ host: { current: {} } }),
  addAttributes() {
    return {
      noteId: { default: null, parseHTML: (el) => el.getAttribute("data-note-id") },
      label: { default: "", parseHTML: (el) => el.getAttribute("data-label") ?? el.textContent ?? "" },
    };
  },
  parseHTML: () => [{ tag: "span[data-type=noteLink]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "span",
    mergeAttributes(HTMLAttributes, { "data-type": "noteLink", "data-note-id": node.attrs.noteId, "data-label": node.attrs.label, class: "ds-note-link" }),
    node.attrs.label,
  ],
  renderText: ({ node }) => `[[${node.attrs.label}]]`,
  addNodeView() {
    const host = this.options.host;
    return ({ node }) => {
      let current = node;
      const dom = document.createElement("span");
      dom.className = "ds-note-link";
      dom.dataset.type = "noteLink";
      dom.contentEditable = "false";
      const render = () => {
        dom.textContent = current.attrs.label || "Без названия";
        dom.dataset.noteId = current.attrs.noteId ?? "";
      };
      render();
      // A link is an atom: a single click or tap opens the note (touch has no ⌘-click).
      dom.addEventListener("click", (e) => {
        e.preventDefault();
        if (current.attrs.noteId) host.current.onOpenNote?.(current.attrs.noteId);
      });
      return {
        dom,
        update: (n) => {
          if (n.type !== current.type) return false;
          current = n;
          render();
          return true;
        },
        ignoreMutation: () => true,
      };
    };
  },
});

export const TAG_PATTERN = /(?:^|\s)#([\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*)\s$/u;

export const Tag = Node.create<HostOptions>({
  name: "tag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addOptions: () => ({ host: { current: {} } }),
  addAttributes() {
    return { name: { default: "", parseHTML: (el) => el.getAttribute("data-name") ?? (el.textContent ?? "").replace(/^#/, "") } };
  },
  parseHTML: () => [{ tag: "span[data-type=tag]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "span",
    mergeAttributes(HTMLAttributes, { "data-type": "tag", "data-name": node.attrs.name, class: "ds-tag" }),
    `#${node.attrs.name}`,
  ],
  renderText: ({ node }) => `#${node.attrs.name}`,
  addInputRules() {
    return [
      new InputRule({
        find: TAG_PATTERN,
        handler: ({ state, range, match }) => {
          const name = match[1]!;
          const start = range.from + (match[0].startsWith("#") ? 0 : 1);
          const $start = state.doc.resolve(start);
          if ($start.parent.type.spec.code || $start.marks().some((m) => m.type.name === "code")) return null;
          state.tr.replaceWith(start, range.to, [this.type.create({ name }), state.schema.text(" ")]);
        },
      }),
    ];
  },
  addNodeView() {
    const host = this.options.host;
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.className = "ds-tag";
      dom.dataset.type = "tag";
      dom.contentEditable = "false";
      dom.textContent = `#${node.attrs.name}`;
      dom.addEventListener("click", (e) => {
        e.preventDefault();
        host.current.onTagClick?.(node.attrs.name);
      });
      return { dom, ignoreMutation: () => true };
    };
  },
});
