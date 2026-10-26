/**
 * Notebook name, icon, colour and space. The server usually does not know
 * them (they live in the account document, encrypted with the master key), so
 * clients mirror them into `meta` of the notebook document (document-model.md
 * §3), which the server can decrypt for agent-mode notebooks.
 */
import * as Y from "yjs";
import type { AgentNotebook, AgentsContext } from "../context.js";

export const UNTITLED_NOTEBOOK = "Без названия";

export interface NotebookDocMeta {
  name: string | null;
  icon: string | null;
  color: string | null;
  space: AgentNotebook["space"];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

export function readNotebookMeta(doc: Y.Doc): NotebookDocMeta {
  const meta = doc.getMap("meta");
  const raw = meta.get("space");
  const spaceObj = raw instanceof Y.Map ? (raw.toJSON() as Record<string, unknown>) : (raw as Record<string, unknown> | null | undefined);
  const space =
    spaceObj && typeof spaceObj.id === "string" && typeof spaceObj.name === "string"
      ? { id: spaceObj.id, name: spaceObj.name, icon: str(spaceObj.icon) }
      : null;
  return { name: str(meta.get("name")), icon: str(meta.get("icon")), color: str(meta.get("color")), space };
}

/** What the server knows wins; the mirrored meta fills the gaps. */
export function mergeNotebookMeta(info: AgentNotebook, meta: NotebookDocMeta): AgentNotebook & { name: string } {
  return {
    ...info,
    name: info.name ?? meta.name ?? UNTITLED_NOTEBOOK,
    icon: info.icon ?? meta.icon,
    color: info.color ?? meta.color,
    space: info.space ?? meta.space,
  };
}

/** Agent-mode notebooks of a user with names filled in from their documents (consent page, settings). */
export async function describeAgentNotebooks(ctx: AgentsContext, userId: string): Promise<(AgentNotebook & { name: string })[]> {
  const list = await ctx.data.listAgentNotebooks(userId);
  return Promise.all(
    list.map(async (info) => {
      if (info.name && info.icon !== null && info.space) return { ...info, name: info.name };
      const loaded = await ctx.data.loadDoc(userId, info.id).catch(() => null);
      return mergeNotebookMeta(info, loaded ? readNotebookMeta(loaded.doc) : { name: null, icon: null, color: null, space: null });
    }),
  );
}
