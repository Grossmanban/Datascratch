# infra — развёртывание сервера Datascratch

Сервер поднимается одной командой `docker compose up -d` (D-40): два контейнера — **сервер** и **PostgreSQL**; файлы вложений лежат в томе на диске (или во внешнем S3). По желанию третий контейнер — **Caddy**, он сам получает и продлевает HTTPS-сертификат.

| Файл | Что это |
| --- | --- |
| `docker-compose.yml` | Описание контейнеров |
| `Dockerfile` | Как собирается образ сервера |
| `.env.example` | Образец настроек → копируется в `.env` |
| `Caddyfile` | HTTPS для вашего домена (профиль `https`) |
| `backup.sh` / `restore.sh` | Резервная копия и восстановление |
| `smoke-test.sh` | Самопроверка: запуск → данные → копия → стирание → восстановление (её же гоняет CI) |

---

## Пошагово: сервер на VPS (Hetzner)

Займёт 20–30 минут. Команды копируются как есть; то, что нужно заменить своим, выделено `ВОТ ТАК`.

### 1. Купить сервер

1. Зарегистрироваться на <https://www.hetzner.com/cloud> → **Add Server**.
2. Локация — любая в Европе (Falkenstein, Nuremberg, Helsinki).
3. Образ — **Ubuntu 24.04**.
4. Тип — **CX22** (2 ядра, 4 ГБ) или ARM **CAX11** (2 ядра, 4 ГБ). Сервер в простое занимает ~400 МБ памяти, запас большой.
5. **SSH key** — добавить свой ключ (на Mac: `cat ~/.ssh/id_ed25519.pub`; если файла нет — `ssh-keygen -t ed25519`, всё по умолчанию).
6. Создать. Запомнить IP-адрес сервера (например, `203.0.113.10`).

### 2. Домен

В панели регистратора домена создать запись **A**: имя, например, `notes` → IP сервера. Получится `notes.ВАШ-ДОМЕН`. Подождать 5–30 минут (проверка: `ping notes.ВАШ-ДОМЕН` показывает IP сервера).

### 3. Подключиться и подготовить сервер

На Mac в «Терминале»:

```bash
ssh root@IP-СЕРВЕРА
```

Дальше всё — на сервере:

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh          # Docker и docker compose
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable   # открыть только SSH и веб
```

### 4. Скачать проект

```bash
git clone https://github.com/Grossmanban/Datascratch.git /opt/datascratch
cd /opt/datascratch/infra
cp .env.example .env
```

(Если репозиторий приватный, GitHub попросит логин и **токен** вместо пароля: github.com → Settings → Developer settings → Personal access tokens.)

### 5. Заполнить настройки

Сгенерировать три секрета — каждая команда печатает новую случайную строку:

```bash
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
```

Открыть настройки: `nano .env` и заполнить:

| Строка | Что вписать |
| --- | --- |
| `POSTGRES_PASSWORD=` | первый секрет |
| `DOMAIN=` | `notes.ВАШ-ДОМЕН` |
| `PUBLIC_URL=` | `https://notes.ВАШ-ДОМЕН` |
| `APP_URL=` | адрес веб-приложения (если оно на том же домене — тот же `https://notes.ВАШ-ДОМЕН`); нужен для подключения ИИ-агентов |
| `DS_JWT_SECRET=` | второй секрет |
| `DS_KMS_KEY=` | третий секрет |

Сохранить: `Ctrl+O`, `Enter`, выйти: `Ctrl+X`.

> **Важно про `DS_KMS_KEY`.** Это ключ сервера для блокнотов «для агентов». Скопируйте его в менеджер паролей **сейчас**. Он намеренно не попадает в базу и в резервные копии: если украдут копию базы, без этого ключа её не прочитать. Но если ключ потерять, агенты перестанут видеть такие блокноты (ваши устройства продолжат работать — у них свой ключ; режим «для агентов» нужно будет включить заново).

### 6. Запустить

```bash
docker compose --profile https up -d --build
```

Первая сборка — 3–5 минут. Проверка:

```bash
docker compose ps                                   # все контейнеры Up (healthy)
curl https://notes.ВАШ-ДОМЕН/v1/health              # {"ok":true,"version":"…"}
```

Адрес сервера для приложений — `https://notes.ВАШ-ДОМЕН`.

### 7. Резервные копии каждую ночь

```bash
crontab -e
```

Добавить строку (каждый день в 03:17):

```
17 3 * * * /opt/datascratch/infra/backup.sh >> /var/log/datascratch-backup.log 2>&1
```

Копии складываются в `/opt/datascratch/infra/backups/` и хранятся 14 дней (`BACKUP_KEEP_DAYS`). Проверить вручную: `./backup.sh`.

**Копии должны храниться вне этого сервера** (R-11). Проще всего — Hetzner Storage Box (от ~4 €/мес) через `rclone`:

```bash
apt install -y rclone
rclone config        # n → имя storagebox → тип sftp → host: uXXXXX.your-storagebox.de, user: uXXXXX, порт 23, пароль Storage Box
```

Потом в `.env`: `BACKUP_RCLONE_REMOTE=storagebox:datascratch` — `backup.sh` будет сам копировать каждую новую копию туда. Подойдёт любое хранилище, которое понимает rclone (S3, Backblaze B2, Google Drive…).

### 8. Обновление сервера

```bash
cd /opt/datascratch && git pull && cd infra && docker compose --profile https up -d --build
```

Миграции базы применяются автоматически при запуске. Перед обновлением полезно сделать `./backup.sh`.

---

## Восстановление из копии

```bash
cd /opt/datascratch/infra
ls backups/                                     # выбрать копию
./restore.sh backups/db-ДАТА.dump backups/files-ДАТА.tar.gz
```

Скрипт спросит подтверждение (`yes`) — текущие данные будут заменены. На новом сервере: шаги 3–5 (тот же `DS_KMS_KEY`!), затем `docker compose up -d postgres`, скопировать файлы копий в `infra/backups/` и запустить `restore.sh`.

Что восстановление работает, проверяет CI при каждом изменении сервера (`smoke-test.sh`).

## Без домена (локально или для проверки)

```bash
cd infra && cp .env.example .env     # заполнить POSTGRES_PASSWORD, DS_JWT_SECRET, DS_KMS_KEY
docker compose up -d --build         # http://localhost:8080/v1/health
```

Чтобы сервер был виден в локальной сети без HTTPS, в `.env` поставить `SERVER_BIND=0.0.0.0` (только для проверки — пароли без HTTPS передавать в интернете нельзя).

## Вложения во внешнем S3 (по желанию, D-26)

Когда вложений станет много, их можно держать в Hetzner Object Storage, Cloudflare R2, Backblaze B2 и т. п. В `.env`:

```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_REGION=auto
S3_BUCKET=datascratch
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
```

Файлы шифруются на устройствах, хранилище видит только шифр. Резервные копии файлов в этом режиме делает само хранилище (версии объектов), `backup.sh` копирует только базу. Перенос уже загруженных файлов с диска в S3 — `rclone copy` содержимого тома `datascratch_files` в бакет.

## Если что-то не так

| Симптом | Что сделать |
| --- | --- |
| `docker compose ps` — сервер не `healthy` | `docker compose logs server --tail 100`; чаще всего не заполнен секрет в `.env` (в логе: `Invalid server configuration`) |
| HTTPS не работает | Проверить, что домен указывает на IP (`ping`), порты 80/443 открыты; `docker compose logs caddy` |
| Закончилось место | `df -h`; старые копии — `infra/backups/`; неиспользуемые образы — `docker image prune` |
