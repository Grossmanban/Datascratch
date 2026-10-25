export { DatascratchEditor, type DatascratchEditorProps, type EditorApi, type EditorUser } from "./Editor";
export type { EditorHost, NoteSummary, UploadedAttachment } from "./host";
export { buildExtensions, createHeadlessEditor } from "./editorCore";
export { createSchemaExtensions, CONTRACT_MARKS, CONTRACT_NODES } from "./schema";
export { initNoteMeta, readNoteMeta, readTitle, setNoteBackdrop, setNoteCover, setNoteStyle, useNoteMeta, SUPPORTED_FORMAT_VERSION } from "./meta";
export { PenLayer, DEFAULT_PEN_SETTINGS, TOOL_DEFAULTS, type PenSettings, type PenTool, type EraserMode } from "./pen/PenLayer";
export { PEN_ORIGIN, META_ORIGIN, createNoteUndoManager } from "./collab/collaboration";
export type { NoteStyle, NoteCover, NoteBackdrop } from "@datascratch/shared/contracts";
