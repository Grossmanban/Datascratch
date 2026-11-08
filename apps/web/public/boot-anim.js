// Launch animation (spec/10 «Запуск»): the ink draws the Datascratch mark in one pen stroke,
// settles, and the mark flies to its place (the space tile in the sidebar, or the logo of the
// sign-in screen) while the interface fades in underneath. It never holds the app up: it plays
// while the app loads and is cut short when the app is ready earlier. Only transform, opacity
// and the stroke reveal are animated. The app calls __dsBootReady() once it knows what to show
// (the session check is done), so the sign-in screen never flashes before that.
// A file, not an inline script: the CSP allows only same-origin scripts.
(function () {
  var boot = document.getElementById("ds-boot");
  if (!boot) return;
  var html = document.documentElement;
  var mode = html.getAttribute("data-boot") || "quick";
  var log = (window.__dsBootLog = { mode: mode, start: performance.now(), ready: null, done: null, target: null });
  try {
    sessionStorage.setItem("ds.bootSeen", "1");
  } catch (e) {}

  var mark = boot.querySelector(".ds-boot-mark");
  var body = boot.querySelector(".ds-boot-body");
  var bg = boot.querySelector(".ds-boot-bg");
  var pen = boot.querySelector(".ds-boot-pen");
  var nib = boot.querySelector(".ds-boot-nib");
  var wet = boot.querySelector(".ds-boot-wet");
  var animated = typeof mark.animate === "function";
  var SNAP = "cubic-bezier(.2,.8,.2,1)";
  var HAND = "cubic-bezier(.55,.06,.32,1)"; // a hand: unhurried touch-down, a quick body, a soft lift
  var LENGTH = 75.56;

  var drawing = [];
  function play(el, frames, opts) {
    var a = el.animate(frames, opts);
    drawing.push(a);
    return a;
  }

  // Timing shared with iOS (spec/05): 0.55 s writing, 0.15 s settling, 0.35 s hand-off, ≤ 1.1 s.
  var WRITE = 550;
  var SETTLE = 150;
  var FLIGHT = 350;
  var LEAD = 40; // the paper tile appears just before the pen touches down
  var drawn = Promise.resolve();
  var reveal = null;
  if (mode === "draw" && animated) {
    var stroke = { duration: WRITE, delay: LEAD, easing: HAND, fill: "forwards" };
    play(body, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "ease-out", fill: "forwards" });
    reveal = play(pen, [{ strokeDashoffset: LENGTH + 5.5 }, { strokeDashoffset: 0 }], stroke);
    try {
      play(nib, [
        { offsetDistance: "0%", opacity: 0 },
        { opacity: 1, offset: 0.06 },
        { opacity: 1, offset: 0.86 },
        { offsetDistance: "100%", opacity: 0 },
      ], stroke);
    } catch (e) {} // no motion path: the stroke draws without the nib
    // The ink settles: fresh ink is lighter and dries darker, and spreads in one 1.8 % breath.
    play(wet, [{ opacity: 0.45 }, { opacity: 0.3, offset: 0.8 }, { opacity: 0 }], { duration: WRITE + SETTLE, delay: LEAD, easing: "ease-in", fill: "forwards" });
    play(body, [{ transform: "none" }, { transform: "scale(1.018)", offset: 0.5 }, { transform: "none" }], { duration: SETTLE, delay: LEAD + WRITE, easing: "ease-in-out" });
    drawn = reveal.finished.then(
      function () {
        return early ? null : wait(SETTLE);
      },
      function () {},
    );
  }

  var early = false;
  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  var flight = FLIGHT;
  var markReady;
  var ready = new Promise(function (resolve) {
    markReady = resolve;
  });
  window.__dsBootReady = function () {
    if (log.ready !== null) return;
    log.ready = performance.now();
    // Ready before the stroke is done: it finishes in ~0.18 s and hands off; ready before the pen
    // has even touched down: the mark is shown whole and hands off at once (0.32 s in all).
    if (reveal && reveal.playState !== "finished") {
      early = true;
      var t = reveal.currentTime || 0;
      var left = LEAD + WRITE - t;
      if (t < LEAD + 30) {
        drawing.forEach(function (a) {
          a.finish();
        });
        flight = 320;
      } else {
        var rate = Math.max(1, left / 180);
        drawing.forEach(function (a) {
          if (a.playState !== "finished") a.updatePlaybackRate ? a.updatePlaybackRate(rate) : (a.playbackRate = rate);
        });
      }
    }
    markReady();
  };
  // Never stay on the boot screen: if the app does not report back, fade it out anyway.
  setTimeout(window.__dsBootReady, 15000);

  var TARGETS = ["[data-ds-boot-target]", '[data-testid="space-switcher"] > :first-child'];
  function visible(r) {
    return r.width > 4 && r.height > 4 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  }
  function findTarget() {
    for (var i = 0; i < TARGETS.length; i++) {
      var els = document.querySelectorAll(TARGETS[i]);
      for (var j = 0; j < els.length; j++) {
        if (boot.contains(els[j])) continue;
        var r = els[j].getBoundingClientRect();
        if (visible(r)) return r;
      }
    }
    return null;
  }
  // The app has said it is ready; its screen may need a few frames to lay out.
  function locate() {
    return new Promise(function (resolve) {
      var until = performance.now() + 400;
      (function tick() {
        var r = findTarget();
        if (r || performance.now() > until) return resolve(r);
        requestAnimationFrame(tick);
      })();
    });
  }

  function done() {
    log.done = performance.now();
    boot.remove();
    html.removeAttribute("data-boot");
    window.dispatchEvent(new Event("ds:boot-done"));
  }

  function handOff(target) {
    log.target = target ? "element" : "none";
    if (!animated) return done();
    if (mode === "reduced") {
      boot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: "ease-out", fill: "forwards" }).finished.then(done, done);
      return;
    }
    var size = 88;
    var left = innerWidth / 2 - size / 2;
    var top = innerHeight / 2 - size / 2;
    var to;
    if (target) {
      var s = target.width / size;
      to = "translate(" + (target.left - left) + "px," + (target.top - top) + "px) scale(" + s + ")";
    } else {
      to = "translate(" + size * 0.1 + "px," + size * 0.1 + "px) scale(.8)";
    }
    if (mode === "quick") flight = 240;
    var anims = [
      mark.animate([{ transform: "none", opacity: 1 }, { opacity: 1, offset: 0.72 }, { transform: to, opacity: 0 }], {
        duration: flight,
        easing: SNAP,
        fill: "forwards",
      }),
      bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: flight - 40, delay: 40, easing: "ease-out", fill: "forwards" }),
    ];
    var root = document.getElementById("root");
    if (root) {
      // The app settles from a hair larger: on a phone that must not make the page scroll sideways.
      var html = document.documentElement;
      // «hidden», not «clip»: Safari still lets the page move sideways with clip on the root.
      html.style.overflowX = "hidden";
      var zoom = root.animate([{ transform: "scale(1.025)" }, { transform: "none" }], { duration: flight, easing: SNAP });
      var unclip = function () {
        html.style.overflowX = "";
      };
      zoom.finished.then(unclip, unclip);
      anims.push(zoom);
    }
    Promise.all(
      anims.map(function (a) {
        return a.finished;
      }),
    ).then(done, done);
  }

  Promise.all([drawn, ready])
    .then(locate)
    .then(handOff, function () {
      done();
    });
})();
