import { kvGet, kvSet } from "@/data/db";
import { uuidv7 } from "@/lib/shared";

// The master key is kept across reloads encrypted with a non-extractable WebCrypto key
// stored in IndexedDB: script on another origin or a copy of the raw bytes on disk can't
// unwrap it without this browser profile's key store. Nothing here ever leaves the device.

export type SealedBlob = { iv: Uint8Array; ct: Uint8Array };

async function deviceKey(): Promise<CryptoKey> {
  const existing = await kvGet<CryptoKey>("deviceKey");
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await kvSet("deviceKey", key);
  return key;
}

export async function sealLocal(data: Uint8Array): Promise<SealedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deviceKey(), data as BufferSource));
  return { iv, ct };
}

export async function openLocal(blob: SealedBlob): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: blob.iv as BufferSource }, await deviceKey(), blob.ct as BufferSource),
  );
}

export async function deviceId(): Promise<string> {
  let id = await kvGet<string>("deviceId");
  if (!id) {
    id = uuidv7();
    await kvSet("deviceId", id);
  }
  return id;
}

export function deviceName(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /iPad/.test(ua)
    ? "iPad"
    : /iPhone/.test(ua)
      ? "iPhone"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Android/.test(ua)
            ? "Android"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  return `Web · ${browser}${os ? ` on ${os}` : ""}`;
}
