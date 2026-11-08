import { Check, Lock, Users } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { makeSpaceShared } from "@/data/sharedSpaces";
import { createNotebook, createSpace, deleteSpace, updateSpace } from "@/domain/actions";
import { setActiveSpace, useWorkspace } from "@/domain/workspace";
import { PeopleSection } from "@/features/share/People";
import { useUi } from "@/hooks/useUi";
import { iconGlyph } from "@/lib/glyph";
import { tintName, TINTS, tintFg } from "@/lib/tokens";
import { Button, cn, Dialog, Input, SpaceTile, Tooltip } from "@/ui";
import { spaceFailed } from "./SharedSpaces";

/** Icons offered for a space: a short, calm set (any emoji already set is kept). */
export const SPACE_ICONS = ["💼", "🏡", "🎓", "🧪", "🎨", "🌱", "📚", "✈️", "💡", "🎯", "🧠", "🎵", "📷", "🏃", "🍳", "🛠️", "💰", "❤️", "⭐️", "🌍", "🧭", "📌", "🗂️", "👥"];

export type SpaceDialogState = { mode: "create" } | { mode: "edit"; spaceId: string } | null;

type Kind = "personal" | "shared";

/**
 * «Создать пространство» and «Настройки пространства» — one window (spec/05 §«Пространства»):
 * type (two cards, only when creating), name (required, focused), icon, colour, a live preview of
 * the chip; a shared one goes on to «Пригласить людей» (can be skipped).
 */
export function SpaceDialog() {
  const { t } = useTranslation();
  const state = useUi((s) => s.spaceDialog);
  const editing = state?.mode === "edit" ? state.spaceId : null;
  const space = useWorkspace((s) => (editing ? s.account.spaces.find((x) => x.id === editing) : undefined));
  const [kind, setKind] = useState<Kind>("personal");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(SPACE_ICONS[0]!);
  const [color, setColor] = useState<string>("tint.blue");
  const [busy, setBusy] = useState(false);
  /** After creating a shared space: its id, for «Пригласить людей». */
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state) return;
    setInviteFor(null);
    setBusy(false);
    if (state.mode === "edit" && space) {
      setKind(space.shared ? "shared" : "personal");
      setName(space.name);
      setIcon(iconGlyph(space.icon) || SPACE_ICONS[0]!);
      setColor(space.color ?? "tint.blue");
    } else {
      setKind("personal");
      setName("");
      setIcon(SPACE_ICONS[0]!);
      setColor("tint.blue");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // The name first (spec/05): Radix focuses the window's first control on open, so take it after.
  useEffect(() => {
    if (!state || inviteFor) return;
    const id = setTimeout(() => nameRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [state, inviteFor]);

  const close = () => useUi.setState({ spaceDialog: null });
  const trimmed = name.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || busy) return;
    if (editing) {
      updateSpace(editing, { name: trimmed, icon, color });
      return close();
    }
    setBusy(true);
    const id = createSpace({ name: trimmed, icon, color });
    if (kind === "shared") {
      try {
        await makeSpaceShared(id);
      } catch (err) {
        deleteSpace(id);
        setBusy(false);
        return spaceFailed(t, err);
      }
    }
    await createNotebook({ spaceId: id, name: t("notebook.newName"), icon: "📓" });
    setActiveSpace(id);
    setBusy(false);
    if (kind === "shared") setInviteFor(id);
    else close();
  }

  const open = !!state && (!editing || !!space);
  const title = inviteFor ? t("spaceDialog.inviteTitle") : editing ? t("spaceDialog.editTitle") : t("spaceDialog.createTitle");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()} title={title}>
      {inviteFor ? (
        <div className="flex flex-col gap-4" data-testid="space-invite-step">
          <p className="text-[13.5px] text-ink-2">{t("spaceDialog.inviteText")}</p>
          <PeopleSection target={{ kind: "space", id: inviteFor }} />
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button type="button" variant="ghost" onClick={close} data-testid="space-invite-skip">
              {t("spaceDialog.skip")}
            </Button>
            <Button type="button" variant="primary" onClick={close} data-testid="space-invite-done">
              {t("spaceDialog.done")}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5" data-testid="space-dialog">
          {!editing && (
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={t("spaceDialog.type")}>
              <KindCard
                selected={kind === "personal"}
                onSelect={() => setKind("personal")}
                icon={<Lock className="size-4" />}
                title={t("spaceDialog.personal")}
                text={t("spaceDialog.personalText")}
                testId="space-kind-personal"
              />
              <KindCard
                selected={kind === "shared"}
                onSelect={() => setKind("shared")}
                icon={<Users className="size-4" />}
                title={t("spaceDialog.shared")}
                text={t("spaceDialog.sharedText")}
                testId="space-kind-shared"
              />
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">{t("spaceDialog.name")}</span>
            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("spaceDialog.namePlaceholder")}
              maxLength={80}
              autoFocus
              data-testid="space-name"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">{t("spaceDialog.icon")}</span>
            <div className="grid grid-cols-12 gap-1 pointer-coarse:grid-cols-6" role="radiogroup" aria-label={t("spaceDialog.icon")} data-testid="space-icons">
              {SPACE_ICONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="radio"
                  aria-checked={icon === e}
                  aria-label={e}
                  onClick={() => setIcon(e)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md text-[17px] transition-[background-color,box-shadow] duration-150 hover:bg-ink/[0.06]",
                    icon === e && "bg-ink/[0.07] shadow-[inset_0_0_0_1.5px_var(--ds-accent)]",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">{t("spaceDialog.color")}</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("spaceDialog.color")} data-testid="space-colors">
              {TINTS.map((c) => {
                const token = `tint.${c}`;
                const on = tintName(color) === c;
                return (
                  <Tooltip key={c} content={t(`colors.${c}`)}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={t(`colors.${c}`)}
                      onClick={() => setColor(token)}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full ring-offset-2 pointer-coarse:size-11 ring-offset-surface transition-shadow duration-150",
                        on ? "ring-2 ring-ink/40" : "hover:ring-2 hover:ring-ink/15",
                      )}
                      style={{ background: tintFg(token) }}
                    >
                      {on && <Check className="size-3.5 text-white" strokeWidth={3} />}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 px-3 py-2.5" data-testid="space-preview">
            <span className="text-[12px] font-medium uppercase tracking-wide text-ink-3">{t("spaceDialog.preview")}</span>
            <span className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-[14px] font-semibold text-ink">
              <SpaceTile icon={icon} tint={tintName(color)} size={22} />
              <span className="truncate">{trimmed || t("spaceDialog.namePlaceholder")}</span>
              {kind === "shared" && <Users className="size-3.5 shrink-0 text-ink-3" />}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!trimmed} data-testid="space-submit">
              {editing ? t("common.save") : kind === "shared" ? t("spaceDialog.createAndInvite") : t("spaceDialog.create")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function KindCard({ selected, onSelect, icon, title, text, testId }: { selected: boolean; onSelect: () => void; icon: ReactNode; title: string; text: string; testId: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
        selected ? "border-[var(--ds-accent)] bg-[color-mix(in_oklab,var(--ds-accent)_6%,transparent)] shadow-[0_0_0_1px_var(--ds-accent)]" : "border-line hover:bg-ink/[0.03]",
      )}
    >
      <span className={cn("flex size-7 items-center justify-center rounded-lg", selected ? "bg-[var(--ds-accent)] text-white" : "bg-ink/[0.06] text-ink-2")}>{icon}</span>
      <span className="text-[14px] font-semibold text-ink">{title}</span>
      <span className="text-[12.5px] leading-snug text-ink-2">{text}</span>
    </button>
  );
}
