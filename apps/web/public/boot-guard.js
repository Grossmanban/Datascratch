// Boot watchdog (kept out of index.html: the CSP allows no inline scripts).
// From some networks a share of new connections hangs in the TLS handshake, so a module of the
// app can fail or never arrive and the page would stay on a bare logo. If a script fails to load,
// or loading stalls (nothing finished for STALL_MS), the page reloads once; if that fails too, a
// calm «couldn't load — retry» screen replaces the logo. main.tsx calls __dsBootOk() once mounted.
(function () {
  var KEY = "ds.bootRetry";
  var STALL_MS = 10000;
  var settled = false;
  var ru = (navigator.language || "ru").toLowerCase().indexOf("ru") === 0;

  function retries() {
    try {
      return Number(sessionStorage.getItem(KEY)) || 0;
    } catch (e) {
      return 1;
    }
  }

  function fail() {
    if (settled) return;
    settled = true;
    if (retries() < 1) {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch (e) {}
      location.reload();
      return;
    }
    show();
  }

  function retry() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {}
    location.reload();
  }

  function show() {
    if (document.getElementById("ds-boot-fail")) return;
    var box = document.createElement("div");
    box.id = "ds-boot-fail";
    box.setAttribute("role", "alert");
    box.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;background:var(--ds-bg-canvas,#FAF8F4);color:var(--ds-text-primary,#1D1C1A);font:15px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
    var title = document.createElement("p");
    title.style.cssText = "margin:0;font-weight:600;font-size:17px";
    title.textContent = ru ? "Не удалось загрузить приложение" : "Couldn't load the app";
    var text = document.createElement("p");
    text.style.cssText = "margin:0;max-width:320px;color:var(--ds-text-secondary,#6B6862)";
    text.textContent = ru ? "Соединение оборвалось. Ваши заметки в сохранности — попробуйте ещё раз." : "The connection dropped. Your notes are safe — please try again.";
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = ru ? "Повторить" : "Retry";
    button.style.cssText =
      "margin-top:4px;height:40px;padding:0 20px;border:0;border-radius:10px;background:var(--ds-accent,#2F6FEB);color:#fff;font:inherit;font-weight:600;cursor:pointer";
    button.addEventListener("click", retry);
    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(button);
    (document.body || document.documentElement).appendChild(box);
    button.focus();
  }

  // A script or module preload that failed to load.
  window.addEventListener(
    "error",
    function (e) {
      var t = e.target;
      if (!t || t === window || window.__dsMounted) return;
      if (t.tagName === "SCRIPT" || (t.tagName === "LINK" && /preload/.test(t.rel || ""))) fail();
    },
    true,
  );

  // A lazily loaded module failed later on (Vite): reload once, then the retry screen.
  window.addEventListener("vite:preloadError", function (e) {
    e.preventDefault();
    settled = false;
    fail();
  });

  // Loading stalled: no resource has finished for STALL_MS and the app has not mounted.
  var seen = 0;
  var lastChange = Date.now();
  var poll = setInterval(function () {
    if (window.__dsMounted) return clearInterval(poll);
    var n = performance.getEntriesByType ? performance.getEntriesByType("resource").length : 0;
    if (n !== seen) {
      seen = n;
      lastChange = Date.now();
    } else if (Date.now() - lastChange > STALL_MS) {
      clearInterval(poll);
      fail();
    }
  }, 1000);

  window.__dsBootOk = function () {
    window.__dsMounted = true;
    clearInterval(poll);
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {}
    var el = document.getElementById("ds-boot-fail");
    if (el) el.remove();
  };
})();
