// Vectors for voice (D-65): the timestamps «[мм:сс]» of a cleaned transcript.
import { formatVoiceTime, speakerLabel } from "@datascratch/shared/voice";

export function voiceVectors() {
  const secs = [0, 0.9, 5, 59.99, 60, 65.9, 599, 3599, 3600, 3725.4, 10800];
  return {
    "voice/timestamps.json": {
      description:
        "Voice (D-65): seconds → the «мм:сс» timestamp (from one hour «ч:мм:сс»), seconds rounded down; speaker ids S<n> → «Собеседник <n>».",
      timestamps: secs.map((sec) => ({ sec, text: formatVoiceTime(sec) })),
      speakers: ["S1", "S2", "S8"].map((id) => ({ id, label: speakerLabel(id) })),
    },
  };
}
