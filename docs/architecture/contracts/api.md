# Контракт: REST API сервера (v1)

Связано: D-34, D-36, D-37, `spec/06-data-server.md`, `spec/08-sharing.md`, `spec/09-agents-api.md`. Типы TS: `packages/shared/src/contracts/api.ts`. Подробная схема (OpenAPI) генерируется сервером из кода и публикуется по `GET /v1/openapi.json`.

## Общее

- База: `https://<host>/v1`. JSON, UTF-8. Двоичные поля — base64url без padding.
- Аутентификация: `Authorization: Bearer <accessToken>` (короткоживущий, 15 мин) + `refreshToken` (30 дней, ротация при каждом обновлении). Повторное предъявление уже использованного `refreshToken` — признак кражи: устройство отзывается. Исключение (уточнение 2026-10-26, предложение потока ios-core, принято координатором): повтор в течение **60 с** после обмена (ответ потерялся в сети), пока выданный взамен токен ещё не использован, возвращает **тот же** новый `refreshToken` (и свежий `accessToken`) — запрос идемпотентен. Повтор позже или после использования нового токена — отзыв устройства, как раньше.
- **Отзыв устройства (2026-10-27).** Любой запрос с access-токеном отозванного устройства и `POST /auth/refresh` с его refresh-токеном получают `401 { "error": { "code": "device_revoked", "message", "reason" } }`. `reason`: `user` (отключено в списке устройств или `logout`), `password_change` (пароль сменили на другом устройстве), `recovery` (восстановление по ключу восстановления), `token_reuse` (повтор использованного refresh-токена), `account_deleted` (аккаунт удалён — приходит на запросы с ещё не истёкшим access-токеном; refresh-токены удаляются вместе с аккаунтом, и `/auth/refresh` после этого отвечает обычным `401 unauthorized`). Только по `device_revoked` клиент **стирает локальные данные**; неизвестное или отсутствующее значение `reason` при этом коде считается отзывом с `reason: "user"` (совместимость с будущими причинами), а 401 без такого тела (обычный `unauthorized`, страница прокси) — только обновление токена или вход, без стирания (`classifyApiFailure`, векторы `api/failures.json` в `@datascratch/shared`). Истёкший или неверный токен, сбой сети — обычный `401 unauthorized` без `reason`: обновить токен и повторить. Старые клиенты, не знающие `device_revoked`, видят просто 401: refresh тоже не проходит, и они просят войти снова — данные при этом не стираются (безопасная деградация).
- Ошибки: HTTP-код + тело `{ "error": { "code": string, "message": string } }`. Коды: `bad_request`, `unauthorized`, `device_revoked` (401, с полем `reason`, см. «Аутентификация»), `forbidden`, `not_found`, `conflict`, `rate_limited`, `payload_too_large`, `internal`. У `rate_limited` (429) есть необязательное `retryAfterMs` — через сколько повторить. Превышение квоты хранения аккаунта — `payload_too_large` с сообщением `storage quota exceeded` (в REST — `413`, в синхронизации — `error` с `ref` = `clientMsgId`).
- Идентификаторы создаёт клиент (UUIDv7); повторный `POST` с тем же id и тем же содержимым — идемпотентен (`200`), с другим — `409 conflict`.

## Аутентификация (D-34, `crypto.md`)

| Метод | Путь | Тело → ответ |
| --- | --- | --- |
| POST | `/auth/prelogin` | `{ email }` → `{ salt, kdf }` (для неизвестного email — детерминированная фальшивая соль, чтобы нельзя было перебирать адреса) |
| POST | `/auth/signup` | `{ email, salt, kdf, loginKey, recoveryLoginKey, wrappedMasterKeyPassword, wrappedMasterKeyRecovery, userId, accountDocId, inviteCode? }` → `Session`. `403`, если регистрация на сервере закрыта или нужен код приглашения (`DS_SIGNUP`); любой конфликт — один и тот же `409` (аудит безопасности 2026-10-27) |
| POST | `/auth/login` | `{ email, loginKey, deviceName }` → `Session` |
| POST | `/auth/refresh` | `{ refreshToken }` → `Session` |
| POST | `/auth/logout` | `{ refreshToken }` → `204` |
| POST | `/auth/recovery/start` | `{ email, recoveryLoginKey }` → `{ recoveryToken, wrappedMasterKeyRecovery, userId }` |
| POST | `/auth/recovery/finish` | `{ recoveryToken, salt, kdf, loginKey, wrappedMasterKeyPassword }` → `Session` |
| POST | `/auth/password` | (авторизован) `{ currentLoginKey, salt, kdf, loginKey, wrappedMasterKeyPassword }` → `204` |
| POST | `/auth/recovery-key` | (авторизован) `{ currentLoginKey, recoveryLoginKey, wrappedMasterKeyRecovery }` → `204` — новый ключ восстановления (`crypto.md` §4): старый перестаёт работать сразу, незавершённые восстановления отменяются, другие устройства остаются в системе |

`Session = { userId, deviceId, accessToken, refreshToken, accessExpiresAt, wrappedMasterKeyPassword, accountDocId }`. В `signup` и `recovery/finish` можно передать необязательное `deviceName` (уточнение потока server).

## Аккаунт и устройства

| Метод | Путь | Смысл |
| --- | --- | --- |
| GET | `/me` | `{ userId, email, accountDocId, createdAt }` |
| GET | `/devices` / DELETE `/devices/:id` | список и отзыв устройств (сессий) |
| GET | `/me/security-events` | журнал безопасности, новые сверху (до 100): `{ kind: "password_changed"\|"recovery_used"\|"recovery_key_rotated", at, deviceId \| null, deviceName \| null }[]` |
| DELETE | `/me` | удаление аккаунта (с подтверждением `loginKey`) |

## Блокноты и документы (D-36)

| Метод | Путь | Тело → ответ |
| --- | --- | --- |
| POST | `/notebooks` | `{ notebookId, mode: "private"\|"agent", wrappedKey (notebookKey под masterKey), notebookKey? (только для mode=agent) }` → `Notebook` |
| GET | `/notebooks` | `Notebook[]` |
| GET | `/notebooks/:id/key` | `{ wrappedKey }` |
| PATCH | `/notebooks/:id/mode` | `{ mode, notebookKey? }` — включение режима «для агентов» передаёт ключ, выключение — удаляет серверную обёртку |
| DELETE | `/notebooks/:id` | удаляет блокнот и все его документы |
| POST | `/docs` | `{ docId, kind: "account"\|"notebook"\|"note", notebookId \| null }` → `204`; регистрация до первого `push` |
| PATCH | `/docs/:id` | `{ notebookId }` → `204` — перенос заметки (`kind = note`) в другой блокнот того же пользователя; повтор с тем же `notebookId` — `204` |
| DELETE | `/docs/:id` | окончательное удаление (после корзины) |
| GET | `/docs/:id/versions` | список снимков для истории версий `{ seq, createdAt, deviceId, authors: Author[] }[]`; `authors` — авторы правок с прошлой версии: сервер запоминает их при сохранении снимка по обновлениям после предыдущего снимка (без повторов, по порядку первой правки, D-54) |
| GET | `/docs/:id/versions/:seq` | `{ payload }` — зашифрованное состояние на момент `seq` |

`Notebook = { id, mode, createdAt, wrappedKey, shared }` (`shared` — у блокнота есть участники, D-54).

`Author = { kind: "user", userId } | { kind: "guest", shareId } | { kind: "agent", tokenId }` — автора ставит сервер по тому, кто прислал обновление, а не со слов клиента (D-54).

**Перенос заметки** (`PATCH /docs/:id`, 2026-10-25). Сервер меняет только блокнот документа; содержимое, история версий, вложения и `noteKey` остаются прежними. Порядок на клиенте: (1) обернуть `noteKey` ключом нового блокнота (`ad = ds1|key|note|<noteId>`) и записать `NoteMeta` в индекс нового блокнота; (2) `PATCH /docs/:id`; (3) удалить `NoteMeta` из индекса старого блокнота. Отдельно передавать ключ серверу не нужно: для блокнотов «для агентов» сервер получает `noteKey` из `NoteMeta.wrappedKey` индекса, а ключ блокнота у него есть (`crypto.md` §8). Права следуют за заметкой сразу: гости шеринга старого блокнота её теряют (подписчики получают `error doc_not_found` с `ref = docId`), шеринг самой заметки сохраняется; агенты видят заметку, только если новый блокнот «для агентов» и входит в их разрешение. Ошибки: `400` — документ не заметка; `404` — нет документа или целевого блокнота у пользователя.

Прочие типы ответов (уточнение 2026-10-25, предложение потока core):

- `Device = { id, name, createdAt, lastSeenAt, current: boolean }`;
- `Share = { id, target: { kind, id }, permission, expiresAt, createdAt }`;
- `AgentToken = { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt }` (без секрета; секрет только в ответе на создание).

## Вложения (`crypto.md` §6)

| Метод | Путь | Смысл |
| --- | --- | --- |
| POST | `/attachments` | `{ attachmentId, noteId, size (байт шифротекста), chunkCount, mime }` → `204` |
| PUT | `/attachments/:id/chunks/:index` | тело — двоичный кусок (`application/octet-stream`) → `204` |
| GET | `/attachments/:id` | `{ size, chunkCount, mime, uploadedChunks: number[] }` (для докачки) |
| GET | `/attachments/:id/chunks/:index` | двоичный кусок |
| DELETE | `/attachments/:id` | |

Лимит размера вложения — 200 МБ (настраивается).

**Картинка по ссылке (D-52, 2026-10-27):** `POST /fetch-image` — тело `{ url }` → `200` с байтами картинки (`Content-Type` — тип картинки, `Content-Length`) или `422 { error: "blocked" | "not_image" | "too_large" | "timeout" | "unreachable" }`, `429` при превышении частоты. Только для вошедшего; ограничения сервера — в `decisions/0052-image-fetch-proxy.md` (частные сети запрещены, ≤ 3 переадресаций, только картинки без SVG, ≤ 20 МБ, 15 с, адреса не журналируются). Клиент шифрует полученные байты и загружает как обычное вложение. Уточнение потока server: `Content-Type` ответа определяется по сигнатуре файла (`image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/heic`, `image/avif`); `429` также приходит, когда сервер уже скачивает много картинок одновременно, — повторить через несколько секунд.

## Шеринг (D-13, D-37)

| Метод | Путь | Смысл |
| --- | --- | --- |
| POST | `/shares` | `{ shareId, target: { kind: "note"\|"notebook", id }, permission: "view"\|"edit", expiresAt: ISO \| null }` → `Share` (по умолчанию бессрочно) |
| GET | `/shares` | мои ссылки |
| DELETE | `/shares/:id` | отзыв (сразу отключает гостей) |
| POST | `/shares/:id/guest` | (без авторизации) `{}` → `{ guestToken, target, permission, docIds }` — гостевой токен для `hello` в синхронизации |

## Совместный доступ по аккаунтам (D-54)

Простой вариант: блокнот или одна заметка, конкретному аккаунту по почте, роли `editor` («Может редактировать») и `viewer` («Только чтение»). Доступом управляет только владелец. Ключи — `crypto.md` §10. `:kind` в путях — `notebook` или `note`.

**Ключи аккаунта**

| Метод | Путь | Тело → ответ |
| --- | --- | --- |
| PUT | `/me/box-key` | `{ publicKey, wrappedSecretKey }` → `204`; один раз на аккаунт (повтор с теми же данными — `204`, с другими — `409`) |
| GET | `/me/box-key` | `{ publicKey, wrappedSecretKey }` или `404`, если пары ещё нет |
| GET | `/users/:userId/public-key` | `{ userId, publicKey }` — только для аккаунтов, связанных с вызывающим общим ресурсом или **принятым** приглашением; иначе `404`, неотличимый от «нет такого аккаунта» (перебор не работает) |

**Приглашения**

| Метод | Путь | Тело → ответ |
| --- | --- | --- |
| POST | `/invitations` | `{ invitationId, target: { kind, id }, email, role }` → `204`. **Ответ одинаковый**, есть аккаунт с такой почтой или нет. Только владелец ресурса. Повтор для той же почты и ресурса заменяет роль и продлевает срок |
| GET | `/invitations?target=<kind>:<id>` | исходящие по ресурсу: `{ id, email, role, status: "pending"\|"accepted"\|"declined"\|"expired", createdAt, expiresAt }[]` |
| DELETE | `/invitations/:id` | владелец отзывает непринятое приглашение → `204` |
| GET | `/invitations/incoming` | входящие: `{ id, target: { kind, id }, from: { userId, email }, role, createdAt, expiresAt }[]` (только `pending`) |
| POST | `/invitations/:id/accept` | → `SharedItem` (ключ ещё может быть `null`, см. ниже) |
| POST | `/invitations/:id/decline` | → `204` |

- Приглашение живёт **30 дней**. Приглашение на почту без аккаунта ждёт регистрации с этой почтой и появляется во входящих после неё. Ссылка «скопировать и отправить» — `https://<web-host>/invite/<invitationId>`: она только открывает программу на входящих, сама по себе прав не даёт.
- Ограничение частоты: не больше **50 приглашений в сутки** на приглашающего (`429 rate_limited` с `retryAfterMs`); `accept` и `decline` — под обычным лимитом авторизованных запросов. `POST /invitations` отвечает одинаково и за одинаковое время, есть аккаунт или нет: поиск аккаунта выполняется в обоих случаях.
- Название блокнота или заметки сервер не знает (оно зашифровано), поэтому во входящих — кто пригласил, что (блокнот или заметка) и роль. Название появляется после принятия, когда клиент владельца выдаст ключ.

**Участники**

| Метод | Путь | Тело → ответ |
| --- | --- | --- |
| GET | `/members/:kind/:id` | `Member[]` — видят владелец и участники |
| PATCH | `/members/:kind/:id/:userId` | `{ role }` → `204` (только владелец) |
| DELETE | `/members/:kind/:id/:userId` | `204`. Владелец убирает участника; участник указывает себя — «Выйти». После этого сервер сразу закрывает доступ и ставит `keyRotationPending` |
| PUT | `/members/:kind/:id/:userId/key` | (только владелец) `{ version, wrappedKey }` → `204` — выдать ключ участнику (`crypto.md` §10.2); `409`, если `version` не текущая |
| POST | `/members/:kind/:id/rotate` | (только владелец) смена ключа, `crypto.md` §10.3: `{ version, ownerWrappedKey, previousKeyWrap, memberKeys: { userId, wrappedKey }[], notebookKey? }` → `204`. Атомарно; `409`, если `version` ≠ текущая + 1 или `memberKeys` не покрывает всех участников. `ownerWrappedKey` — новый ключ под мастер-ключом владельца (блокнот, `ad` с версией) или под ключом его блокнота (заметка, как в `NoteMeta.wrappedKey`). `notebookKey` — только для блокнота в режиме «для агентов» (сервер переоборачивает его своим ключом, `crypto.md` §8) |
| GET | `/members/note/:id/key` | (только владелец) `{ version, ownerWrappedKey, keyChain }` — текущий ключ отдельно расшаренной заметки. При запуске клиент владельца сверяет `NoteMeta.keyVersion` своих расшаренных заметок с `version` и, если в индексе старее, дописывает `NoteMeta` (на случай сбоя между `rotate` и `push`) |
| POST | `/members/:kind/:id/rotate/done` | (только владелец, `kind = notebook`) все заметки блокнота получили новые ключи → снимает `keyRotationPending`. Для `kind = note` флаг снимает сам `rotate` |
| GET | `/shared-with-me` | `SharedItem[]` |

- `Member = { userId, email, role, status: "active"\|"awaiting_key", joinedAt, accountCreatedAfterInvite: boolean }`. `awaiting_key` — приглашение принято, клиент владельца ещё не выдал ключ: он делает это сам, как только оказывается в сети, и затем видит участника `active`. `accountCreatedAfterInvite` — аккаунт зарегистрирован уже после приглашения. Почта при регистрации не подтверждается, поэтому такому участнику клиент владельца ключ сам **не** выдаёт: сначала спрашивает владельца «<почта> приняла приглашение — открыть доступ?» (решение владельца продукта, 2026-10-27, D-54). Остальным ключ выдаётся без вопроса.
- `SharedItem = { target: { kind, id }, owner: { userId, email, publicKey }, role, keyVersion, wrappedKey: string \| null, keyChain: string[], docIds: string[], addedAt }`. `keyChain` — звенья цепочки от текущей версии назад (`crypto.md` §10.3). `docIds` — документы ресурса (индекс и заметки блокнота или одна заметка).
- `GET /notebooks/:id/key` у владельца дополнительно отдаёт `{ version, keyChain, keyRotationPending }`; `Notebook` получает поле `shared: boolean`.
- В ресурсе не больше **50 человек**, считая непринятые приглашения: сверх — `409 conflict` с сообщением `member limit`.
- **Всё общее принадлежит владельцу.** Документы и вложения общего ресурса, в том числе созданные участником (`POST /docs` от `editor` регистрирует документ на владельца), считаются в квоту владельца и удаляются вместе с его аккаунтом.
- **Права участников по REST** (кроме синхронизации, `sync-protocol.md` §6):
  - `viewer`: `403` на `POST /docs`, `PATCH /docs/:id`, `DELETE /docs/:id`, `POST`/`PUT`/`DELETE /attachments…`; чтение вложений и версий разрешено;
  - `editor`: создаёт заметки в общем блокноте (`POST /docs` — только `kind = note` и `notebookId` этого блокнота, иначе `403`), загружает и удаляет вложения любой заметки этого блокнота (сервер проверяет документ → блокнот → членство), кладёт заметки в корзину и достаёт из неё (это поле `trashedAt` в индексе — обычная правка); окончательное удаление (`DELETE /docs/:id`) и перенос заметки из общего блокнота (`PATCH /docs/:id`) — `403`, это может только владелец (после переноса в свой личный блокнот участники заметку теряют);
  - гостевые ссылки (`/shares`) на общий ресурс создаёт и отзывает только владелец; `PATCH /notebooks/:id/mode` и `DELETE /notebooks/:id` — тоже.
- **Агенты:** токены агентов участника не дают доступа к чужим общим блокнотам — только токены владельца, как раньше. При `rotate` блокнота в режиме «для агентов» сервер сбрасывает кэш ключей агентов (`crypto.md` §8).
- **Удаление аккаунта участника** убирает его членство во всех ресурсах и ставит им `keyRotationPending`, как при выходе.
- Режим «для агентов» у общего блокнота включает и выключает только владелец (`PATCH /notebooks/:id/mode` — `403` для участника).
- Удаление блокнота или заметки владельцем закрывает доступ всем участникам; удаление аккаунта владельца — тоже.

## Токены агентов (`spec/09-agents-api.md`)

| Метод | Путь | Смысл |
| --- | --- | --- |
| POST | `/agent-tokens` | `{ name, notebookIds, permission: "read"\|"read_write", expiresAt? }` → `{ id, token }` (токен показывается один раз) |
| GET | `/agent-tokens` | список (без секретов) |
| DELETE | `/agent-tokens/:id` | отзыв |
| GET | `/agent-tokens/:id/audit` | журнал действий агента |

API для самих агентов (MCP и REST для агентов) описывается в потоке агентов: `docs/architecture/contracts/agents-api.md` (появится на этапе агентов).

## Служебное

`GET /health` → `{ ok: true, version }`; `GET /openapi.json`.
