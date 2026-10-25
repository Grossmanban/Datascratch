# packages/test-vectors — общие тестовые векторы

Наборы «вход → ожидаемый выход», по которым TypeScript (`packages/shared`, веб, сервер) и Swift (`apps/ios/Packages/DSCore`) доказывают совместимость без общего ядра (D-22). Контракты — `docs/architecture/contracts/`.

## Что внутри

Векторы — JSON в `vectors/`, закоммичены и **детерминированы** (повторная генерация даёт те же байты). Все двоичные значения — **канонический** base64url без padding (неиспользуемые младшие биты последнего символа — нули; схемы и декодеры обязаны отвергать иное), если поле не называется `…Hex`/`…hex`. У каждого файла есть `version` и `description` с точным правилом.

| Файл | Что проверяет |
| --- | --- |
| `crypto/kdf.json` | Argon2id → `authSeed`, `loginKey`, `passwordKey`; нормализация NFKC (байты `passwordNfkcUtf8`) |
| `crypto/envelope.json` | Конверт `0x01 ‖ nonce ‖ XChaCha20-Poly1305`; `failures` — что обязано не расшифроваться (код ошибки) |
| `crypto/key-wraps.json` | Обёртки masterKey/notebookKey/noteKey со строками `ad` из `crypto.md` |
| `crypto/recovery-key.json` | Ключ восстановления `DS1-…` (Crockford Base32), `recoveryLoginKey`; `parse` — разбор пользовательского ввода |
| `crypto/attachment.json` | Куски вложения по 1 MiB; большие конверты даны длиной и SHA-256 |
| `crypto/base64url.json` | base64url: граничные длины и строки, которые декодер обязан отвергнуть |
| `crypto/share-link.json` | Ссылка шеринга `…/s/<shareId>#k=<ключ>`: сборка, разбор, отказы |
| `crypto/signup-flow.json` | Сквозная регистрация с фиксированной случайностью: что должно уйти в `POST /auth/signup` |
| `api/bodies.json` | Тела REST API: `valid` принимаются, `invalid` отвергаются схемой с тем же именем |
| `ids/uuidv7.json` | Сборка UUIDv7 из времени и случайных байт |
| `strokes/points.json` | Упаковка точек (8 × Float32 LE) |
| `strokes/anchors.json` | Относительные позиции Yjs после вставок и удалений другим клиентом; D-35 |
| `strokes/layout.json` | Раскладка штриха по эталонной моноширинной вёрстке, разрыв по строкам, выпадение удалённых точек |
| `strokes/width.json` | Кривая нажима и толщина |
| `document/note.json` | Эталонная заметка **со всеми узлами и метками**, записанная через y-prosemirror (как пишет веб): байты обновления Yjs + ожидаемый канонический JSON, мета, штрихи, комментарии и производные данные (заголовок, текст для поиска, задачи, ссылки, теги, Markdown) |
| `document/notebook.json`, `document/account.json` | Индекс блокнота и документ аккаунта |
| `sync/messages.json` | Кадры протокола синхронизации: `valid` обязаны разбираться, `invalid` — отклоняться |

### Канонический JSON содержимого заметки

`content` (Y.XmlFragment) читается как ProseMirror-JSON: `{ type, attrs?, content?, text?, marks? }`.

- Атрибуты со значением `null` в Yjs **не хранятся** (так пишет y-prosemirror) — отсутствие атрибута означает `null`.
- Метка в `Y.XmlText` — атрибут форматирования `имяМетки` (или `имяМетки--<хэш>` для перекрывающихся меток) со значением «объект атрибутов метки»; у меток без атрибутов это `{}`. Читатель обязан принимать и `true`. В каноническом JSON у метки без атрибутов поле `attrs` опускается.
- Соседние текстовые узлы с разными метками — один `Y.XmlText` с несколькими кусками; inline-узлы (`noteLink`, `tag`, `hardBreak`) — отдельные `Y.XmlElement` между ними.

## Как пользоваться из Swift

Пакет `DSCore` подключает файлы как ресурсы теста (без копирования — относительный путь от `Package.swift`):

```swift
// apps/ios/Packages/DSCore/Package.swift
.testTarget(
    name: "DSCoreTests",
    dependencies: ["DSCore"],
    resources: [.copy("../../../../../packages/test-vectors/vectors")]
)
```

Если SwiftPM не принимает путь вне пакета, тесты читают файлы напрямую по пути от `#filePath`:

```swift
let vectors = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()          // Tests/DSCoreTests
    .appendingPathComponent("../../../../../../packages/test-vectors/vectors")
    .standardized

struct EnvelopeFile: Decodable {
    struct Case: Decodable { let key, nonce, ad, plaintext, envelope: String }
    let cases: [Case]
}

func testEnvelopes() throws {
    let data = try Data(contentsOf: vectors.appendingPathComponent("crypto/envelope.json"))
    for c in try JSONDecoder().decode(EnvelopeFile.self, from: data).cases {
        let out = try Envelope.encrypt(key: b64url(c.key), plaintext: b64url(c.plaintext),
                                       ad: c.ad, nonce: b64url(c.nonce))
        XCTAssertEqual(out.base64URLEncodedString(), c.envelope)
    }
}
```

Порядок для документа (`document/note.json`): `Doc()` → `applyUpdate(v1, base64url(update))` → обойти `content` → сравнить с `expected.content`; затем записать `expected.content` своим писателем в новый документ и сравнить дерево (так проверяется и запись). Для якорей (`strokes/anchors.json`): применить `base`, затем по очереди `steps[i].update`, после каждого шага разрешить все `anchors` и сравнить `{ deleted, index }`.

## Как обновлять

```bash
pnpm --filter @datascratch/test-vectors generate   # перезаписать vectors/
pnpm --filter @datascratch/test-vectors test       # проверить, что закоммиченное актуально (это же делает CI)
```

Генератор — `src/generate.ts` (TypeScript, использует `@datascratch/shared` и для документа — сам y-prosemirror со схемой `src/pm-schema.ts`). Изменение векторов = изменение контракта: только через координатора (`docs/architecture/contracts/README.md`).
