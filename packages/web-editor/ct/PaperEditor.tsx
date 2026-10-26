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

export function PaperEditor({ paper, font, width }: { paper: "lines" | "grid" | "dots" | "plain"; font: "serif" | "sans" | "mono"; width: number }) {
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
            if (doc.getXmlFragment("content").length === 0) api.editor.commands.setContent(CONTENT);
            window.__paper = { api, ready: true };
          }, 0)
        }
      />
    </div>
  );
}
