/// <reference lib="webworker" />
import { derivePasswordKeys } from "@/lib/shared";
import type { KdfParams } from "@/lib/shared";

type Req = { id: number; password: string; salt: Uint8Array; kdf: KdfParams };

self.onmessage = async (e: MessageEvent<Req>) => {
  const { id, password, salt, kdf } = e.data;
  try {
    const keys = await derivePasswordKeys(password, salt, kdf);
    (self as DedicatedWorkerGlobalScope).postMessage({ id, ok: true, keys });
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({ id, ok: false, error: String(err) });
  }
};
