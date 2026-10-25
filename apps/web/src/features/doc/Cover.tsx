import { ImagePlus, MoveVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { attachmentUrl, resizeImage, storeAttachment } from "@/data/attachments";
import { runtime } from "@/data/runtime";
import { updateNote } from "@/domain/actions";
import { setNoteMeta } from "@/domain/note";
import type { NoteCover } from "@/lib/shared";
import { Button, cn, Spinner, toast } from "@/ui";

/** Decrypts and shows an attachment image. */
export function useAttachmentUrl(attachmentId: string | null | undefined, key: () => Promise<Uint8Array | null>, opts: { auth?: string | null; persist?: boolean } = {}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!attachmentId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Another device may still be uploading the chunks: retry with backoff.
    const attempt = (n: number) => {
      void key()
        .then((k) => (k ? attachmentUrl(attachmentId, k, opts) : Promise.reject(new Error("no key"))))
        .then((u) => alive && setUrl(u))
        .catch(() => {
          if (!alive) return;
          if (n < 5) timer = setTimeout(() => attempt(n + 1), 1000 * 2 ** n);
          else setFailed(true);
        });
    };
    attempt(0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentId]);
  return { url, failed };
}

export async function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/** Make `file` the note's cover (spec/12 §12.7): encrypted image + card thumbnail. */
export async function setCoverImage(noteId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("not_image");
  const store = runtime().store;
  const key = await store.keyFor(noteId);
  if (!key) throw new Error("no_key");
  const doc = await store.load(noteId);
  const { cover, thumb } = await uploadCover(noteId, key, file);
  setNoteMeta(doc, { cover: { attachmentId: cover, offsetY: 0.5 } });
  updateNote(noteId, { coverThumb: thumb });
}

export async function removeCover(noteId: string) {
  setNoteMeta(await runtime().store.load(noteId), { cover: null });
  updateNote(noteId, { coverThumb: null });
}

/** First image among dropped or pasted items. */
export function imageFrom(data: DataTransfer | null): File | null {
  for (const f of Array.from(data?.files ?? [])) if (f.type.startsWith("image/")) return f;
  return null;
}

/** Encrypt and store a cover (2400px) plus a list thumbnail (640px). */
export async function uploadCover(noteId: string, key: Uint8Array, file: File) {
  const [big, small] = await Promise.all([resizeImage(file, 2400), resizeImage(file, 640, 0.8)]);
  const cover = await storeAttachment(noteId, key, big.data, big.mime);
  const thumb = await storeAttachment(noteId, key, small.data, small.mime);
  return { cover, thumb };
}

export function CoverImage({
  cover,
  keyFor,
  editable,
  onChange,
  onReposition,
  onRemove,
  onDropImage,
  auth,
  persist,
}: {
  cover: NonNullable<NoteCover>;
  keyFor: () => Promise<Uint8Array | null>;
  editable: boolean;
  onChange?: () => void;
  onReposition?: (offsetY: number) => void;
  onRemove?: () => void;
  /** An image dropped onto the cover replaces it. */
  onDropImage?: (file: File) => void;
  auth?: string | null;
  persist?: boolean;
}) {
  const { t } = useTranslation();
  const { url, failed } = useAttachmentUrl(cover.attachmentId, keyFor, { auth, persist });
  const [moving, setMoving] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [offset, setOffset] = useState(cover.offsetY);
  const drag = useRef<{ y: number; start: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setOffset(cover.offsetY), [cover.offsetY]);

  return (
    <div
      ref={box}
      className={cn(
        "group relative h-[150px] overflow-hidden rounded-2xl bg-ink/5 sm:h-[190px]",
        moving && "cursor-ns-resize",
        dropping && "ring-2 ring-accent/50",
      )}
      data-testid="doc-cover"
      onDragOver={(e) => {
        if (!editable || !onDropImage || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(e) => {
        setDropping(false);
        const file = imageFrom(e.dataTransfer);
        if (!file || !onDropImage) return;
        e.preventDefault();
        onDropImage(file);
      }}
      onPointerDown={(e) => {
        if (!moving) return;
        drag.current = { y: e.clientY, start: offset };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current || !box.current) return;
        const dy = (e.clientY - drag.current.y) / box.current.clientHeight;
        setOffset(Math.min(1, Math.max(0, drag.current.start - dy * 0.6)));
      }}
      onPointerUp={() => (drag.current = null)}
    >
      {url ? (
        <img src={url} alt="" draggable={false} className="h-full w-full select-none object-cover" style={{ objectPosition: `50% ${offset * 100}%` }} />
      ) : (
        <div className="flex h-full items-center justify-center text-ink-3">{failed ? null : <Spinner className="size-5" />}</div>
      )}
      {editable && (
        <div className={cn("absolute bottom-3 right-3 flex gap-1.5 transition-opacity", moving ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          {moving ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setMoving(false);
                onReposition?.(offset);
              }}
            >
              {t("common.done")}
            </Button>
          ) : (
            <>
              <Button size="sm" className="glass" icon={<ImagePlus className="size-3.5" />} onClick={onChange}>
                {t("style.cover")}
              </Button>
              <Button size="sm" className="glass" icon={<MoveVertical className="size-3.5" />} onClick={() => setMoving(true)}>
                ↕
              </Button>
              <Button size="sm" className="glass" icon={<Trash2 className="size-3.5" />} onClick={onRemove} aria-label={t("style.removeCover")} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function coverError(e: unknown, t: (k: string) => string) {
  const code = (e as Error).message;
  toast(code === "payload_too_large" ? "200 MB max" : code === "not_image" ? t("cover.notImage") : t("history.loadFailed"), { tone: "danger" });
}
