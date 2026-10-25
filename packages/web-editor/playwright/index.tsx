import "../src/styles/editor.css";

// Deterministic fonts for layout tests: no web fonts, fixed system fallbacks.
const style = document.createElement("style");
style.textContent = `
  html, body { margin: 0; background: #fff; }
  .ds-editor { --ds-font-display: "DejaVu Serif", Georgia, serif; --ds-font-text: "DejaVu Sans", Arial, sans-serif; }
`;
document.head.append(style);
