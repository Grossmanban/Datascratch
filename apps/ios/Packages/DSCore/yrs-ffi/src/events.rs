//! Observer callbacks and event conversion.

use std::collections::HashMap;

use yrs::types::{Change, Delta, Event, PathSegment};
use yrs::{Out, TransactionMut, XmlOut};

use crate::value::{attrs_to_map, out_to_value, YValue};
use crate::xml::{read_node, XmlNode};

/// Receives encoded updates (`doc.on('update')`). Runs inside the transaction: do not call back
/// into the document.
#[uniffi::export(callback_interface)]
pub trait UpdateObserver: Send + Sync {
    fn on_update(&self, update: Vec<u8>, origin: Option<String>);
}

/// Receives deep change events of one root. Runs inside the transaction: do not call back into
/// the document.
#[uniffi::export(callback_interface)]
pub trait DeepObserver: Send + Sync {
    fn on_events(&self, events: Vec<YEvent>, origin: Option<String>);
}

#[derive(Debug, Clone, PartialEq, uniffi::Enum)]
pub enum YPathSegment {
    Key { key: String },
    Index { index: u32 },
}

#[derive(Debug, Clone, PartialEq, uniffi::Enum)]
pub enum TextDelta {
    Insert { text: String, embed: Option<YValue>, attributes: HashMap<String, YValue> },
    Delete { len: u32 },
    Retain { len: u32, attributes: Option<HashMap<String, YValue>> },
}

#[derive(Debug, Clone, PartialEq, uniffi::Enum)]
pub enum XmlChildDelta {
    Insert { nodes: Vec<XmlNode> },
    Delete { count: u32 },
    Retain { count: u32 },
}

#[derive(Debug, Clone, PartialEq, uniffi::Enum)]
pub enum ArrayDelta {
    Insert { items: Vec<YValue> },
    Delete { count: u32 },
    Retain { count: u32 },
}

#[derive(Debug, Clone, PartialEq, uniffi::Enum)]
pub enum YEventKind {
    /// Characters/formatting of an `XmlText` or `Text` changed.
    Text { delta: Vec<TextDelta> },
    /// Children and/or attributes of an XML element (or the root fragment) changed.
    Xml { children: Vec<XmlChildDelta>, attributes: Vec<String> },
    /// Keys of a map changed (inserted, updated or removed).
    Map { keys: Vec<String> },
    Array { delta: Vec<ArrayDelta> },
}

/// One change. `path` leads from the observed root to the changed node.
#[derive(Debug, Clone, PartialEq, uniffi::Record)]
pub struct YEvent {
    pub path: Vec<YPathSegment>,
    pub kind: YEventKind,
}

fn path(p: yrs::types::Path) -> Vec<YPathSegment> {
    p.into_iter()
        .map(|s| match s {
            PathSegment::Key(k) => YPathSegment::Key { key: k.to_string() },
            PathSegment::Index(i) => YPathSegment::Index { index: i },
        })
        .collect()
}

fn text_delta(txn: &TransactionMut, delta: &[Delta]) -> Vec<TextDelta> {
    delta
        .iter()
        .map(|d| match d {
            Delta::Inserted(value, attrs) => {
                let attributes = attrs_to_map(attrs.as_deref());
                match value {
                    Out::Any(yrs::Any::String(s)) => TextDelta::Insert { text: s.to_string(), embed: None, attributes },
                    other => TextDelta::Insert { text: String::new(), embed: Some(out_to_value(txn, other)), attributes },
                }
            }
            Delta::Deleted(len) => TextDelta::Delete { len: *len },
            Delta::Retain(len, attrs) => TextDelta::Retain {
                len: *len,
                attributes: attrs.as_deref().map(|a| attrs_to_map(Some(a))),
            },
        })
        .collect()
}

fn sorted_keys<V>(keys: &HashMap<std::sync::Arc<str>, V>) -> Vec<String> {
    let mut out: Vec<String> = keys.keys().map(|k| k.to_string()).collect();
    out.sort();
    out
}

pub fn convert(txn: &TransactionMut, event: &Event) -> YEvent {
    match event {
        Event::Text(e) => YEvent { path: path(e.path()), kind: YEventKind::Text { delta: text_delta(txn, e.delta(txn)) } },
        Event::XmlText(e) => YEvent { path: path(e.path()), kind: YEventKind::Text { delta: text_delta(txn, e.delta(txn)) } },
        Event::XmlFragment(e) => {
            let children = if e.children_changed() {
                e.delta(txn)
                    .iter()
                    .map(|c| match c {
                        Change::Added(items) => XmlChildDelta::Insert {
                            nodes: items
                                .iter()
                                .filter_map(|o| XmlOut::try_from(o.clone()).ok())
                                .map(|n| read_node(txn, &n))
                                .collect(),
                        },
                        Change::Removed(n) => XmlChildDelta::Delete { count: *n },
                        Change::Retain(n) => XmlChildDelta::Retain { count: *n },
                    })
                    .collect()
            } else {
                vec![]
            };
            YEvent {
                path: path(e.path()),
                kind: YEventKind::Xml { children, attributes: sorted_keys(e.keys(txn)) },
            }
        }
        Event::Map(e) => YEvent { path: path(e.path()), kind: YEventKind::Map { keys: sorted_keys(e.keys(txn)) } },
        Event::Array(e) => YEvent {
            path: path(e.path()),
            kind: YEventKind::Array {
                delta: e
                    .delta(txn)
                    .iter()
                    .map(|c| match c {
                        Change::Added(items) => ArrayDelta::Insert { items: items.iter().map(|o| out_to_value(txn, o)).collect() },
                        Change::Removed(n) => ArrayDelta::Delete { count: *n },
                        Change::Retain(n) => ArrayDelta::Retain { count: *n },
                    })
                    .collect(),
            },
        },
    }
}
