import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { DatascratchEditor, initNoteMeta, setNoteCover, setNoteStyle, useNoteMeta, type EditorApi, type EditorHost, type NoteSummary } from "../src";
import "@datascratch/ui/fonts.css";
import "@datascratch/ui/styles.css";
import { UIProvider } from "@datascratch/ui";
import "../src/styles/editor.css";
import "./demo.css";
import { SAMPLE_CONTENT } from "./sample";

// ---------- an in-memory "server": two replicas of one note, synced both ways ----------

function connect(a: Y.Doc, b: Y.Doc) {
  a.on("update", (u: Uint8Array, origin: unknown) => origin !== "remote" && Y.applyUpdate(b, u, "remote"));
  b.on("update", (u: Uint8Array, origin: unknown) => origin !== "remote" && Y.applyUpdate(a, u, "remote"));
}
function connectAwareness(a: Awareness, b: Awareness) {
  const relay = (from: Awareness, to: Awareness) => (changes: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (origin === "remote") return;
    const ids = [...changes.added, ...changes.updated, ...changes.removed];
    applyAwarenessUpdate(to, encodeAwarenessUpdate(from, ids), "remote");
  };
  a.on("update", relay(a, b));
  b.on("update", relay(b, a));
}

const docA = new Y.Doc();
const docB = new Y.Doc();
connect(docA, docB);
const awA = new Awareness(docA);
const awB = new Awareness(docB);
connectAwareness(awA, awB);
initNoteMeta(docA);

// ---------- a fake host: attachments as blob URLs, a few notes ----------

const attachments = new Map<string, string>();
const notes: NoteSummary[] = [
  { noteId: "note-ideas", title: "Идеи для книги", icon: "💡" },
  { noteId: "note-trip", title: "Поездка в Тбилиси", icon: "🧳" },
  { noteId: "note-reading", title: "Что почитать", icon: "📚" },
  { noteId: "note-meeting", title: "Встреча с командой", icon: "🗓" },
];

function gradientImage(seed: number): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 1600;
  c.height = 600;
  const ctx = c.getContext("2d")!;
  const palettes = [
    ["#F6D8B8", "#E8A87C", "#C38D9E"],
    ["#C9D6FF", "#E2E2E2", "#A1C4FD"],
    ["#D4FC79", "#96E6A1", "#84FAB0"],
    ["#FBC2EB", "#A6C1EE", "#FDCBF1"],
  ];
  const p = palettes[seed % palettes.length]!;
  const g = ctx.createLinearGradient(0, 0, 1600, 600);
  p.forEach((col, i) => g.addColorStop(i / (p.length - 1), col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1600, 600);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 1600, Math.random() * 600, 2, 2);
  }
  return new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9));
}

const host: EditorHost = {
  resolveAttachment: async (id) => attachments.get(id) ?? null,
  uploadAttachment: async (file) => {
    const id = `att-${Math.random().toString(36).slice(2, 10)}`;
    attachments.set(id, URL.createObjectURL(file));
    return { attachmentId: id, name: file.name, size: file.size, mime: file.type || "application/octet-stream" };
  },
  onOpenAttachment: (a) => {
    const url = attachments.get(a.attachmentId);
    if (url) window.open(url, "_blank");
  },
  resolveNote: async (id) => notes.find((n) => n.noteId === id) ?? null,
  onOpenNote: (id) => toast(`Открыть заметку «${notes.find((n) => n.noteId === id)?.title ?? id}»`),
  searchNotes: async (q) => notes.filter((n) => n.title.toLowerCase().includes(q.toLowerCase())),
  createNote: async (title) => {
    const n = { noteId: `note-${Math.random().toString(36).slice(2, 8)}`, title, icon: "📄" };
    notes.push(n);
    return n;
  },
  onTagClick: (name) => toast(`Тег #${name}`),
  onTaskAction: (action) => toast(action === "open" ? "Открыть документ задачи" : "Переместить задачу…"),
};

let toastTimer = 0;
function toast(text: string) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("is-visible"), 1800);
}

declare global {
  interface Window {
    __ds: { docA: Y.Doc; docB: Y.Doc; apiA: EditorApi | null; apiB: EditorApi | null; ready: boolean };
  }
}
window.__ds = { docA, docB, apiA: null, apiB: null, ready: false };

// ---------- the showcase ----------

function App() {
  const meta = useNoteMeta(docA);
  const [split, setSplit] = useState(false);
  const [width, setWidth] = useState(100);
  const seeded = useRef(false);
  const coverSeed = useRef(0);
  const userA = useMemo(() => ({ id: "u-anna", name: "Анна", color: "#2E5BDB" }), []);
  const userB = useMemo(() => ({ id: "u-boris", name: "Борис", color: "#C2477F" }), []);

  const onReadyA = (api: EditorApi) => {
    window.__ds.apiA = api;
    const params = new URLSearchParams(location.search);
    // y-prosemirror binds asynchronously; seed on the next tick (once, StrictMode mounts twice).
    setTimeout(() => {
      if (api.editor.isDestroyed) return;
      if (!seeded.current && docA.getXmlFragment("content").length === 0) {
        seeded.current = true;
        if (params.get("empty") !== null) api.editor.commands.setContent({ type: "doc", content: [{ type: "title" }, { type: "paragraph" }] });
        else api.editor.commands.setContent(SAMPLE_CONTENT);
        api.undoManager.clear();
      }
      window.__ds.ready = true;
    }, 0);
  };

  const pickCover = async () => {
    const blob = await gradientImage(coverSeed.current++);
    const id = `att-cover-${coverSeed.current}`;
    attachments.set(id, URL.createObjectURL(blob));
    setNoteCover(docA, { attachmentId: id, offsetY: 0.5 });
  };

  const agentEdit = () => {
    // An "agent" writes into replica B; the change arrives in A highlighted (D-10).
    const frag = docB.getXmlFragment("content");
    const p = new Y.XmlElement("paragraph");
    const t = new Y.XmlText();
    docB.transact(() => {
      frag.insert(Math.min(3, frag.length), [p]);
      p.insert(0, [t]);
      t.insert(0, "Агент добавил этот абзац: краткое резюме заметки — перо привязано к словам и переживает правки.", {
        agentEdit: { agentId: "agent-claude", at: new Date().toISOString() },
      });
    });
  };

  return (
    <div className="demo">
      <header className="demo-bar ds-glass">
        <strong className="demo-logo">Datascratch</strong>
        <span className="demo-sub">витрина редактора</span>
        <div className="demo-controls">
          <label>
            Шрифт
            <select value={meta.style.font} onChange={(e) => setNoteStyle(docA, { font: e.target.value as "serif" })}>
              <option value="serif">С засечками</option>
              <option value="sans">Без засечек</option>
              <option value="mono">Моно</option>
            </select>
          </label>
          <label>
            Бумага
            <select value={meta.style.paper} onChange={(e) => setNoteStyle(docA, { paper: e.target.value as "plain" })}>
              <option value="plain">Гладкая</option>
              <option value="dots">Точки</option>
              <option value="grid">Клетка</option>
              <option value="lines">Линейка</option>
            </select>
          </label>
          <label>
            Ширина
            <select value={meta.style.width} onChange={(e) => setNoteStyle(docA, { width: e.target.value as "normal" })}>
              <option value="normal">Обычная</option>
              <option value="wide">Широкая</option>
              <option value="full">Во всю ширину</option>
            </select>
          </label>
          <label title="Ширина окна редактора — проверка перекладки штрихов">
            Окно {width}%
            <input type="range" min={35} max={100} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
          <button type="button" onClick={pickCover}>
            Обложка
          </button>
          <button type="button" onClick={agentEdit}>
            Правка агента
          </button>
          <button type="button" className={split ? "is-on" : ""} onClick={() => setSplit((s) => !s)}>
            Соавтор
          </button>
        </div>
      </header>
      <main className={`demo-main${split ? " is-split" : ""}`}>
        <section className="demo-pane" style={{ width: split ? undefined : `${width}%` }} data-testid="pane-a">
          <DatascratchEditor doc={docA} awareness={awA} user={userA} host={host} onReady={onReadyA} onRequestCover={pickCover} />
        </section>
        {split && (
          <section className="demo-pane" data-testid="pane-b">
            <DatascratchEditor doc={docB} awareness={awB} user={userB} host={host} onReady={(api) => (window.__ds.apiB = api)} showPalette={false} />
          </section>
        )}
      </main>
      <div id="toast" className="demo-toast ds-glass" />
    </div>
  );
}

function Root() {
  useEffect(() => {
    document.title = "Datascratch — витрина редактора";
  }, []);
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UIProvider locale="ru" theme="system">
      <Root />
    </UIProvider>
  </StrictMode>,
);
