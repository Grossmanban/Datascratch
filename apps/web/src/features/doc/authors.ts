// Names for the authors of document versions (D-54): «Вы», a member's email, the owner's email,
// an agent's name, «Гость». The server stamps who wrote; names come from what this account can see.
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { agentTokensApi, membersApi } from "@/api/endpoints";
import { useAuth } from "@/auth/session";
import { sharedResourceOf } from "@/data/sharedWithMe";
import { useWorkspace } from "@/domain/workspace";
import type { Author, ShareTarget } from "@/lib/shared";

/** The resources whose members may have written this note: its own share and its notebook's. */
function targetsOf(noteId: string): ShareTarget[] {
  const shared = sharedResourceOf(noteId);
  if (shared) return [shared.target];
  const nb = useWorkspace.getState().notes[noteId]?.notebookId;
  return [{ kind: "note", id: noteId }, ...(nb ? [{ kind: "notebook" as const, id: nb }] : [])];
}

export function useAuthorNames(noteId: string | null): (a: Author) => string {
  const { t } = useTranslation();
  const myId = useAuth((s) => s.userId);
  const people = useQuery({
    queryKey: ["version-authors", noteId],
    enabled: !!noteId,
    staleTime: 60_000,
    queryFn: async () => {
      const names = new Map<string, string>();
      const shared = sharedResourceOf(noteId!);
      if (shared) names.set(shared.ownerUserId, shared.ownerEmail);
      for (const target of targetsOf(noteId!)) {
        const list = await membersApi.list(target).catch(() => []);
        for (const m of list) names.set(m.userId, m.email);
      }
      return names;
    },
  });
  // Agent tokens are the owner's; a member sees «Агент».
  const agents = useQuery({
    queryKey: ["agent-tokens"],
    enabled: !!noteId && !sharedResourceOf(noteId),
    queryFn: agentTokensApi.list,
    staleTime: 60_000,
    retry: false,
  });
  return (a) => {
    if (a.kind === "user") return a.userId === myId ? t("history.you") : (people.data?.get(a.userId) ?? t("history.someone"));
    if (a.kind === "agent") {
      const name = agents.data?.find((g) => g.id === a.tokenId)?.name;
      return name ? t("history.agentNamed", { name }) : t("history.agent");
    }
    return t("history.guest");
  };
}
