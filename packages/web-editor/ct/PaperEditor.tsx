import { useMemo } from "react";
import * as Y from "yjs";
import { DatascratchEditor, setNoteStyle, type EditorApi } from "../src";

declare global {
  interface Window {
    __paper?: { api: EditorApi; ready: boolean };
  }
}

const CONTENT = `<h1 data-type=title>Ruled paper</h1>
<p>First paragraph of body text that is long enough to wrap onto a second line in a normal column width, so wrapped lines are checked too.</p>
<p>Second paragraph.</p>
<h2>Heading two</h2>
<p>Text under a heading.</p>
<h3>Heading three</h3>
<ul data-type="taskList"><li data-type="taskItem" data-state="open"><p>A task</p></li><li data-type="taskItem" data-state="done"><p>Another task</p></li></ul>
<blockquote><p>A quote that sits on the rules.</p></blockquote>
<ul><li><p>Bullet one</p></li><li><p>Bullet two</p></li></ul>
<aside data-type="callout" data-tone="info"><p>Callout text.</p></aside>
<pre><code>const x = 1;
const y = 2;</code></pre>
<div data-type="mathBlock" data-latex="\\int_0^1 x^2 dx"></div>
<p>After the formula.</p>
<table><tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></table>
<p>After the table.</p>
<div data-type="drawing" data-height="130"></div>
<p>Last paragraph.</p>`;

/** What users actually write (the welcome note and beyond): inline chips and nested blocks. */
const RICH = `<h1 data-type=title>Добро пожаловать</h1>
<p>Это ваш первый документ. Пишите, ставьте задачи с [ ] и рисуйте прямо поверх текста, — абзац переносится на вторую строку.</p>
<p>Теги <span data-type="tag" data-name="работа">#работа</span> и <span data-type="tag" data-name="идеи">#идеи</span> в строке текста, которая тоже переносится на следующую строку колонки.</p>
<p>Ссылка <span data-type="noteLink" data-note-id="0192f3c4-0000-7000-8000-000000000001" data-label="Другая заметка">Другая заметка</span>, <code>инлайн-код</code>, <strong>жирный</strong>, <em>курсив</em>, <mark>маркер</mark>, <a href="https://example.com">ссылка</a>.</p>
<p>Строчная формула $x^2 + y^2$ и дробь $\\frac{a}{b}$ в тексте.</p>
<h2>Заголовок с тегом <span data-type="tag" data-name="план">#план</span></h2>
<p>Текст под заголовком.</p>
<h3>Заголовок три с <code>кодом</code></h3>
<ul data-type="taskList"><li data-type="taskItem" data-state="open" data-scheduled="2026-10-27"><p>Задача с датой и тегом <span data-type="tag" data-name="дом">#дом</span></p></li><li data-type="taskItem" data-state="done" data-deadline="2026-10-20"><p>Сделанная задача с дедлайном</p></li><li data-type="taskItem" data-state="open"><p>Длинная задача, которая не помещается в одну строку и переносится на следующую строку колонки текста.</p></li></ul>
<blockquote><p>Цитата из двух абзацев, первый достаточно длинный, чтобы перенестись на вторую строку колонки.</p><p>Второй абзац цитаты с тегом <span data-type="tag" data-name="мысли">#мысли</span>.</p><h3>Заголовок в цитате</h3><p>И ещё абзац.</p></blockquote>
<ul><li><p>Пункт списка</p><ul><li><p>Вложенный пункт с <code>кодом</code></p></li></ul></li><li><p>Второй пункт</p></li></ul>
<ol><li><p>Первый</p></li><li><p>Второй с <span data-type="tag" data-name="тег">#тег</span></p></li></ol>
<aside data-type="callout" data-tone="info"><p>Выноска из двух абзацев.</p><p>Второй абзац выноски.</p></aside>
<p>Последний абзац.</p>`;

export function PaperEditor({ paper, font, width, content = "basic" }: { paper: "lines" | "grid" | "dots" | "plain"; font: "serif" | "sans" | "mono"; width: number; content?: "basic" | "rich" }) {
  const doc = useMemo(() => {
    const d = new Y.Doc();
    setNoteStyle(d, { paper, font });
    return d;
  }, [paper, font]);
  return (
    <div style={{ width, margin: "0 auto" }}>
      <DatascratchEditor
        doc={doc}
        showPalette={false}
        bottomPadding={40}
        onReady={(api) =>
          setTimeout(() => {
            if (api.editor.isDestroyed) return;
            if (doc.getXmlFragment("content").length === 0) api.editor.commands.setContent(content === "rich" ? RICH : CONTENT);
            window.__paper = { api, ready: true };
          }, 0)
        }
      />
    </div>
  );
}
