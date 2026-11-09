import type { EditorApi } from "@datascratch/web-editor";
import { Slice } from "@tiptap/pm/model";
import { create } from "zustand";
import { ApiError, NetworkError } from "@/api/client";
import { setSetting } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { MicFailure, Recording, type MicError } from "./recorder";
import { turnsText, voiceApi, type VoiceProfanity, type VoiceQuality } from "./voiceApi";
import { refreshVoiceMe } from "./access";

// D-65 dictation (spec/04 «Голос»): hold the button (or press Space / ⌥M to start and stop),
// speak, let go — the audio goes to /voice/transcribe, the words to /voice/text «clean», and the
// tidy text is inserted at the caret. Several takes in a row are processed in order; Esc cancels.

/** Account settings (document `account`, synced): the same keys on iOS. */
export const VOICE_SETTINGS = { consent: "voiceConsentAt", quality: "voiceQuality", profanity: "voiceProfanity" } as const;

export function voiceSettings(): { quality: VoiceQuality; profanity: VoiceProfanity; consented: boolean } {
  const s = useWorkspace.getState().account.settings;
  return {
    quality: s[VOICE_SETTINGS.quality] === "best" ? "best" : "standard",
    profanity: s[VOICE_SETTINGS.profanity] === "keep" ? "keep" : "soften",
    consented: typeof s[VOICE_SETTINGS.consent] === "string",
  };
}

export type DictationError = MicError | "offline" | "too-short" | "server" | "quota" | "too-long" | "disabled" | "upstream" | "unavailable";

/** One dictation take is cut off at 10 minutes (api.md «Голос»: the client stops it itself). */
export const MAX_TAKE_SEC = 600;
let takeTimer: ReturnType<typeof setTimeout> | null = null;

type State = {
  phase: "idle" | "listening" | "working";
  /** Takes recorded and not yet in the text. */
  pending: number;
  error: DictationError | null;
  /** The consent window is open; `then` runs once it is accepted. */
  consentOpen: boolean;
};

export const useDictation = create<State>(() => ({ phase: "idle", pending: 0, error: null, consentOpen: false }));

let recording: Recording | null = null;
let starting: Promise<void> | null = null;
let queue: Promise<void> = Promise.resolve();
let aborter = new AbortController();
let afterConsent: (() => void) | null = null;

export function currentLevel(): number {
  return recording?.level() ?? 0;
}

function setError(error: DictationError | null) {
  useDictation.setState({ error });
}

/** First use: the window explaining where the audio goes (D-65); once accepted it is remembered. */
export function acceptVoiceConsent() {
  setSetting(VOICE_SETTINGS.consent, new Date().toISOString());
  useDictation.setState({ consentOpen: false });
  const go = afterConsent;
  afterConsent = null;
  go?.();
}

export function declineVoiceConsent() {
  afterConsent = null;
  useDictation.setState({ consentOpen: false });
}

/** Starts listening (after the consent window the first time). */
export function startDictation(api: EditorApi): void {
  if (recording || starting) return;
  if (!voiceSettings().consented) {
    afterConsent = () => startDictation(api);
    useDictation.setState({ consentOpen: true });
    return;
  }
  setError(null);
  starting = Recording.start()
    .then((r) => {
      recording = r;
      useDictation.setState({ phase: "listening" });
      takeTimer = setTimeout(() => void stopDictation(api), MAX_TAKE_SEC * 1000);
    })
    .catch((e) => {
      setError(e instanceof MicFailure ? e.kind : "unsupported");
      useDictation.setState({ phase: useDictation.getState().pending ? "working" : "idle" });
    })
    .finally(() => {
      starting = null;
    });
}

/** Stops listening and sends the take; the text lands at the caret when it is ready. */
export async function stopDictation(api: EditorApi): Promise<void> {
  if (starting) await starting;
  if (takeTimer) clearTimeout(takeTimer);
  takeTimer = null;
  const r = recording;
  if (!r) return;
  recording = null;
  const seconds = r.seconds;
  const audio = await r.stop();
  if (seconds < 0.5 || audio.size < 1_000) {
    setError("too-short");
    useDictation.setState({ phase: useDictation.getState().pending ? "working" : "idle" });
    return;
  }
  useDictation.setState((s) => ({ phase: "working", pending: s.pending + 1 }));
  const signal = aborter.signal;
  queue = queue.then(() => processTake(api, audio, signal));
}

async function processTake(api: EditorApi, audio: Blob, signal: AbortSignal) {
  try {
    if (signal.aborted) return;
    const { quality, profanity } = voiceSettings();
    const heard = await voiceApi.transcribe(audio, "dictation", signal);
    const raw = turnsText(heard.turns);
    if (!raw) return;
    const { markdown } = await voiceApi.text({ task: "clean", text: raw, quality, profanity }, signal);
    if (signal.aborted) return;
    insertAtCaret(api, markdown.trim() || raw);
  } catch (e) {
    if (signal.aborted) return;
    console.warn("[ds] voice take failed:", (e as Error)?.message ?? e);
    setError(errorOf(e));
    // Access or quota may have changed: the button and the settings follow.
    void refreshVoiceMe();
  } finally {
    useDictation.setState((s) => {
      const pending = Math.max(0, s.pending - 1);
      return { pending, phase: recording ? "listening" : pending ? "working" : "idle" };
    });
  }
}

export function errorOf(e: unknown): DictationError {
  if (e instanceof NetworkError) return "offline";
  if (e instanceof ApiError) {
    if (e.status === 0) return "offline";
    // api.md «Голос»: voice_disabled 403, voice_quota 429, voice_too_long 413, voice_upstream 502, voice_unavailable 503.
    if (e.code === "voice_disabled" || e.status === 403) return "disabled";
    if (e.code === "voice_too_long" || e.status === 413) return "too-long";
    if (e.code === "voice_quota" || e.status === 429) return "quota";
    if (e.code === "voice_upstream" || e.status === 502) return "upstream";
    if (e.code === "voice_unavailable" || e.status === 503) return "unavailable";
  }
  return "server";
}

/** Esc: the take being recorded is dropped, and so are those still being processed. */
export function cancelDictation() {
  if (takeTimer) clearTimeout(takeTimer);
  takeTimer = null;
  recording?.cancel();
  recording = null;
  aborter.abort();
  aborter = new AbortController();
  queue = Promise.resolve();
  useDictation.setState({ phase: "idle", pending: 0 });
}

/**
 * Inserts text at the caret as if it were pasted: the editor's own clipboard parser turns the
 * server's Markdown into headings, lists and emphasis (plain text stays paragraphs).
 */
export function insertAtCaret(api: EditorApi, markdown: string) {
  const { view } = api.editor;
  const { $from } = view.state.selection;
  // Mid-paragraph text joins with a space; a fresh line takes it as is.
  const lead = $from.parent.isTextblock && $from.parentOffset > 0 && !/\s$/.test($from.parent.textBetween(0, $from.parentOffset)) ? " " : "";
  view.focus();
  if (!/\n/.test(markdown)) return void view.dispatch(view.state.tr.insertText(lead + markdown).scrollIntoView());
  replaceWithMarkdown(view, markdown);
}

type View = EditorApi["editor"]["view"];

/** Replaces the selection with Markdown, parsed by the editor's clipboard text parser. */
export function replaceWithMarkdown(view: View, markdown: string, opts: { closed?: boolean } = {}) {
  const $from = view.state.selection.$from;
  let slice = view.someProp("clipboardTextParser", (f) => f(markdown, $from, false, view)) ?? null;
  if (!slice) return void view.pasteText(markdown);
  slice = view.someProp("transformPasted", (f) => f(slice!, view, false)) ?? slice;
  // Closed: the blocks stand on their own (the paragraph around a selection is split, not joined
  // into the first or last of them) — what «Оформить» on part of a paragraph wants.
  if (opts.closed && slice.content.firstChild?.isBlock) slice = new Slice(slice.content, 0, 0);
  view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
}
