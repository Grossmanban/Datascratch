import { useQuery } from "@tanstack/react-query";
import { History, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Y from "yjs";
import { docsApi } from "@/api/endpoints";
import { runtime } from "@/data/runtime";
import { restoreNoteVersion } from "@datascratch/shared";
import { useUi } from "@/hooks/useUi";
import { formatDateTime } from "@/lib/dates";
import { ad, fromBase64Url, open } from "@/lib/shared";
import { Button, cn, Dialog, EmptyState, Spinner, toast } from "@/ui";
import { DocView } from "./DocView";

async function loadVersion(noteId: string, seq: number): Promise<Y.Doc> {
  const { payload } = await docsApi.version(noteId, seq);
  const key = await runtime().store.keyFor(noteId);
  if (!key) throw new Error("no key");
  const doc = new Y.Doc({ gc: false });
  Y.applyUpdate(doc, await open(key, fromBase64Url(payload), ad.doc(noteId)));
  return doc;
}

export function HistoryDialog() {
  const { t } = useTranslation();
  const noteId = useUi((s) => s.historyFor);
  const close = () => useUi.setState({ historyFor: null });
  const versions = useQuery({ queryKey: ["versions", noteId], queryFn: () => docsApi.versions(noteId!), enabled: !!noteId });
  const [seq, setSeq] = useState<number | null>(null);
  const [preview, setPreview] = useState<Y.Doc | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSeq(null);
    setPreview(null);
  }, [noteId]);

  useEffect(() => {
    if (!noteId || seq === null) return;
    let alive = true;
    setLoading(true);
    setFailed(false);
    loadVersion(noteId, seq)
      .then((d) => alive && setPreview(d))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [noteId, seq]);

  async function restore() {
    if (!noteId || !preview) return;
    const rt = runtime();
    const doc = await rt.store.acquire(noteId);
    try {
      // Re-anchors strokes onto the restored text (strokes.md), then restores style/cover/backdrop.
      restoreNoteVersion(doc, Y.encodeStateAsUpdate(preview));
      const meta = preview.getMap("meta");
      doc.transact(() => {
        for (const k of ["style", "cover", "backdrop"]) doc.getMap("meta").set(k, meta.get(k) ?? null);
      });
    } finally {
      rt.store.release(noteId);
    }
    toast(t("history.restored"));
    close();
  }

  const list = versions.data ?? [];
  return (
    <Dialog open={!!noteId} onOpenChange={(o) => !o && close()} title={t("history.title")} wide className="max-w-4xl">
      {versions.isLoading ? (
        <Spinner className="size-5 text-ink-3" />
      ) : versions.isError ? (
        <p className="text-[14px] text-ink-3">{t("common.requiresOnline")}</p>
      ) : !list.length ? (
        <EmptyState icon={<History className="size-7" />} title={t("history.title")} description={t("history.empty")} />
      ) : (
        <div className="flex h-[60vh] flex-col gap-3 md:flex-row">
          <ul className="scrollbar-thin flex shrink-0 gap-1 overflow-auto md:w-56 md:flex-col">
            {list.map((v) => (
              <li key={v.seq}>
                <button
                  onClick={() => setSeq(v.seq)}
                  className={cn(
                    "w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-[13.5px] transition-colors",
                    v.seq === seq ? "bg-ink text-canvas" : "text-ink hover:bg-ink/5",
                  )}
                >
                  {formatDateTime(v.createdAt)}
                </button>
              </li>
            ))}
          </ul>
          <div className="relative min-h-0 flex-1 overflow-y-auto rounded-lg border border-line bg-canvas">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner className="size-5 text-ink-3" />
              </div>
            ) : failed ? (
              <p className="p-6 text-[14px] text-ink-3">{t("history.loadFailed")}</p>
            ) : preview ? (
              <>
                <div className="pointer-events-none origin-top scale-[0.9]">
                  <DocView doc={preview} backdrop={null} editable={false} compact showPalette={false} />
                </div>
                <div className="sticky bottom-0 flex justify-end border-t border-line bg-surface/90 p-3 backdrop-blur">
                  <Button variant="primary" icon={<RotateCcw className="size-4" />} onClick={restore}>
                    {t("history.restore")}
                  </Button>
                </div>
              </>
            ) : (
              <p className="p-6 text-[14px] text-ink-3">{t("history.preview")}</p>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
