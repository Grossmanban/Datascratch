// Applies the saved theme before first paint (a file, not an inline script: the CSP allows
// only same-origin scripts).
try {
  var t = localStorage.getItem("ds.theme");
  var dark = t === "dark" || ((!t || t === "system") && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
} catch (e) {}
