# Контракт: REST API сервера (v1)

Связано: D-34, D-36, D-37, `spec/06-data-server.md`, `spec/08-sharing.md`, `spec/09-agents-api.md`. Типы TS: `packages/shared/src/contracts/api.ts`. Подробная схема (OpenAPI) генерируется сервером из кода и публикуется по `GET /v1/openapi.json`.

## Общее

- База: `https://<host>/v1`. JSON, UTF-8. Двоичные поля — base64url без padding.
- Аутентификация: `Authorization: Bearer <accessToken>` (короткоживущий, 15 мин) + `refreshToken` (30 дней, ротация при каждом обновлении).
- Ошибки: HTTP-код + тело `{ "error": { "code": string, "message": string } }`. Коды: `bad_request`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `payload_too_large`, `internal`.
- Идентификаторы создаёт клиент (UUIDv7); повторный `POST` с тем же id и тем же содержимым — идемпотентен (`200`), с другим — `409 conflict`.

## Аутентификация (D-34, `crypto.md`)

| Метод | Путь | Тело → ответ |
| --- | --- | --- |
| POST | `/auth/prelogin` | `{ email }` → `{ salt, kdf }` (для неизвестного email — детерминированная фальшивая соль, чтобы нельзя было перебирать адреса) |
| POST | `/auth/signup` | `{ email, salt, kdf, loginKey, recoveryLoginKey, wrappedMasterKeyPassword, wrappedMasterKeyRecovery, userId, accountDocId }` → `Session` |
| POST | `/auth/login` | `{ email, loginKey, deviceName }` → `Session` |
| POST | `/auth/refresh` | `{ refreshToken }` → `Session` |
| POST | `/auth/logout` | `{ refreshToken }` → `204` |
| POST | `/auth/recovery/start` | `{ email, recoveryLoginKey }` → `{ recoveryToken, wrappedMasterKeyRecovery, userId }` |
| POST | `/auth/recovery/finish` | `{ recoveryToken, salt, kdf, loginKey, wrappedMasterKeyPassword }` → `Session` |
| POST | `/auth/password` | (авторизован) `{ currentLoginKey, salt, kdf, loginKey, wrappedMasterKeyPassword }` → `204` |

`Session = { userId, accessToken, refreshToken, accessExpiresAt, wrappedMasterKeyPassword, accountDocId }`.

## Аккаунт и устройства

| Метод | Путь | Смысл |
| --- | --- | --- |
| GET | `/me` | `{ userId, email, accountDocId, createdAt }` |
| GET | `/devices` / DELETE `/devices/:id` | список и отзыв устройств (сессий) |
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
| DELETE | `/docs/:id` | окончательное удаление (после корзины) |
| GET | `/docs/:id/versions` | список снимков для истории версий `{ seq, createdAt, deviceId }[]` |
| GET | `/docs/:id/versions/:seq` | `{ payload }` — зашифрованное состояние на момент `seq` |

`Notebook = { id, mode, createdAt, wrappedKey }`.

## Вложения (`crypto.md` §6)

| Метод | Путь | Смысл |
| --- | --- | --- |
| POST | `/attachments` | `{ attachmentId, noteId, size (байт шифротекста), chunkCount, mime }` → `204` |
| PUT | `/attachments/:id/chunks/:index` | тело — двоичный кусок (`application/octet-stream`) → `204` |
| GET | `/attachments/:id` | `{ size, chunkCount, uploadedChunks: number[] }` (для докачки) |
| GET | `/attachments/:id/chunks/:index` | двоичный кусок |
| DELETE | `/attachments/:id` | |

Лимит размера вложения — 200 МБ (настраивается).

## Шеринг (D-13, D-37)

| Метод | Путь | Смысл |
| --- | --- | --- |
| POST | `/shares` | `{ shareId, target: { kind: "note"\|"notebook", id }, permission: "view"\|"edit", expiresAt: ISO \| null }` → `Share` (по умолчанию бессрочно) |
| GET | `/shares` | мои ссылки |
| DELETE | `/shares/:id` | отзыв (сразу отключает гостей) |
| POST | `/shares/:id/guest` | (без авторизации) `{}` → `{ guestToken, target, permission, docIds }` — гостевой токен для `hello` в синхронизации |

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
