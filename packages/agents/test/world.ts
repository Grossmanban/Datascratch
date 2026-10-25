import type { AgentGrant } from "../src/context.js";
import type { Principal } from "../src/service/access.js";
import { createInMemoryContext } from "../src/testing/in-memory.js";
import { addTextStroke, blockIdAt, makeNoteDoc, makeNotebookDoc } from "../src/testing/fixtures.js";

export const USER = "0192f3c4-0000-7000-8000-000000000001";
export const NB_WORK = "0192f3c4-0000-7000-8000-0000000000a1";
export const NB_PRIVATE = "0192f3c4-0000-7000-8000-0000000000a2";
export const NB_OTHER = "0192f3c4-0000-7000-8000-0000000000a3";
export const NOTE_PLAN = "0192f3c4-0000-7000-8000-0000000000b1";
export const NOTE_IDEAS = "0192f3c4-0000-7000-8000-0000000000b2";
export const NOTE_SECRET = "0192f3c4-0000-7000-8000-0000000000b3";
export const NOTE_TRASH = "0192f3c4-0000-7000-8000-0000000000b4";
export const NOTE_OTHER = "0192f3c4-0000-7000-8000-0000000000b5";
export const FOLDER = "0192f3c4-0000-7000-8000-0000000000c1";

/** A user with three notebooks: agent-mode "Работа", private "Личное", agent-mode "Архив" (not granted). */
export function makeWorld() {
  const ctx = createInMemoryContext();
  ctx.users.addUser(USER);
  const plan = makeNoteDoc(
    "План запуска",
    "Встреча с командой в четверг. Нужно обсудить сроки запуска и бюджет.\n\n## Задачи\n\n- [ ] Подготовить макеты 📅 2026-10-27\n- [x] Собрать отзывы\n- [ ] Написать пресс-релиз ⏰ 2026-11-01\n\nСм. также #запуск",
  );
  const p0 = blockIdAt(plan, 0);
  addTextStroke(plan, { blockId: p0, start: 46, end: 59, hint: "underline" });
  const ideas = makeNoteDoc("Идеи", "Связано с [[План запуска]] — подумать про сроки.");
  // Resolve the [[ ]] link to a real noteLink atom (fixtures don't resolve titles).
  const ideasLinked = makeNoteDocWithLink("Идеи", "Связано с ", NOTE_PLAN, "План запуска", " — подумать про сроки.");
  void ideas;
  ctx.data.addNotebook(
    USER,
    { id: NB_WORK, name: "Работа", space: { id: "s1", name: "Основное", icon: "🏠" } },
    makeNotebookDoc(NB_WORK, "Работа", [
      { id: NOTE_PLAN, title: "План запуска", tags: ["запуск"], updatedAt: "2026-10-24T10:00:00.000Z" },
      { id: NOTE_IDEAS, title: "Идеи", folderId: FOLDER, updatedAt: "2026-10-23T10:00:00.000Z" },
      { id: NOTE_TRASH, title: "Удалённое", trashedAt: "2026-10-20T00:00:00.000Z" },
    ], [{ id: FOLDER, name: "Черновики" }]),
  );
  ctx.data.putDoc(USER, NOTE_PLAN, NB_WORK, plan);
  ctx.data.putDoc(USER, NOTE_IDEAS, NB_WORK, ideasLinked);
  ctx.data.putDoc(USER, NOTE_TRASH, NB_WORK, makeNoteDoc("Удалённое", "сроки"));
  ctx.data.addNotebook(USER, { id: NB_PRIVATE, name: "Личное", mode: "private" }, makeNotebookDoc(NB_PRIVATE, "Личное", [{ id: NOTE_SECRET, title: "Секрет" }]));
  ctx.data.putDoc(USER, NOTE_SECRET, NB_PRIVATE, makeNoteDoc("Секрет", "сроки секрет"));
  ctx.data.addNotebook(USER, { id: NB_OTHER, name: "Архив" }, makeNotebookDoc(NB_OTHER, "Архив", [{ id: NOTE_OTHER, title: "Старое" }]));
  ctx.data.putDoc(USER, NOTE_OTHER, NB_OTHER, makeNoteDoc("Старое", "сроки старые"));
  return ctx;
}

import * as Y from "yjs";
import { insertBlocks } from "../src/doc/build.js";
import { contentOf } from "../src/doc/model.js";

function makeNoteDocWithLink(title: string, before: string, noteId: string, label: string, after: string): Y.Doc {
  const doc = new Y.Doc({ gc: false });
  insertBlocks(contentOf(doc), 0, [
    { type: "title", attrs: {}, inline: [{ text: title, marks: {} }] },
    { type: "paragraph", attrs: {}, inline: [{ text: before, marks: {} }, { atom: "noteLink", attrs: { noteId, label } }, { text: after, marks: {} }] },
  ], { agentEdit: null });
  return doc;
}

export function grant(overrides: Partial<AgentGrant> = {}): AgentGrant {
  return {
    id: "0192f3c4-0000-7000-8000-0000000000d1",
    userId: USER,
    kind: "static",
    name: "Claude",
    clientId: null,
    notebookIds: [NB_WORK, NB_PRIVATE],
    permission: "read_write",
    createdAt: "2026-10-25T00:00:00.000Z",
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    secretHash: null,
    ...overrides,
  };
}

export function principal(overrides: Partial<AgentGrant> = {}): Principal {
  const g = grant(overrides);
  return { grant: g, agentName: g.name, via: "rest" };
}
