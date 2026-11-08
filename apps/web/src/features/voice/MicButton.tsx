import type { EditorApi } from "@datascratch/web-editor";
import { Loader2, Mic, ShieldCheck, Square } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button, cn, Dialog, Tooltip } from "@/ui";
import { acceptVoiceConsent, cancelDictation, currentLevel, declineVoiceConsent, startDictation, stopDictation, useDictation } from "./dictation";

/** Held this long, the button is push-to-talk (released → sent); a shorter press toggles. */
const HOLD_MS = 350;

/** Five bars moving with the voice (AnalyserNode loudness), drawn every frame while listening. */
function Wave({ active }: { active: boolean }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const shape = [0.55, 0.85, 1, 0.8, 0.5];
    const tick = (t: number) => {
      const level = currentLevel();
      bars.current.forEach((el, i) => {
        if (!el) return;
        const wobble = 0.35 + 0.65 * Math.abs(Math.sin(t / 140 + i * 1.3));
        el.style.transform = `scaleY(${Math.max(0.18, Math.min(1, level * shape[i]! * wobble * 1.6))})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return (
    <span className="flex h-4 items-center gap-[2px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} ref={(el) => void (bars.current[i] = el)} className="h-4 w-[3px] origin-center scale-y-[0.18] rounded-full bg-current transition-transform duration-75" />
      ))}
    </span>
  );
}

/**
 * «Диктовать» (D-65): in the document bar, and as a round floating button on a phone (`floating`).
 * Press and hold to talk, or tap to start and tap again to stop; Space on the focused button and
 * ⌥M anywhere in the note do the same; Esc cancels.
 */
export function MicButton({ api, floating = false }: { api: EditorApi; floating?: boolean }) {
  const { t } = useTranslation();
  const { phase, pending, error } = useDictation();
  const pressedAt = useRef(0);
  const holding = useRef(false);
  const listening = phase === "listening";

  // ⌥M toggles from anywhere in the note; Esc cancels while there is something to cancel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && (e.code === "KeyM" || e.key.toLowerCase() === "m")) {
        e.preventDefault();
        if (useDictation.getState().phase === "listening") void stopDictation(api);
        else startDictation(api);
      } else if (e.key === "Escape" && useDictation.getState().phase !== "idle") {
        e.preventDefault();
        cancelDictation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [api]);

  // Leaving the note mid-take drops it.
  useEffect(() => () => cancelDictation(), []);

  // Pressing while listening stops. Otherwise a press starts; let go after HOLD_MS (push-to-talk)
  // and the take is sent, a short tap keeps listening until the next tap.
  function down(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    if (listening) {
      holding.current = false;
      void stopDictation(api);
      return;
    }
    pressedAt.current = performance.now();
    holding.current = true;
    // The release counts wherever the pointer is by then (the finger slides, the bar may move).
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    startDictation(api);
  }
  function up() {
    if (!holding.current) return;
    holding.current = false;
    if (performance.now() - pressedAt.current >= HOLD_MS) void stopDictation(api);
  }

  const label = listening ? t("voice.listening") : pending ? t("voice.working") : t("voice.dictate");
  const hint = t("voice.hint");

  const button = (
    <button
      type="button"
      aria-label={listening ? t("voice.stop") : t("voice.dictate")}
      aria-pressed={listening}
      data-testid="mic-button"
      data-phase={phase}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          if (listening) void stopDictation(api);
          else startDictation(api);
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "relative flex select-none items-center justify-center gap-1.5 rounded-full transition-[background-color,box-shadow,color] duration-200 [touch-action:none] [-webkit-touch-callout:none]",
        floating
          ? "size-14 shadow-popover"
          : "h-8 min-w-8 px-2 text-ink-2 hover:bg-ink/5 hover:text-ink",
        floating && !listening && "bg-surface text-ink ring-1 ring-line",
        listening && "bg-[var(--ds-accent)] text-white shadow-[0_0_0_6px_color-mix(in_srgb,var(--ds-accent)_22%,transparent),0_0_24px_color-mix(in_srgb,var(--ds-accent)_45%,transparent)]",
      )}
    >
      {listening ? (
        <>
          <Wave active />
          {floating && <Square className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-white p-0.5 text-[var(--ds-accent)]" fill="currentColor" />}
        </>
      ) : pending ? (
        <Loader2 className={cn("animate-spin", floating ? "size-6" : "size-4")} />
      ) : (
        <Mic className={floating ? "size-6" : "size-4"} />
      )}
    </button>
  );

  return (
    // The status floats under the button: nothing in the bar moves while the finger is on it.
    <div className={cn("relative flex items-center", floating && "flex-col-reverse gap-2")} data-testid="mic">
      {floating ? button : <Tooltip content={`${t("voice.dictate")} · ⌥M — ${hint}`}>{button}</Tooltip>}
      {(phase !== "idle" || error) && (
        <span
          role="status"
          aria-live="polite"
          className={cn(
            "whitespace-nowrap text-[12.5px] font-medium",
            "rounded-full bg-surface/95 px-3 py-1 shadow-card ring-1 ring-line",
            !floating && "absolute right-0 top-[calc(100%+6px)] z-30",
            error && phase === "idle" ? "text-danger" : "text-ink-2",
          )}
          data-testid="mic-status"
        >
          {phase !== "idle" ? (
            <>
              {label}
              <span className="ml-1.5 text-ink-3">{t("voice.escToCancel")}</span>
            </>
          ) : (
            t(`voice.error.${error}`)
          )}
        </span>
      )}
    </div>
  );
}

/** First use (D-65): where the audio goes, before the microphone is asked for. */
export function VoiceConsentDialog() {
  const { t } = useTranslation();
  const open = useDictation((s) => s.consentOpen);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && declineVoiceConsent()} title={t("voice.consentTitle")}>
      <div className="flex flex-col gap-4" data-testid="voice-consent">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--ds-accent)_10%,transparent)] text-[var(--ds-accent)]">
            <ShieldCheck className="size-5" />
          </span>
          <p className="text-[14px] leading-relaxed text-ink-2">{t("voice.consentText")}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={declineVoiceConsent} data-testid="voice-consent-decline">
            {t("voice.consentLater")}
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={busy}
            onClick={() => {
              setBusy(true);
              acceptVoiceConsent();
              setBusy(false);
            }}
            data-testid="voice-consent-accept"
          >
            {t("voice.consentAccept")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
