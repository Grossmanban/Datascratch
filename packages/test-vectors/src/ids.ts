import { uuidv7FromParts } from "@datascratch/shared/ids";
import { det, hex } from "./util.js";

export function idVectors() {
  const cases = [0, 1, 0x0192f3c4a1b2, 0xffff_ffff_ffff].map((ms, i) => {
    const rand = det(`uuid-${i}`, 10);
    return { unixMs: ms, rand: hex(rand), uuid: uuidv7FromParts(ms, rand) };
  });
  return {
    "ids/uuidv7.json": {
      description:
        "UUIDv7: bytes 0..5 = unix ms big-endian; byte 6 = 0x70 | (rand[0] & 0x0f); byte 7 = rand[1]; byte 8 = 0x80 | (rand[2] & 0x3f); bytes 9..15 = rand[3..10]; lowercase hyphenated.",
      cases,
    },
  };
}
