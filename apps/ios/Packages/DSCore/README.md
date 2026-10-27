# DSCore

Ядро данных iOS-приложения Datascratch (поток ios-core, D-39): модель документа на Yrs,
криптография, локальное хранилище, REST- и sync-клиенты. На нём строятся `DSEditor`
(редактор) и приложение (`apps/ios`).

Swift 6 (строгая конкурентность), iOS/iPadOS 26+ (D-32). Контракты, которые реализует пакет:
`docs/architecture/contracts/` — `document-model.md`, `strokes.md`, `crypto.md`,
`sync-protocol.md`, `api.md`.

## Подключение

```swift
// Package.swift пакета-потребителя
.package(path: "../DSCore"),
// ...
.product(name: "DSCore", package: "DSCore")
```

Rust-библиотека Yrs приходит готовой: `Package.swift` скачивает `yrs_ffiFFI.xcframework` из
GitHub-релиза `yrs-ffi-<хэш>` (публикует CI `ios-core.yml` после зелёных тестов). Rust и
скрипты потребителям **не нужны**.

| Где | Что |
| --- | --- |
| Потребитель (DSEditor, приложение, их CI) | ничего: SwiftPM сам скачает и проверит контрольную сумму |
| Правка `yrs-ffi` на Mac | `scripts/build-xcframework.sh` (Xcode 26+, `rustup`) — локальная сборка в `build/` имеет приоритет над релизом; после зелёного CI вписать новый url/checksum из сводки задания в `yrsRelease` (`Package.swift`) |
| Linux (облачные сессии) | `scripts/build-linux.sh`, затем `swift build` / `swift test` (Swift 6.2+, `libsodium-dev`, `libsqlite3-dev`) |

`scripts/generate-bindings.sh` — перегенерировать Swift-привязки после правки `yrs-ffi/src`
(CI проверяет, что закоммиченные привязки свежие).

## Устройство

```
DSCore
├─ yrs-ffi/            Rust-крейт: UniFFI-обёртка над yrs 0.25 (вендорена с патчем, vendor/PATCHES.md)
│  └─ compat/          генератор эталонов Yjs/y-prosemirror и проверка «Yjs читает документ Yrs»
├─ Sources/YrsFFI      сгенерированные привязки (не править руками)
└─ Sources/DSCore
   ├─ CRDT/            CRDTDocument, CRDTTransaction, YValue — низкий уровень
   ├─ Model/           NoteDocument, NotebookDocument, AccountDocument, Block, Stroke, производные данные
   ├─ Crypto/          DSCrypto, KeyRing, SecretStore (Keychain)
   ├─ Storage/         LocalStore (GRDB): обновления, очередь, индексы, поиск, вложения
   ├─ Network/         APIClient (REST)
   └─ Sync/            SyncClient (WebSocket), SyncEngine (документы ↔ хранилище ↔ сервер)
```

## Документы (CRDT)

`CRDTDocument(kind:docId:)` — документ Yjs на Yrs. Корневые типы задаются видом
(`DocKind.account/.notebook/.note`, document-model.md §2–4). Все текстовые смещения —
**UTF-16** (как `NSString`/`NSRange` и Yjs).

- Чтение — снимки: `mapValue(root, path)`, `mapKeys`, `arrayValues`, `xmlChildren(root, at:)`,
  `xmlNode(root, at:)`. Значения — `YValue` (`.string`, `.number`, `.bytes`, `.object`,
  `.sharedMap`, …; удобные `stringValue`, `entries`, литералы `"x"`, `1`, `true`, `nil`).
- Запись — пакетом в одной транзакции:
  ```swift
  try doc.transact(origin: .local) { txn in
      txn.insertText("Hi", marks: ["bold": .emptyObject], at: 0, in: [1, 0])
      txn.setAttribute("level", 2, at: [3])
  }
  ```
  Пути в XML — индексы детей от корня `content` (`[1, 0]` — первый ребёнок второго блока);
  пути в картах — ключи вложенных `Y.Map`.
- Происхождение (`TransactionOrigin`): `.local` — правка пользователя (попадает в отмену и
  на сервер), `.system` — программная правка (на сервер, без отмены), `.undo`, `.remote`
  (с сервера), `.storage` (загрузка с диска). `isOutgoing` — нужно ли отправлять.
- Наблюдение: `observeUpdates { update, origin in }` (каждое обновление — для хранилища и
  синхронизации), `observeDeep("content") { events, origin in }` (пути + дельты текста /
  детей / ключей — для инкрементальной перерисовки). Колбэк вызывается **внутри транзакции**:
  не обращаться из него к документу, скопировать данные и уйти в другую задачу.
- Отмена: `enableUndo(roots:captureTimeout:)`, `undo()`, `redo()`, `canUndo`, `stopCapturing()`.
  Запоминаются только `.local`-транзакции. Для заметок вызывать `NoteDocument.undo()/redo()`:
  они ещё и перепривязывают якоря штрихов (strokes.md §4.1).
- Относительные позиции (якоря штрихов, комментарии):
  `relativePosition(at: path, index:, assoc:)` → `Data` (байты `Y.encodeRelativePosition`),
  `resolve(relativePositions:)` → `[ResolvedIndex?]` (`path`, `index`, `deleted` — символ
  удалён, D-35). Разрешение учитывает восстановленные отменой элементы.
- `CRDTUpdates.merge/diff/stateVector(of:)` — операции над закодированными обновлениями.

## Модель заметки

`NoteDocument(noteId:)` (или `NoteDocument(crdt)`), `initialize(title:)` для новой заметки.

- Блоки: `blocks() -> [Block]`, `block(at:)`, `title()`, `path(ofBlock: blockId)`,
  `insertBlocks(_:into:at:)`, `appendBlocks`, `deleteBlock(at:)`, `replaceBlock`, `moveBlock`,
  `setBlockAttributes(_:at:)` (`.null` удаляет атрибут).
- `Block`: `type`, `attrs`, `blockId`, `inline: [Inline]` (текстовые блоки), `children`
  (контейнеры), `raw` (неизвестный узел, пишется обратно как есть). Фабрики:
  `.paragraph`, `.title`, `.heading`, `.taskItem`, `.container`, `.atom`. Имена — `BlockType`.
- `Inline`: `.text(String, marks: [Mark])` или `.node(name:attrs:)` (`noteLink`, `tag`,
  `hardBreak`). `Mark`: `.bold`, `.italic`, `.link(href)`, `.highlight(color)`, … Метки
  пишутся объектом (`{}` без атрибутов), читаются и `{}`, и `true`, и `имя--хэш`.
- Правка текста внутри блока по смещению уровня блока (inline-узел = 1 символ):
  `insertText(_:marks:at:inBlock:)`, `deleteText(range:inBlock:)`,
  `format(range:set:remove:inBlock:)`, `insertInlineNode(name:attrs:at:inBlock:)`,
  `locate(offset:inBlock:)` → путь `XmlText` и смещение в нём (для якорей штрихов).
- Задачи: `updateTask(taskId:state:scheduled:deadline:)` (`.done` ставит `completedAt`).
- `meta()`, `setStyle`, `setCover`, `setBackdrop`; `isReadOnly`, если `formatVersion` новее.
- Штрихи: `strokes()`, `stroke(id:)`, `addStrokes`, `removeStrokes(ids:)` (ластик по
  штриху), `replaceStroke(id:with:)` (ластик по пикселю), `setStrokeHidden`.
  `Stroke` — поля strokes.md §2; `StrokeCodec.pack/unpack` — упаковка точек §3;
  `StrokeMetrics.width(...)` — толщина §5; `stroke.segments(resolved:line:)` — разбиение на
  рисуемые сегменты (удалённые якоря, разрыв по строкам, сегменты < 2 точек — §4).
- Осиротевшие штрихи (§4.2): `orphanedStrokeIds()`, `LocalStore.updateOrphans`,
  `purgeOrphanedStrokes(orphanedAt:)` перед сборкой снимка.
- Комментарии: `comments()`, `addComment`, `resolveComment`, `deleteComment`.
- Производные данные: `derived() -> NoteDerivedData` (заголовок, plain text, задачи,
  ссылки `[[ ]]` и карточки страниц, теги) — по тем же правилам, что
  `packages/shared/src/document/extract.ts`.
- Экспорт: `contentJSON()` — канонический ProseMirror-JSON; `markdown()` /
  `MarkdownExport.render` — Markdown в стиле Obsidian (байт в байт как TS).
- История версий: `restoreVersion(state:)` — восстанавливает `content` и `strokes` версии
  с перепривязкой якорей (strokes.md §4.1).

## Блокнот и аккаунт

- `NotebookDocument`: `folders()`, `putFolder`, `updateFolder(id:_:)` (по полям — правки
  разных полей с разных устройств сливаются), `deleteFolder` (содержимое — родителю),
  `notes(inFolder:)`, `note(id:)`, `putNote`, `updateNote`, `syncDerived(_:)` (копия
  заголовка и тегов в `NoteMeta`), `trashNote/restoreNote/purgeNote`, `expiredTrash()`,
  `dailyNote(for:)`, `inbox`, `tagCounts()`, `setTagProperties`.
  `metaCopy` / `setMetaCopy(_:)` — копия названия, иконки, цвета и пространства в `meta` блокнота
  для агентов (они не читают документ аккаунта); обновлять при создании, переименовании, смене
  иконки или цвета, переносе в другое пространство и переименовании пространства — проще всего
  `AccountService.refreshNotebookMeta(_:in:)`, который берёт всё из документа аккаунта.
- Заметка, созданная агентом (D-45): `NoteMeta.createdByAgent` (`AgentAuthor { agentId,
  agentName, at }` или `nil`; отсутствующее и испорченное значение читается как `nil`) —
  показать полоску «Создано агентом {agentName}»; «Понятно» →
  `NotebookDocument.clearCreatedByAgent(noteId:)` (поле становится `null` на всех устройствах).
- `AccountDocument`: `spaces()`, `putSpace`, `notebooks(inSpace:)`, `putNotebook`,
  `setting/setSetting`, `dailyNotebookId`, `starred/star/unstar`, `tabs/openTab/closeTab`.
- Записи: `Space`, `NotebookRef`, `Folder`, `NoteMeta`, `TagProperties`, `StarredItem`.

## Криптография (crypto.md)

- `DSCrypto.deriveKeys(password:salt:params:)` → `loginKey`, `passwordKey` (Argon2id,
  ~0.5 с — не на главном потоке); `seal/open` (конверт `0x01 || nonce || XChaCha20-Poly1305`
  с `ad` из `CryptoAD`); `wrapKey/unwrapKey`; `sealAttachment/openAttachment` (куски по 1 MiB);
  `recoveryLoginKey`. `RecoveryKeyFormat.format/parse` — `DS1-XXXX-…` (Crockford Base32).
- Параметры KDF с сервера (`APIClient.prelogin`: вход, смена пароля, смена ключа
  восстановления) принимаются только в границах crypto.md §2 (`KDFParams.validate()`:
  `argon2id13`, `3 ≤ ops ≤ 10`, `64 MiB ≤ mem ≤ 256 MiB`), иначе `CryptoError.unsafeKDF` —
  враждебный сервер не может удешевить `loginKey` для перебора пароля.
- Пути REST: id в пути — только буквы, цифры, `-`, `_` (`UnsafePathError`, запрос не уходит).
- Отзыв устройства (D-53): `401` с `error.code == "device_revoked"` (в том числе на
  `/auth/refresh`) → `DeviceRevokedError(reason:)`, один раз `APIClient.setDeviceRevokedHandler`,
  `api.revocation` (сбрасывается новой сессией устройства — вход, регистрация, восстановление;
  после повторного входа следующий отзыв сообщается снова); без повторов и обновления токена. Разбор ответов — `APIFailure.classify`
  (векторы `api/failures.json`): истёкший токен, страница прокси с 401, 502–504 без нашего тела
  и отсутствие ответа отзывом не считаются никогда. Причина: `user`, `password_change`,
  `recovery`, `token_reuse`, `account_deleted`; неизвестная или без причины → `user`.
- `SignupMaterial.make(password:userId:)`, `PasswordChangeMaterial.make(...)` — всё для
  `/auth/signup`, `/auth/password`, `/auth/recovery/finish`.
- `KeyRing(store:)` — иерархия ключей: мастер-ключ, ключи блокнотов (в `SecretStore`),
  ключи заметок (в памяти). `KeychainSecretStore` (Keychain, только это устройство, после
  первой разблокировки) и `InMemorySecretStore` (тесты).

## Аккаунт, вложения, шеринг

- `AccountService(api:keys:store:)`: `signup(email:password:)` (возвращает текст ключа
  восстановления — показать один раз), `login`, `recover(email:recoveryKeyText:newPassword:)`,
  `changePassword`, `rotateRecoveryKey(email:currentPassword:account:)` (новый ключ восстановления,
  подтверждение паролем; возвращает текст ключа — показать один раз; сбрасывает
  `AccountDocument.recoveryKeyConfirmed`, подтверждение — `setRecoveryKeyConfirmed(true)`),
  `securityEvents()` (журнал безопасности), `logout` (ключи блокнотов, ещё не дошедших до сервера,
  сохраняются — spec/07; возвращает их id; перед выходом показать `LocalStore.unsentChangeCount()`),
  `eraseDeviceKeys()` («Удалить данные с этого устройства»; ключи при входе в другой аккаунт
  удаляются сами — `KeyRing.resolveKeptKeys`), `createNotebook(name:spaceId:mode:...in:)`
  (ключ, `POST /notebooks`, `POST /docs`, документ блокнота, `NotebookRef`), `loadNotebookKeys()`
  (новое устройство), `setMode` (режим «для агентов»), `createNote(in:...)` (ключ заметки,
  `NoteMeta`), `moveNote(id:from:to:)` (перенос в другой блокнот), `dailyNote(for:in:)`, `inbox(in:)`.
- `AttachmentManager(api:store:directory:)`: `add(_:mime:noteId:)` → `attachmentId` (файл
  сохраняется локально и ставится в очередь); `add(_:mime:noteId:id:)` — с id, созданным заранее
  (`EntityID.make()`), когда блок должен сослаться на вложение раньше, чем есть байты (вставка
  веб-страницы: блок сразу, картинка — после загрузки). Пока байты не добавлены, о вложении нигде
  ничего нет: не отправляется и не требует уборки; неверный id — `AttachmentError.invalidId`,
  занятый — `.alreadyExists`. Id вложения — только UUIDv7 везде (`localURL`, `upload`, `download`,
  `delete`, обложка в `meta`): id из содержимого заметки (другие устройства, агенты) вида
  `../library.sqlite` не выходит за папку вложений. `download` сверяет описание с сервера (число
  кусков с размером, размер с записанным и с `maxSize` = 200 МБ, размер каждого куска) и пишет
  куски на диск по мере расшифровки — `AttachmentError.invalidDownload`, файла не остаётся.
  `wipeLocal()` / `AttachmentManager.wipeLocal(directory:store:)` — все локальные файлы и записи
  вложений («Удалить данные с этого устройства»). `uploadPending(noteKey:)` / `upload` (куски по
  1 MiB, докачка), `download(...)`, `localURL`, `delete`.
- `ShareLink(url:)` / `.url` — ссылки `https://<host>/s/<shareId>#k=<ключ>` (crypto.md §7).

### Совместный доступ по аккаунтам (D-54, crypto.md §10)

- Пара ключей аккаунта X25519: `AccountService.ensureBoxKeyPair()` (само при регистрации и входе;
  у старых аккаунтов создаётся и публикуется `PUT /me/box-key` один раз, на других устройствах
  загружается и сверяется с открытым ключом — `CryptoError.boxKeyMismatch`). `KeyRing.boxSecretKey`.
- Владелец: `invite(_:role:to:)` → id приглашения (ссылка `…/invite/<id>`);
  `grantPendingKeys(to:key:version:confirmed:)` — выдаёт ключ принявшим (`awaiting_key`), обёрнутый
  для каждого (`DSCrypto.wrapKeyForMember`); зарегистрировавшиеся после приглашения — только после
  подтверждения владельца, они возвращаются для вопроса «… зарегистрировалась — открыть доступ?».
  `ownerKey(notebookId:)` / `ownerKey(note:notebookId:)` — текущий ключ и версия.
- Смена ключа (после удаления или выхода участника): `resumeNotebookRotation(_:)` при запуске
  (по `keyRotationPending`) или `rotateNotebookKey(_:)` сразу — шаг 1 одним `rotate` (новая
  версия для владельца, активных участников, звено цепочки; в режиме «для агентов» — ключ
  серверу; ждущие ключа получают новую версию через `grantPendingKeys`, после подтверждения),
  шаг 2 `rekeyNotes(in:)` — новые ключи заметок в индексе (`NoteMeta.keyVersion`, `keyChain`),
  шаг 3 `finishNotebookRotation(_:)` — когда индекс подтверждён (`rotate/done`). Сделан ли шаг 1,
  решает `pendingSinceVersion` (версия выше — сделан; у старого сервера — есть ли заметки под
  прежним ключом блокнота), поэтому доделать можно с любого устройства владельца. Прерванная смена
  доделывается при следующем запуске. Отдельно расшаренная заметка — `rotateNoteKey(_:in:)`,
  `syncSharedNoteMeta(_:in:)`.
- Участник: `acceptInvitation(id:)`, `refreshSharedWithMe()` — забирает выданные ключи
  (`KeyRing.adoptSharedItem`: ключ блокнота становится ключом блокнота, заметки — ключом этой
  заметки) и регистрирует документы для синхронизации; `leave(_:)`; `safetyCode(with:publicKey:)`.
- Версии ключей: `NoteMeta.keyVersion`/`keyChain` (пишутся только с версии 2),
  `KeyRing.noteKey(_:notebookId:)`, `earlierNoteKeys`, `notebookKeyVersion`; старые данные
  читаются ключами из цепочки (`KeyRingDocumentKeys(keyRing:noteMeta:)` → `retiredKeys(for:)`).
  `reconcileNotebookKeys` и `notebookKeyForWriting` понимают версии ключей блокнотов.
- REST: `APIClient.boxKey/putBoxKey/publicKey`, приглашения, участники, `rotateKey`,
  `rotationDone`, `sharedNoteKey`, `sharedWithMe`, `sharedByMe` (по нему владелец при запуске
  выдаёт ключи и доделывает смену ключа), `notebookKeyState`; типы со строгой проверкой
  (векторы `api/bodies.json`). Авторы: `UpdateItem.author`, `DocVersion.authors` (`UpdateAuthor`).

## Синхронизация

```swift
let client = SyncClient(configuration: .init(url: SyncClient.Configuration.url(forServer: server),
                                             deviceId: try store.deviceId(), clientVersion: "1.0")) {
    .user(accessToken: try await api.accessToken())
}
let keysLookup = KeyRingDocumentKeys(keyRing: keys) { noteId, notebookId in /* NoteMeta.wrappedKey */ }
let engine = SyncEngine(store: store, client: client, keyFor: keysLookup.key(for:)) { record in
    try await api.registerDoc(docId: record.docId, kind: record.kind, notebookId: record.notebookId)
}
await engine.start()
try await engine.open(note.crdt, notebookId: notebookId)   // правки сохраняются и уходят сами
for await status in await engine.statusUpdates() { /* connection, pending, catchingUp */ }
```

`SyncEngine` хранит каждое локальное обновление в `LocalStore` атомарно с очередью отправки
(до подтверждения `ack` ничего не теряется), шифрует (`ds1|doc|<docId>`), регистрирует
документ перед первым `push` (а не перед подпиской — см. «Скорость синхронизации»), подписывает
все известные документы с их `lastSeq` при каждом подключении, применяет чужие обновления к открытым документам, отправляет снимок после
500 обновлений / 1 MiB (предварительно удаляя осиротевшие штрихи) и передаёт awareness
(`sendAwareness`, `setAwarenessHandler` — только для открытых документов). В очереди ожидания
`ack` не больше 100 сообщений, следующие уходят по мере подтверждений. `SyncClient` — WebSocket: `hello`/`welcome`,
пинг 25 с, переподключение с экспоненциальной задержкой (`reconnectNow()` — при появлении сети).

**Живые документы — только открытые.** `CRDTDocument` в памяти есть лишь у документов, переданных
в `open`; остальные (тысячи заметок) лежат в SQLite как обновления: чужие дописываются в хранилище,
снимок закрытого документа собирается слиянием обновлений без документа (`CRDTUpdates.merge`,
`Y.mergeUpdates`), обход осиротевших штрихов — при снимке открытой заметки, в том числе при её
закрытии. `close` сначала отцепляет документ и лишь потом ждёт отправки снимка, поэтому `open`
той же заметки во время закрытия получает свежий экземпляр из хранилища со всеми правками.
### Скорость синхронизации

Подписка не ждёт REST: документы подписываются сразу (`POST /docs` только перед первым `push`
или когда сервер ответил на подписку `doc_not_found` для ещё не зарегистрированной записи —
тогда регистрация и повторная подписка; удалённые документы не воскрешаются). Раньше при каждом
подключении все «незарегистрированные» документы (а это всё, что пришло с других устройств)
регистрировались по одному перед первой подпиской: 55 документов при RTT 100 мс — 6,3 с.

Порядок подписки: сначала аккаунт, индексы блокнотов и открытые заметки — отдельным кадром,
затем остальные пачками по 100 (сервер принимает пачку в одном `subscribe`, изменений
сервера не нужно). Приложение сообщает, какая заметка открыта: `engine.focus(noteId)` — до
8 последних, если документ ещё не догнан, он подписывается немедленно. Приём, расшифровка и
применение идут в акторе `SyncEngine`, не на главном потоке.

Замер: `engine.setTraceHandler { event in … }` — `SyncTraceEvent` (`connected`, `subscribed`,
`caughtUp`, `registered`, `keyMissing`), удобно для `os_signpost`. Бенчмарки и проверки с
порогами — `Tests/DSCoreTests/SyncPerfTests.swift` (RTT 100 мс, Linux; в CI — отдельным шагом,
одни на раннере, вместе с `LiveSyncTests`: в общем прогоне их время зависит от соседних наборов): свежая синхронизация
3 блокнотов и 51 заметки по 25 КБ — аккаунт ≈ 0,3 с, индексы ≈ 0,45 с, все заметки ≈ 1,1–1,3 с
(порог в CI — 10 с); подключение с 55 известными документами — ≈ 0,8–1 с без единого
`POST /docs` (порог 5 с); открытая заметка догоняется раньше остальных.

### Ключи блокнотов: канонический — с сервера

Ключ блокнота один на все устройства — тот, что обёрнут мастер-ключом на сервере
(`GET /v1/notebooks` → `wrappedKey`). Новый ключ создаётся **только** для блокнота, которого на
сервере ещё нет; блокнот, пришедший с другого устройства, получает ключ с сервера.

```swift
// При каждом запуске до engine.start() и когда в аккаунте появился блокнот без ключа:
for change in try await accounts.reconcileNotebookKeys() {
    try notebookDocument(change.notebookId).rewrapNoteKeys(from: change.previousKey, to: change.key)
    await engine.rekey(docId: change.notebookId)
}
// Ключ для записи в блокнот (заметка, перенос): свой или с сервера; nil — блокнота на сервере нет.
let key = try await accounts.notebookKeyForWriting(notebookId)
// Движку — отставные ключи, чтобы прочитать уже записанное ими:
SyncEngine(store:client:keyFor: keys.key(for:), register:, retiredKeysFor: keys.retiredKeys(for:),
           isKeyCanonical: keys.isCanonical)
// Свой POST /notebooks прошёл — ключ канонический:
keys.markNotebookKeyVerified(notebookId)
```

`reconcileNotebookKeys` заполняет недостающие ключи и заменяет отличающиеся на серверные;
прежний ключ остаётся «отставным» (`KeyRing.retiredNotebookKeys`) — им читаются только уже
записанные данные, писать им нельзя. `rewrapNoteKeys` переобёртывает ключи заметок, обёрнутые
отставным ключом. `SyncEngine.rekey(docId:)` скачивает документ заново с начала (старое — через
отставной ключ) и выгружает снимок каноническим ключом, чтобы все устройства снова читали весь
документ; переживает перезапуск.

### Нет ключа ≠ нечитаемо

Документ, ключа которого ещё нет (заметка, чей `NoteMeta` не дошёл; перенесённая заметка, пока
индекс нового блокнота отстаёт; блокнот до получения ключа), **ждёт**: не подписывается, а если
ключ пропал на ходу — подписка снимается; ничего не сохраняется и не пропускается, `lastSeq`
стоит. Ключ появился — документ снова подписывается с `lastSeq` и догоняет всё: само после
каждого обновления индекса блокнота (и повторно через 0,5, 2 и 10 с — если ключи заметок
приложение узнаёт из индекса чуть позже, при перечитывании библиотеки), а после
`reconcileNotebookKeys` — вызовом
`engine.resumeDocumentsWaitingForKeys()` (его же делает `retryUnreadable()`). В карантин
попадает только то, что не открылось имеющимся ключом.

### Нечитаемые данные (карантин)

Чужое обновление или снимок, который не расшифровывается (другой ключ) или не является
обновлением Yrs, не останавливает документ: он откладывается (`LocalStore.quarantined` —
документ, seq, устройство, причина), остальное применяется, `lastSeq` идёт дальше.
`SyncStatus.unreadable: [UnreadableSync { docId, notebookId, count, firstSeq, lastSeq,
deviceIds, reason }]` — спокойное предупреждение у блокнота («часть изменений с другого
устройства не прочитана»), на `summary` не влияет. После того как ключи поменялись
(`reconcileNotebookKeys`) — `engine.retryUnreadable()`: отложенное скачивается заново.

Если ключ документа подтверждён сервером в этой сессии (`SyncEngine(isKeyCanonical:
keys.isCanonical)`: ключ блокнота пришёл из `reconcileNotebookKeys`, создан `createNotebook` или
отмечен `KeyRing.markNotebookKeyVerified` после успешного `POST /notebooks`), устройство,
отложившее элементы, выгружает снимок того, что прочитало: остальные устройства догоняют с него
и битых элементов больше не встречают. Устройство с неподтверждённым ключом снимок не выгружает.

### Ненадёжная сеть

Один `URLSession` (`DSNetwork.session`) на REST и WebSocket: соединения переиспользуются (HTTP/2
keep-alive), новых TLS-рукопожатий меньше; `waitsForConnectivity = false`, тайм-ауты — по простою.

- REST (`APIClient`, транспорт `URLSessionTransport`): у каждой попытки короткий тайм-аут простоя
  (5, 8, 12, 15 с), неудачные попытки повторяются с задержкой 0,3 с · 2ⁿ ± 30 %. Любой запрос
  повторяется, если он точно не ушёл (`TransportFailure.notSent`: нет соединения, рукопожатие не
  прошло или не закончилось — по метрикам задачи); идемпотентные (GET/PUT/DELETE и POST/PATCH,
  идемпотентные по id: регистрация документа, создание блокнота/вложения/ссылки, перенос
  заметки, смена режима) — ещё и после тайм-аута и 502/503/504. Вход и смена пароля после тайм-аута
  не повторяются. Обновление токена повторяется: повтор того же refresh-токена в течение 60 с
  сервер отвечает той же новой сессией (api.md), все попытки укладываются в это окно; неудачное
  обновление сессию не стирает.
- WebSocket (`SyncClient`): от открытия до `welcome` — не дольше `handshakeTimeout` (6 с);
  зависшее рукопожатие закрывается, первые `quickRetries` (2) повтора идут почти сразу
  (≈ 0,3 с), потом — экспоненциальная задержка. Рабочее соединение, которое оборвалось,
  восстанавливается сразу. `reconnectNow()` (сеть вернулась) не ждёт текущую задержку.
  `rate_limited` с `retryAfterMs` (sync-protocol §7): ни переподключения, ни повторной отправки
  раньше этого срока. `subscribe` — до 1000 документов без повторов `docId` (движок шлёт пачки по 100).
- Отзыв устройства (D-53): кадр `error` с `code: "device_revoked"` и/или закрытие с кодом 4410
  (причина — из кадра, иначе из причины закрытия, иначе `user`) → `SyncConnectionState.revoked`,
  `SyncStatus.revoked`, один раз `SyncEngine.setDeviceRevokedHandler`; без переподключения, очередь
  отправки больше не отправляется. `unauthorized`/4401 и обрыв связи — обычное переподключение.
  Стирание данных — в приложении.
- Пульс: пинг каждые 25 с (`pingInterval`), нет понга за 10 с (`pongTimeout`) — соединение
  умерло молча (приложение было приостановлено, сменилась сеть, истекла запись NAT): оно
  закрывается, новое подписывается с `lastSeq` и догоняет пропущенное. Раньше ошибка пинга
  игнорировалась, и такое соединение висело до перезапуска приложения — чужие правки не
  приходили. При возврате приложения на передний план — `engine.client.checkConnection()`:
  проверка пингом сразу (мёртвое соединение заменяется за ≤ 10 с, а не через 25–35 с), а если
  связи нет — переподключение без ожидания задержки.
- Статус: пока идут быстрые повторы, `summary` — `.syncing`, а не `.offline`
  (`SyncStatus.connectionTrouble` — только после нескольких неудач подряд). Сеть ничего не
  удаляет из базы: библиотека остаётся на месте при любом состоянии связи.

### Статус и ошибки отправки

`engine.status()` / `statusUpdates()` → `SyncStatus { connection, pending, catchingUp, failed, held }`
(`pending` — только то, что движок может отправить сейчас; `held` — сообщения документов, чей
ключ ещё не на устройстве: уйдут сами, когда ключ появится — спокойная пометка, не крутилка),
`isIdle` — нечего отправлять и догонять, `summary` — одно состояние для индикатора:
`.offline`, `.syncing`, `.synced`, `.failed(documents:reason:)` (без связи, идёт, всё
синхронизировано, есть недоставленное). Сообщения, которые не доставить повтором, уходят из
`pending` в `failed: [FailedSync { docId, reason, count }]`, остальное синхронизируется дальше:

- регистрация документа отклонена (`POST /docs` 4xx, кроме 401/408/429) — все сообщения
  документа, причина `register: forbidden (403)` и т. п.;
- сервер отклонил сообщение (`forbidden`, `payload_too_large`, `bad_request`) или обновление
  больше лимита ещё до отправки;
- `doc_not_found` (документ регистрируется заново) и ошибки сервера — после
  `LocalStore.maxSendAttempts` (5) попыток; `rate_limited` и обрывы связи повторяются без счёта.

Временные ошибки (сервер недоступен, 5xx, 429) повторяются сами с нарастающей задержкой —
от 1 с до минуты; отклонённая регистрация сама не повторяется (до `retryFailed`).

`retryFailed(docId:)` — вернуть в очередь и попробовать снова (регистрация, подписка,
отправка); `discardFailed(docId:)` — отказаться (локальное содержимое остаётся).
`engine.deleteDocument(docId)` удаляет документ локально целиком — очередь, обновления,
индекс — и перестаёт его синхронизировать.

### Индексация (поиск, задачи, ссылки, теги)

Инкрементальная: каждое сохранённое обновление заметки (своё или чужое) помечает её
изменённой, локальное уплотнение — нет. Приложение догоняет индекс короткими порциями:

```swift
// После синхронизации и с задержкой ~1 с после последней правки (дебаунс):
while try await store.reindexChanged(limit: 500) > 0 { /* можно показать прогресс */ }
let left = try store.pendingIndexCount()   // «Индексация… N» в поиске, пока > 0
```

`reindexChanged` разбирает заметки параллельно на всех ядрах и пишет порцию одной транзакцией;
сначала — недавно изменённые. Каждая порция короткая, поэтому цикл можно прервать в любой момент
(уход в фон, истечение фоновой задачи) — остаток доиндексируется в следующий раз. После
обновления приложения со старой базой все заметки один раз переиндексируются так же.
`index(_:notebookId:)` — ручная индексация одной заметки (например, открытой).

### Фоновая синхронизация

`SyncEngine.syncOnce(deadline:)` — один проход для `BGAppRefreshTask`: подключиться, догнать все
документы с их `lastSeq`, отправить очередь, дождаться подтверждений, отключиться. Чужие
обновления только записываются в базу (документы не загружаются, индекс не строится); прерывание
ничего не теряет. Если движок уже запущен (приложение на экране), соединение остаётся.

```swift
BGTaskScheduler.shared.register(forTaskWithIdentifier: "app.datascratch.refresh", using: nil) { task in
    let work = Task {
        let result = await engine.syncOnce(deadline: .now + .seconds(25))
        try? await store.reindexChanged(limit: 200)          // немного индекса, если осталось время
        scheduleRefresh()                                     // следующий BGAppRefreshTaskRequest
        task.setTaskCompleted(success: result.completed)
    }
    task.expirationHandler = { work.cancel() }
}
```

В `Info.plist` приложения: `BGTaskSchedulerPermittedIdentifiers` с идентификатором задачи и
`UIBackgroundModes` → `fetch` (для `BGProcessingTask` — ещё `processing`).

База открывается с защитой `completeUntilFirstUserAuthentication`, ключи в Keychain —
`AfterFirstUnlockThisDeviceOnly`: после первой разблокировки всё доступно в фоне. Тяжёлую
работу (полная переиндексация, уплотнение) — в `BGProcessingTask` (сеть и питание).

## Локальное хранилище

`LocalStore(url:)` / `LocalStore.inMemory()` (GRDB, SQLite):

- документы и синхронизация: `ensureDocument`, `appendLocalUpdate` (атомарно с очередью
  отправки), `appendRemoteUpdates`, `applyRemoteSnapshot`, `updates(docId:)`, `compact`,
  `needsSnapshot` (> 500 обновлений или > 1 MiB), `pendingOutbox`, `acknowledge`, `deviceId()`;
- индексы (document-model.md §5): `index(_ derived:notebookId:)`, `search(_:)` (FTS5,
  префиксы, без учёта диакритики), `tasks(TaskQuery)` (`TaskEntry` с `completedAt` и `order` — позицией среди задач заметки), `backlinks(to:)`, `tags()`,
  `notes(withTag:)` (с вложенными `тег/…`);
- вложения: `saveAttachment`, `markChunkUploaded` (докачка по кускам), `attachments(state:)`.

## Производительность (spec/11)

Бенчмарки `Tests/DSCoreTests/BenchmarkTests.swift` (включаются `DS_BENCH=1`; в CI — отдельный
информационный шаг на симуляторе, итоги в сводке задания). Замеры 2026-10-25, release, база на диске;
iOS — симулятор iPad (iOS 26) на раннере GitHub `macos-26`, Linux — x86-64, 4 ядра:

| Цель spec/11 | iOS (симулятор) | Linux |
| --- | --- | --- |
| Первая синхронизация 10 000 заметок ≤ 1 мин | ≈ 9,5 с приём + ≈ 3 с индексация (3 ядра раннера; последовательно было 6–15 с) ≈ 12,5 с | ≈ 18 с + ≈ 2,5 с (до параллельной индексации — ≈ 4,4 с) |
| Открытие заметки на 10 000 слов ≤ 300 мс | ≈ 12 мс | ≈ 10 мс |
| Холодный старт ≤ 1 с | ≈ 0,33–0,37 с | ≈ 0,5 с |
| Память после первой синхронизации 10 000 заметок (прирост, `phys_footprint` / RSS) | ≈ 0 (−7,5 МБ к исходному; если держать все заметки живыми — +112 МБ) | ≈ 40 МБ (все живые — ≈ 166 МБ) |

Приём включает фейковый сервер в тесте. Холодный старт = открыть базу, загрузить блокнот с 10 000
заметок, получить список; записи читаются одним JSON (`map_json`) через `JSONDecoder` — путь
через `NSDictionary` на iOS давал ≈ 1,8 с.

Индексация — `reindexChanged` (параллельный разбор на всех ядрах, подготовленные запросы,
порции по 500 одной транзакцией): 10 000 заметок — ≈ 3 с на симуляторе (3 ядра), ≈ 2,5 с на Linux (4 ядра); последовательно было 6–15 с и ≈ 4,4 с.

## Тесты

`swift test` (Linux) или `xcodebuild test -scheme DSCore` на симуляторе iPad. Совместимость
с Yjs: `yrs-ffi/tests/yjs_compat.rs` и `compat/verify.mjs` (в CI), эталон —
`yrs-ffi/compat/fixtures/yjs-note.json` (генерируется `node compat/generate.mjs`).
Общие векторы `packages/test-vectors/vectors` (crypto, ids, strokes, document, sync)
проверяются в `VectorTests.swift`: тесты читают файлы по пути от `#filePath` и включаются,
когда каталог есть в репозитории.
