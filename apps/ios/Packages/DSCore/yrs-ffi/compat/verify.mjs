// Reads an update written by yrs-ffi (cargo test writes target/compat/yrs-note.bin) and
// checks that Yjs/y-prosemirror sees the expected document. Run after `cargo test`.
import * as Y from 'yjs'
import { yDocToProsemirrorJSON } from 'y-prosemirror'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const update = readFileSync(new URL('../target/compat/yrs-note.bin', import.meta.url))
const doc = new Y.Doc()
Y.applyUpdate(doc, update)
// Mark order is not significant (ProseMirror re-sorts marks by schema rank).
const sortMarks = (node) => {
  if (node.marks) node.marks.sort((a, b) => a.type.localeCompare(b.type))
  ;(node.content || []).forEach(sortMarks)
  return node
}
const expected = JSON.parse(readFileSync(new URL('./fixtures/yjs-note.json', import.meta.url))).prosemirror
assert.deepEqual(sortMarks(yDocToProsemirrorJSON(doc, 'content')), sortMarks(expected))
assert.equal(doc.getMap('meta').get('formatVersion'), 1)
const s1 = doc.getMap('strokes').get('s1')
assert.ok(s1 instanceof Y.Map)
assert.deepEqual(s1.get('points'), new Uint8Array([0, 0, 128, 63]))
assert.deepEqual(s1.get('author'), { kind: 'user', id: 'u1' })
console.log('Yjs reads the yrs-ffi document correctly')
