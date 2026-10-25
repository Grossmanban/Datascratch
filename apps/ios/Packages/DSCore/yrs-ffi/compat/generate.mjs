// Produces fixtures/yjs-note.json: a note written by y-prosemirror (as TipTap does) plus
// relative positions encoded by Yjs. Run: npm install && node generate.mjs
import * as Y from 'yjs'
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror'
import { writeFileSync, mkdirSync } from 'node:fs'
import { schema } from './schema.mjs'

const b64 = (u8) => Buffer.from(u8).toString('base64url')

const json = {
  type: 'doc',
  content: [
    { type: 'title', attrs: { blockId: '0192f3c4-0000-7000-8000-000000000001' }, content: [{ type: 'text', text: 'Заметка 😀' }] },
    {
      type: 'paragraph',
      attrs: { blockId: '0192f3c4-0000-7000-8000-000000000002', textAlign: null },
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }, { type: 'italic' }] },
        { type: 'noteLink', attrs: { noteId: '0192f3c4-0000-7000-8000-0000000000aa', label: 'Other' } },
        { type: 'hardBreak' },
        { type: 'text', text: 'tail', marks: [{ type: 'highlight', attrs: { color: 'yellow' } }] },
      ],
    },
    { type: 'heading', attrs: { blockId: '0192f3c4-0000-7000-8000-000000000003', level: 2 }, content: [{ type: 'text', text: 'Tasks' }] },
    {
      type: 'taskList',
      attrs: { blockId: '0192f3c4-0000-7000-8000-000000000004' },
      content: [
        {
          type: 'taskItem',
          attrs: { blockId: '0192f3c4-0000-7000-8000-000000000005', taskId: '0192f3c4-0000-7000-8000-0000000000t1', state: 'done', scheduled: '2026-10-25', deadline: null, completedAt: '2026-10-25T12:00:00.000Z' },
          content: [{ type: 'paragraph', attrs: { blockId: '0192f3c4-0000-7000-8000-000000000006', textAlign: null }, content: [{ type: 'text', text: 'Buy milk' }] }],
        },
      ],
    },
  ],
}

const doc = prosemirrorJSONToYDoc(schema, json, 'content')
doc.getMap('meta').set('formatVersion', 1)
const strokes = doc.getMap('strokes')
const stroke = new Y.Map()
strokes.set('s1', stroke)
stroke.set('v', 1)
stroke.set('points', new Uint8Array([0, 0, 128, 63]))
stroke.set('author', { kind: 'user', id: 'u1' })

const content = doc.getXmlFragment('content')
const para = content.get(1)
const firstRun = para.get(0) // XmlText "Hello bold and link"
const rel = (type, index, assoc = 0) => b64(Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(type, index, assoc)))

const fixture = {
  generator: 'yjs ' + '13.6.27' + ' / y-prosemirror 1.3.7',
  update: b64(Y.encodeStateAsUpdate(doc)),
  prosemirror: yDocToProsemirrorJSON(doc, 'content'),
  relativePositions: [
    { path: [1, 0], index: 6, assoc: 0, encoded: rel(firstRun, 6) },
    { path: [1, 0], index: 6, assoc: -1, encoded: rel(firstRun, 6, -1) },
    { path: [0, 0], index: 8, assoc: 0, encoded: rel(content.get(0).get(0), 8) },
    { path: [], index: 2, assoc: 0, encoded: rel(content, 2) },
  ],
}

mkdirSync('fixtures', { recursive: true })
writeFileSync('fixtures/yjs-note.json', JSON.stringify(fixture, null, 2) + '\n')
console.log('wrote fixtures/yjs-note.json')
