# Контракт: шифрование (v1)

Связано: D-04, D-09, D-34, R-02, R-10, `spec/07-encryption.md`. Реализация TS: `packages/shared/src/crypto/`. Библиотека — **libsodium** на всех платформах (`libsodium-wrappers-sumo` в TS, `swift-sodium` в iOS).

## 1. Иерархия ключей

```
пароль ──Argon2id──► 64 байта ─┬─► loginKey (32) ──► на сервер (сервер хранит Argon2id(loginKey))
                               └─► passwordKey (32) ─ никогда не покидает устройство
                                        │ оборачивает
recoveryKey (32, показывается 1 раз) ─┐ ▼
                                      └► masterKey (32, случайный, создаётся при регистрации)
                                              │ оборачивает
                                              ▼
                                        notebookKey (32, случайный, на блокнот)
                                              │ оборачивает
                                              ▼
                                        noteKey (32, случайный, на заметку)

Режим «для агентов»: notebookKey дополнительно оборачивается serverKey (KMS сервера).
```

- `account`-документ шифруется **masterKey**; `notebook`-документ — **notebookKey**; `note`-документ — **noteKey**; вложения — **noteKey** заметки, к которой прикреплены.
- Ключ отдельной заметки нужен для шеринга одной заметки по ссылке без раскрытия всего блокнота.

## 2. Вывод ключей из пароля

- `crypto_pwhash` с `ALG_ARGON2ID13`, `opslimit = 3`, `memlimit = 64 MiB` (67 108 864 байт), длина выхода 64 байта.
- Вход: пароль в UTF-8 после нормализации **NFKC**. Соль — 16 случайных байт, создаётся при регистрации и хранится на сервере (выдаётся `POST /v1/auth/prelogin`).
- Выход: байты 0..31 — `authSeed`, 32..63 — `passwordKey`.
- `loginKey = crypto_generichash(32, message = "ds1|login", key = authSeed)` (BLAKE2b с ключом).
- Параметры KDF хранятся вместе с солью (`kdf: { alg: "argon2id13", ops: 3, mem: 67108864 }`), чтобы их можно было повысить в будущем.

Сервер хранит `Argon2id(loginKey)` со своей солью (обычное хэширование пароля на сервере). Узнать `passwordKey` по `loginKey` невозможно (разные независимые выходы).

## 3. Формат шифротекста (конверт)

```
байт 0      версия = 0x01
байты 1..24 nonce (24 случайных байта)
далее       crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, ad, nonce, key) (шифротекст + 16 байт тега)
```

Ассоциированные данные (`ad`, UTF-8) привязывают шифротекст к месту, чтобы его нельзя было подменить другим:

| Что шифруется | `ad` |
| --- | --- |
| Обновление/снимок документа | `ds1|doc|<docId>` |
| Awareness | `ds1|awareness|<docId>` |
| Обёрнутый masterKey паролем | `ds1|key|master|password|<userId>` |
| Обёрнутый masterKey ключом восстановления | `ds1|key|master|recovery|<userId>` |
| Обёрнутый notebookKey мастер-ключом | `ds1|key|notebook|<notebookId>` |
| Обёрнутый notebookKey ключом сервера | `ds1|key|notebook-server|<notebookId>` |
| Обёрнутый noteKey ключом блокнота | `ds1|key|note|<noteId>` |
| Кусок вложения | `ds1|att|<attachmentId>|<index>|<last: 0 или 1>` |

В JSON и URL конверт передаётся в base64url без padding.

## 4. Ключ восстановления

- 32 случайных байта, показываются пользователю один раз в виде **Crockford Base32** (52 символа), группами по 4 через дефис, с префиксом `DS1-`.
- `recoveryLoginKey = crypto_generichash(32, "ds1|recovery-login", key = recoveryKey)`; сервер хранит `Argon2id(recoveryLoginKey)`.
- Восстановление: клиент доказывает знание ключа восстановления (`recoveryLoginKey`), получает `wrappedMasterKeyRecovery`, расшифровывает masterKey, задаёт новый пароль (новая соль, новый `loginKey`, новый `wrappedMasterKeyPassword`). Данные не перешифровываются.

## 5. Смена пароля

Перешифровывается только обёртка masterKey: новая соль → новые `loginKey` и `passwordKey` → новый `wrappedMasterKeyPassword`.

## 6. Вложения

Файл режется на куски по **1 MiB** открытого текста; каждый кусок — отдельный конверт (`ad` с индексом и признаком последнего). Это позволяет докачку и проверку целостности по кускам.

## 7. Шеринг по ссылке

`https://<web-host>/s/<shareId>#k=<base64url ключа>` — для заметки в ссылке `noteKey`, для блокнота — `notebookKey`. Часть после `#` браузер не отправляет на сервер.

## 8. Режим «для агентов» (R-10)

- `serverKey` — 32 байта из переменной окружения сервера `DS_KMS_KEY` (base64url), **не** хранится в базе.
- При переводе блокнота в режим «для агентов» клиент отправляет `notebookKey` по TLS на `PATCH /v1/notebooks/:id/mode`; сервер сам оборачивает его `serverKey` и хранит только обёртку. Обратный перевод — сервер удаляет обёртку.
- Сервер расшифровывает `notebookKey` только в момент обработки запроса агента с действительным токеном и правами на блокнот.

## 9. Тестовые векторы

`packages/test-vectors/crypto/`: KDF (пароль + соль → loginKey, passwordKey), конверты (ключ + nonce + ad + plaintext → bytes), Crockford Base32 ключа восстановления, куски вложения. Обязательны для Swift и TS: одинаковые входы → одинаковые байты.
