import { useMemo } from "react";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { absolutePositionToRelativePosition, ySyncPluginKey } from "y-prosemirror";
import { DatascratchEditor, type EditorApi } from "../src";

declare global {
  interface Window {
    __co?: {
      a: EditorApi | null;
      b: EditorApi | null;
      docA: Y.Doc;
      docB: Y.Doc;
      ready: () => boolean;
      /** A third co-author's caret at `pos` (A's positions), as another device sends it: it stays whatever has the focus here. */
      remoteCaretA: (pos: number) => void;
    };
  }
}

/** Two co-authors on one note: two Y docs and two awarenesses, relayed both ways as a server would. */
export function CoAuthorEditors({ html }: { html: string }) {
  const setup = useMemo(() => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    docA.on("update", (u: Uint8Array, origin: unknown) => origin !== "relay" && Y.applyUpdate(docB, u, "relay"));
    docB.on("update", (u: Uint8Array, origin: unknown) => origin !== "relay" && Y.applyUpdate(docA, u, "relay"));
    // A third device: only its presence (a caret) goes to B; its doc is a copy kept in sync.
    const docC = new Y.Doc();
    docA.on("update", (u: Uint8Array) => Y.applyUpdate(docC, u, "relay"));
    const awC = new Awareness(docC);
    awC.setLocalStateField("user", { name: "Вера", color: "#3E8E5A" });
    awC.on("update", ({ added, updated, removed }: Record<string, number[]>) => {
      applyAwarenessUpdate(awB, encodeAwarenessUpdate(awC, [...added!, ...updated!, ...removed!]), "relay");
    });
    const awA = new Awareness(docA);
    const awB = new Awareness(docB);
    awA.on("update", ({ added, updated, removed }: Record<string, number[]>, origin: unknown) => {
      if (origin !== "relay") applyAwarenessUpdate(awB, encodeAwarenessUpdate(awA, [...added!, ...updated!, ...removed!]), "relay");
    });
    awB.on("update", ({ added, updated, removed }: Record<string, number[]>, origin: unknown) => {
      if (origin !== "relay") applyAwarenessUpdate(awA, encodeAwarenessUpdate(awB, [...added!, ...updated!, ...removed!]), "relay");
    });
    const state = {
      a: null as EditorApi | null,
      b: null as EditorApi | null,
      docA,
      docB,
      ready: () => !!state.a && !!state.b,
      remoteCaretA: (pos: number) => {
        const ystate = ySyncPluginKey.getState(state.a!.editor.state) as { type: Y.XmlFragment; binding: { mapping: Map<unknown, unknown> } };
        const rel = absolutePositionToRelativePosition(pos, ystate.type, ystate.binding.mapping as never);
        awC.setLocalStateField("cursor", { anchor: rel, head: rel });
      },
    };
    window.__co = state;
    return { docA, docB, awA, awB, state };
  }, []);
  return (
    <div style={{ display: "flex", gap: 20 }}>
      <div style={{ width: 480 }} data-testid="a">
        <DatascratchEditor
          doc={setup.docA}
          awareness={setup.awA}
          user={{ id: "ua", name: "Аня", color: "#D2453B" }}
          showPalette={false}
          bottomPadding={20}
          penSettings={{ tool: null }}
          onReady={(api) =>
            setTimeout(() => {
              api.editor.commands.setContent(html);
              setup.state.a = api;
            }, 0)
          }
        />
      </div>
      <div style={{ width: 480 }} data-testid="b">
        <DatascratchEditor
          doc={setup.docB}
          awareness={setup.awB}
          user={{ id: "ub", name: "Борис", color: "#2E5BDB" }}
          showPalette={false}
          bottomPadding={20}
          penSettings={{ tool: null }}
          onReady={(api) => setTimeout(() => (setup.state.b = api), 0)}
        />
      </div>
    </div>
  );
}
