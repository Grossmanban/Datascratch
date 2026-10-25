use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use super::*;

fn note_roots() -> Vec<RootDef> {
    vec![
        RootDef { name: "content".into(), kind: RootKind::XmlFragment },
        RootDef { name: "meta".into(), kind: RootKind::Map },
        RootDef { name: "strokes".into(), kind: RootKind::Map },
        RootDef { name: "starred".into(), kind: RootKind::Array },
    ]
}

fn s(v: &str) -> YValue {
    YValue::String { value: v.into() }
}

fn chunk(text: &str) -> TextChunk {
    TextChunk { text: text.into(), embed: None, attributes: HashMap::new() }
}

fn paragraph(id: &str, text: &str) -> XmlNode {
    XmlNode::Element {
        name: "paragraph".into(),
        attributes: HashMap::from([("blockId".into(), s(id))]),
        children: vec![XmlNode::Text { chunks: vec![chunk(text)] }],
    }
}

fn plain(doc: &YDocument, path: Vec<u32>) -> String {
    match doc.xml_node("content".into(), path).unwrap() {
        XmlNode::Text { chunks } => chunks.iter().map(|c| c.text.clone()).collect(),
        other => panic!("not text: {:?}", other),
    }
}

fn local() -> String {
    ORIGIN_LOCAL.into()
}

#[test]
fn xml_round_trip_through_update() {
    let a = YDocument::new(Some(1), note_roots());
    a.apply(
        vec![YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes: vec![paragraph("b1", "Hello world")] }],
        local(),
    )
    .unwrap();
    a.apply(
        vec![YOp::TextFormat {
            root: "content".into(),
            path: vec![0, 0],
            index: 6,
            len: 5,
            attributes: HashMap::from([("bold".into(), YValue::Object { entries: HashMap::new() })]),
        }],
        local(),
    )
    .unwrap();

    let b = YDocument::new(Some(2), note_roots());
    b.apply_update(a.encode_state_as_update(None).unwrap(), "remote".into()).unwrap();
    let node = b.xml_node("content".into(), vec![0]).unwrap();
    match node {
        XmlNode::Element { name, attributes, children } => {
            assert_eq!(name, "paragraph");
            assert_eq!(attributes.get("blockId"), Some(&s("b1")));
            match &children[0] {
                XmlNode::Text { chunks } => {
                    assert_eq!(chunks.len(), 2);
                    assert_eq!(chunks[0].text, "Hello ");
                    assert_eq!(chunks[1].text, "world");
                    assert!(chunks[1].attributes.contains_key("bold"));
                }
                other => panic!("{:?}", other),
            }
        }
        other => panic!("{:?}", other),
    }
}

#[test]
fn utf16_offsets() {
    let doc = YDocument::new(Some(1), note_roots());
    doc.apply(vec![YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes: vec![paragraph("b1", "a😀b")] }], local()).unwrap();
    // 😀 is two UTF-16 units: "a" = 0, emoji = 1..3, "b" = 3.
    doc.apply(vec![YOp::TextInsert { root: "content".into(), path: vec![0, 0], index: 3, chunks: vec![chunk("X")] }], local()).unwrap();
    assert_eq!(plain(&doc, vec![0, 0]), "a😀Xb");
}

#[test]
fn nested_maps_merge_per_field() {
    let a = YDocument::new(Some(1), note_roots());
    let mut stroke = HashMap::new();
    stroke.insert("v".to_string(), YValue::Number { value: 1.0 });
    stroke.insert("points".to_string(), YValue::Bytes { value: vec![1, 2, 3] });
    stroke.insert("anchors".to_string(), YValue::List { items: vec![YValue::Bytes { value: vec![9] }] });
    a.apply(vec![YOp::MapSet { root: "strokes".into(), path: vec![], key: "s1".into(), value: YValue::SharedMap { entries: stroke } }], local()).unwrap();

    let b = YDocument::new(Some(2), note_roots());
    b.apply_update(a.encode_state_as_update(None).unwrap(), "remote".into()).unwrap();
    // Concurrent edits of different fields of the same nested map both survive.
    a.apply(vec![YOp::MapSet { root: "strokes".into(), path: vec!["s1".into()], key: "hidden".into(), value: YValue::Bool { value: true } }], local()).unwrap();
    b.apply(vec![YOp::MapSet { root: "strokes".into(), path: vec!["s1".into()], key: "tool".into(), value: s("pen") }], local()).unwrap();
    let ua = a.encode_state_as_update(Some(b.state_vector())).unwrap();
    let ub = b.encode_state_as_update(Some(a.state_vector())).unwrap();
    a.apply_update(ub, "remote".into()).unwrap();
    b.apply_update(ua, "remote".into()).unwrap();
    for doc in [&a, &b] {
        assert_eq!(doc.map_get("strokes".into(), vec!["s1".into(), "hidden".into()]).unwrap(), Some(YValue::Bool { value: true }));
        assert_eq!(doc.map_get("strokes".into(), vec!["s1".into(), "tool".into()]).unwrap(), Some(s("pen")));
        assert_eq!(doc.map_get("strokes".into(), vec!["s1".into(), "points".into()]).unwrap(), Some(YValue::Bytes { value: vec![1, 2, 3] }));
    }
}

#[test]
fn relative_positions_follow_text_and_detect_deletion() {
    let doc = YDocument::new(Some(1), note_roots());
    doc.apply(vec![YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes: vec![paragraph("b1", "Hello world")] }], local()).unwrap();
    let w = doc.encode_relative_position("content".into(), vec![0, 0], 6, 0).unwrap();
    let h = doc.encode_relative_position("content".into(), vec![0, 0], 0, 0).unwrap();

    doc.apply(vec![YOp::TextInsert { root: "content".into(), path: vec![0, 0], index: 0, chunks: vec![chunk(">> ")] }], local()).unwrap();
    let r = doc.resolve_relative_positions("content".into(), vec![w.clone(), h.clone()]).unwrap();
    assert_eq!(r[0], Some(ResolvedIndex { path: vec![0, 0], index: 9, deleted: false }));
    assert_eq!(r[1], Some(ResolvedIndex { path: vec![0, 0], index: 3, deleted: false }));

    // Delete "Hello" (now at 3..8): the anchor on "H" is deleted, "w" moves left.
    doc.stop_capturing();
    doc.enable_undo(vec!["content".into()], 0).unwrap();
    doc.apply(vec![YOp::TextDelete { root: "content".into(), path: vec![0, 0], index: 3, len: 5 }], local()).unwrap();
    let r = doc.resolve_relative_positions("content".into(), vec![w.clone(), h.clone()]).unwrap();
    assert_eq!(r[0], Some(ResolvedIndex { path: vec![0, 0], index: 4, deleted: false }));
    assert!(r[1].as_ref().unwrap().deleted);

    // Undo brings the anchor back (redone items are followed).
    assert!(doc.undo());
    let r = doc.resolve_relative_positions("content".into(), vec![w, h]).unwrap();
    assert_eq!(r[0], Some(ResolvedIndex { path: vec![0, 0], index: 9, deleted: false }));
    assert_eq!(r[1], Some(ResolvedIndex { path: vec![0, 0], index: 3, deleted: false }));
}

#[test]
fn relative_position_in_deleted_block() {
    let doc = YDocument::new(Some(1), note_roots());
    doc.apply(
        vec![YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes: vec![paragraph("b1", "one"), paragraph("b2", "two")] }],
        local(),
    )
    .unwrap();
    let p = doc.encode_relative_position("content".into(), vec![1, 0], 1, 0).unwrap();
    assert_eq!(doc.resolve_relative_positions("content".into(), vec![p.clone()]).unwrap()[0], Some(ResolvedIndex { path: vec![1, 0], index: 1, deleted: false }));
    doc.apply(vec![YOp::XmlDelete { root: "content".into(), parent: vec![], index: 0, len: 1 }], local()).unwrap();
    assert_eq!(doc.resolve_relative_positions("content".into(), vec![p.clone()]).unwrap()[0], Some(ResolvedIndex { path: vec![0, 0], index: 1, deleted: false }));
    doc.apply(vec![YOp::XmlDelete { root: "content".into(), parent: vec![], index: 0, len: 1 }], local()).unwrap();
    assert!(doc.resolve_relative_positions("content".into(), vec![p]).unwrap()[0].as_ref().unwrap().deleted);
}

struct Collect(Arc<Mutex<Vec<(Vec<YEvent>, Option<String>)>>>);
impl DeepObserver for Collect {
    fn on_events(&self, events: Vec<YEvent>, origin: Option<String>) {
        self.0.lock().unwrap().push((events, origin));
    }
}

struct Updates(Arc<Mutex<Vec<(Vec<u8>, Option<String>)>>>);
impl UpdateObserver for Updates {
    fn on_update(&self, update: Vec<u8>, origin: Option<String>) {
        self.0.lock().unwrap().push((update, origin));
    }
}

#[test]
fn observers_report_paths_deltas_and_origins() {
    let doc = YDocument::new(Some(1), note_roots());
    doc.enable_undo(vec!["content".into(), "strokes".into()], 0).unwrap();
    let events = Arc::new(Mutex::new(vec![]));
    let updates = Arc::new(Mutex::new(vec![]));
    let _s1 = doc.observe_deep("content".into(), Box::new(Collect(events.clone()))).unwrap();
    let _s2 = doc.observe_updates(Box::new(Updates(updates.clone())));

    doc.apply(vec![YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes: vec![paragraph("b1", "abc")] }], local()).unwrap();
    doc.apply(vec![YOp::TextInsert { root: "content".into(), path: vec![0, 0], index: 1, chunks: vec![chunk("Z")] }], local()).unwrap();
    {
        let ev = events.lock().unwrap();
        assert_eq!(ev.len(), 2);
        assert_eq!(ev[1].1.as_deref(), Some("local"));
        assert_eq!(ev[1].0[0].path, vec![YPathSegment::Index { index: 0 }, YPathSegment::Index { index: 0 }]);
        assert_eq!(
            ev[1].0[0].kind,
            YEventKind::Text { delta: vec![TextDelta::Retain { len: 1, attributes: None }, TextDelta::Insert { text: "Z".into(), embed: None, attributes: HashMap::new() }] }
        );
    }
    assert!(doc.undo());
    let up = updates.lock().unwrap();
    assert_eq!(up.len(), 3);
    assert_eq!(up[2].1.as_deref(), Some("undo"));
    assert_eq!(plain(&doc, vec![0, 0]), "abc");
}

#[test]
fn remote_changes_are_not_undoable() {
    let a = YDocument::new(Some(1), note_roots());
    let b = YDocument::new(Some(2), note_roots());
    a.enable_undo(vec!["content".into()], 0).unwrap();
    b.apply(vec![YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes: vec![paragraph("b1", "remote")] }], local()).unwrap();
    a.apply_update(b.encode_state_as_update(None).unwrap(), "remote".into()).unwrap();
    assert!(!a.can_undo());
    a.apply(vec![YOp::TextInsert { root: "content".into(), path: vec![0, 0], index: 0, chunks: vec![chunk("my ")] }], local()).unwrap();
    assert!(a.can_undo());
    a.undo();
    assert_eq!(plain(&a, vec![0, 0]), "remote");
    assert!(a.can_redo());
    a.redo();
    assert_eq!(plain(&a, vec![0, 0]), "my remote");
}

#[test]
fn arrays_and_errors() {
    let doc = YDocument::new(Some(1), note_roots());
    let item = YValue::Object { entries: HashMap::from([("kind".into(), s("note")), ("id".into(), s("n1"))]) };
    doc.apply(vec![YOp::ArrayInsert { root: "starred".into(), index: 0, items: vec![item.clone()] }], local()).unwrap();
    assert_eq!(doc.array_get("starred".into()).unwrap(), vec![item]);
    let err = doc.apply(vec![YOp::ArrayDelete { root: "starred".into(), index: 0, len: 2 }], local()).unwrap_err();
    assert!(matches!(err, YrsError::Operation { index: 0, .. }));
    assert!(matches!(doc.map_get("nope".into(), vec![]).unwrap_err(), YrsError::UnknownRoot { .. }));
    assert!(doc.apply_update(vec![1, 2, 3], "remote".into()).is_err());
}

#[test]
fn merge_and_diff_updates() {
    let a = YDocument::new(Some(1), note_roots());
    let updates = Arc::new(Mutex::new(vec![]));
    let _s = a.observe_updates(Box::new(Updates(updates.clone())));
    a.apply(vec![YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes: vec![paragraph("b1", "one")] }], local()).unwrap();
    a.apply(vec![YOp::MapSet { root: "meta".into(), path: vec![], key: "formatVersion".into(), value: YValue::Number { value: 1.0 } }], local()).unwrap();
    let all: Vec<Vec<u8>> = updates.lock().unwrap().iter().map(|u| u.0.clone()).collect();
    let merged = merge_updates(all).unwrap();
    let b = YDocument::new(Some(2), note_roots());
    b.apply_update(merged.clone(), "remote".into()).unwrap();
    assert_eq!(plain(&b, vec![0, 0]), "one");
    assert_eq!(state_vector_from_update(merged.clone()).unwrap(), a.state_vector());
    assert_eq!(diff_update(merged, a.state_vector()).unwrap().len() <= 2, true);
}

#[test]
fn relative_positions_survive_undo_mid_item() {
    let doc = YDocument::new(Some(1), note_roots());
    doc.enable_undo(vec!["content".into()], 0).unwrap();
    doc.apply(vec![YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes: vec![paragraph("b1", "")] }], local()).unwrap();
    doc.stop_capturing();
    doc.apply(vec![YOp::TextInsert { root: "content".into(), path: vec![0, 0], index: 0, chunks: vec![chunk("abcdef")] }], local()).unwrap();
    let positions: Vec<Vec<u8>> = (0..6).map(|i| doc.encode_relative_position("content".into(), vec![0, 0], i, 0).unwrap()).collect();
    doc.stop_capturing();
    doc.apply(vec![YOp::TextDelete { root: "content".into(), path: vec![0, 0], index: 0, len: 6 }], local()).unwrap();
    assert!(doc.resolve_relative_positions("content".into(), positions.clone()).unwrap().iter().all(|r| r.as_ref().unwrap().deleted));
    assert!(doc.undo());
    let r = doc.resolve_relative_positions("content".into(), positions).unwrap();
    for (i, r) in r.iter().enumerate() {
        assert_eq!(r, &Some(ResolvedIndex { path: vec![0, 0], index: i as u32, deleted: false }));
    }
}

#[test]
fn rebase_after_undo_survives_reload_on_other_peer() {
    let a = YDocument::new(Some(1), note_roots());
    a.enable_undo(vec!["content".into()], 0).unwrap();
    a.apply(vec![YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes: vec![paragraph("b1", "")] }], local()).unwrap();
    a.stop_capturing();
    a.apply(vec![YOp::TextInsert { root: "content".into(), path: vec![0, 0], index: 0, chunks: vec![chunk("abcdef")] }], local()).unwrap();
    let positions: Vec<Vec<u8>> = vec![
        a.encode_relative_position("content".into(), vec![0, 0], 2, 0).unwrap(),
        a.encode_relative_position("content".into(), vec![0, 0], 5, -1).unwrap(),
    ];
    // Live positions need no rebase.
    assert_eq!(a.rebase_relative_positions("content".into(), positions.clone()).unwrap(), vec![None, None]);
    a.stop_capturing();
    a.apply(vec![YOp::TextDelete { root: "content".into(), path: vec![0, 0], index: 0, len: 6 }], local()).unwrap();
    assert_eq!(a.rebase_relative_positions("content".into(), positions.clone()).unwrap(), vec![None, None]);
    a.undo();
    let rebased = a.rebase_relative_positions("content".into(), positions.clone()).unwrap();
    let rebased: Vec<Vec<u8>> = rebased.into_iter().map(|r| r.expect("rebased")).collect();

    // Another peer has no `redone` links: old positions are deleted there, rebased ones are live.
    let b = YDocument::new(Some(2), note_roots());
    b.apply_update(a.encode_state_as_update(None).unwrap(), "remote".into()).unwrap();
    let old = b.resolve_relative_positions("content".into(), positions).unwrap();
    assert!(old.iter().all(|r| r.as_ref().unwrap().deleted));
    let new = b.resolve_relative_positions("content".into(), rebased).unwrap();
    assert_eq!(new[0], Some(ResolvedIndex { path: vec![0, 0], index: 2, deleted: false }));
    assert_eq!(new[1], Some(ResolvedIndex { path: vec![0, 0], index: 5, deleted: false }));
}
