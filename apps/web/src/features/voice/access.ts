import type { VoiceMe } from "@datascratch/shared/voice";
import { create } from "zustand";
import { voiceApi } from "./voiceApi";

// D-65: voice is turned on per account by the server admin, with a monthly quota (UTC months).
// `GET /voice/me` says whether this account may use it and what is left; `account_changed` with
// `voice` makes it read again, so a switch by the admin shows at once.

type Access = { me: VoiceMe | null; loaded: boolean };
export const useVoiceAccess = create<Access>(() => ({ me: null, loaded: false }));

let running: Promise<void> | null = null;

export function refreshVoiceMe(): Promise<void> {
  running ??= voiceApi
    .me()
    .then((me) => useVoiceAccess.setState({ me, loaded: true }))
    .catch(() => {
      // Offline or an older server: keep what is known (the button stays, errors say why).
    })
    .finally(() => {
      running = null;
    });
  return running;
}

/** Minutes left this month, never below zero. */
export const minutesLeft = (me: VoiceMe) => Math.max(0, Math.floor(me.monthlyMinutes - me.usedMinutes));

export function resetVoiceAccess() {
  useVoiceAccess.setState({ me: null, loaded: false });
}
