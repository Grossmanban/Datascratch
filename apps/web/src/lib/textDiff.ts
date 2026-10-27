// Word-level diff of two plain texts for «Сравнить с предыдущей версией» (spec/08, D-54):
// added words are highlighted, removed ones struck through. LCS over word/space tokens; very
// long texts fall back to whole lines so the table stays small.

export type DiffPart = { kind: "same" | "added" | "removed"; text: string };

const MAX_CELLS = 4_000_000;

const words = (s: string) => s.split(/(\s+)/).filter((t) => t !== "");
const lines = (s: string) => s.split(/(?<=\n)/).filter((t) => t !== "");

export function diffText(before: string, after: string): DiffPart[] {
  let a = words(before);
  let b = words(after);
  if (a.length * b.length > MAX_CELLS) {
    a = lines(before);
    b = lines(after);
  }
  // Common prefix/suffix first: most versions differ in a small part.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const out: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  for (let i = 0; i < start; i++) push("same", a[i]!);
  const ma = a.slice(start, endA);
  const mb = b.slice(start, endB);
  if (ma.length * mb.length > MAX_CELLS) {
    for (const t of ma) push("removed", t);
    for (const t of mb) push("added", t);
  } else {
    // lcs[i][j] = LCS length of ma[i..] and mb[j..], one flat array.
    const w = mb.length + 1;
    const lcs = new Uint32Array((ma.length + 1) * w);
    for (let i = ma.length - 1; i >= 0; i--)
      for (let j = mb.length - 1; j >= 0; j--)
        lcs[i * w + j] = ma[i] === mb[j] ? lcs[(i + 1) * w + j + 1]! + 1 : Math.max(lcs[(i + 1) * w + j]!, lcs[i * w + j + 1]!);
    let i = 0;
    let j = 0;
    while (i < ma.length && j < mb.length) {
      if (ma[i] === mb[j]) {
        push("same", ma[i]!);
        i++;
        j++;
      } else if (lcs[(i + 1) * w + j]! >= lcs[i * w + j + 1]!) push("removed", ma[i++]!);
      else push("added", mb[j++]!);
    }
    while (i < ma.length) push("removed", ma[i++]!);
    while (j < mb.length) push("added", mb[j++]!);
  }
  for (let i = endA; i < a.length; i++) push("same", a[i]!);
  return out;
}
