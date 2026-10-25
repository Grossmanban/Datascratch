//! XML tree (y-prosemirror layout) read/write helpers.

use std::collections::HashMap;

use yrs::types::text::YChange;
use yrs::{
    Out, ReadTxn, Text, TransactionMut, Xml, XmlElementPrelim, XmlElementRef, XmlFragment,
    XmlFragmentRef, XmlOut, XmlTextPrelim, XmlTextRef,
};

use crate::value::{attrs_to_map, map_to_attrs, out_to_value, value_to_any, YValue};
use crate::YrsError;

/// One run of an `XmlText`: either a string or an embedded value, with formatting attributes
/// (ProseMirror marks in the y-prosemirror layout).
#[derive(Debug, Clone, PartialEq, uniffi::Record)]
pub struct TextChunk {
    pub text: String,
    /// Non-text embed. When set, `text` is ignored.
    pub embed: Option<YValue>,
    pub attributes: HashMap<String, YValue>,
}

/// A node of the XML tree.
#[derive(Debug, Clone, PartialEq, uniffi::Enum)]
pub enum XmlNode {
    Element {
        name: String,
        attributes: HashMap<String, YValue>,
        children: Vec<XmlNode>,
    },
    Text {
        chunks: Vec<TextChunk>,
    },
}

/// Resolves a child-index path starting at `root`.
pub fn resolve<T: ReadTxn>(txn: &T, root: &XmlFragmentRef, path: &[u32]) -> Result<Option<XmlOut>, YrsError> {
    if path.is_empty() {
        return Ok(None);
    }
    let mut current: XmlOut = root
        .get(txn, path[0])
        .ok_or_else(|| invalid(path, 0))?;
    for (depth, index) in path.iter().enumerate().skip(1) {
        current = match &current {
            XmlOut::Element(el) => el.get(txn, *index).ok_or_else(|| invalid(path, depth))?,
            XmlOut::Fragment(fr) => fr.get(txn, *index).ok_or_else(|| invalid(path, depth))?,
            XmlOut::Text(_) => return Err(invalid(path, depth)),
        };
    }
    Ok(Some(current))
}

fn invalid(path: &[u32], depth: usize) -> YrsError {
    YrsError::InvalidPath { message: format!("{:?} has no node at depth {}", path, depth) }
}

pub enum Container {
    Fragment(XmlFragmentRef),
    Element(XmlElementRef),
}

impl Container {
    pub fn len<T: ReadTxn>(&self, txn: &T) -> u32 {
        match self {
            Container::Fragment(f) => f.len(txn),
            Container::Element(e) => e.len(txn),
        }
    }
    pub fn children<T: ReadTxn>(&self, txn: &T) -> Vec<XmlOut> {
        match self {
            Container::Fragment(f) => f.children(txn).collect(),
            Container::Element(e) => e.children(txn).collect(),
        }
    }
    fn insert_element(&self, txn: &mut TransactionMut, index: u32, name: &str) -> XmlElementRef {
        let prelim = XmlElementPrelim::empty(name);
        match self {
            Container::Fragment(f) => f.insert(txn, index, prelim),
            Container::Element(e) => e.insert(txn, index, prelim),
        }
    }
    fn insert_text(&self, txn: &mut TransactionMut, index: u32) -> XmlTextRef {
        let prelim = XmlTextPrelim::new("");
        match self {
            Container::Fragment(f) => f.insert(txn, index, prelim),
            Container::Element(e) => e.insert(txn, index, prelim),
        }
    }
    pub fn remove_range(&self, txn: &mut TransactionMut, index: u32, len: u32) {
        match self {
            Container::Fragment(f) => f.remove_range(txn, index, len),
            Container::Element(e) => e.remove_range(txn, index, len),
        }
    }
}

/// Resolves a path to a node that can hold children (the root itself for an empty path).
pub fn container<T: ReadTxn>(txn: &T, root: &XmlFragmentRef, path: &[u32]) -> Result<Container, YrsError> {
    match resolve(txn, root, path)? {
        None => Ok(Container::Fragment(root.clone())),
        Some(XmlOut::Element(e)) => Ok(Container::Element(e)),
        Some(XmlOut::Fragment(f)) => Ok(Container::Fragment(f)),
        Some(XmlOut::Text(_)) => Err(YrsError::TypeMismatch {
            message: format!("{:?} is a text node, expected an element", path),
        }),
    }
}

pub fn element<T: ReadTxn>(txn: &T, root: &XmlFragmentRef, path: &[u32]) -> Result<XmlElementRef, YrsError> {
    match resolve(txn, root, path)? {
        Some(XmlOut::Element(e)) => Ok(e),
        _ => Err(YrsError::TypeMismatch { message: format!("{:?} is not an element", path) }),
    }
}

pub fn text<T: ReadTxn>(txn: &T, root: &XmlFragmentRef, path: &[u32]) -> Result<XmlTextRef, YrsError> {
    match resolve(txn, root, path)? {
        Some(XmlOut::Text(t)) => Ok(t),
        _ => Err(YrsError::TypeMismatch { message: format!("{:?} is not a text node", path) }),
    }
}

/// Snapshot of a node and its subtree.
pub fn read_node<T: ReadTxn>(txn: &T, node: &XmlOut) -> XmlNode {
    match node {
        XmlOut::Element(el) => XmlNode::Element {
            name: el.tag().to_string(),
            attributes: el
                .attributes(txn)
                .map(|(k, v)| (k.to_string(), out_to_value(txn, &v)))
                .collect(),
            children: el.children(txn).map(|c| read_node(txn, &c)).collect(),
        },
        XmlOut::Fragment(fr) => XmlNode::Element {
            name: String::new(),
            attributes: HashMap::new(),
            children: fr.children(txn).map(|c| read_node(txn, &c)).collect(),
        },
        XmlOut::Text(t) => XmlNode::Text { chunks: read_text(txn, t) },
    }
}

pub fn read_text<T: ReadTxn>(txn: &T, text: &XmlTextRef) -> Vec<TextChunk> {
    text.diff(txn, YChange::identity)
        .into_iter()
        .map(|d| {
            let attributes = attrs_to_map(d.attributes.as_deref());
            match &d.insert {
                Out::Any(yrs::Any::String(s)) => TextChunk { text: s.to_string(), embed: None, attributes },
                other => TextChunk { text: String::new(), embed: Some(out_to_value(txn, other)), attributes },
            }
        })
        .collect()
}

/// Inserts `nodes` (with their whole subtrees) into `parent` at `index`.
pub fn insert_nodes(txn: &mut TransactionMut, parent: &Container, index: u32, nodes: &[XmlNode]) -> Result<(), YrsError> {
    if index > parent.len(txn) {
        return Err(YrsError::InvalidPath {
            message: format!("insert index {} is out of bounds ({})", index, parent.len(txn)),
        });
    }
    for (offset, node) in nodes.iter().enumerate() {
        let at = index + offset as u32;
        match node {
            XmlNode::Element { name, attributes, children } => {
                let el = parent.insert_element(txn, at, name);
                for (key, value) in sorted(attributes) {
                    el.insert_attribute(txn, key.as_str(), value_to_any(value));
                }
                insert_nodes(txn, &Container::Element(el), 0, children)?;
            }
            XmlNode::Text { chunks } => {
                let t = parent.insert_text(txn, at);
                insert_chunks(txn, &t, 0, chunks);
            }
        }
    }
    Ok(())
}

/// Inserts text chunks into an existing text node starting at `index`.
pub fn insert_chunks(txn: &mut TransactionMut, text: &XmlTextRef, index: u32, chunks: &[TextChunk]) {
    let mut at = index;
    for chunk in chunks {
        let attrs = map_to_attrs(&chunk.attributes);
        match &chunk.embed {
            Some(embed) => {
                text.insert_embed_with_attributes(txn, at, value_to_any(embed), attrs);
                at += 1;
            }
            None => {
                if chunk.text.is_empty() {
                    continue;
                }
                // Always explicit: like Yjs, attributes active at `at` but absent here are
                // negated, so a chunk never inherits the formatting of its left neighbour.
                text.insert_with_attributes(txn, at, &chunk.text, attrs);
                at += chunk.text.encode_utf16().count() as u32;
            }
        }
    }
}

/// Deterministic attribute order so that identical inputs produce identical updates.
pub fn sorted(map: &HashMap<String, YValue>) -> Vec<(&String, &YValue)> {
    let mut entries: Vec<_> = map.iter().collect();
    entries.sort_by(|a, b| a.0.cmp(b.0));
    entries
}

/// Walks the tree and records the child-index path of every live shared node.
pub fn index_paths<T: ReadTxn>(txn: &T, root: &XmlFragmentRef) -> HashMap<yrs::branch::BranchID, Vec<u32>> {
    let mut out = HashMap::new();
    let mut stack: Vec<(XmlOut, Vec<u32>)> = root
        .children(txn)
        .enumerate()
        .map(|(i, c)| (c, vec![i as u32]))
        .collect();
    while let Some((node, path)) = stack.pop() {
        if let XmlOut::Element(el) = &node {
            for (i, child) in el.children(txn).enumerate() {
                let mut p = path.clone();
                p.push(i as u32);
                stack.push((child, p));
            }
        }
        out.insert(node.id(), path);
    }
    out
}
