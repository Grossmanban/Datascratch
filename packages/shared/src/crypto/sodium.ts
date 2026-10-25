// libsodium loader. The WASM module initializes asynchronously once; every
// crypto function is synchronous afterwards and throws if called too early.
import sodiumModule from "libsodium-wrappers-sumo";

export type Sodium = typeof sodiumModule;

let instance: Sodium | null = null;
let pending: Promise<Sodium> | null = null;

/** Initialize libsodium. Idempotent; await it once at startup. */
export function initCrypto(): Promise<Sodium> {
  if (instance) return Promise.resolve(instance);
  pending ??= sodiumModule.ready.then(() => {
    instance = sodiumModule;
    return sodiumModule;
  });
  return pending;
}

export function isCryptoReady(): boolean {
  return instance !== null;
}

/** @internal */
export function sodium(): Sodium {
  if (!instance) throw new Error("crypto is not initialized: await initCrypto() first");
  return instance;
}
