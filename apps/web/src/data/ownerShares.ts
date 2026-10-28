// D-54, the owner's side (api.md `GET /shared-by-me`, crypto.md §10): deliver keys to members who
// accepted, change the key after someone left or was removed, and re-create guest links with it.
// One pass of core's maintainOwnedShares, at start, every two minutes and after a change here.
import { maintainOwnedShares, type Member, type ShareTarget } from "@datascratch/shared";
import { getMasterKey, useAuth } from "@/auth/session";
import { useWorkspace } from "@/domain/workspace";
import i18n from "@/i18n";
import { useUi } from "@/hooks/useUi";
import { confirmDialog, toast } from "@/ui";
import { refreshNotebookKeyCache, setKeyring } from "./keys";
import { runtime } from "./runtime";
import { accountBoxKeys, sharingApi } from "./sharing";

let running: Promise<void> | null = null;
let again = false;
/** «Not now» for an account created after its invitation: not asked again in this session. */
const declined = new Set<string>();

/** The owner pressed «Открыть доступ» for a member: ask again even after «Не сейчас». */
export function giveAccessNow(target: ShareTarget, userId: string) {
  declined.delete(`${target.kind}:${target.id}:${userId}`);
  return maintainShares();
}

/** Run one maintenance pass now (or right after the one in progress). */
export function maintainShares(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = pass()
    .catch((e) => console.warn("[ds] shared resources upkeep:", (e as Error).message))
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        void maintainShares();
      }
    });
  return running;
}

async function confirmLateAccount(target: ShareTarget, member: Member): Promise<boolean> {
  const id = `${target.kind}:${target.id}:${member.userId}`;
  if (declined.has(id)) return false;
  // Sign-up does not verify e-mail: an account made after the invitation gets access only on «yes».
  const ok = await confirmDialog({
    title: i18n.t("share.people.confirmLateTitle", { email: member.email }),
    description: i18n.t("share.people.confirmLateText"),
    confirmLabel: i18n.t("share.people.confirmLateYes"),
    cancelLabel: i18n.t("share.people.confirmLateNo"),
  });
  if (!ok) declined.add(id);
  return ok;
}

async function pass() {
  const { userId } = useAuth.getState();
  if (!userId) return;
  const pair = await accountBoxKeys();
  const rt = runtime();
  const results = await maintainOwnedShares({
    api: sharingApi,
    owner: { userId, secretKey: pair.secretKey },
    masterKey: getMasterKey(),
    notebookIndex: (id) => rt.store.load(id),
    notebookOfNote: async (noteId) => useWorkspace.getState().notes[noteId]?.notebookId ?? null,
    isAgentMode: (id) => useWorkspace.getState().account.notebooks.find((n) => n.id === id)?.mode === "agent",
    whenIndexSent: (id) => rt.client.whenSent(id),
    onKeys: async (target, keys) => {
      setKeyring(target.id, target.kind, keys);
      if (target.kind === "notebook") await refreshNotebookKeyCache(target.id);
      useUi.setState({ keysChangedAt: Date.now() });
    },
    confirm: confirmLateAccount,
    links: {
      webOrigin: location.origin,
      onRecreated: (target, urls) => {
        useUi.setState({ keysChangedAt: Date.now() });
        if (!urls.length) return;
        // Guest links carry the key: after a key change the old ones show nothing new (D-54).
        toast(i18n.t("share.linksRecreated", { count: urls.length }), {
          duration: 12_000,
          action: { label: i18n.t("share.linksShow"), run: () => useUi.setState({ shareFor: target }) },
        });
      },
    },
  });
  for (const r of results) if ("error" in r) console.warn("[ds] shared resource upkeep failed:", r.target, r.error);
}
