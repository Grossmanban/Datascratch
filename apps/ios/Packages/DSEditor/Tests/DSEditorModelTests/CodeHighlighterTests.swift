import DSEditorModel
import Testing

@Suite struct CodeHighlighterTests {
    @Test func swift() {
        let code = "let x = foo(\"hi\") // done\nstruct A {}"
        let t = CodeHighlighter.tokenize(code, language: "swift")
        func kind(_ word: String) -> CodeTokenKind? {
            let u = Array(code.utf16)
            return t.first { String(decoding: u[$0.range], as: UTF16.self) == word }?.kind
        }
        #expect(kind("let") == .keyword)
        #expect(kind("foo") == .function)
        #expect(kind("\"hi\"") == .string)
        #expect(kind("// done") == .comment)
        #expect(kind("A") == .type)
    }

    @Test func pythonHashComment() {
        let t = CodeHighlighter.tokenize("x = 1 # c", language: "python")
        #expect(t.contains { $0.kind == .comment && $0.range == 6..<9 })
        #expect(t.contains { $0.kind == .number })
    }
}
