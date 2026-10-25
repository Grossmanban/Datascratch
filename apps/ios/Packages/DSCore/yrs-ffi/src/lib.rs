//! UniFFI bindings over Yrs for the Datascratch iOS client (DSCore).
//!
//! The surface is deliberately coarse: one [`YDocument`] object, nodes addressed by paths,
//! writes batched as [`YOp`] lists applied in a single transaction. No Yrs reference or
//! transaction ever crosses the FFI boundary, so there are no lifetimes to manage in Swift.
//!
//! Text offsets are UTF-16 code units (same as Yjs and `NSString`).

mod events;
mod value;
mod xml;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use yrs::updates::decoder::Decode;
use yrs::updates::encoder::Encode;
use yrs::{
    Array, ArrayRef, Assoc, Doc, IndexedSequence, Map, MapRef, OffsetKind, Options, Origin,
    ReadTxn, StateVector, StickyIndex, Text, TextRef, Transact, TransactionMut, UndoManager,
    Update, XmlFragmentRef, XmlOut,
};

pub use events::{ArrayDelta, DeepObserver, TextDelta, UpdateObserver, XmlChildDelta, YEvent, YEventKind, YPathSegment};
pub use value::YValue;
pub use xml::{TextChunk, XmlNode};

uniffi::setup_scaffolding!();

/// Transaction origin of local edits. Only these are captured by the undo manager.
pub const ORIGIN_LOCAL: &str = "local";
/// Origin reported for transactions performed by the undo manager.
pub const ORIGIN_UNDO: &str = "undo";

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum YrsError {
    #[error("decoding failed: {message}")]
    Decoding { message: String },
    #[error("invalid path: {message}")]
    InvalidPath { message: String },
    #[error("type mismatch: {message}")]
    TypeMismatch { message: String },
    #[error("unknown root: {name}")]
    UnknownRoot { name: String },
    #[error("operation {index} failed: {message}")]
    Operation { index: u32, message: String },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum RootKind {
    Map,
    Array,
    XmlFragment,
    Text,
}

/// Root shared type of a document (`Y.Doc.get*(name)`).
#[derive(Debug, Clone, uniffi::Record)]
pub struct RootDef {
    pub name: String,
    pub kind: RootKind,
}

#[derive(Clone)]
enum RootRef {
    Map(MapRef),
    Array(ArrayRef),
    Xml(XmlFragmentRef),
    Text(TextRef),
}

/// One write operation. Paths of XML ops are child indices from the XML root; paths of map
/// ops are keys of nested shared maps from the root map.
#[derive(Debug, Clone, uniffi::Enum)]
pub enum YOp {
    MapSet { root: String, path: Vec<String>, key: String, value: YValue },
    MapDelete { root: String, path: Vec<String>, key: String },
    ArrayInsert { root: String, index: u32, items: Vec<YValue> },
    ArrayDelete { root: String, index: u32, len: u32 },
    XmlInsert { root: String, parent: Vec<u32>, index: u32, nodes: Vec<XmlNode> },
    XmlDelete { root: String, parent: Vec<u32>, index: u32, len: u32 },
    XmlSetAttribute { root: String, path: Vec<u32>, key: String, value: YValue },
    XmlRemoveAttribute { root: String, path: Vec<u32>, key: String },
    TextInsert { root: String, path: Vec<u32>, index: u32, chunks: Vec<TextChunk> },
    TextDelete { root: String, path: Vec<u32>, index: u32, len: u32 },
    /// Applies formatting attributes; a `Null` value removes that attribute.
    TextFormat { root: String, path: Vec<u32>, index: u32, len: u32, attributes: HashMap<String, YValue> },
    /// Root `Y.Text` edits (not used by the note schema, kept for completeness).
    RootTextInsert { root: String, index: u32, text: String },
    RootTextDelete { root: String, index: u32, len: u32 },
}

/// Result of resolving an encoded relative position.
#[derive(Debug, Clone, PartialEq, uniffi::Record)]
pub struct ResolvedIndex {
    /// Child-index path of the node the position lives in (empty = the XML root itself).
    pub path: Vec<u32>,
    /// Absolute index (UTF-16 units for text) inside that node.
    pub index: u32,
    /// The referenced character/node has been deleted (D-35). `index` is where it used to be.
    pub deleted: bool,
}

#[derive(uniffi::Object)]
pub struct YSubscription {
    inner: Mutex<Option<yrs::Subscription>>,
}

#[uniffi::export]
impl YSubscription {
    /// Stops delivering events. Dropping the object has the same effect.
    pub fn cancel(&self) {
        self.inner.lock().unwrap().take();
    }
}

impl YSubscription {
    fn new(sub: yrs::Subscription) -> Arc<Self> {
        Arc::new(YSubscription { inner: Mutex::new(Some(sub)) })
    }
}


/// A Yjs document.
///
/// Thread-safe, but observers run synchronously inside the transaction that triggered them:
/// an observer must not call back into the same document.
#[derive(uniffi::Object)]
pub struct YDocument {
    doc: Doc,
    roots: HashMap<String, RootRef>,
    undo: Mutex<Option<UndoManager>>,
    /// Origin of undo/redo transactions, readable from observers while `undo` is locked.
    undo_origin: Arc<Mutex<Option<Origin>>>,
}

#[uniffi::export]
impl YDocument {
    /// Creates an empty document. `client_id` must be below 2^53 for Yjs compatibility; pass
    /// `None` for a random 32-bit id (what Yjs does).
    #[uniffi::constructor]
    pub fn new(client_id: Option<u64>, roots: Vec<RootDef>) -> Arc<Self> {
        let mut options = Options::default();
        if let Some(id) = client_id {
            options.client_id = id;
        } else {
            options.client_id = (options.client_id as u32) as u64;
        }
        options.offset_kind = OffsetKind::Utf16;
        let doc = Doc::with_options(options);
        let mut map = HashMap::new();
        for def in roots {
            let r = match def.kind {
                RootKind::Map => RootRef::Map(doc.get_or_insert_map(def.name.as_str())),
                RootKind::Array => RootRef::Array(doc.get_or_insert_array(def.name.as_str())),
                RootKind::XmlFragment => RootRef::Xml(doc.get_or_insert_xml_fragment(def.name.as_str())),
                RootKind::Text => RootRef::Text(doc.get_or_insert_text(def.name.as_str())),
            };
            map.insert(def.name, r);
        }
        Arc::new(YDocument { doc, roots: map, undo: Mutex::new(None), undo_origin: Arc::new(Mutex::new(None)) })
    }

    pub fn client_id(&self) -> u64 {
        self.doc.client_id()
    }

    // MARK: updates

    pub fn state_vector(&self) -> Vec<u8> {
        self.doc.transact().state_vector().encode_v1()
    }

    /// `Y.encodeStateAsUpdate(doc, stateVector)`.
    pub fn encode_state_as_update(&self, state_vector: Option<Vec<u8>>) -> Result<Vec<u8>, YrsError> {
        let sv = match state_vector {
            Some(bytes) => StateVector::decode_v1(&bytes).map_err(decoding)?,
            None => StateVector::default(),
        };
        Ok(self.doc.transact().encode_state_as_update_v1(&sv))
    }

    /// `Y.applyUpdate(doc, update, origin)`.
    pub fn apply_update(&self, update: Vec<u8>, origin: String) -> Result<(), YrsError> {
        let update = Update::decode_v1(&update).map_err(decoding)?;
        let mut txn = self.doc.transact_mut_with(origin.as_str());
        txn.apply_update(update).map_err(|e| YrsError::Decoding { message: e.to_string() })
    }

    /// Applies several updates in one transaction (faster for loading from storage).
    pub fn apply_updates(&self, updates: Vec<Vec<u8>>, origin: String) -> Result<(), YrsError> {
        let mut txn = self.doc.transact_mut_with(origin.as_str());
        for bytes in updates {
            let update = Update::decode_v1(&bytes).map_err(decoding)?;
            txn.apply_update(update).map_err(|e| YrsError::Decoding { message: e.to_string() })?;
        }
        Ok(())
    }

    // MARK: writes

    /// Applies `ops` in order inside one transaction with the given origin (`"local"` for user
    /// edits, which makes them undoable). Ops see the effects of earlier ops in the batch.
    /// On error the ops before the failing one stay applied.
    pub fn apply(&self, ops: Vec<YOp>, origin: String) -> Result<(), YrsError> {
        let mut txn = self.doc.transact_mut_with(origin.as_str());
        for (i, op) in ops.iter().enumerate() {
            self.apply_op(&mut txn, op).map_err(|e| YrsError::Operation { index: i as u32, message: e.to_string() })?;
        }
        Ok(())
    }

    // MARK: map / array reads

    /// Value at `path` inside root map `root`: an empty path returns the whole map as
    /// `SharedMap`; otherwise the last element is the key read from the nested map.
    pub fn map_get(&self, root: String, path: Vec<String>) -> Result<Option<YValue>, YrsError> {
        let map = self.map_root(&root)?;
        let txn = self.doc.transact();
        if path.is_empty() {
            return Ok(Some(value::out_to_value(&txn, &yrs::Out::YMap(map))));
        }
        let parent = nested_map(&txn, &map, &path[..path.len() - 1])?;
        Ok(match parent {
            Some(m) => m.get(&txn, path.last().unwrap()).map(|v| value::out_to_value(&txn, &v)),
            None => None,
        })
    }

    /// Keys of the (nested) map at `path`; empty if it does not exist.
    pub fn map_keys(&self, root: String, path: Vec<String>) -> Result<Vec<String>, YrsError> {
        let map = self.map_root(&root)?;
        let txn = self.doc.transact();
        Ok(match nested_map(&txn, &map, &path)? {
            Some(m) => m.keys(&txn).map(|k| k.to_string()).collect(),
            None => vec![],
        })
    }

    pub fn array_get(&self, root: String) -> Result<Vec<YValue>, YrsError> {
        let array = match self.root(&root)? {
            RootRef::Array(a) => a,
            _ => return Err(mismatch(&root, "Array")),
        };
        let txn = self.doc.transact();
        Ok(array.iter(&txn).map(|v| value::out_to_value(&txn, &v)).collect())
    }

    pub fn text_get(&self, root: String) -> Result<String, YrsError> {
        match self.root(&root)? {
            RootRef::Text(t) => Ok(yrs::GetString::get_string(&t, &self.doc.transact())),
            _ => Err(mismatch(&root, "Text")),
        }
    }

    // MARK: XML reads

    /// Children of the node at `path` (the XML root for an empty path).
    pub fn xml_children(&self, root: String, path: Vec<u32>) -> Result<Vec<XmlNode>, YrsError> {
        let fragment = self.xml_root(&root)?;
        let txn = self.doc.transact();
        let c = xml::container(&txn, &fragment, &path)?;
        Ok(c.children(&txn).iter().map(|n| xml::read_node(&txn, n)).collect())
    }

    /// Snapshot of the node at `path` with its subtree.
    pub fn xml_node(&self, root: String, path: Vec<u32>) -> Result<XmlNode, YrsError> {
        let fragment = self.xml_root(&root)?;
        let txn = self.doc.transact();
        match xml::resolve(&txn, &fragment, &path)? {
            Some(n) => Ok(xml::read_node(&txn, &n)),
            None => Ok(xml::read_node(&txn, &XmlOut::Fragment(fragment.clone()))),
        }
    }

    pub fn xml_child_count(&self, root: String, path: Vec<u32>) -> Result<u32, YrsError> {
        let fragment = self.xml_root(&root)?;
        let txn = self.doc.transact();
        Ok(xml::container(&txn, &fragment, &path)?.len(&txn))
    }

    // MARK: relative positions

    /// `Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(node, index, assoc))` for
    /// the node at `path` (a text node: index in UTF-16 units; an element: child index).
    /// `assoc >= 0` sticks to the item at `index` (Yjs default), `assoc < 0` to the one before.
    pub fn encode_relative_position(&self, root: String, path: Vec<u32>, index: u32, assoc: i32) -> Result<Vec<u8>, YrsError> {
        let fragment = self.xml_root(&root)?;
        let assoc = if assoc >= 0 { Assoc::After } else { Assoc::Before };
        let txn = self.doc.transact_mut();
        let sticky = match xml::resolve(&txn, &fragment, &path)? {
            None => fragment.sticky_index(&txn, index, assoc),
            Some(XmlOut::Text(t)) => t.sticky_index(&txn, index, assoc),
            Some(XmlOut::Element(e)) => e.sticky_index(&txn, index, assoc),
            Some(XmlOut::Fragment(f)) => f.sticky_index(&txn, index, assoc),
        };
        sticky
            .map(|s| s.encode_v1())
            .ok_or_else(|| YrsError::InvalidPath { message: format!("index {} out of bounds at {:?}", index, path) })
    }

    /// `Y.createAbsolutePositionFromRelativePosition` for many encoded positions at once
    /// (follows redone items). `None` for positions that cannot be decoded or that point
    /// outside the XML root `root`.
    pub fn resolve_relative_positions(&self, root: String, positions: Vec<Vec<u8>>) -> Result<Vec<Option<ResolvedIndex>>, YrsError> {
        let fragment = self.xml_root(&root)?;
        let txn = self.doc.transact();
        let paths = xml::index_paths(&txn, &fragment);
        let state = txn.state_vector();
        let root_id = yrs::branch::Branch::id(fragment.as_ref());
        Ok(positions
            .iter()
            .map(|bytes| {
                let sticky = StickyIndex::decode_v1(bytes).ok()?;
                let offset = match sticky.get_offset(&txn) {
                    Some(o) => o,
                    // Known but unresolvable item: it was deleted and garbage-collected.
                    None => {
                        let id = sticky.id()?;
                        return (state.get(&id.client) > id.clock)
                            .then(|| ResolvedIndex { path: vec![], index: 0, deleted: true });
                    }
                };
                let deleted = match sticky.scope() {
                    yrs::IndexScope::Relative(_) => {
                        let after = StickyIndex::new(sticky.scope().clone(), Assoc::After).get_offset(&txn)?;
                        let before = StickyIndex::new(sticky.scope().clone(), Assoc::Before).get_offset(&txn)?;
                        after.index == before.index
                    }
                    _ => false,
                };
                let branch_id = offset.branch.id();
                if branch_id == root_id {
                    return Some(ResolvedIndex { path: vec![], index: offset.index, deleted });
                }
                match paths.get(&branch_id) {
                    Some(path) => Some(ResolvedIndex { path: path.clone(), index: offset.index, deleted }),
                    // The containing node itself is not in the live tree: it was deleted.
                    None if is_inside(&offset.branch, &fragment) => {
                        Some(ResolvedIndex { path: vec![], index: 0, deleted: true })
                    }
                    None => None,
                }
            })
            .collect())
    }

    /// Rebases positions that point at deleted items which were restored by undo/redo
    /// (strokes.md §4.1): for each such position returns a new encoding pointing at the
    /// restored item; `None` for positions that need no change (live, deleted for good, or
    /// undecodable). The `redone` link is local to this document instance, so this must run on
    /// the device that performed the undo/redo.
    pub fn rebase_relative_positions(&self, root: String, positions: Vec<Vec<u8>>) -> Result<Vec<Option<Vec<u8>>>, YrsError> {
        let fragment = self.xml_root(&root)?;
        let txn = self.doc.transact();
        Ok(positions
            .iter()
            .map(|bytes| {
                let sticky = StickyIndex::decode_v1(bytes).ok()?;
                if !sticky.is_relative() {
                    return None;
                }
                let offset = sticky.get_offset(&txn)?;
                let after = StickyIndex::new(sticky.scope().clone(), Assoc::After).get_offset(&txn)?;
                let before = StickyIndex::new(sticky.scope().clone(), Assoc::Before).get_offset(&txn)?;
                if after.index == before.index || !is_inside(&offset.branch, &fragment) {
                    return None; // deleted for good (or outside the content tree)
                }
                let rebased = StickyIndex::at(&txn, offset.branch, offset.index, sticky.assoc)?.encode_v1();
                (rebased != *bytes).then_some(rebased)
            })
            .collect())
    }

    // MARK: observation

    /// Calls `observer` with every update produced by a transaction (`doc.on('update')`).
    pub fn observe_updates(&self, observer: Box<dyn UpdateObserver>) -> Arc<YSubscription> {
        let undo = self.undo_origin.clone();
        let sub = self
            .doc
            .observe_update_v1(move |txn, event| {
                let origin = origin_name(txn.origin(), &undo);
                observer.on_update(event.update.clone(), origin);
            })
            .expect("observe_update_v1");
        YSubscription::new(sub)
    }

    /// Calls `observer` with all changes under root `root` (`type.observeDeep`).
    pub fn observe_deep(&self, root: String, observer: Box<dyn DeepObserver>) -> Result<Arc<YSubscription>, YrsError> {
        use yrs::DeepObservable;
        let undo = self.undo_origin.clone();
        let observer: Arc<dyn DeepObserver> = Arc::from(observer);
        let callback = move |txn: &TransactionMut, events: &yrs::types::Events| {
            let origin = origin_name(txn.origin(), &undo);
            let converted: Vec<YEvent> = events.iter().map(|e| events::convert(txn, e)).collect();
            observer.on_events(converted, origin);
        };
        let sub = match self.root(&root)? {
            RootRef::Map(m) => m.observe_deep(callback),
            RootRef::Array(a) => a.observe_deep(callback),
            RootRef::Xml(x) => x.observe_deep(callback),
            RootRef::Text(t) => t.observe_deep(callback),
        };
        Ok(YSubscription::new(sub))
    }

    // MARK: undo

    /// Enables undo/redo over the given roots. Only transactions with origin `"local"` are
    /// captured; consecutive edits within `capture_timeout_ms` merge into one step.
    pub fn enable_undo(&self, roots: Vec<String>, capture_timeout_ms: u64) -> Result<(), YrsError> {
        let mut options = yrs::undo::Options::default();
        options.capture_timeout_millis = capture_timeout_ms;
        let mut refs = Vec::new();
        for name in &roots {
            refs.push(self.root(name)?);
        }
        let first = refs.first().ok_or_else(|| YrsError::UnknownRoot { name: "<none>".into() })?;
        let mut manager = match first {
            RootRef::Map(m) => UndoManager::with_scope_and_options(&self.doc, m, options),
            RootRef::Array(a) => UndoManager::with_scope_and_options(&self.doc, a, options),
            RootRef::Xml(x) => UndoManager::with_scope_and_options(&self.doc, x, options),
            RootRef::Text(t) => UndoManager::with_scope_and_options(&self.doc, t, options),
        };
        for r in refs.iter().skip(1) {
            match r {
                RootRef::Map(m) => manager.expand_scope(m),
                RootRef::Array(a) => manager.expand_scope(a),
                RootRef::Xml(x) => manager.expand_scope(x),
                RootRef::Text(t) => manager.expand_scope(t),
            }
        }
        manager.include_origin(ORIGIN_LOCAL);
        *self.undo_origin.lock().unwrap() = Some(manager.as_origin());
        *self.undo.lock().unwrap() = Some(manager);
        Ok(())
    }

    pub fn undo(&self) -> bool {
        self.with_undo(|u| u.undo_blocking())
    }

    pub fn redo(&self) -> bool {
        self.with_undo(|u| u.redo_blocking())
    }

    pub fn can_undo(&self) -> bool {
        self.with_undo(|u| u.can_undo())
    }

    pub fn can_redo(&self) -> bool {
        self.with_undo(|u| u.can_redo())
    }

    /// Ends the current capture group: the next edit becomes a separate undo step.
    pub fn stop_capturing(&self) {
        self.with_undo(|u| {
            u.reset();
            true
        });
    }

    pub fn clear_undo(&self) {
        self.with_undo(|u| {
            u.clear();
            true
        });
    }
}

/// `Y.mergeUpdates`.
#[uniffi::export]
pub fn merge_updates(updates: Vec<Vec<u8>>) -> Result<Vec<u8>, YrsError> {
    yrs::merge_updates_v1(updates.iter().map(|u| u.as_slice())).map_err(|e| YrsError::Decoding { message: e.to_string() })
}

/// `Y.diffUpdate`.
#[uniffi::export]
pub fn diff_update(update: Vec<u8>, state_vector: Vec<u8>) -> Result<Vec<u8>, YrsError> {
    yrs::diff_updates_v1(&update, &state_vector).map_err(|e| YrsError::Decoding { message: e.to_string() })
}

/// `Y.encodeStateVectorFromUpdate`.
#[uniffi::export]
pub fn state_vector_from_update(update: Vec<u8>) -> Result<Vec<u8>, YrsError> {
    yrs::encode_state_vector_from_update_v1(&update).map_err(|e| YrsError::Decoding { message: e.to_string() })
}

impl YDocument {
    fn root(&self, name: &str) -> Result<RootRef, YrsError> {
        self.roots.get(name).cloned().ok_or_else(|| YrsError::UnknownRoot { name: name.to_string() })
    }

    fn map_root(&self, name: &str) -> Result<MapRef, YrsError> {
        match self.root(name)? {
            RootRef::Map(m) => Ok(m),
            _ => Err(mismatch(name, "Map")),
        }
    }

    fn xml_root(&self, name: &str) -> Result<XmlFragmentRef, YrsError> {
        match self.root(name)? {
            RootRef::Xml(x) => Ok(x),
            _ => Err(mismatch(name, "XmlFragment")),
        }
    }

    fn with_undo(&self, f: impl FnOnce(&mut UndoManager) -> bool) -> bool {
        match self.undo.lock().unwrap().as_mut() {
            Some(u) => f(u),
            None => false,
        }
    }

    fn apply_op(&self, txn: &mut TransactionMut, op: &YOp) -> Result<(), YrsError> {
        match op {
            YOp::MapSet { root, path, key, value } => {
                let map = self.map_root(root)?;
                let target = nested_map(txn, &map, path)?.ok_or_else(|| missing_map(path))?;
                target.insert(txn, key.as_str(), value::value_to_in(value));
            }
            YOp::MapDelete { root, path, key } => {
                let map = self.map_root(root)?;
                if let Some(target) = nested_map(txn, &map, path)? {
                    target.remove(txn, key);
                }
            }
            YOp::ArrayInsert { root, index, items } => {
                let array = match self.root(root)? {
                    RootRef::Array(a) => a,
                    _ => return Err(mismatch(root, "Array")),
                };
                if *index > array.len(txn) {
                    return Err(YrsError::InvalidPath { message: format!("array index {} out of bounds", index) });
                }
                for (i, item) in items.iter().enumerate() {
                    array.insert(txn, index + i as u32, value::value_to_in(item));
                }
            }
            YOp::ArrayDelete { root, index, len } => {
                let array = match self.root(root)? {
                    RootRef::Array(a) => a,
                    _ => return Err(mismatch(root, "Array")),
                };
                if index + len > array.len(txn) {
                    return Err(YrsError::InvalidPath { message: format!("array range {}+{} out of bounds", index, len) });
                }
                array.remove_range(txn, *index, *len);
            }
            YOp::XmlInsert { root, parent, index, nodes } => {
                let fragment = self.xml_root(root)?;
                let c = xml::container(txn, &fragment, parent)?;
                xml::insert_nodes(txn, &c, *index, nodes)?;
            }
            YOp::XmlDelete { root, parent, index, len } => {
                let fragment = self.xml_root(root)?;
                let c = xml::container(txn, &fragment, parent)?;
                if index + len > c.len(txn) {
                    return Err(YrsError::InvalidPath { message: format!("child range {}+{} out of bounds at {:?}", index, len, parent) });
                }
                c.remove_range(txn, *index, *len);
            }
            YOp::XmlSetAttribute { root, path, key, value } => {
                use yrs::Xml;
                let fragment = self.xml_root(root)?;
                let el = xml::element(txn, &fragment, path)?;
                el.insert_attribute(txn, key.as_str(), value::value_to_any(value));
            }
            YOp::XmlRemoveAttribute { root, path, key } => {
                use yrs::Xml;
                let fragment = self.xml_root(root)?;
                let el = xml::element(txn, &fragment, path)?;
                el.remove_attribute(txn, key);
            }
            YOp::TextInsert { root, path, index, chunks } => {
                let fragment = self.xml_root(root)?;
                let t = xml::text(txn, &fragment, path)?;
                check_text_range(txn, &t, *index, 0)?;
                xml::insert_chunks(txn, &t, *index, chunks);
            }
            YOp::TextDelete { root, path, index, len } => {
                let fragment = self.xml_root(root)?;
                let t = xml::text(txn, &fragment, path)?;
                check_text_range(txn, &t, *index, *len)?;
                t.remove_range(txn, *index, *len);
            }
            YOp::TextFormat { root, path, index, len, attributes } => {
                let fragment = self.xml_root(root)?;
                let t = xml::text(txn, &fragment, path)?;
                check_text_range(txn, &t, *index, *len)?;
                t.format(txn, *index, *len, value::map_to_attrs(attributes));
            }
            YOp::RootTextInsert { root, index, text } => match self.root(root)? {
                RootRef::Text(t) => {
                    if *index > t.len(txn) {
                        return Err(YrsError::InvalidPath { message: format!("text index {} out of bounds", index) });
                    }
                    t.insert(txn, *index, text)
                }
                _ => return Err(mismatch(root, "Text")),
            },
            YOp::RootTextDelete { root, index, len } => match self.root(root)? {
                RootRef::Text(t) => {
                    if index + len > t.len(txn) {
                        return Err(YrsError::InvalidPath { message: format!("text range {}+{} out of bounds", index, len) });
                    }
                    t.remove_range(txn, *index, *len)
                }
                _ => return Err(mismatch(root, "Text")),
            },
        }
        Ok(())
    }
}

fn check_text_range<T: ReadTxn>(txn: &T, text: &yrs::XmlTextRef, index: u32, len: u32) -> Result<(), YrsError> {
    let total = text.len(txn);
    if index + len > total {
        return Err(YrsError::InvalidPath { message: format!("text range {}+{} out of bounds ({})", index, len, total) });
    }
    Ok(())
}

fn nested_map<T: ReadTxn>(txn: &T, root: &MapRef, path: &[String]) -> Result<Option<MapRef>, YrsError> {
    let mut current = root.clone();
    for key in path {
        match current.get(txn, key) {
            Some(yrs::Out::YMap(m)) => current = m,
            Some(_) => return Err(YrsError::TypeMismatch { message: format!("{:?}: '{}' is not a shared map", path, key) }),
            None => return Ok(None),
        }
    }
    Ok(Some(current))
}

fn is_inside(branch: &yrs::branch::BranchPtr, root: &XmlFragmentRef) -> bool {
    use yrs::Xml;
    let root_id = yrs::branch::Branch::id(root.as_ref());
    let mut current = XmlOut::try_from(*branch).ok();
    while let Some(node) = current {
        if node.id() == root_id {
            return true;
        }
        current = match &node {
            XmlOut::Element(e) => e.parent(),
            XmlOut::Text(t) => t.parent(),
            XmlOut::Fragment(f) => f.parent(),
        };
    }
    false
}

fn origin_name(origin: Option<&Origin>, undo_origin: &Mutex<Option<Origin>>) -> Option<String> {
    let origin = origin?;
    if undo_origin.lock().unwrap().as_ref() == Some(origin) {
        return Some(ORIGIN_UNDO.to_string());
    }
    let bytes: &[u8] = origin.as_ref();
    Some(String::from_utf8_lossy(bytes).into_owned())
}

fn decoding(e: impl std::fmt::Display) -> YrsError {
    YrsError::Decoding { message: e.to_string() }
}

fn mismatch(root: &str, expected: &str) -> YrsError {
    YrsError::TypeMismatch { message: format!("root '{}' is not a {}", root, expected) }
}

fn missing_map(path: &[String]) -> YrsError {
    YrsError::InvalidPath { message: format!("no shared map at {:?}", path) }
}

#[cfg(test)]
mod tests;
