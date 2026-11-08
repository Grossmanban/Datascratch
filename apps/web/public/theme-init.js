// Applies the saved theme before first paint (a file, not an inline script: the CSP allows
// only same-origin scripts).
try {
  var t = localStorage.getItem("ds.theme");
  var dark = t === "dark" || ((!t || t === "system") && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
} catch (e) {}

// Launch animation mode (public/boot-anim.js), decided before the boot screen's first frame:
// the ink draws the mark on a cold start of this tab, a quick hand-off on reloads in it, and a
// plain cross-fade when the system asks for reduced motion.
try {
  var rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try {
    seen = sessionStorage.getItem("ds.bootSeen") === "1";
  } catch (e) {}
  document.documentElement.setAttribute("data-boot", rm ? "reduced" : seen ? "quick" : "draw");
} catch (e) {}
