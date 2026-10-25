import {
  AD,
  ATTACHMENT_CHUNK_BYTES,
  DEFAULT_KDF,
  attachmentChunkCount,
  buildShareLink,
  deriveRecoveryLoginKey,
  derivePasswordKeys,
  encryptAttachmentChunk,
  encryptEnvelope,
  formatRecoveryKey,
  utf8,
  wrapKey,
} from "@datascratch/shared/crypto";
import { b64, det, hex, sha256, vid } from "./util.js";

export function cryptoVectors() {
  const kdf = [
    { password: "correct horse battery staple" },
    // NFKC: "ﬁ" ligature + decomposed "é" must equal "fié" (precomposed).
    { password: "ﬁé-пароль-🔑" },
    { password: "" },
  ].map(({ password }, i) => {
    const salt = det(`kdf-salt-${i}`, 16);
    const k = derivePasswordKeys(password, salt, DEFAULT_KDF);
    return {
      password,
      passwordNfkcUtf8: hex(utf8(password.normalize("NFKC"))),
      salt: b64(salt),
      kdf: DEFAULT_KDF,
      authSeed: hex(k.authSeed),
      loginKey: b64(k.loginKey),
      passwordKey: b64(k.passwordKey),
    };
  });

  const recovery = [0, 1, 2].map((i) => {
    const key =
      i === 0 ? new Uint8Array(32) : i === 1 ? new Uint8Array(32).fill(255) : det("recovery", 32);
    return {
      recoveryKey: hex(key),
      text: formatRecoveryKey(key),
      recoveryLoginKey: b64(deriveRecoveryLoginKey(key)),
    };
  });
  const recoveryParse = [
    { input: recovery[2]!.text.toLowerCase(), recoveryKey: recovery[2]!.recoveryKey },
    { input: recovery[2]!.text.slice(4).replace(/-/g, " "), recoveryKey: recovery[2]!.recoveryKey },
    {
      input: recovery[0]!.text.replace(/0/g, "O").replace(/^DSO-/, "DS1-"),
      recoveryKey: recovery[0]!.recoveryKey,
    },
    { input: "DS1-ABCD", error: "invalid_recovery_key" },
    { input: recovery[0]!.text.slice(0, -1) + "1", error: "invalid_recovery_key" },
    { input: recovery[0]!.text.slice(0, -1) + "U", error: "invalid_recovery_key" },
  ];

  const key = det("envelope-key", 32);
  const envelopes = [
    { ad: AD.doc(vid(1)), plaintext: utf8("hello, Datascratch") },
    { ad: AD.doc(vid(1)), plaintext: new Uint8Array(0) },
    { ad: AD.awareness(vid(1)), plaintext: det("awareness-payload", 100) },
    { ad: "", plaintext: utf8("empty ad") },
  ].map(({ ad, plaintext }, i) => {
    const nonce = det(`envelope-nonce-${i}`, 24);
    return {
      key: b64(key),
      nonce: b64(nonce),
      ad,
      plaintext: b64(plaintext),
      envelope: b64(encryptEnvelope(key, plaintext, ad, { nonce })),
    };
  });
  const envelopeFailures = [
    {
      case: "wrong ad",
      key: b64(key),
      ad: AD.doc(vid(2)),
      envelope: envelopes[0]!.envelope,
      error: "decrypt_failed",
    },
    {
      case: "unsupported version",
      key: b64(key),
      ad: envelopes[0]!.ad,
      envelope: "Ag" + envelopes[0]!.envelope.slice(2),
      error: "unsupported_version",
    },
    {
      case: "too short",
      key: b64(key),
      ad: "",
      envelope: b64(new Uint8Array(40)),
      error: "malformed",
    },
  ];

  const userId = vid(10);
  const notebookId = vid(11);
  const noteId = vid(12);
  const masterKey = det("master-key", 32);
  const passwordKey = det("password-key", 32);
  const recoveryKey = det("recovery", 32);
  const notebookKey = det("notebook-key", 32);
  const serverKey = det("server-key", 32);
  const noteKey = det("note-key", 32);
  const wraps = [
    {
      name: "masterKey/password",
      wrapping: passwordKey,
      key: masterKey,
      ad: AD.masterKeyPassword(userId),
    },
    {
      name: "masterKey/recovery",
      wrapping: recoveryKey,
      key: masterKey,
      ad: AD.masterKeyRecovery(userId),
    },
    {
      name: "notebookKey/master",
      wrapping: masterKey,
      key: notebookKey,
      ad: AD.notebookKey(notebookId),
    },
    {
      name: "notebookKey/server",
      wrapping: serverKey,
      key: notebookKey,
      ad: AD.notebookKeyServer(notebookId),
    },
    { name: "noteKey/notebook", wrapping: notebookKey, key: noteKey, ad: AD.noteKey(noteId) },
  ].map((w, i) => {
    const nonce = det(`wrap-nonce-${i}`, 24);
    return {
      name: w.name,
      wrappingKey: b64(w.wrapping),
      key: b64(w.key),
      ad: w.ad,
      nonce: b64(nonce),
      wrapped: wrapKey(w.wrapping, w.key, w.ad, { nonce }),
    };
  });

  // Attachment: plaintext byte i = (i * 31 + 7) mod 256, 1 MiB + 100 bytes → 2 chunks.
  const attachmentId = vid(20);
  const size = ATTACHMENT_CHUNK_BYTES + 100;
  const data = new Uint8Array(size).map((_, i) => (i * 31 + 7) & 255);
  const count = attachmentChunkCount(size);
  const chunks = Array.from({ length: count }, (_, i) => {
    const last = i === count - 1;
    const nonce = det(`attachment-nonce-${i}`, 24);
    const plain = data.subarray(i * ATTACHMENT_CHUNK_BYTES, (i + 1) * ATTACHMENT_CHUNK_BYTES);
    const env = encryptAttachmentChunk(noteKey, attachmentId, i, last, plain, { nonce });
    return {
      index: i,
      last,
      ad: AD.attachmentChunk(attachmentId, i, last),
      nonce: b64(nonce),
      plaintextLength: plain.length,
      envelopeLength: env.length,
      envelopeSha256: sha256(env),
      ...(env.length < 1024 ? { envelope: b64(env) } : {}),
    };
  });

  return {
    "crypto/kdf.json": {
      description:
        "Argon2id13 (ops 3, mem 64 MiB, 64-byte output) over NFKC(password) UTF-8; authSeed = out[0..32], passwordKey = out[32..64], loginKey = BLAKE2b-256(key=authSeed, msg='ds1|login').",
      cases: kdf,
    },
    "crypto/recovery-key.json": {
      description:
        "Recovery key text: 'DS1-' + Crockford Base32 (MSB first, 52 chars, last 4 bits zero) in groups of 4; recoveryLoginKey = BLAKE2b-256(key=recoveryKey, msg='ds1|recovery-login').",
      cases: recovery,
      parse: recoveryParse,
    },
    "crypto/envelope.json": {
      description:
        "Envelope = 0x01 | nonce(24) | XChaCha20-Poly1305-IETF(plaintext, ad UTF-8, nonce, key). All binary values base64url.",
      cases: envelopes,
      failures: envelopeFailures,
    },
    "crypto/key-wraps.json": {
      description:
        "Key wraps are envelopes of the 32-byte key with the contract ad strings (crypto.md §3).",
      ids: { userId, notebookId, noteId },
      cases: wraps,
    },
    "crypto/attachment.json": {
      description:
        "Attachment chunks of 1 MiB plaintext; plaintext byte i = (i * 31 + 7) mod 256. Each chunk is an envelope with ad 'ds1|att|<id>|<index>|<last>'. Large envelopes are given by length and SHA-256.",
      attachmentId,
      noteKey: b64(noteKey),
      plaintextSize: size,
      plaintextSha256: sha256(data),
      chunkCount: count,
      chunks,
    },
  };
}

export function cryptoExtraVectors() {
  // base64url edge cases.
  const lengths = [0, 1, 2, 3, 4, 5, 31, 32, 33];
  const encode = lengths.map((n) => {
    const bytes = det(`b64-${n}`, n);
    return { hex: hex(bytes), base64url: b64(bytes) };
  });
  const rejectDecode = [
    { input: "AA==", reason: "padding" },
    { input: "A", reason: "length mod 4 = 1" },
    { input: "A+B/", reason: "standard base64 alphabet" },
    { input: "AB", reason: "non-zero trailing bits" },
    { input: "AAA ", reason: "whitespace" },
  ];

  // Share links (crypto.md §7).
  const shareKey = det("share-key", 32);
  const shareId = vid(5);
  const shareLinks = {
    build: [
      {
        origin: "https://app.example",
        shareId,
        key: b64(shareKey),
        url: buildShareLink("https://app.example/", shareId, shareKey),
      },
    ],
    reject: [
      { url: `https://app.example/notes/${shareId}#k=${b64(shareKey)}`, reason: "not a /s/ path" },
      { url: `https://app.example/s/${shareId}`, reason: "no key" },
      { url: `https://app.example/s/${shareId}#k=AAAA`, reason: "key is not 32 bytes" },
    ],
  };

  // A whole signup with fixed randomness: what `POST /auth/signup` must contain.
  const userId = vid(10);
  const password = "correct horse battery staple";
  const salt = det("signup-salt", 16);
  const masterKey = det("signup-master", 32);
  const recoveryKey = det("signup-recovery", 32);
  const pk = derivePasswordKeys(password, salt, DEFAULT_KDF);
  const signup = {
    inputs: {
      password,
      userId,
      salt: b64(salt),
      masterKey: b64(masterKey),
      recoveryKey: b64(recoveryKey),
      nonceMasterPassword: b64(det("signup-nonce-1", 24)),
      nonceMasterRecovery: b64(det("signup-nonce-2", 24)),
    },
    expected: {
      recoveryKeyText: formatRecoveryKey(recoveryKey),
      body: {
        salt: b64(salt),
        kdf: DEFAULT_KDF,
        loginKey: b64(pk.loginKey),
        recoveryLoginKey: b64(deriveRecoveryLoginKey(recoveryKey)),
        wrappedMasterKeyPassword: wrapKey(pk.passwordKey, masterKey, AD.masterKeyPassword(userId), {
          nonce: det("signup-nonce-1", 24),
        }),
        wrappedMasterKeyRecovery: wrapKey(recoveryKey, masterKey, AD.masterKeyRecovery(userId), {
          nonce: det("signup-nonce-2", 24),
        }),
        userId,
      },
    },
  };

  return {
    "crypto/base64url.json": {
      description: "base64url without padding; decoders must reject every `rejectDecode` input.",
      encode,
      rejectDecode,
    },
    "crypto/share-link.json": {
      description:
        "Share links https://<web-host>/s/<shareId>#k=<base64url key> (crypto.md §7); `reject` inputs must fail to parse.",
      ...shareLinks,
    },
    "crypto/signup-flow.json": {
      description:
        "End-to-end signup with fixed randomness: password + salt → keys; masterKey wrapped by passwordKey and by recoveryKey with the given nonces. `expected.body` is the crypto part of POST /auth/signup.",
      ...signup,
    },
  };
}
