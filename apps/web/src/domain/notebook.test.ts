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

  it("does not fight another client's representation of the same copy (iOS)", () => {
    const doc = new Y.Doc();
    initNotebookDoc(doc, "nb-2");
    const meta = notebookMaps(doc).meta;
    // As iOS writes it: other key order, icon absent instead of null.
    meta.set("name", "Ии");
    meta.set("icon", "globe");
    meta.set("color", null);
    meta.set("space", { name: "Личное", id: "sp-1" });
    let updates = 0;
    doc.on("update", () => updates++);
    syncNotebookMetaCopy(doc, { name: "Ии", icon: "globe", color: null }, { id: "sp-1", name: "Личное", icon: null });
    expect(updates).toBe(0);
    // iOS writes an empty space object where there is none.
    meta.set("space", { id: "", name: "", icon: null });
    updates = 0;
    syncNotebookMetaCopy(doc, { name: "Ии", icon: "globe", color: null }, null);
    expect(updates).toBe(0);
  });
});
