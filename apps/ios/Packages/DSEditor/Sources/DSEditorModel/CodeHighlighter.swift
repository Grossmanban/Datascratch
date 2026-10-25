import Foundation

/// Token kinds for code block highlighting.
public enum CodeTokenKind: String, Sendable, CaseIterable {
    case keyword, string, comment, number, type, function, punctuation
}

public struct CodeToken: Equatable, Sendable {
    public var kind: CodeTokenKind
    /// UTF-16 range in the code text.
    public var range: Range<Int>
}

/// Small, fast, dependency-free highlighter: comments, strings, numbers, keywords, types, calls.
/// Good enough for notes; exact grammars are not a goal.
public enum CodeHighlighter {
    static let keywords: [String: Set<String>] = [
        "swift": ["func", "let", "var", "if", "else", "guard", "return", "struct", "class", "enum", "protocol", "extension",
                  "import", "for", "in", "while", "switch", "case", "default", "break", "continue", "public", "private",
                  "internal", "fileprivate", "static", "self", "Self", "init", "deinit", "throws", "throw", "try", "catch",
                  "do", "async", "await", "actor", "some", "any", "where", "nil", "true", "false", "inout", "defer", "repeat",
                  "override", "final", "mutating", "lazy", "weak", "unowned", "typealias", "associatedtype", "is", "as"],
        "js": ["function", "const", "let", "var", "if", "else", "return", "for", "while", "do", "switch", "case", "default",
               "break", "continue", "class", "extends", "new", "this", "import", "export", "from", "async", "await", "try",
               "catch", "finally", "throw", "typeof", "instanceof", "null", "undefined", "true", "false", "of", "in",
               "interface", "type", "enum", "implements", "public", "private", "readonly", "as", "yield", "static"],
        "python": ["def", "class", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "is", "None",
                   "True", "False", "import", "from", "as", "with", "try", "except", "finally", "raise", "lambda", "yield",
                   "pass", "break", "continue", "global", "nonlocal", "async", "await", "self"],
        "generic": ["if", "else", "for", "while", "return", "function", "func", "def", "class", "struct", "let", "var",
                    "const", "import", "true", "false", "null", "nil", "None", "new", "public", "private", "static"],
    ]

    static func family(_ language: String?) -> String {
        switch language?.lowercased() {
        case "swift": "swift"
        case "js", "javascript", "ts", "typescript", "jsx", "tsx", "json": "js"
        case "py", "python": "python"
        default: "generic"
        }
    }

    public static func tokenize(_ code: String, language: String?) -> [CodeToken] {
        let fam = family(language)
        let kw = keywords[fam] ?? keywords["generic"]!
        let hashComments = fam == "python" || ["sh", "bash", "ruby", "rb", "yaml", "yml"].contains(language?.lowercased() ?? "")
        let u = Array(code.utf16)
        var tokens: [CodeToken] = []
        var i = 0
        func isIdentStart(_ c: UInt16) -> Bool { (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c == 95 || c > 127 }
        func isIdent(_ c: UInt16) -> Bool { isIdentStart(c) || (c >= 48 && c <= 57) }
        while i < u.count {
            let c = u[i]
            // Comments.
            if c == 0x2F, i + 1 < u.count, u[i + 1] == 0x2F, !hashComments || fam == "js" {
                let s = i
                while i < u.count, u[i] != 0x0A { i += 1 }
                tokens.append(CodeToken(kind: .comment, range: s..<i))
                continue
            }
            if c == 0x2F, i + 1 < u.count, u[i + 1] == 0x2A {
                let s = i
                i += 2
                while i + 1 < u.count, !(u[i] == 0x2A && u[i + 1] == 0x2F) { i += 1 }
                i = min(u.count, i + 2)
                tokens.append(CodeToken(kind: .comment, range: s..<i))
                continue
            }
            if c == 0x23, hashComments {
                let s = i
                while i < u.count, u[i] != 0x0A { i += 1 }
                tokens.append(CodeToken(kind: .comment, range: s..<i))
                continue
            }
            // Strings.
            if c == 0x22 || c == 0x27 || c == 0x60 {
                let s = i
                i += 1
                while i < u.count, u[i] != c, u[i] != 0x0A || c == 0x60 {
                    if u[i] == 0x5C { i += 1 }
                    i += 1
                }
                i = min(u.count, i + 1)
                tokens.append(CodeToken(kind: .string, range: s..<i))
                continue
            }
            // Numbers.
            if c >= 48, c <= 57 {
                let s = i
                while i < u.count, isIdent(u[i]) || u[i] == 0x2E { i += 1 }
                tokens.append(CodeToken(kind: .number, range: s..<i))
                continue
            }
            if isIdentStart(c) {
                let s = i
                while i < u.count, isIdent(u[i]) { i += 1 }
                let word = String(decoding: u[s..<i], as: UTF16.self)
                if kw.contains(word) {
                    tokens.append(CodeToken(kind: .keyword, range: s..<i))
                } else if i < u.count, u[i] == 0x28 {
                    tokens.append(CodeToken(kind: .function, range: s..<i))
                } else if c >= 65, c <= 90 {
                    tokens.append(CodeToken(kind: .type, range: s..<i))
                }
                continue
            }
            i += 1
        }
        return tokens
    }
}
