import DSEditor
import Testing

@Suite struct SmokeTests {
    @Test func version() { #expect(!DSEditorInfo.version.isEmpty) }
}
