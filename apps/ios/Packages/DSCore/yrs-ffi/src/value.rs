//! Conversion between Yrs values and the FFI-friendly [`YValue`].

use std::collections::HashMap;
use std::sync::Arc;

use yrs::{
    Any, Array, ArrayPrelim, GetString, In, Map, MapPrelim, Out, ReadTxn, TextPrelim,
};

/// A value stored in a Yjs document.
///
/// `Object` / `List` are plain JSON-like values (Yjs `ContentAny`): they are replaced as a whole.
/// `SharedMap` / `SharedArray` / `SharedText` are nested shared types (`Y.Map`, `Y.Array`,
/// `Y.Text`): their fields merge independently between peers. When writing, the variant decides
/// which of the two is created.
#[derive(Debug, Clone, PartialEq, uniffi::Enum)]
pub enum YValue {
    Undefined,
    Null,
    Bool { value: bool },
    Number { value: f64 },
    BigInt { value: i64 },
    String { value: String },
    Bytes { value: Vec<u8> },
    List { items: Vec<YValue> },
    Object { entries: HashMap<String, YValue> },
    SharedMap { entries: HashMap<String, YValue> },
    SharedArray { items: Vec<YValue> },
    SharedText { text: String },
    /// A shared type that has no FFI representation (XML nodes outside the content tree,
    /// sub-documents). Preserved in the document, read-only here.
    Unsupported { type_name: String },
}

impl From<&Any> for YValue {
    fn from(any: &Any) -> Self {
        match any {
            Any::Null => YValue::Null,
            Any::Undefined => YValue::Undefined,
            Any::Bool(v) => YValue::Bool { value: *v },
            Any::Number(v) => YValue::Number { value: *v },
            Any::BigInt(v) => YValue::BigInt { value: *v },
            Any::String(v) => YValue::String { value: v.to_string() },
            Any::Buffer(v) => YValue::Bytes { value: v.to_vec() },
            Any::Array(items) => YValue::List { items: items.iter().map(YValue::from).collect() },
            Any::Map(entries) => YValue::Object {
                entries: entries.iter().map(|(k, v)| (k.clone(), YValue::from(v))).collect(),
            },
        }
    }
}

/// Reads an [`Out`] into a [`YValue`], materialising nested shared types.
pub fn out_to_value<T: ReadTxn>(txn: &T, out: &Out) -> YValue {
    match out {
        Out::Any(any) => YValue::from(any),
        Out::YText(text) => YValue::SharedText { text: text.get_string(txn) },
        Out::YArray(array) => YValue::SharedArray {
            items: array.iter(txn).map(|v| out_to_value(txn, &v)).collect(),
        },
        Out::YMap(map) => YValue::SharedMap {
            entries: map
                .iter(txn)
                .map(|(k, v)| (k.to_string(), out_to_value(txn, &v)))
                .collect(),
        },
        Out::YXmlElement(_) => YValue::Unsupported { type_name: "XmlElement".into() },
        Out::YXmlFragment(_) => YValue::Unsupported { type_name: "XmlFragment".into() },
        Out::YXmlText(_) => YValue::Unsupported { type_name: "XmlText".into() },
        Out::YDoc(_) => YValue::Unsupported { type_name: "Doc".into() },
        Out::UndefinedRef(_) => YValue::Undefined,
    }
}

/// Converts a value into a plain [`Any`]. Shared variants are flattened into plain values.
pub fn value_to_any(value: &YValue) -> Any {
    match value {
        YValue::Undefined | YValue::Unsupported { .. } => Any::Undefined,
        YValue::Null => Any::Null,
        YValue::Bool { value } => Any::Bool(*value),
        YValue::Number { value } => Any::Number(*value),
        YValue::BigInt { value } => Any::BigInt(*value),
        YValue::String { value } => Any::String(Arc::from(value.as_str())),
        YValue::SharedText { text } => Any::String(Arc::from(text.as_str())),
        YValue::Bytes { value } => Any::Buffer(Arc::from(value.as_slice())),
        YValue::List { items } | YValue::SharedArray { items } => {
            Any::Array(items.iter().map(value_to_any).collect::<Vec<_>>().into())
        }
        YValue::Object { entries } | YValue::SharedMap { entries } => Any::Map(Arc::new(
            entries.iter().map(|(k, v)| (k.clone(), value_to_any(v))).collect(),
        )),
    }
}

/// Converts a value into an insertable [`In`], creating shared types for shared variants.
pub fn value_to_in(value: &YValue) -> In {
    match value {
        YValue::SharedMap { entries } => In::Map(MapPrelim::from_iter(
            entries.iter().map(|(k, v)| (k.clone(), value_to_in(v))),
        )),
        YValue::SharedArray { items } => {
            In::Array(ArrayPrelim::from_iter(items.iter().map(value_to_in)))
        }
        YValue::SharedText { text } => In::Text(TextPrelim::new(text.as_str()).into()),
        other => In::Any(value_to_any(other)),
    }
}

/// Converts formatting attributes into the FFI map.
pub fn attrs_to_map(attrs: Option<&yrs::types::Attrs>) -> HashMap<String, YValue> {
    attrs
        .map(|a| a.iter().map(|(k, v)| (k.to_string(), YValue::from(v))).collect())
        .unwrap_or_default()
}

/// Converts the FFI map into formatting attributes.
pub fn map_to_attrs(map: &HashMap<String, YValue>) -> yrs::types::Attrs {
    map.iter().map(|(k, v)| (Arc::from(k.as_str()), value_to_any(v))).collect()
}

