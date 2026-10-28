# Как поставить Datascratch на iPad без Mac (TestFlight)

Приложение собирается и подписывается в GitHub Actions на macOS-машине GitHub, а затем загружается в **TestFlight**. На iPad вы ставите его из приложения TestFlight — как из App Store. Mac для этого не нужен.

Нужно один раз сделать 5 шагов (≈ 20 минут). Всё делается в браузере.

> Что понадобится: платный аккаунт Apple Developer (есть), доступ к репозиторию на GitHub с правами администратора, iPad с приложением **TestFlight** (бесплатно в App Store).

---

## Шаг 1. Узнать Team ID

1. Откройте <https://developer.apple.com/account> и войдите.
2. Внизу страницы в блоке **Membership details** найдите **Team ID** — 10 символов, например `AB12CD34EF`.
3. Запишите его — это секрет `APPLE_TEAM_ID`.

## Шаг 2. Зарегистрировать идентификатор приложения

1. Откройте <https://developer.apple.com/account/resources/identifiers/list>.
2. Нажмите **+** → **App IDs** → **Continue** → тип **App** → **Continue**.
3. Заполните:
   - **Description:** `Datascratch`
   - **Bundle ID:** выберите **Explicit** и введите `com.datascratch.app`
4. В списке **Capabilities** ничего отмечать не нужно: ссылки открывают приложение по своей схеме `ds://` (D-56), Associated Domains не используются.
5. **Continue** → **Register**.

## Шаг 3. Создать приложение в App Store Connect

1. Откройте <https://appstoreconnect.apple.com/apps>.
2. Нажмите **+** → **New App**.
3. Заполните:
   - **Platforms:** iOS
   - **Name:** `Datascratch` (если имя занято — любое, например `Datascratch Notes`; его можно поменять позже)
   - **Primary Language:** Russian
   - **Bundle ID:** выберите `com.datascratch.app` из списка
   - **SKU:** `datascratch`
   - **User Access:** Full Access
4. **Create**. Больше на странице приложения ничего заполнять не нужно — для TestFlight этого достаточно.

## Шаг 4. Создать ключ App Store Connect API

Этот ключ позволяет GitHub самому создавать сертификаты подписи и загружать сборки — без Mac и без ручной работы с сертификатами.

1. Откройте <https://appstoreconnect.apple.com/access/integrations/api>.
2. Если просят — нажмите **Request Access** и примите условия (один раз).
3. Нажмите **Generate API Key** (или **+**).
   - **Name:** `GitHub Actions`
   - **Access:** **Admin** (именно Admin: только с этой ролью ключ может создавать сертификаты подписи).
4. **Generate**. В таблице появится ключ. Запишите:
   - **Issuer ID** — над таблицей (длинная строка вида `69a6de7e-...`) → секрет `APP_STORE_CONNECT_ISSUER_ID`;
   - **Key ID** — в строке ключа (10 символов) → секрет `APP_STORE_CONNECT_KEY_ID`.
5. Нажмите **Download API Key** — скачается файл `AuthKey_XXXXXXXXXX.p8`. **Скачать можно только один раз**, сохраните его в надёжном месте (например, в менеджере паролей). Его содержимое → секрет `APP_STORE_CONNECT_KEY_P8`.

## Шаг 5. Добавить секреты в GitHub

1. Откройте репозиторий на GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. На вкладке **Secrets** нажмите **New repository secret** и добавьте четыре секрета:

| Name | Значение |
| --- | --- |
| `APPLE_TEAM_ID` | Team ID из шага 1 |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID из шага 4 |
| `APP_STORE_CONNECT_KEY_ID` | Key ID из шага 4 |
| `APP_STORE_CONNECT_KEY_P8` | Всё содержимое файла `.p8`, включая строки `-----BEGIN PRIVATE KEY-----` и `-----END PRIVATE KEY-----` (откройте файл в «Блокноте»/TextEdit и скопируйте целиком) |

Названия должны совпадать буква в букву.

---

## Как выпустить сборку

1. На GitHub: вкладка **Actions** → слева **ios-release** → справа кнопка **Run workflow** → **Run workflow**.
2. Сборка идёт 10–20 минут. Зелёная галочка — сборка загружена в App Store Connect.
3. Ещё 5–30 минут Apple обрабатывает сборку. Когда закончит, она появится в App Store Connect → ваше приложение → вкладка **TestFlight**.
4. **Первый раз:** на вкладке TestFlight у сборки может стоять «Missing Compliance» (вопрос о шифровании). Нажмите **Manage** и ответьте на вопросы (приложение использует стандартное шифрование). Это вопрос юридический — ответ нужно дать один раз, дальше можно зафиксировать его в настройках проекта.
5. Там же, в **Internal Testing**, нажмите **+**, создайте группу (например, «Я») и добавьте себя по адресу Apple ID.
6. На iPad придёт письмо/уведомление — откройте **TestFlight** и нажмите **Install**.

Сборку также можно выпустить, отправив тег вида `ios-v0.1.0` — workflow запустится сам.

## Если что-то пошло не так

- **Workflow зелёный, но написано «TestFlight skipped»** — не хватает какого-то секрета; его название будет в сообщении.
- **«Your account has reached the maximum number of certificates»** — каждая облачная сборка получает новый сертификат разработчика, и у Apple есть лимит. Workflow сам удаляет перед сборкой сертификаты разработчика, созданные прошлыми запусками (в названии «Created via API», `asc.py prune-ci-certs`); сертификаты с вашим именем (сделанные в Xcode на Mac) и сертификаты распространения не трогаются. Владелец разрешил это 2026-10-26.
- **Ошибка про сертификат / «No signing certificate»** — проверьте, что у ключа API роль **Admin**. Если не помогает — запасной вариант ниже.
- **Ошибка «No suitable application records were found»** — не выполнен шаг 3 (приложение не создано в App Store Connect) или Bundle ID не совпадает.

### Запасной вариант: свой сертификат распространения

Если подпись «из облака» не сработала, можно один раз создать сертификат **Apple Distribution** и добавить его в секреты (нужен любой Mac, на котором можно открыть «Связку ключей», или помощь Claude с командами OpenSSL):

| Name | Значение |
| --- | --- |
| `DIST_CERTIFICATE_P12` | Сертификат с закрытым ключом в формате `.p12`, закодированный в base64 |
| `DIST_CERTIFICATE_PASSWORD` | Пароль от `.p12` |

Workflow сам импортирует его, если эти секреты есть.

## Сборка на Mac (когда он будет)

```bash
brew install xcodegen
cd apps/ios
cp Config/Local.xcconfig.example Config/Local.xcconfig   # вписать свой Team ID
scripts/generate.sh
open Datascratch.xcodeproj
```
