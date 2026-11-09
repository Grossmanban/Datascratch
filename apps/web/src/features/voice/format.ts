import type { EditorApi } from "@datascratch/web-editor";
import { TextSelection } from "@tiptap/pm/state";
import { create } from "zustand";
import { replaceWithMarkdown, voiceSettings } from "./dictation";
import { VOICE_AGENT_ID, VOICE_STYLES, voiceApi, type VoiceStyle } from "./voiceApi";

// D-65 «Оформить»: the selection (or the whole note under its title) goes to /voice/text «format»
// in the chosen style; the result replaces it as one edit, highlighted like an agent's edit
// (`agentEdit`, «Принять»), and undoable; the draft before formatting stays at hand.

export const FORMAT_STYLES = VOICE_STYLES;
export type FormatStyle = VoiceStyle;

type FormatState = {
  /** The note whose «Оформить» window is open. */
  openFor: string | null;
  /** Opened from the selection's toolbar: that range (the window takes the focus, not the text). */
  range: { from: number; to: number } | null;
  busy: boolean;
  /** The last formatting in this note: its draft, to look at or bring back. */
  last: { noteId: string; draft: string; style: FormatStyle } | null;
  error: string | null;
};

export const useFormat = create<FormatState>(() => ({
  openFor: null,
  range: null,
  busy: false,
  last: null,
  error: null,
}));

/** The range «Оформить» works on: the selection, or everything after the title. */
export function formatRange(api: EditorApi): { from: number; to: number } | null {
  const { state } = api.editor;
  const { from, to, empty } = state.selection;
  if (!empty) return { from, to };
  const first = state.doc.firstChild;
  const start = first?.type.name === "title" ? first.nodeSize : 0;
  const end = state.doc.content.size;
  return end > start ? { from: start, to: end } : null;
}

export async function formatNote(
  api: EditorApi,
  noteId: string,
  style: FormatStyle,
  signal?: AbortSignal,
): Promise<void> {
  const range = useFormat.getState().range ?? formatRange(api);
  if (!range) return;
  const { view } = api.editor;
  const draft = view.state.doc.textBetween(range.from, range.to, "\n\n", " ").trim();
  if (!draft) return;
  const { quality, profanity } = voiceSettings();
  const { markdown } = await voiceApi.text(
    { task: "format", style, text: draft, quality, profanity },
    signal,
  );
  if (signal?.aborted || !markdown.trim()) return;
  // The note may have changed meanwhile: the same range, clamped to what is there now.
  const size = view.state.doc.content.size;
  const from = Math.min(range.from, size);
  const to = Math.min(Math.max(range.to, from), size);
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
  replaceWithMarkdown(view, markdown.trim(), { closed: true });
  const end = view.state.selection.to;
  const mark = view.state.schema.marks.agentEdit;
  if (mark && end > from)
    view.dispatch(
      view.state.tr.addMark(
        from,
        end,
        mark.create({ agentId: VOICE_AGENT_ID, at: new Date().toISOString() }),
      ),
    );
  useFormat.setState({ last: { noteId, draft, style } });
}

/** «Отменить»: the formatting goes, the draft is back (the editor's own undo of that edit). */
export function undoFormat(api: EditorApi) {
  api.undoManager.undo();
  useFormat.setState({ last: null });
}
