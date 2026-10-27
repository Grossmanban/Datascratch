import Foundation
import Testing
@testable import DSEditorModel

/// Comparable shape of document content: type, attributes (without generated ids and nulls),
/// inline runs with their marks, children. Built from our blocks and from ProseMirror JSON.
private indirect enum Shape: Equatable, CustomStringConvertible {
    case block(String, [String: JSONValue], [Shape])
    case text(String, [String: JSONValue])
    case atom(String, [String: JSONValue], [String: JSONValue])

    var description: String {
        switch self {
        case .block(let t, let a, let c): "\(t)\(a.isEmpty ? "" : "\(a)")[\(c.map(\.description).joined(separator: ", "))]"
        case .text(let s, let m): m.isEmpty ? "\"\(s)\"" : "\"\(s)\"\(m.keys.sorted())"
        case .atom(let t, let a, _): "<\(t) \(a)>"
        }
    }
}

private func shape(_ b: BlockNode) -> Shape {
    let attrs = b.attrs.filter { $0.key != "blockId" && $0.key != "taskId" && $0.key != PasteFragment.pasteImageAttr && $0.value != .null }
    if let inline = b.inline {
        return .block(b.type, attrs, inline.map { el in
            switch el {
            case .text(let s, let m): .text(s, m.values)
            case .atom(let a, let m): .atom(a.type, a.attrs, m.values)
            }
        })
    }
    return .block(b.type, attrs, b.children.map(shape))
}

private func shape(json: [String: Any]) -> Shape {
    let type = json["type"] as! String
    if type == "text" {
        var marks: [String: JSONValue] = [:]
        for m in json["marks"] as? [[String: Any]] ?? [] {
            marks[m["type"] as! String] = jsonValue(m["attrs"] ?? [String: Any]())
        }
        return .text(json["text"] as! String, marks)
    }
    var attrs: [String: JSONValue] = [:]
    for (k, v) in json["attrs"] as? [String: Any] ?? [:] where k != "blockId" && k != "taskId" && !(v is NSNull) {
        attrs[k] = jsonValue(v)
    }
    let content = (json["content"] as? [[String: Any]] ?? []).map { shape(json: $0) }
    if ["noteLink", "tag", "hardBreak", "mention"].contains(type) { return .atom(type, attrs, [:]) }
    return .block(type, attrs, content)
}

private func jsonValue(_ v: Any) -> JSONValue {
    switch v {
    case let s as String: return .string(s)
    case let b as Bool where type(of: v) == type(of: true): return .bool(b)
    case let n as NSNumber: return .number(n.doubleValue)
    case let d as [String: Any]: return .object(d.mapValues(jsonValue))
    case let a as [Any]: return .array(a.map(jsonValue))
    default: return .null
    }
}

@MainActor
struct PasteImportTests {
    nonisolated static let agentsVector = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // DSEditorModelTests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // DSEditor
        .deletingLastPathComponent() // Packages
        .deletingLastPathComponent() // ios
        .deletingLastPathComponent() // apps
        .deletingLastPathComponent() // repo
        .appendingPathComponent("packages/test-vectors/vectors/agents/create-note.json")

    /// The agents' create_note vector: our Markdown import gives the same blocks as the agents'
    /// importer (the same mapping on every client).
    @Test(.enabled(if: FileManager.default.fileExists(atPath: agentsVector.path)))
    func markdownMatchesTheAgentsImporter() throws {
        let file = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: Self.agentsVector)) as? [String: Any])
        let input = try #require(file["input"] as? [String: Any])
        let markdown = try #require(input["markdown"] as? String)
        let linked = try #require(input["linkedNoteId"] as? String)
        let expected = try #require(((file["createNote"] as? [String: Any])?["expected"] as? [String: Any])?["content"] as? [String: Any])
        // The vector's document starts with the title; the Markdown is the body after it.
        let body = (expected["content"] as? [[String: Any]] ?? []).dropFirst().map { shape(json: $0) }
        let fragment = MarkdownImport.blocks(markdown, options: .init(resolveNoteLink: { $0 == "План запуска" ? linked : nil }))
        let ours = fragment.blocks.map(shape)
        #expect(ours.count == body.count)
        for (a, b) in zip(ours, body) {
            #expect(a == b, "\(a)\n≠\n\(b)")
        }
    }

    @Test func markdownDetails() {
        let md = """
        # Заголовок
        #### Глубокий
        Текст с ~~зачёркнутым~~, <u>подчёркнутым</u> и [ссылкой](https://example.com).
        Вторая строка\\#не-тег

        > Цитата
        > в две строки

        ---

        1. раз
           - вложенный
        3. три

        - [-] отменено
        """
        let blocks = MarkdownImport.blocks(md).blocks
        #expect(blocks.map(\.type) == ["heading", "heading", "paragraph", "blockquote", "horizontalRule", "orderedList", "taskList"])
        #expect(blocks[1].attrs["level"] == .number(3), "levels above 3 become 3")
        let para = blocks[2].inline ?? []
        #expect(para.contains(.text("зачёркнутым", MarkSet([MarkName.strike: MarkSet.plain]))))
        #expect(para.contains(.text("подчёркнутым", MarkSet([MarkName.underline: MarkSet.plain]))))
        #expect(para.contains(.text("ссылкой", MarkSet([MarkName.link: .object(["href": "https://example.com"])]))))
        #expect(para.contains(.atom(.hardBreak, .empty)), "a line break is a hard break")
        #expect(para.contains(.text("Вторая строка#не-тег", .empty)), "an escaped # is not a tag")
        #expect(blocks[3].children.first?.inline?.contains(.atom(.hardBreak, .empty)) == true)
        let ordered = blocks[5]
        #expect(ordered.children.count == 2)
        #expect(ordered.children[0].children.map(\.type) == ["paragraph", "bulletList"], "nesting")
        #expect(blocks[6].children[0].attrs["state"] == "cancelled")
    }

    @Test func markdownDetection() {
        #expect(MarkdownImport.looksLikeMarkdown("# План\n\n- раз\n- два"))
        #expect(MarkdownImport.looksLikeMarkdown("| a | b |\n|---|---|\n| 1 | 2 |"))
        #expect(MarkdownImport.looksLikeMarkdown("Смотри **это** и `код`\n- пункт"))
        #expect(!MarkdownImport.looksLikeMarkdown("Просто текст из письма.\nВторая строка — без разметки."))
        #expect(!MarkdownImport.looksLikeMarkdown("Цена 5 * 3 = 15"))
    }

    @Test func remoteImageParagraph() {
        let f = MarkdownImport.blocks("Текст\n\n![Схема](https://example.com/a.png)", options: .init(remoteImages: true))
        #expect(f.blocks.map(\.type) == ["paragraph", "image"])
        #expect(f.images == [PastedImage(source: .url(URL(string: "https://example.com/a.png")!), alt: "Схема")])
        #expect(f.blocks[1].attrs[PasteFragment.pasteImageAttr] == .number(0))
    }

    // MARK: HTML

    /// A web page selection: heading, formatted paragraph, nested list, table, images.
    @Test func htmlFromAWebPage() {
        let png = Data([0x89, 0x50, 0x4E, 0x47]).base64EncodedString()
        let html = """
        <html><head><style>p { color: red }</style></head><body>
        <h1>Отчёт</h1>
        <p>Текст с <b>жирным</b>, <em>курсивом</em>, <u>подчёркнутым</u>, <s>старым</s>, <code>кодом</code>
        и <a href="https://example.com/x?a=1&amp;b=2">ссылкой</a>&nbsp;— <span style="font-weight:700">важно</span>.</p>
        <ul>
          <li>Первый</li>
          <li>Второй
            <ol start="3"><li>вложенный</li></ol>
          </li>
        </ul>
        <table>
          <thead><tr><th>Имя</th><th style="text-align:right">Сумма</th></tr></thead>
          <tbody><tr><td>Аня</td><td align="right">10</td></tr></tbody>
        </table>
        <p><img src="data:image/png;base64,\(png)" alt="Логотип"> подпись</p>
        <img src="https://example.com/photo.jpg">
        <hr>
        <pre><code class="language-swift">let x = 1
        print(x)
        </code></pre>
        <blockquote><p>Цитата</p></blockquote>
        <script>alert(1)</script>
        </body></html>
        """
        let f = HTMLImport.blocks(html)
        #expect(f.blocks.map(\.type) == ["heading", "paragraph", "bulletList", "table", "image", "paragraph", "image",
                                         "horizontalRule", "codeBlock", "blockquote"])
        #expect(f.blocks[0].inline == [.text("Отчёт", .empty)])
        let p = f.blocks[1].inline ?? []
        #expect(p.contains(.text("жирным", MarkSet([MarkName.bold: MarkSet.plain]))))
        #expect(p.contains(.text("курсивом", MarkSet([MarkName.italic: MarkSet.plain]))))
        #expect(p.contains(.text("подчёркнутым", MarkSet([MarkName.underline: MarkSet.plain]))))
        #expect(p.contains(.text("старым", MarkSet([MarkName.strike: MarkSet.plain]))))
        #expect(p.contains(.text("кодом", MarkSet([MarkName.code: MarkSet.plain]))))
        #expect(p.contains(.text("ссылкой", MarkSet([MarkName.link: .object(["href": "https://example.com/x?a=1&b=2"])]))))
        #expect(p.contains(.text("важно", MarkSet([MarkName.bold: MarkSet.plain]))), "bold from the inline style")
        #expect(f.blocks[1].plainText.contains("и ссылкой\u{00A0}— важно."), "whitespace collapses, &nbsp; stays")
        let list = f.blocks[2]
        #expect(list.children.count == 2)
        #expect(list.children[1].children.map(\.type) == ["paragraph", "orderedList"])
        #expect(list.children[1].children[1].attrs["start"] == .number(3))
        let table = f.blocks[3]
        #expect(table.children[0].children.map(\.type) == ["tableHeader", "tableHeader"])
        #expect(table.children[0].children[1].attrs["align"] == "right")
        #expect(table.children[1].children[1].attrs["align"] == "right")
        #expect(table.children[1].children[0].children[0].inline == [.text("Аня", .empty)])
        #expect(f.images.count == 2)
        #expect(f.images[0] == PastedImage(source: .data(Data([0x89, 0x50, 0x4E, 0x47])), alt: "Логотип"))
        #expect(f.images[1].source == .url(URL(string: "https://example.com/photo.jpg")!))
        #expect(f.blocks[4].attrs[PasteFragment.pasteImageAttr] == .number(0))
        #expect(f.blocks[5].inline == [.text("подпись", .empty)])
        #expect(f.blocks[6].attrs[PasteFragment.pasteImageAttr] == .number(1))
        #expect(f.blocks[8].attrs["language"] == "swift")
        #expect(f.blocks[8].inline == [.text("let x = 1\nprint(x)", .empty)])
        #expect(!f.blocks.contains { $0.plainText.contains("alert") }, "scripts are dropped")
    }

    /// Google Docs wraps the paste in <b style="font-weight:normal">; Apple Notes uses a div per
    /// line and checkbox lists.
    @Test func htmlFromDocsAndNotes() {
        let docs = """
        <meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr"><span style="font-weight:400">Обычный </span><span style="font-weight:700">жирный</span></p><p dir="ltr"><span style="font-style:italic">курсив</span></p></b>
        """
        let d = HTMLImport.blocks(docs).blocks
        #expect(d.map(\.type) == ["paragraph", "paragraph"])
        #expect(d[0].inline == [.text("Обычный ", .empty), .text("жирный", MarkSet([MarkName.bold: MarkSet.plain]))])
        #expect(d[1].inline == [.text("курсив", MarkSet([MarkName.italic: MarkSet.plain]))])

        let notes = """
        <div>Первая строка</div><div><br></div><div>Вторая <b>строка</b></div>
        <ul><li><input type="checkbox" checked>Сделано</li><li><input type="checkbox">Не сделано</li></ul>
        """
        let n = HTMLImport.blocks(notes).blocks
        #expect(n.map(\.type) == ["paragraph", "paragraph", "taskList"])
        #expect(n[2].children.map { $0.attrs["state"] } == ["done", "open"])
        #expect(n[2].children[0].children[0].inline == [.text("Сделано", .empty)])
    }

    @Test func htmlEntitiesAndBrokenMarkup() {
        let f = HTMLImport.blocks("<p>A &lt;b&gt; &#8212; &#x41; &unknown; <i>курсив<p>следующий")
        #expect(f.blocks.count == 2)
        #expect(f.blocks[0].plainText == "A <b> — A &unknown; курсив")
        #expect(f.blocks[1].plainText == "следующий")
    }

    // MARK: Inserting a fragment

    /// Pasting into the middle of a paragraph: the first pasted paragraph joins the text before
    /// the caret, the last one the text after it, a list goes between; one undo step.
    @Test func fragmentSplitsTheParagraphAndUndoesAtOnce() {
        let doc = InMemoryEditorDocument(blocks: [.title("Т"), .paragraph("Начало|конец")])
        let cmd = EditorCommands(document: doc)
        let caret = Projection.build(doc.blocks).starts[1] + "Начало".utf16.count
        let fragment = MarkdownImport.blocks("**первый**\n\n- пункт\n\nпоследний ")
        let end = cmd.insertFragment(fragment.blocks, replacing: caret..<(caret + 1))
        #expect(doc.blocks.map(\.type) == ["title", "paragraph", "bulletList", "paragraph"])
        #expect(doc.blocks[1].plainText == "Началопервый")
        #expect(doc.blocks[1].inline?.last == .text("первый", MarkSet([MarkName.bold: MarkSet.plain])))
        #expect(doc.blocks[3].plainText == "последнийконец")
        #expect(end == TextPosition(block: doc.blocks[3].id, offset: "последний".utf16.count))
        doc.undo()
        #expect(doc.blocks.map(\.plainText) == ["Т", "Начало|конец"], "one paste is one undo step")
    }

    /// Plain text only in the title (its first line) and in code blocks.
    @Test func fragmentInTheTitleIsPlainText() {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .paragraph("")])
        let cmd = EditorCommands(document: doc)
        let fragment = MarkdownImport.blocks("# Заголовок\n\nТекст")
        cmd.insertFragment(fragment.blocks, replacing: 0..<0)
        #expect(doc.blocks[0].plainText == "Заголовок Текст", "the title is one line: breaks become spaces")
        #expect(doc.blocks.count == 2)
    }

    /// An empty paragraph the paste starts in does not stay above a pasted table.
    @Test func fragmentReplacesAnEmptyParagraph() {
        let doc = InMemoryEditorDocument(blocks: [.title("Т"), .paragraph("")])
        let cmd = EditorCommands(document: doc)
        let at = Projection.build(doc.blocks).starts[1]
        cmd.insertFragment(MarkdownImport.blocks("| a | b |\n|---|---|\n| 1 | 2 |").blocks, replacing: at..<at)
        #expect(doc.blocks.map(\.type) == ["title", "table", "paragraph"])
    }

    // MARK: Agreed with web-editor (spec/04 «Вставка с форматированием»)

    /// Word lists (mso-list paragraphs) with levels and markers; a checklist only when every item
    /// has a checkbox; figcaption is the image caption; file: and cid: images are skipped; a cell
    /// takes the alignment of its paragraphs.
    @Test func htmlWebEditorMapping() {
        let word = """
        <p class=MsoListParagraphCxSpFirst style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>·<span>&nbsp;&nbsp;</span></span><![endif]>Первый<o:p></o:p></p>
        <p class=MsoListParagraphCxSpMiddle style='mso-list:l0 level2 lfo1'><span style='mso-list:Ignore'>o<span>&nbsp;</span></span>Вложенный</p>
        <p class=MsoListParagraphCxSpLast style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>Второй</p>
        <p class=MsoNormal>Обычный</p>
        <p style='mso-list:l1 level1 lfo2'><span style='mso-list:Ignore'>1.<span>&nbsp;</span></span>Раз</p>
        """
        let w = HTMLImport.blocks(word).blocks
        #expect(w.map(\.type) == ["bulletList", "paragraph", "orderedList"])
        #expect(w[0].children.count == 2)
        #expect(w[0].children[0].children.map(\.type) == ["paragraph", "bulletList"])
        #expect(w[0].children[0].children[0].inline == [.text("Первый", .empty)], "Word's drawn marker is dropped")
        #expect(w[2].children[0].children[0].inline == [.text("Раз", .empty)])

        let mixed = HTMLImport.blocks("<ul><li><input type=checkbox checked>а</li><li>б</li></ul>").blocks
        #expect(mixed.map(\.type) == ["bulletList"], "not every item has a checkbox: a plain list")

        let figure = HTMLImport.blocks("<figure><img src=\"https://e.com/a.png\"><figcaption> Закат </figcaption></figure><p><img src=\"file:///C:/x.png\" alt=\"локальная\">текст</p>")
        #expect(figure.blocks.map(\.type) == ["image", "paragraph"])
        #expect(figure.blocks[0].attrs["caption"] == "Закат")
        #expect(figure.blocks[1].inline == [.text("текст", .empty)], "file: images are skipped")

        let table = HTMLImport.blocks("<table><tr><td><p style=\"text-align:center\">x</p></td></tr></table>").blocks
        #expect(table[0].children[0].children[0].attrs["align"] == "center")
        #expect(MarkdownImport.looksLikeMarkdown("Купить ==молоко== и\n- хлеб"))
    }

    // MARK: Shared vectors (web and iOS)

    nonisolated static let pasteVectors = agentsVector.deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("paste/cases.json")

    /// `packages/test-vectors/vectors/paste/cases.json`: the same clipboard gives the same blocks
    /// and images on the web and on iOS (spec/04 «Вставка с форматированием»).
    @Test(.enabled(if: FileManager.default.fileExists(atPath: pasteVectors.path)))
    func sharedPasteVectors() throws {
        let file = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: Self.pasteVectors)) as? [String: Any])
        let cases = try #require(file["cases"] as? [[String: Any]])
        for c in cases {
            let name = c["name"] as? String ?? "?"
            let fragment: PasteFragment
            if let html = c["html"] as? String {
                fragment = HTMLImport.blocks(html)
            } else {
                let text = try #require(c["text"] as? String)
                fragment = MarkdownImport.blocks(text, options: .init(remoteImages: true))
            }
            let expected = try #require(c["expected"] as? [String: Any])
            let blocks = (expected["blocks"] as? [[String: Any]] ?? []).map { shape(json: $0) }
            let ours = fragment.blocks.map(shape)
            #expect(ours.count == blocks.count, "\(name): \(ours.count) blocks, expected \(blocks.count)\n\(ours)\n≠\n\(blocks)")
            for (a, b) in zip(ours, blocks) {
                #expect(a == b, "\(name):\n\(a)\n≠\n\(b)")
            }
            let images = expected["images"] as? [[String: Any]] ?? []
            #expect(fragment.images.count == images.count, "\(name): images")
            for (img, exp) in zip(fragment.images, images) {
                let src = exp["src"] as? String ?? ""
                #expect(img.alt == (exp["alt"] as? String ?? ""), "\(name): alt")
                switch img.source {
                case .url(let url): #expect(url.absoluteString == src, "\(name): \(url) ≠ \(src)")
                case .data(let data):
                    let payload = src.split(separator: ",", maxSplits: 1).last.map(String.init) ?? ""
                    #expect(Data(base64Encoded: payload) == data, "\(name): embedded image bytes")
                }
            }
        }
    }
}
