# packages/shared — `@datascratch/shared`

Общий TypeScript-код для веба, сервера и агентов: точные типы контрактов (`docs/architecture/contracts/`), криптография, модель документа, кодек штрихов, клиент синхронизации. ESM, строгий TypeScript, сборка tsup.

## Подпути

| Импорт | Что | Контракт |
| --- | --- | --- |
| `@datascratch/shared/contracts` | Типы и zod-схемы: документ, штрихи, сообщения синхронизации (`parseClientMessage` / `parseServerMessage`), тела REST API, константы и строки `ad` | все |
| `@datascratch/shared/crypto` | libsodium: `initCrypto()`, Argon2id → `loginKey`/`passwordKey`, конверт v1, обёртки ключей, `createAccountKeys`/`rekeyPassword`, ключ восстановления `DS1-…`, вложения кусками 1 MiB, ссылки шеринга, base64url | `crypto.md` |
| `@datascratch/shared/ids` | `uuidv7()` (монотонный), проверка, время из id | `document-model.md` §1 |
| `@datascratch/shared/document` | Фабрики `account`/`notebook`/`note` (с копией имени, иконки и пространства в `meta` блокнота),  доступ к записям (пространства, блокноты, папки, мета заметок, теги, избранное, вкладки), PM-JSON ↔ Yjs (как y-prosemirror), задачи, бэклинки, теги, текст для поиска, экспорт в Markdown, блочные операции для агентов (`applyBlockOperations`) | `document-model.md` |
| `@datascratch/shared/strokes` | Упаковка точек, якоря (Yjs RelativePosition) и D-35, раскладка по строкам при заданной платформой геометрии глифов, толщина, хранение штрихов, `rebaseRedoneAnchors` и `attachAnchorRebase` после undo, `restoreNoteVersion`, перепривязка при перестройке блоков (`captureAnchorOffsets` → `reanchorStrokes`) | `strokes.md` |
| `@datascratch/shared/sync` | `SyncClient` (WebSocket браузера/Node, офлайн-очередь через `SyncStorage`, шифрование, переподключение с backoff, снимки по порогам), `MemorySyncStorage`, `MemorySyncHub` — эталонный сервер протокола в памяти для тестов | `sync-protocol.md` |

Корневой импорт `@datascratch/shared` реэкспортирует всё.

## Коротко об использовании

```ts
import { initCrypto, createAccountKeys, signupFields } from "@datascratch/shared/crypto";
import { uuidv7 } from "@datascratch/shared/ids";

await initCrypto(); // один раз при старте
const userId = uuidv7();
const keys = createAccountKeys(password, userId);
await api.signup({ email, userId, accountDocId: uuidv7(), ...signupFields(keys) });
```

```ts
import { SyncClient } from "@datascratch/shared/sync";

const sync = new SyncClient({
  url: "wss://host/v1/sync",
  auth: async () => ({ kind: "user", accessToken: await tokens.access() }),
  deviceId, client: { platform: "web", version },
  storage: dexieSyncStorage,           // реализация SyncStorage
  keyFor: (docId) => keyring.get(docId),
});
await sync.addDoc(noteId, ydoc);       // локальные правки уходят сами
// при старте — addDocs([...]) одним пакетом (одно чтение курсоров и один subscribe)
sync.start();
```

Обновления, применённые из сети, помечены origin `REMOTE_ORIGIN` — редактор и undo-менеджер могут их отличать.

### Особенности, о которых стоит знать

- Атрибуты узлов со значением `null` в Yjs не хранятся (как в y-prosemirror); метки без атрибутов хранятся как `{}`.
- Якорь штриха на удалённом символе разрешается с `deleted: true`; точки на нём не рисуются, но штрих остаётся (D-35). Восстановление текста отменой видно другим устройствам только после `rebaseRedoneAnchors(doc)` (ссылки redone в Yjs локальны).
- Производительность первой синхронизации: `pnpm --filter @datascratch/shared bench 10000 <задержка хранилища, мс>`; 10 000 заметок ≈ 6 с на клиенте (цель spec/11 — до минуты). Реализациям `SyncStorage` стоит поддержать пакетные `getDocStates`/`setDocStates`: курсоры пишутся пачками раз в 200 мс.
- Клиент синхронизации считает `lastSeq` по максимуму полученных `seq` (из `update`, `updates`, `ack`): сервер обязан рассылать обновления документа в порядке `seq`.

## Разработка

```bash
pnpm --filter @datascratch/shared test        # vitest, включая проверку общих векторов
pnpm --filter @datascratch/shared build
```

Тесты читают векторы из `packages/test-vectors/vectors` — реализация обязана совпадать с ними байт в байт.
