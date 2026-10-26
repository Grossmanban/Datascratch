import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { initNotebookDoc, notebookMaps, syncNotebookMetaCopy } from "./notebook";

describe("notebook meta copy (document-model.md §3)", () => {
  it("copies name, icon, colour and space for agents, and only writes what changed", () => {
    const doc = new Y.Doc();
    initNotebookDoc(doc, "nb-1");
    const space = { id: "sp-1", name: "Работа", icon: "💼" };
    syncNotebookMetaCopy(doc, { name: "Проекты", icon: "book.closed", color: "tint.blue" }, space);
    const meta = notebookMaps(doc).meta;
    expect(meta.toJSON()).toMatchObject({ name: "Проекты", icon: "book.closed", color: "tint.blue", space });

    let updates = 0;
    doc.on("update", () => updates++);
    syncNotebookMetaCopy(doc, { name: "Проекты", icon: "book.closed", color: "tint.blue" }, space);
    expect(updates).toBe(0);
    syncNotebookMetaCopy(doc, { name: "Проекты", icon: "book.closed", color: "tint.green" }, space);
    expect(meta.get("color")).toBe("tint.green");
    expect(updates).toBe(1);
  });
});
