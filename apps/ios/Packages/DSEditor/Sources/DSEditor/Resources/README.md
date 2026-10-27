# Vendored resources

## mermaid.min.js

- Package: [mermaid](https://www.npmjs.com/package/mermaid) **12.2.0** (MIT, `mermaid-LICENSE.txt`), the same version as the web editor (`packages/web-editor/package.json`).
- File: `dist/mermaid.min.js` from `https://registry.npmjs.org/mermaid/-/mermaid-12.2.0.tgz`, unchanged.
- SHA-256: `a8a6a6f805b074a8261a2825c86f99c8054acb3b35f50bb7e24a4f9f2c3c3b9f`
- Used by `MermaidRenderer` in an off-screen WKWebView that cannot load anything from the network (content rule list), keeps no data (non-persistent store) and navigates nowhere; diagrams render with `securityLevel: 'strict'`.
- Updating: replace the file from the package's `dist/`, update the version and the checksum here, keep the version equal to the web editor's.
