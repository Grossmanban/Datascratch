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
    /// Separate off-screen window for the web view. WebKit installs many touch-delaying gesture
    /// recognizers; inside the editor's window they took part in every touch on the text and
    /// crashed UIKit's gesture environment depending on when the diagram finished loading.
    private var offscreenWindow: UIWindow?
    private var ready = false
    private var queue: [(Key, (UIImage?) -> Void)] = []
    private var busy = false
    /// A diagram in one appearance: dark mode uses Mermaid's dark theme (dark text on the dark
    /// card would be invisible).
    struct Key: Hashable {
        var source: String
        var dark: Bool
    }
    private var images: [Key: UIImage] = [:]
    private var failed: Set<Key> = []
    /// A view of the editor; only its window scene is used (snapshots need a window).
    weak var host: UIView?

    func cachedImage(for source: String, dark: Bool) -> UIImage? { images[Key(source: source, dark: dark)] }
    /// Size of the diagram in either appearance (the layout does not depend on the theme).
    func cachedSize(for source: String) -> CGSize? {
        (images[Key(source: source, dark: false)] ?? images[Key(source: source, dark: true)])?.size
    }

    func render(_ source: String, dark: Bool, completion: @escaping (UIImage?) -> Void) {
        let key = Key(source: source, dark: dark)
        if let img = images[key] { return completion(img) }
        if failed.contains(key) { return completion(nil) }
        queue.append((key, completion))
        pump()
    }

    private func setUp() -> Bool {
        if webView != nil { return true }
        guard let host, let scene = host.window?.windowScene,
              let url = Bundle.module.url(forResource: "mermaid.min", withExtension: "js"),
              let script = try? String(contentsOf: url, encoding: .utf8) else { return false }
        let config = WKWebViewConfiguration()
        let user = WKUserScript(source: script,
                                injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        config.userContentController.addUserScript(user)
        let wv = WKWebView(frame: CGRect(x: -4000, y: 0, width: 900, height: 1200), configuration: config)
        wv.isOpaque = false
        wv.backgroundColor = .clear
        // Fully opaque: snapshots carry the view's alpha (a near-transparent web view, left over
        // from when it hid inside the editor's window, gave empty-looking diagrams). The window
        // itself is off screen and below everything.
        wv.isUserInteractionEnabled = false
        wv.navigationDelegate = self
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: -5000, y: 0, width: 900, height: 1200)
        window.windowLevel = UIWindow.Level(rawValue: -1000)
        window.isUserInteractionEnabled = false
        window.rootViewController = UIViewController()
        window.isHidden = false
        window.addSubview(wv)
        wv.frame = window.bounds
        offscreenWindow = window
        EditorDiagnostics.log("mermaid web view created in its own window")
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
        let (key, completion) = queue.removeFirst()
        let js = """
        mermaid.initialize({startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict',
                            fontFamily: '-apple-system, Helvetica', themeVariables: {background: 'transparent'}});
        const r = await mermaid.render('m' + Date.now(), src);
        const c = document.getElementById('c');
        c.innerHTML = r.svg;
        const b = c.getBoundingClientRect();
        return [b.width, b.height];
        """
        wv.callAsyncJavaScript(js, arguments: ["src": key.source, "dark": key.dark], in: nil, in: .page) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let value):
                let dims = (value as? [Any])?.compactMap { ($0 as? NSNumber)?.doubleValue } ?? []
                guard dims.count == 2, dims[0] > 1, dims[1] > 1 else { return self.finish(key, nil, completion) }
                let snap = WKSnapshotConfiguration()
                snap.rect = CGRect(x: 0, y: 0, width: dims[0], height: dims[1])
                wv.takeSnapshot(with: snap) { image, _ in
                    MainActor.assumeIsolated { self.finish(key, image, completion) }
                }
            case .failure:
                self.finish(key, nil, completion)
            }
        }
    }

    private func finish(_ key: Key, _ image: UIImage?, _ completion: (UIImage?) -> Void) {
        if let image {
            images[key] = image
            NotificationCenter.default.post(name: Self.didRender, object: key.source)
        } else {
            failed.insert(key)
        }
        completion(image)
        busy = false
        pump()
    }
}

extension MermaidRenderer: @preconcurrency WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        EditorDiagnostics.log("mermaid web view loaded")
        ready = true
        pump()
    }
}
#endif
