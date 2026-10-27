import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { AwarenessEditor } from "./AwarenessEditor";
import { PasteEditor } from "./PasteEditor";

// Security audit 2026-10-27 (defence in depth behind the app's CSP): document and presence data
// never inject CSS, pasted Markdown/HTML never runs or loads active content, links are web or
// mail only, and one paste cannot flood the network or memory.

const OVERLAY = "#000;position:fixed;inset:0;z-index:9999;background:red";

async function ready(page: Page) {
  await page.waitForFunction(() => window.__paste?.ready === true);
}

async function paste(page: Page, data: { html?: string; text?: string }) {
  await page.evaluate((data) => {
    const ed = window.__paste!.api.editor;
    ed.commands.focus(ed.state.doc.firstChild!.nodeSize + 1);
    const dt = new DataTransfer();
    if (data.html !== undefined) dt.setData("text/html", data.html);
    dt.setData("text/plain", data.text ?? "");
    document.querySelector(".ds-prose")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, data);
}

/** Elements of the note whose computed position is fixed or whose inline style carries `position`. */
const injected = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll(".ds-prose *, .ds-collab-caret, .ds-collab-selection"))
      .filter((e) => getComputedStyle(e).position === "fixed" || /position|inset|url\(/i.test(e.getAttribute("style") ?? ""))
      .map((e) => e.outerHTML.slice(0, 120)),
  );

test("colours and alignments from the document never inject CSS", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await page.evaluate((evil) => {
    // JSON content goes straight to renderHTML, like data written by another client.
    window.__paste!.api.editor.commands.setContent({
      type: "doc",
      content: [
        { type: "title", content: [{ type: "text", text: "Т" }] },
        {
          type: "paragraph",
          attrs: { textAlign: "center;position:fixed;inset:0" },
          content: [
            { type: "text", text: "цвет", marks: [{ type: "textColor", attrs: { color: evil } }] },
            { type: "text", text: " маркер", marks: [{ type: "highlight", attrs: { color: "x,red);position:fixed;inset:0;--a:(" } }] },
            { type: "text", text: " токен", marks: [{ type: "textColor", attrs: { color: "tint.red.fg" } }] },
            { type: "text", text: " hex", marks: [{ type: "textColor", attrs: { color: "#C2412F" } }] },
          ],
        },
        {
          type: "table",
          content: [{ type: "tableRow", content: [{ type: "tableCell", attrs: { align: "right;position:fixed;inset:0" }, content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] }] }],
        },
        { type: "paragraph", attrs: { textAlign: "right" }, content: [{ type: "text", text: "вправо" }] },
      ],
    });
  }, OVERLAY);
  expect(await injected(page)).toEqual([]);
  // Valid values still render.
  const styles = await page.evaluate(() => Array.from(document.querySelectorAll(".ds-prose [style]")).map((e) => e.getAttribute("style")));
  expect(styles).toContain("color: var(--ds-tint-red-fg, #C2412F);");
  expect(styles).toContain("color: rgb(194, 65, 47);");
  expect(styles).toContain("text-align: right;");
  // Invalid ones are dropped, not passed through.
  expect(styles).toContain("color: inherit;");
  expect(styles).toContain("--ds-mark-bg: inherit;");
});

test("a collaborator's colour from awareness never injects CSS", async ({ mount, page }) => {
  await mount(<AwarenessEditor docKey="sec" awarenessKey="a" />);
  await page.waitForFunction(() => window.__aw?.ready === true && !window.__aw.api!.editor.isDestroyed);
  await page.evaluate(() => {
    const e = window.__aw!.api!.editor;
    e.commands.focus();
    e.commands.setTextSelection({ from: 4, to: 9 });
  });
  await expect.poll(() => page.evaluate(() => Boolean(window.__aw!.awareness["sec:a"]!.getLocalState()?.cursor))).toBe(true);
  await page.evaluate((evil) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Y, Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, doc, awareness } = window.__aw!.lib as any;
    const remoteDoc = new Y.Doc();
    Y.applyUpdate(remoteDoc, Y.encodeStateAsUpdate(doc));
    const remote = new Awareness(remoteDoc);
    remote.setLocalState({ user: { name: "Чужой", color: evil }, cursor: awareness.getLocalState().cursor });
    applyAwarenessUpdate(awareness, encodeAwarenessUpdate(remote, [remote.clientID]), "remote");
  }, OVERLAY);
  await expect(page.locator(".ds-collab-label", { hasText: "Чужой" })).toHaveCount(1);
  expect(await injected(page)).toEqual([]);
  expect(await page.locator(".ds-collab-caret").evaluateAll((els) => els.map((e) => (e as HTMLElement).style.getPropertyValue("--ds-collab-color")))).toEqual(["#2E5BDB"]);
});

test("pasted Markdown and HTML never run or load active content", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  const raw = [
    `<video src="x" onerror="window.__pwned='video'"></video>`,
    `<details open ontoggle="window.__pwned='details'"><summary>s</summary></details>`,
    `<iframe srcdoc="<script>parent.__pwned='iframe'</script>"></iframe>`,
    `<object data="x"></object><embed src="x">`,
    `<svg onload="window.__pwned='svg'"><circle r="5"/></svg>`,
    `<p onclick="window.__pwned='click'" onmouseover="window.__pwned='hover'">текст</p>`,
  ].join("\n");
  await paste(page, { text: `# Заголовок\n\n${raw}\n\nконец` });
  await paste(page, { html: `<p>html</p>${raw}`, text: "html" });
  await page.waitForTimeout(300);
  await page.locator(".ds-prose p", { hasText: "текст" }).first().hover();
  await page.locator(".ds-prose p", { hasText: "текст" }).first().click();
  expect(await page.evaluate(() => (window as unknown as { __pwned?: string }).__pwned)).toBeUndefined();
  const active = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".ds-prose *"))
      .filter((e) => ["IFRAME", "OBJECT", "EMBED", "VIDEO", "DETAILS"].includes(e.tagName) || e.tagName.toLowerCase() === "svg" && !e.closest(".ds-upload-ring, .ds-task-check, button") || Array.from(e.attributes).some((a) => /^on/i.test(a.name)))
      .map((e) => e.tagName),
  );
  expect(active).toEqual([]);
  expect(await page.evaluate(() => window.__paste!.api.editor.getText())).toContain("конец");
});

test("links are web or mail only: rendering, pasting and setting", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await page.evaluate(() => {
    const link = (href: string, text: string) => ({ type: "text", text, marks: [{ type: "link", attrs: { href } }] });
    window.__paste!.api.editor.commands.setContent({
      type: "doc",
      content: [
        { type: "title", content: [{ type: "text", text: "Т" }] },
        {
          type: "paragraph",
          content: [link("javascript:alert(1)", "js"), { type: "text", text: " " }, link("data:text/html,<b>x</b>", "data"), { type: "text", text: " " }, link(" JaVaScRiPt:alert(1)", "js2"), { type: "text", text: " " }, link("https://example.com/a", "web"), { type: "text", text: " " }, link("mailto:a@example.com", "mail")],
        },
        { type: "paragraph" },
      ],
    });
  });
  const hrefs = () => page.evaluate(() => Array.from(document.querySelectorAll(".ds-prose a")).map((a) => [a.textContent, a.getAttribute("href")]));
  expect(await hrefs()).toEqual([
    ["js", null],
    ["data", null],
    ["js2", null],
    ["web", "https://example.com/a"],
    ["mail", "mailto:a@example.com"],
  ]);
  // Pasted HTML: a javascript: link is plain text.
  await page.evaluate(() => {
    const ed = window.__paste!.api.editor;
    ed.commands.focus(ed.state.doc.content.size - 1);
    const dt = new DataTransfer();
    dt.setData("text/html", `<p><a href="javascript:alert(1)">вставка</a> и <a href="vbscript:x">ещё</a></p>`);
    dt.setData("text/plain", "вставка и ещё");
    document.querySelector(".ds-prose")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  const marks = await page.evaluate(() => {
    const out: string[] = [];
    window.__paste!.api.editor.state.doc.descendants((n) => {
      if (n.isText && /вставка|ещё/.test(n.text!)) out.push(...n.marks.map((m) => m.type.name));
      return true;
    });
    return out;
  });
  expect(marks).toEqual([]);
  // Setting a link: the command refuses other schemes.
  const set = await page.evaluate(() => {
    const ed = window.__paste!.api.editor;
    ed.commands.setTextSelection({ from: 4, to: 6 });
    return [ed.commands.setLink({ href: "javascript:alert(1)" }), ed.commands.setLink({ href: "https://ok.example" })];
  });
  expect(set).toEqual([false, true]);
});

test("one paste: at most 50 images, 4 fetched at once, data: images over 20 MB dropped", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  const html = Array.from({ length: 60 }, (_, i) => `<p>п${i}</p><img src="https://example.com/lag-${i}.png">`).join("");
  await paste(page, { html, text: "много" });
  const count = () => page.evaluate(() => {
    let n = 0;
    window.__paste!.api.editor.state.doc.descendants((node) => {
      if (node.type.name === "image") n++;
      return true;
    });
    return n;
  });
  expect(await count()).toBe(50);
  await expect.poll(() => page.evaluate(() => window.__paste!.fetched.length), { timeout: 15_000 }).toBe(50);
  expect(await page.evaluate(() => window.__paste!.inflight.max)).toBeLessThanOrEqual(4);
  expect(await page.evaluate(() => window.__paste!.inflight.max)).toBeGreaterThan(1);

  // A 21 MB data: image is dropped; a small one goes in.
  await page.evaluate(() => {
    const ed = window.__paste!.api.editor;
    ed.commands.setContent("<h1 data-type=title>Т</h1><p></p>");
    const big = "data:image/png;base64," + "A".repeat(Math.ceil((21 * 1024 * 1024 * 4) / 3));
    const dt = new DataTransfer();
    dt.setData("text/html", `<p>до</p><img src="${big}" alt="большая"><img src="data:image/png;base64,iVBORw==" alt="маленькая"><p>после</p>`);
    dt.setData("text/plain", "до после");
    ed.commands.focus(ed.state.doc.firstChild!.nodeSize + 1);
    document.querySelector(".ds-prose")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  const alts = await page.evaluate(() => {
    const out: string[] = [];
    window.__paste!.api.editor.state.doc.descendants((n) => {
      if (n.type.name === "image") out.push(n.attrs.alt);
      return true;
    });
    return out;
  });
  expect(alts).toEqual(["маленькая"]);
});
