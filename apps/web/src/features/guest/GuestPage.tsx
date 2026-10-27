import { useParams } from "@tanstack/react-router";
import { Eye, FileText, Link2Off, PenLine } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type * as Y from "yjs";
import { ApiError } from "@/api/client";
import { attachmentUrl } from "@/data/attachments";
import { GuestSession } from "@/data/guest";
import type { EditorHost } from "@/editor";
import { colorFor } from "@/data/presence";
import { readNotebook } from "@/domain/notebook";
import { readNoteMeta } from "@/domain/note";
import { CoverImage } from "@/features/doc/Cover";
import { DocView } from "@/features/doc/DocView";
import { PresenceStack } from "@/features/doc/PresenceStack";
import { usePresence } from "@/features/doc/usePresence";
import { Logo } from "@/features/shell/Splash";
import type { NoteMeta } from "@/lib/shared";
import { cn, EmptyState, Spinner } from "@/ui";
import { iconGlyph } from "@/lib/glyph";

const KEY_PREFIX = "ds.shareKey.";

/**
 * The share key from the link's fragment (never sent to the server). It is removed from the
 * address bar at once (audit 2026-10-27: not left in history, screenshots or a copied URL) and
 * kept for this tab only, so a reload still opens the note.
 */
function takeShareKey(shareId: string): string | null {
  const m = /[#&]k=([A-Za-z0-9_-]+)/.exec(location.hash);
  if (m) {
    try {
      sessionStorage.setItem(KEY_PREFIX + shareId, m[1]!);
    } catch {
      // private mode: the key just is not kept for a reload
    }
    const rest = location.hash.slice(1).split("&").filter((p) => p && !p.startsWith("k=")).join("&");
    history.replaceState(history.state, "", location.pathname + location.search + (rest ? `#${rest}` : ""));
    return m[1]!;
  }
  try {
    return sessionStorage.getItem(KEY_PREFIX + shareId);
  } catch {
    return null;
  }
}

export function GuestPage() {
  const { t } = useTranslation();
  const { shareId } = useParams({ from: "/s/$shareId" });
  const [session, setSession] = useState<GuestSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = takeShareKey(shareId);
    if (!key) {
      setError("bad_link");
      return;
    }
    let s: GuestSession | null = null;
    let alive = true;
    GuestSession.open(shareId, key)
      .then((gs) => {
        if (!alive) return gs.close();
        s = gs;
        gs.onChange(() => gs.ended && alive && setError(gs.ended));
        if (import.meta.env.DEV) (window as unknown as { __guest?: unknown }).__guest = gs;
        setSession(gs);
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.code : String(e)));
    return () => {
      alive = false;
      s?.close();
    };
  }, [shareId]);

  if (error)
    return (
      <GuestFrame>
        <EmptyState icon={<Link2Off className="size-7" />} title={t("guest.badLink")} description={t("guest.badLinkText")} />
      </GuestFrame>
    );
  if (!session)
    return (
      <GuestFrame>
        <Loading />
      </GuestFrame>
    );
  return session.grant.target.kind === "note" ? <GuestNote session={session} noteId={session.grant.target.id} /> : <GuestNotebook session={session} />;
}

function Loading() {
  const { t } = useTranslation();
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-ink-2">
      <Spinner className="size-5" />
      <span className="text-[14px]">{t("guest.loading")}</span>
    </div>
  );
}

function GuestFrame({ children, session, presence }: { children: React.ReactNode; session?: GuestSession; presence?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="glass sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-line/60 px-3 sm:px-5">
        <a href="/" className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Logo size={24} />
          <span className="hidden sm:inline">{t("app.name")}</span>
        </a>
        <div className="flex-1" />
        {presence}
        {session && (
          <span
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium",
              session.canEdit ? "bg-accent/10 text-accent" : "bg-ink/[0.06] text-ink-2",
            )}
            data-testid="guest-permission"
          >
            {session.canEdit ? <PenLine className="size-3.5" /> : <Eye className="size-3.5" />}
            {session.canEdit ? t("guest.canEdit") : t("guest.viewOnly")}
          </span>
        )}
        <a href="/signup" className="hidden h-7 items-center rounded-md bg-ink px-3 text-[12.5px] font-medium text-canvas sm:inline-flex">
          {t("guest.getApp")}
        </a>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function useReady(session: GuestSession, docId: string) {
  return useSyncExternalStore(
    (cb) => session.onChange(cb),
    () => session.isReady(docId),
  );
}

function useYMetaVersion(doc: Y.Doc | null) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!doc) return;
    const m = doc.getMap("meta");
    const f = () => setV((x) => x + 1);
    m.observe(f);
    return () => m.unobserve(f);
  }, [doc]);
  return v;
}

const guestUser = () => {
  const id = Math.random().toString(36).slice(2);
  return { name: "", color: colorFor(id), kind: "guest" as const };
};

function GuestNote({ session, noteId, embedded }: { session: GuestSession; noteId: string; embedded?: boolean }) {
  const { t } = useTranslation();
  const ready = useReady(session, noteId);
  const doc = session.doc(noteId);
  const metaV = useYMetaVersion(doc);
  const meta = useMemo(() => readNoteMeta(doc), [doc, metaV]);
  const user = useMemo(() => ({ ...guestUser(), name: t("guest.guest") }), [t]);
  const { awareness, others } = usePresence(
    noteId,
    ready ? doc : null,
    user,
    (update) => session.sendAwareness(noteId, update),
  );
  const editorUser = useMemo(() => ({ id: session.guestId, name: user.name, color: user.color, kind: "guest" as const }), [session, user]);
  const host = useMemo<EditorHost>(
    () => ({
      resolveAttachment: async (id) => {
        const k = await session.keyFor(noteId);
        return k ? attachmentUrl(id, k, { auth: session.grant.guestToken, persist: false }).catch(() => null) : null;
      },
    }),
    [session, noteId],
  );
  useEffect(() => {
    if (embedded) void session.subscribeNote(noteId);
  }, [embedded, session, noteId]);
  const body = !ready || !awareness ? (
    <Loading />
  ) : (
    <DocView
      doc={doc}
      backdrop={meta.backdrop}
      editable={session.canEdit}
      awareness={awareness}
      user={editorUser}
      host={host}
      cover={
        meta.cover ? (
          <CoverImage cover={meta.cover} keyFor={() => session.keyFor(noteId)} editable={false} auth={session.grant.guestToken} persist={false} />
        ) : null
      }
    />
  );
  if (embedded)
    return (
      <>
        <div className="flex justify-end px-4 pt-2">
          <PresenceStack users={others} />
        </div>
        {body}
      </>
    );
  return (
    <GuestFrame session={session} presence={<PresenceStack users={others} />}>
      <div data-testid="guest-doc">{body}</div>
    </GuestFrame>
  );
}

function GuestNotebook({ session }: { session: GuestSession }) {
  const { t } = useTranslation();
  const nbId = session.grant.target.id;
  const ready = useReady(session, nbId);
  const doc = session.doc(nbId);
  const [v, setV] = useState(0);
  useEffect(() => {
    const f = () => setV((x) => x + 1);
    doc.on("afterTransaction", f);
    return () => doc.off("afterTransaction", f);
  }, [doc]);
  const notes = useMemo(
    () =>
      readNotebook(doc)
        .notes.filter((n: NoteMeta) => !n.trashedAt && n.kind !== "inbox")
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [doc, v],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? notes[0]?.id ?? null;
  return (
    <GuestFrame session={session}>
      {!ready ? (
        <Loading />
      ) : (
        <div className="flex min-h-full flex-col md:flex-row">
          <aside className="border-b border-line bg-sidebar p-2 md:w-64 md:shrink-0 md:border-b-0 md:border-r">
            <div className="px-2 pb-2 pt-1 text-[12.5px] font-semibold text-ink-2">{t("guest.documents")}</div>
            <div className="flex gap-1 overflow-x-auto md:flex-col">
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelected(n.id)}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-left text-[13.5px]",
                    n.id === current ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgb(40_30_10/0.08)] ring-1 ring-line" : "text-ink-2 hover:bg-ink/[0.04]",
                  )}
                >
                  <span className="text-[13px]">{iconGlyph(n.icon) || <FileText className="size-3.5 text-ink-3" />}</span>
                  <span className="truncate">{n.title || t("app.untitled")}</span>
                </button>
              ))}
            </div>
          </aside>
          <div className="min-w-0 flex-1">{current && <GuestNote key={current} session={session} noteId={current} embedded />}</div>
        </div>
      )}
    </GuestFrame>
  );
}
