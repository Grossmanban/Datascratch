// D-65 dictation: the microphone through MediaRecorder (webm/opus; mp4 where Safari has no webm)
// and an AnalyserNode for the live wave. Nothing is sent while recording: the audio goes to the
// server only after the button is released (no Web Speech API — in Chrome that goes to Google).

export type MicError = "denied" | "no-device" | "unsupported" | "insecure" | "busy";

export class MicFailure extends Error {
  constructor(readonly kind: MicError, cause?: unknown) {
    super(kind);
    this.cause = cause;
  }
}

/** The first recording format this browser can make: Chrome/Firefox webm+opus, Safari mp4/aac. */
export function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/aac"]) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      // older Safari throws for unknown types
    }
  }
  return undefined;
}

export function micSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

function asFailure(e: unknown): MicFailure {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return new MicFailure("denied", e);
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return new MicFailure("no-device", e);
  if (name === "NotReadableError" || name === "AbortError" || name === "TrackStartError") return new MicFailure("busy", e);
  return new MicFailure("unsupported", e);
}

export class Recording {
  private chunks: Blob[] = [];
  private analyser: AnalyserNode | null = null;
  private ctx: AudioContext | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  readonly startedAt = performance.now();

  private constructor(
    private stream: MediaStream,
    private recorder: MediaRecorder,
  ) {}

  /** Asks for the microphone (the browser's prompt the first time) and starts recording. */
  static async start(): Promise<Recording> {
    if (typeof window !== "undefined" && !window.isSecureContext) throw new MicFailure("insecure");
    if (!micSupported()) throw new MicFailure("unsupported");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch (e) {
      throw asFailure(e);
    }
    const mime = pickMime();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48_000 } : undefined);
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      throw asFailure(e);
    }
    const rec = new Recording(stream, recorder);
    recorder.ondataavailable = (ev) => {
      if (ev.data.size) rec.chunks.push(ev.data);
    };
    recorder.start(250);
    rec.listen();
    return rec;
  }

  private listen() {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;
      src.connect(this.analyser);
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
    } catch {
      // No wave, recording still works.
    }
  }

  /** Loudness now, 0…1 (for the glow and the wave). */
  level(): number {
    if (!this.analyser || !this.data) return 0;
    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    for (const v of this.data) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / this.data.length) * 3);
  }

  get seconds(): number {
    return (performance.now() - this.startedAt) / 1000;
  }

  /** Stops and hands back the audio. */
  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const done = () => {
        this.release();
        resolve(new Blob(this.chunks, { type: this.recorder.mimeType || pickMime() || "audio/webm" }));
      };
      if (this.recorder.state === "inactive") return done();
      this.recorder.onstop = done;
      this.recorder.stop();
    });
  }

  /** Throws the recording away (Esc). */
  cancel() {
    this.recorder.onstop = null;
    if (this.recorder.state !== "inactive") this.recorder.stop();
    this.chunks = [];
    this.release();
  }

  private release() {
    this.stream.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.analyser = null;
  }
}
