// Minimal subset of the note schema (docs/architecture/contracts/document-model.md §4.2),
// enough to exercise the y-prosemirror layout: block attributes, marks with and without
// attributes, inline atoms between text runs, nested blocks.
import { Schema } from 'prosemirror-model'

const block = { blockId: { default: null } }

export const schema = new Schema({
  nodes: {
    doc: { content: 'title block+' },
    title: { content: 'inline*', attrs: block },
    paragraph: { group: 'block', content: 'inline*', attrs: { ...block, textAlign: { default: null } } },
    heading: { group: 'block', content: 'inline*', attrs: { ...block, level: { default: 1 } } },
    taskList: { group: 'block', content: 'taskItem+', attrs: block },
    taskItem: {
      content: 'paragraph block*',
      attrs: { ...block, taskId: { default: null }, state: { default: 'open' }, scheduled: { default: null }, deadline: { default: null }, completedAt: { default: null } },
    },
    noteLink: { group: 'inline', inline: true, atom: true, attrs: { noteId: {}, label: { default: '' } } },
    hardBreak: { group: 'inline', inline: true },
    text: { group: 'inline' },
  },
  marks: {
    bold: {},
    italic: {},
    link: { attrs: { href: {} } },
    highlight: { attrs: { color: { default: 'yellow' } } },
  },
})
