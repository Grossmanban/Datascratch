//! Compatibility with Yjs + y-prosemirror (fixtures from compat/generate.mjs).

use std::collections::HashMap;

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use serde_json::Value;
use yrs_ffi::*;

fn roots() -> Vec<RootDef> {
    vec![
        RootDef { name: "content".into(), kind: RootKind::XmlFragment },
        RootDef { name: "meta".into(), kind: RootKind::Map },
        RootDef { name: "strokes".into(), kind: RootKind::Map },
    ]
}

fn fixture() -> Value {
    let raw = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/compat/fixtures/yjs-note.json")).unwrap();
    serde_json::from_str(&raw).unwrap()
}

fn b64(v: &Value) -> Vec<u8> {
    URL_SAFE_NO_PAD.decode(v.as_str().unwrap()).unwrap()
}

/// XmlNode → ProseMirror JSON the way y-prosemirror's yDocToProsemirrorJSON does it.
fn to_pm(node: &XmlNode) -> Vec<Value> {
    match node {
        XmlNode::Element { name, attributes, children } => {
            let mut obj = serde_json::Map::new();
            obj.insert("type".into(), Value::String(name.clone()));
            if !attributes.is_empty() {
                obj.insert("attrs".into(), Value::Object(attributes.iter().map(|(k, v)| (k.clone(), to_json(v))).collect()));
            }
            let content: Vec<Value> = children.iter().flat_map(to_pm).collect();
            if !content.is_empty() {
                obj.insert("content".into(), Value::Array(content));
            }
            vec![Value::Object(obj)]
        }
        XmlNode::Text { chunks } => chunks
            .iter()
            .map(|c| {
                let mut obj = serde_json::Map::new();
                obj.insert("type".into(), "text".into());
                obj.insert("text".into(), Value::String(c.text.clone()));
                if !c.attributes.is_empty() {
                    let mut marks: Vec<(&String, &YValue)> = c.attributes.iter().collect();
                    marks.sort_by_key(|m| m.0.clone());
                    obj.insert(
                        "marks".into(),
                        Value::Array(
                            marks
                                .into_iter()
                                .map(|(k, v)| {
                                    let mut m = serde_json::Map::new();
                                    m.insert("type".into(), Value::String(k.clone()));
                                    if let YValue::Object { entries } = v {
                                        if !entries.is_empty() {
                                            m.insert("attrs".into(), to_json(v));
                                        }
                                    }
                                    Value::Object(m)
                                })
                                .collect(),
                        ),
                    );
                }
                Value::Object(obj)
            })
            .collect(),
    }
}

fn to_json(v: &YValue) -> Value {
    match v {
        YValue::Null | YValue::Undefined => Value::Null,
        YValue::Bool { value } => Value::Bool(*value),
        YValue::Number { value } if value.fract() == 0.0 => Value::Number((*value as i64).into()),
        YValue::Number { value } => serde_json::Number::from_f64(*value).map(Value::Number).unwrap(),
        YValue::String { value } => Value::String(value.clone()),
        YValue::Object { entries } => Value::Object(entries.iter().map(|(k, v)| (k.clone(), to_json(v))).collect()),
        other => panic!("unexpected {:?}", other),
    }
}

/// Compares PM JSON ignoring mark order and attributes y-prosemirror fills with schema defaults.
fn normalize(mut v: Value) -> Value {
    if let Value::Object(obj) = &mut v {
        if let Some(Value::Object(attrs)) = obj.get_mut("attrs") {
            attrs.retain(|_, v| !v.is_null());
            if attrs.is_empty() {
                obj.remove("attrs");
            }
        }
        if let Some(Value::Array(marks)) = obj.get_mut("marks") {
            for m in marks.iter_mut() {
                *m = normalize(m.take());
            }
            marks.sort_by_key(|m| m["type"].as_str().unwrap().to_string());
        }
        if let Some(Value::Array(content)) = obj.get_mut("content") {
            for c in content.iter_mut() {
                *c = normalize(c.take());
            }
        }
    }
    v
}

#[test]
fn reads_yjs_document() {
    let f = fixture();
    let doc = YDocument::new(None, roots());
    doc.apply_update(b64(&f["update"]), "remote".into()).unwrap();

    let children = doc.xml_children("content".into(), vec![]).unwrap();
    let pm = Value::Object(serde_json::Map::from_iter([
        ("type".to_string(), Value::String("doc".into())),
        ("content".to_string(), Value::Array(children.iter().flat_map(to_pm).collect())),
    ]));
    assert_eq!(normalize(pm), normalize(f["prosemirror"].clone()));

    assert_eq!(doc.map_get("meta".into(), vec!["formatVersion".into()]).unwrap(), Some(YValue::Number { value: 1.0 }));
    assert_eq!(doc.map_get("strokes".into(), vec!["s1".into(), "points".into()]).unwrap(), Some(YValue::Bytes { value: vec![0, 0, 128, 63] }));

    // Relative positions encoded by Yjs resolve to the same place, and Yrs encodes them identically.
    for rp in f["relativePositions"].as_array().unwrap() {
        let path: Vec<u32> = rp["path"].as_array().unwrap().iter().map(|v| v.as_u64().unwrap() as u32).collect();
        let index = rp["index"].as_u64().unwrap() as u32;
        let assoc = rp["assoc"].as_i64().unwrap() as i32;
        let encoded = b64(&rp["encoded"]);
        let resolved = doc.resolve_relative_positions("content".into(), vec![encoded.clone()]).unwrap();
        assert_eq!(resolved[0], Some(ResolvedIndex { path: path.clone(), index, deleted: false }), "{}", rp);
        assert_eq!(doc.encode_relative_position("content".into(), path, index, assoc).unwrap(), encoded, "{}", rp);
    }
}

fn s(v: &str) -> YValue {
    YValue::String { value: v.into() }
}

fn el(name: &str, attrs: &[(&str, YValue)], children: Vec<XmlNode>) -> XmlNode {
    XmlNode::Element {
        name: name.into(),
        attributes: attrs.iter().map(|(k, v)| (k.to_string(), v.clone())).collect(),
        children,
    }
}

fn text(chunks: &[(&str, &[(&str, YValue)])]) -> XmlNode {
    XmlNode::Text {
        chunks: chunks
            .iter()
            .map(|(t, marks)| TextChunk {
                text: t.to_string(),
                embed: None,
                attributes: marks.iter().map(|(k, v)| (k.to_string(), v.clone())).collect(),
            })
            .collect(),
    }
}

fn empty() -> YValue {
    YValue::Object { entries: HashMap::new() }
}

/// Writes the fixture document through yrs-ffi ops; compat/verify.mjs checks it with Yjs.
#[test]
fn writes_document_readable_by_yjs() {
    let id = |n: &str| s(&format!("0192f3c4-0000-7000-8000-0000000000{}", n));
    let link = YValue::Object { entries: HashMap::from([("href".to_string(), s("https://example.com"))]) };
    let highlight = YValue::Object { entries: HashMap::from([("color".to_string(), s("yellow"))]) };
    let nodes = vec![
        el("title", &[("blockId", id("01"))], vec![text(&[("Заметка 😀", &[])])]),
        el(
            "paragraph",
            &[("blockId", id("02"))],
            vec![
                text(&[("Hello ", &[]), ("bold", &[("bold", empty())]), (" and ", &[]), ("link", &[("link", link), ("italic", empty())])]),
                el("noteLink", &[("noteId", id("aa")), ("label", s("Other"))], vec![]),
                el("hardBreak", &[], vec![]),
                text(&[("tail", &[("highlight", highlight)])]),
            ],
        ),
        el("heading", &[("blockId", id("03")), ("level", YValue::Number { value: 2.0 })], vec![text(&[("Tasks", &[])])]),
        el(
            "taskList",
            &[("blockId", id("04"))],
            vec![el(
                "taskItem",
                &[
                    ("blockId", id("05")),
                    ("taskId", id("t1")),
                    ("state", s("done")),
                    ("scheduled", s("2026-10-25")),
                    ("completedAt", s("2026-10-25T12:00:00.000Z")),
                ],
                vec![el("paragraph", &[("blockId", id("06"))], vec![text(&[("Buy milk", &[])])])],
            )],
        ),
    ];
    let doc = YDocument::new(None, roots());
    let stroke = HashMap::from([
        ("v".to_string(), YValue::Number { value: 1.0 }),
        ("points".to_string(), YValue::Bytes { value: vec![0, 0, 128, 63] }),
        ("author".to_string(), YValue::Object { entries: HashMap::from([("kind".to_string(), s("user")), ("id".to_string(), s("u1"))]) }),
    ]);
    doc.apply(
        vec![
            YOp::XmlInsert { root: "content".into(), parent: vec![], index: 0, nodes },
            YOp::MapSet { root: "meta".into(), path: vec![], key: "formatVersion".into(), value: YValue::Number { value: 1.0 } },
            YOp::MapSet { root: "strokes".into(), path: vec![], key: "s1".into(), value: YValue::SharedMap { entries: stroke } },
        ],
        "local".into(),
    )
    .unwrap();
    let out = concat!(env!("CARGO_MANIFEST_DIR"), "/target/compat");
    std::fs::create_dir_all(out).unwrap();
    std::fs::write(format!("{}/yrs-note.bin", out), doc.encode_state_as_update(None).unwrap()).unwrap();
}
