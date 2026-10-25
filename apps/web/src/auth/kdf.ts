import { derivePasswordKeys, type KdfParams, type PasswordKeys } from "@/lib/shared";

// Argon2id with 64 MiB takes ~0.5–1.5 s; run it off the main thread so the UI keeps animating.
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (k: PasswordKeys) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (typeof Worker === "undefined" || import.meta.env.MODE === "test") return null;
  if (!worker) {
    worker = new Worker(new URL("./kdf.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; keys?: PasswordKeys; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok && e.data.keys) p.resolve(e.data.keys);
      else p.reject(new Error(e.data.error ?? "KDF failed"));
    };
  }
  return worker;
}

export function deriveKeys(password: string, salt: Uint8Array, kdf: KdfParams): Promise<PasswordKeys> {
  const w = getWorker();
  if (!w) return derivePasswordKeys(password, salt, kdf);
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, password, salt, kdf });
  });
}
