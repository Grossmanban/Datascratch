#if canImport(UIKit)
import UIKit
import WebKit

/// Renders Mermaid sources to images with the bundled mermaid.js (MIT, version and checksum in
/// `Resources/README.md`) in an off-screen WKWebView. Works offline and is kept offline: a content
/// rule list blocks every network load, the web view has no persistent storage and navigates
/// nowhere. Renders one diagram at a time and caches results by source (bounded).
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
    /// Least recently used first (cache eviction).
    private var recency: [Key] = []
    private var failed: Set<Key> = []
    private var failedOrder: [Key] = []
    /// Cache bounds: diagrams of open notes stay, a long session does not grow without limit.
    static let maxImages = 64
    static let maxFailed = 256
    /// Largest snapshot, in pixels: a diagram of hundreds of nodes snapshotted at full size and
    /// screen scale took ~900 MB (security audit 2026-10-27).
    static let maxPixels: CGFloat = 16_000_000
    /// Tallest drawing in the web view, in points: taller diagrams are scaled down in the page.
    static let maxPageHeight: CGFloat = 6000
    /// Blocks every network load (http, https, ws, wss, ftp, file) from the diagram page. One rule
    /// per scheme: content-blocker patterns have no alternation (`|` failed to compile).
    static let networkRules = """
    [{"trigger":{"url-filter":"^https?:"},"action":{"type":"block"}},
     {"trigger":{"url-filter":"^wss?:"},"action":{"type":"block"}},
     {"trigger":{"url-filter":"^ftp:"},"action":{"type":"block"}},
     {"trigger":{"url-filter":"^file:"},"action":{"type":"block"}}]
    """
    private static var ruleList: WKContentRuleList?
    private static var compilingRules = false
    /// A view of the editor; only its window scene is used (snapshots need a window).
    weak var host: UIView?

    func cachedImage(for source: String, dark: Bool) -> UIImage? {
        let key = Key(source: source, dark: dark)
        guard let image = images[key] else { return nil }
        touch(key)
        return image
    }
    /// Size of the diagram in either appearance (the layout does not depend on the theme).
    func cachedSize(for source: String) -> CGSize? {
        (images[Key(source: source, dark: false)] ?? images[Key(source: source, dark: true)])?.size
    }

    /// Puts a rendered image in the cache and announces it, as a finished render does (tests use
    /// it to land a "late" render at a chosen moment).
    func store(_ image: UIImage, for source: String, dark: Bool) {
        remember(image, for: Key(source: source, dark: dark))
        NotificationCenter.default.post(name: Self.didRender, object: source)
    }

    private func touch(_ key: Key) {
        if let i = recency.firstIndex(of: key) { recency.remove(at: i) }
        recency.append(key)
    }

    private func remember(_ image: UIImage, for key: Key) {
        images[key] = image
        touch(key)
        while recency.count > Self.maxImages {
            images[recency.removeFirst()] = nil
        }
    }

    private func rememberFailure(_ key: Key) {
        guard failed.insert(key).inserted else { return }
        failedOrder.append(key)
        while failedOrder.count > Self.maxFailed { failed.remove(failedOrder.removeFirst()) }
    }

    /// Snapshot width (points) that keeps a capture of `size` at `scale` within `maxPixels`.
    static func snapshotWidth(for size: CGSize, scale: CGFloat, maxPixels: CGFloat = maxPixels) -> CGFloat {
        let pixels = size.width * size.height * scale * scale
        guard pixels > maxPixels, pixels > 0 else { return size.width }
        return floor(size.width * (maxPixels / pixels).squareRoot())
    }

    func render(_ source: String, dark: Bool, completion: @escaping (UIImage?) -> Void) {
        let key = Key(source: source, dark: dark)
        if let img = images[key] {
            touch(key)
            return completion(img)
        }
        if failed.contains(key) { return completion(nil) }
        queue.append((key, completion))
        pump()
    }

    private func setUp() -> Bool {
        if webView != nil { return true }
        guard let rules = Self.ruleList else {
            compileRules()
            return false
        }
        guard let host, let scene = host.window?.windowScene,
              let url = Bundle.module.url(forResource: "mermaid.min", withExtension: "js"),
              let script = try? String(contentsOf: url, encoding: .utf8) else { return false }
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.userContentController.add(rules)
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
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
        // Snapshot rects are in page coordinates: no safe-area inset may shift the page (on
        // iPhone it moved the diagram under the snapshot rect and cut its top off).
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        wv.scrollView.contentInset = .zero
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
        wv.loadHTMLString("<html><head><meta name='viewport' content='width=900'><style>body{margin:0;background:transparent}#c{position:absolute;left:0;top:0}#c svg{display:block}</style></head><body><div id='c'></div></body></html>", baseURL: nil)
        webView = wv
        return true
    }

    /// Compiles the network-blocking rules once; the web view is created only with them.
    private func compileRules() {
        guard !Self.compilingRules, Self.ruleList == nil else { return }
        Self.compilingRules = true
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "DSEditor.mermaid.offline",
                                                                encodedContentRuleList: Self.networkRules) { list, error in
            MainActor.assumeIsolated {
                Self.compilingRules = false
                if let list {
                    Self.ruleList = list
                } else {
                    EditorDiagnostics.log("mermaid network rules failed to compile: \(String(describing: error))")
                }
            }
        }
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
        const svg = c.querySelector('svg');
        if (!svg) return [0, 0, 0, 0];
        // The drawing's real extent: the union of Mermaid's viewBox and the content's bounding
        // box (some diagrams draw past their viewBox), with a margin. The SVG is then shown at
        // that size (scaled down to the page width), so the snapshot holds all of it.
        const pad = 8;
        const bb = svg.getBBox();
        const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0 ? svg.viewBox.baseVal : bb;
        const x0 = Math.min(vb.x, bb.x) - pad, y0 = Math.min(vb.y, bb.y) - pad;
        const x1 = Math.max(vb.x + vb.width, bb.x + bb.width) + pad, y1 = Math.max(vb.y + vb.height, bb.y + bb.height) + pad;
        const w = x1 - x0, h = y1 - y0;
        const scale = Math.min(1, 900 / w, maxHeight / h);
        svg.setAttribute('viewBox', `${x0} ${y0} ${w} ${h}`);
        svg.removeAttribute('style');
        svg.setAttribute('width', w * scale);
        svg.setAttribute('height', h * scale);
        window.scrollTo(0, 0);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const b = svg.getBoundingClientRect();
        return [b.left, b.top, b.width, b.height];
        """
        wv.callAsyncJavaScript(js, arguments: ["src": key.source, "dark": key.dark, "maxHeight": Double(Self.maxPageHeight)],
                               in: nil, in: .page) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let value):
                let dims = (value as? [Any])?.compactMap { ($0 as? NSNumber)?.doubleValue } ?? []
                guard dims.count == 4, dims[2] > 1, dims[3] > 1 else { return self.finish(key, nil, completion) }
                let rect = CGRect(x: dims[0], y: dims[1], width: dims[2], height: dims[3])
                // A diagram taller than the web view would be blank below its bottom edge.
                if rect.maxY > wv.bounds.height {
                    let size = CGSize(width: wv.bounds.width, height: ceil(rect.maxY) + 16)
                    self.offscreenWindow?.frame.size = size
                    wv.frame = CGRect(origin: .zero, size: size)
                    wv.layoutIfNeeded()
                }
                let snap = WKSnapshotConfiguration()
                snap.rect = rect
                snap.afterScreenUpdates = true
                let scale = wv.traitCollection.displayScale > 0 ? wv.traitCollection.displayScale : 2
                snap.snapshotWidth = NSNumber(value: Double(Self.snapshotWidth(for: rect.size, scale: scale)))
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
            remember(image, for: key)
            NotificationCenter.default.post(name: Self.didRender, object: key.source)
        } else {
            rememberFailure(key)
        }
        completion(image)
        busy = false
        pump()
    }
}

extension MermaidRenderer: @preconcurrency WKNavigationDelegate {
    /// The diagram page goes nowhere: only its own blank document loads.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
        let scheme = navigationAction.request.url?.scheme?.lowercased()
        decisionHandler(scheme == nil || scheme == "about" ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        EditorDiagnostics.log("mermaid web view loaded")
        ready = true
        pump()
    }
}
#endif
