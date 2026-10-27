/**
 * Server-rendered pages of the OAuth flow in the "Тихая бумага" style
 * (D-38, contracts/design-tokens.md): warm paper background, white card,
 * serif display heading, ink-blue accent, light and dark themes.
 * No JavaScript and no external resources.
 */

import { ICON_STYLE, notebookIcon } from "./notebook-icon.js";
import { esc } from "./pages-escape.js";

export { esc };

const STYLE = `
:root{--canvas:#FAF8F4;--surface:#FFFFFF;--text:#1D1C1A;--text2:#6B6862;--text3:#9C978E;--line:#E6E1D8;--accent:#2E5BDB;--accent-soft:rgba(46,91,219,.08);--warning:#C98A1B;--warning-soft:rgba(201,138,27,.10);--danger:#D2453B;--on-accent:#FFFFFF;
--shadow:0 1px 2px rgba(29,28,26,.04),0 12px 40px rgba(29,28,26,.08);--display:"Newsreader","New York","Iowan Old Style",Georgia,serif;--sans:"Inter",-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--canvas:#1A1917;--surface:#22211E;--text:#ECE9E3;--text2:#A19D95;--text3:#77736C;--line:#34322E;--accent:#7B9BFF;--accent-soft:rgba(123,155,255,.12);--warning:#F2B54B;--warning-soft:rgba(242,181,75,.12);--danger:#FF6B5E;--on-accent:#0E1220;--shadow:0 1px 2px rgba(0,0,0,.3),0 12px 40px rgba(0,0,0,.35)}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:var(--canvas);color:var(--text);font:16px/1.5 var(--sans);-webkit-font-smoothing:antialiased;display:flex;align-items:flex-start;justify-content:center;padding:clamp(16px,6vh,72px) 16px}
main{width:100%;max-width:520px;background:var(--surface);border-radius:20px;box-shadow:var(--shadow);padding:clamp(24px,5vw,40px)}
.brand{display:flex;align-items:center;gap:10px;color:var(--text2);font-size:13px;letter-spacing:.02em;margin-bottom:28px}
.brand b{color:var(--text);font-weight:600}
.dot{width:8px;height:8px;border-radius:50%;background:var(--accent)}
h1{font:600 30px/1.2 var(--display);margin:0 0 8px;letter-spacing:-.01em}
p{margin:0 0 16px;color:var(--text2)}
.who{display:flex;gap:14px;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:14px;margin:20px 0 24px}
.who img{width:40px;height:40px;border-radius:10px;object-fit:cover}
.who .ph{width:40px;height:40px;border-radius:10px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font:600 18px var(--display)}
.who small{display:block;color:var(--text3);font-size:13px}
.who b{overflow-wrap:anywhere}
.badge{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;font:600 11px/18px var(--sans);letter-spacing:.02em;vertical-align:2px}
.badge.ok{background:var(--accent-soft);color:var(--accent)}
.badge.warn{background:var(--warning-soft);color:var(--warning)}
h2{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin:24px 0 10px}
.nb{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;cursor:pointer;transition:border-color .2s,background .2s}
.nb:hover{border-color:var(--accent)}
.nb input{width:18px;height:18px;accent-color:var(--accent);margin:0}
.nb:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}
.nb small{color:var(--text3);margin-left:auto;font-size:13px}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.seg label{display:block;padding:12px 14px;border:1px solid var(--line);border-radius:12px;cursor:pointer;transition:border-color .2s,background .2s}
.seg label:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}
.seg input{position:absolute;opacity:0;pointer-events:none}
.seg b{display:block;font-weight:600}
.seg span{font-size:13px;color:var(--text2)}
.note{margin:24px 0 0;padding:12px 14px;border-radius:12px;background:var(--warning-soft);color:var(--text);font-size:14px}
.empty{padding:16px;border:1px dashed var(--line);border-radius:12px;color:var(--text2);font-size:14px}
.actions{display:flex;gap:10px;margin-top:28px}
button,.btn{flex:1;appearance:none;border:0;border-radius:12px;padding:13px 18px;font:600 16px var(--sans);cursor:pointer;text-align:center;text-decoration:none;transition:transform .12s,opacity .2s}
button:active,.btn:active{transform:scale(.98)}
.primary{background:var(--accent);color:var(--on-accent)}
button:disabled{opacity:.4;cursor:not-allowed}
.secondary{background:transparent;color:var(--text);border:1px solid var(--line)}
.fine{margin-top:20px;font-size:12px;color:var(--text3)}
code{font-size:13px;background:var(--accent-soft);padding:1px 6px;border-radius:6px}
${ICON_STYLE}
`;

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} — Datascratch</title><style>${STYLE}</style></head><body><main><div class="brand"><span class="dot"></span><b>Datascratch</b></div>${body}</main></body></html>`;
}

export interface ConsentNotebook {
  id: string;
  name: string;
  space: string | null;
  icon: string | null;
  color: string | null;
  /** The server cannot read this notebook's data right now (its name is unknown). */
  unavailable?: boolean;
}

export interface ConsentPageInput {
  /** Name the client gives itself — not verified, shown as a quote. */
  clientName: string;
  clientUri: string | null;
  logoUri: string | null;
  /** Where the browser goes back: host of an https/loopback redirect, or the private-use scheme. */
  redirectHost: string;
  /**
   * The client is identified by an https client_id that served its metadata
   * document (CIMD): its host is verified. Dynamically registered clients can
   * call themselves anything (RFC 7591), so they are «не проверен».
   */
  verifiedHost: string | null;
  userEmail: string | null;
  notebooks: ConsentNotebook[];
  /** The client asked for `notes:write`: pre-select "read & write". */
  writeRequested: boolean;
  request: string;
  action: string;
  appUrl: string | null;
}

/** How the redirect target reads for a person: a site, an app on this computer, or a native app. */
function describeRedirect(redirectHost: string): string {
  if (/^(127\.0\.0\.1|\[::1\]|localhost)(:\d+)?$/.test(redirectHost)) return "программа на этом компьютере";
  if (redirectHost.endsWith(":")) return `приложение ${redirectHost.slice(0, -1)}`;
  return redirectHost;
}

export function consentPage(i: ConsentPageInput): string {
  const initial = esc((i.clientName.trim()[0] ?? "A").toUpperCase());
  // Only a verified client may show its picture: an unverified logo could imitate a known agent (and works as a tracking pixel).
  const logo = i.verifiedHost && i.logoUri && /^https:\/\//.test(i.logoUri) ? `<img src="${esc(i.logoUri)}" alt="">` : `<div class="ph">${initial}</div>`;
  const identity = i.verifiedHost ?? describeRedirect(i.redirectHost);
  const badge = i.verifiedHost ? `<span class="badge ok">адрес проверен</span>` : `<span class="badge warn">не проверен</span>`;
  const site = i.verifiedHost && i.clientUri ? safeHost(i.clientUri) : null;
  const details = [`называет себя «${esc(i.clientName)}»`, site && site !== i.verifiedHost ? `сайт ${esc(site)}` : null, `вернёт вас на ${esc(i.redirectHost)}`]
    .filter(Boolean)
    .join(" · ");
  const notebooks = i.notebooks.length
    ? i.notebooks
        .map(
          (n, k) =>
            `<label class="nb"><input type="checkbox" name="notebook" value="${esc(n.id)}"${i.notebooks.length === 1 || k === 0 ? " checked" : ""}>${notebookIcon(n.icon, n.color)}<span>${esc(n.name)}</span>${n.unavailable ? `<small>данные сейчас недоступны</small>` : n.space ? `<small>${esc(n.space)}</small>` : ""}</label>`,
        )
        .join("")
    : `<div class="empty">Нет блокнотов в режиме «для агентов». Включите этот режим у блокнота в Datascratch${i.appUrl ? ` (<a href="${esc(i.appUrl)}">открыть</a>)` : ""} и вернитесь сюда.</div>`;
  const body = `
<h1>Доступ для ИИ-агента</h1>
<p>Агент просит доступ к вашим заметкам${i.userEmail ? ` в аккаунте <b>${esc(i.userEmail)}</b>` : ""}.</p>
<div class="who">${logo}<div><b>${esc(identity)}</b>${badge}<small>${details}</small></div></div>
${i.verifiedHost ? "" : `<div class="note">Название этого агента не проверено: так может назвать себя кто угодно. Разрешайте доступ, только если вы сами только что начали подключение и адрес возврата выше вам знаком.</div>`}
<form method="post" action="${esc(i.action)}">
<input type="hidden" name="request" value="${esc(i.request)}">
<h2>Блокноты</h2>
${notebooks}
<h2>Права</h2>
<div class="seg">
<label><input type="radio" name="permission" value="read"${i.writeRequested ? "" : " checked"}><b>Только чтение</b><span>искать и читать заметки</span></label>
<label><input type="radio" name="permission" value="read_write"${i.writeRequested ? " checked" : ""}><b>Чтение и правка</b><span>создавать и менять заметки</span></label>
</div>
<div class="note">Агент увидит только выбранные блокноты. Его правки появляются сразу, подсвечиваются и откатываются через историю версий. Доступ можно отозвать в настройках в любой момент.</div>
<div class="actions">
<button class="secondary" type="submit" name="decision" value="deny">Отклонить</button>
<button class="primary" type="submit" name="decision" value="allow"${i.notebooks.length ? "" : " disabled"}>Разрешить</button>
</div>
</form>
<p class="fine">Разрешайте доступ только агентам, которым доверяете. Блокноты «для агентов» сервер может расшифровать по запросу агента; приватные блокноты агентам недоступны.</p>`;
  return layout("Доступ для ИИ-агента", body);
}

export function signInPage(appUrl: string | null): string {
  return layout(
    "Войдите в Datascratch",
    `<h1>Сначала войдите</h1><p>Чтобы разрешить агенту доступ, войдите в Datascratch в этом браузере, затем вернитесь к подключению агента.</p>${
      appUrl ? `<div class="actions"><a class="btn primary" href="${esc(appUrl)}">Открыть Datascratch</a></div>` : ""
    }`,
  );
}

export function errorPage(message: string): string {
  return layout("Ошибка подключения", `<h1>Не получилось подключить агента</h1><p>${esc(message)}</p><p class="fine">Закройте это окно и попробуйте подключить агента заново. Если ошибка повторяется — проверьте адрес сервера в настройках агента.</p>`);
}

function safeHost(uri: string): string | null {
  try {
    return new URL(uri).host;
  } catch {
    return null;
  }
}
