#if canImport(UIKit)
import UIKit
import WebKit

/// Renders Mermaid sources to images with the bundled mermaid.js (MIT) in an off-screen WKWebView.
/// Works offline. Renders one diagram at a time and caches results by source.
@MainActor
final class MermaidRenderer: NSObject {
    static let shared = MermaidRenderer()
    static let didRender = Notification.Name("DSEditor.MermaidRenderer.didRender")

    private var webView: WKWebView?
    private var ready = false
    private var queue: [(String, (UIImage?) -> Void)] = []
    private var busy = false
    private var images: [String: UIImage] = [:]
    private var failed: Set<String> = []
    /// View the web view is attached to (snapshots need a window).
    weak var host: UIView?

    func cachedImage(for source: String) -> UIImage? { images[source] }
    func cachedSize(for source: String) -> CGSize? { images[source]?.size }

    func render(_ source: String, completion: @escaping (UIImage?) -> Void) {
        if let img = images[source] { return completion(img) }
        if failed.contains(source) { return completion(nil) }
        queue.append((source, completion))
        pump()
    }

    private func setUp() -> Bool {
        if webView != nil { return true }
        guard let host, host.window != nil,
              let url = Bundle.module.url(forResource: "mermaid.min", withExtension: "js"),
              let script = try? String(contentsOf: url, encoding: .utf8) else { return false }
        let config = WKWebViewConfiguration()
        let user = WKUserScript(source: script + "\nmermaid.initialize({startOnLoad:false, theme:'neutral', securityLevel:'strict', fontFamily:'-apple-system, Helvetica'});",
                                injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        config.userContentController.addUserScript(user)
        let wv = WKWebView(frame: CGRect(x: -4000, y: 0, width: 900, height: 1200), configuration: config)
        wv.isOpaque = false
        wv.backgroundColor = .clear
        wv.alpha = 0.011
        wv.isUserInteractionEnabled = false
        wv.navigationDelegate = self
        host.addSubview(wv)
        wv.loadHTMLString("<html><head><meta name='viewport' content='width=900'><style>body{margin:0;background:transparent}#c{display:inline-block;padding:8px}</style></head><body><div id='c'></div></body></html>", baseURL: nil)
        webView = wv
        return true
    }

    private func pump() {
        guard !busy, !queue.isEmpty else { return }
        guard setUp() else {
            // No window yet; try again shortly.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.pump() }
            return
        }
        guard ready, let wv = webView else { return }
        busy = true
        let (source, completion) = queue.removeFirst()
        let js = """
        const r = await mermaid.render('m' + Date.now(), src);
        const c = document.getElementById('c');
        c.innerHTML = r.svg;
        const b = c.getBoundingClientRect();
        return [b.width, b.height];
        """
        wv.callAsyncJavaScript(js, arguments: ["src": source], in: nil, in: .page) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let value):
                let dims = (value as? [Any])?.compactMap { ($0 as? NSNumber)?.doubleValue } ?? []
                guard dims.count == 2, dims[0] > 1, dims[1] > 1 else { return self.finish(source, nil, completion) }
                let snap = WKSnapshotConfiguration()
                snap.rect = CGRect(x: 0, y: 0, width: dims[0], height: dims[1])
                wv.takeSnapshot(with: snap) { image, _ in
                    MainActor.assumeIsolated { self.finish(source, image, completion) }
                }
            case .failure:
                self.finish(source, nil, completion)
            }
        }
    }

    private func finish(_ source: String, _ image: UIImage?, _ completion: (UIImage?) -> Void) {
        if let image {
            images[source] = image
            NotificationCenter.default.post(name: Self.didRender, object: source)
        } else {
            failed.insert(source)
        }
        completion(image)
        busy = false
        pump()
    }
}

extension MermaidRenderer: @preconcurrency WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        ready = true
        pump()
    }
}
#endif
