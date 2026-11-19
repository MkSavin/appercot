# Appercot

Self-hosted PWA-платформа для бот-приложений без оплаты и подписок. Сейчас поддерживаются общие чаты, каталог и Web Push. Веб-приложения внутри оболочки — следующий режим. Сервер использует Bun, SQLite, GraphQL и WebSocket.

Документация по устройству проекта и проверяемым инвариантам начинается с [AGENTS.md](AGENTS.md).

## Быстрый старт для разработки

Требуется Bun 1.4.3.

```bash
cp .env.example .env
# Задайте ADMIN_PASSWORD в .env (минимум 8 символов).
bun install --frozen-lockfile
bun run dev
```

Веб-клиент открывается на `http://localhost:5173`, API — на `http://localhost:3000`. При первом запуске создаётся владелец `admin` с паролем из `ADMIN_PASSWORD`.

Создайте бота в настройках на вкладке «Боты», скопируйте его токен и запустите пример.

```bash
BOT_TOKEN='<botId>:<token>' BOT_URL='ws://localhost:3000/api/bot/ws' bun examples/echo-bot/index.ts
```

## Проверка и production-сборка

```bash
bun run check
bun run build
```

Сборка создаёт `apps/server/dist/appercot` (на Windows — `appercot.exe`), `public/` и `drizzle/`. Эти три элемента должны оставаться рядом:

```bash
DATA_DIR=.data NODE_ENV=production ADMIN_USERNAME=admin ADMIN_PASSWORD='change-me' ./apps/server/dist/appercot
```

Сервер раздаёт SPA, GraphQL, файлы и оба WebSocket-эндпоинта на `PORT`.

## Docker Compose с HTTPS

1. Направьте DNS A/AAAA-запись домена на сервер и откройте порты 80 и 443.
2. Скопируйте `.env.example` в `.env` и задайте `DOMAIN`, `ADMIN_PASSWORD` и отдельный стойкий `MINIO_ROOT_PASSWORD`.
3. Запустите:

```bash
docker compose up --build -d
```

Caddy автоматически получает и обновляет TLS-сертификат. Приложение доступно по `https://DOMAIN`. SQLite и ранее загруженные локальные файлы остаются в `appercot-data`. Новые вложения и миниатюры хранятся в `appercot-media`. Compose собирает закреплённый релиз MinIO из исходников и создаёт бакет при запуске. Проверить состояние можно через `docker compose ps` и `docker compose logs app minio minio-init`.

Для обновления локальной сборки:

```bash
git pull
docker compose up --build -d
```

CI проверяет код, production-сборку и Docker image. После успешных проверок ветки `master` и тегов `v*` workflow Release публикует образ в `ghcr.io/<owner>/appercot`.

## Переменные окружения

| Переменная                                  | По умолчанию                         | Назначение                                                                                        |
| ------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `PORT`                                      | `3000`                               | Порт HTTP и WebSocket                                                                             |
| `DATA_DIR`                                  | `.data`; `/data` в Docker            | SQLite и загруженные файлы                                                                        |
| `PUBLIC_URL`                                | `http://localhost:3000`              | Публичный origin для инвайтов и push                                                              |
| `DOMAIN`                                    | —                                    | Домен для Compose и Caddy                                                                         |
| `ADMIN_USERNAME`                            | `admin`                              | Логин первого владельца                                                                           |
| `ADMIN_PASSWORD`                            | —                                    | Пароль первого владельца, минимум 8 символов                                                      |
| `BOOTSTRAP_INVITE`                          | —                                    | Необязательный инвайт для первой регистрации                                                      |
| `ALLOW_REGISTRATION`                        | `true`                               | При `false` отключает регистрацию                                                                 |
| `ALLOW_USER_INVITES`                        | `true`                               | При `false` отключает создание и редактирование приглашений на платформу                          |
| `MEDIA_MAX_BYTES`                           | `2147483648`                         | Лимит одного вложения в байтах. `0` снимает лимит приложения                                      |
| `MEDIA_UPLOADS_PER_ACTOR`                   | `3`                                  | Одновременные загрузки на пользователя или бота                                                   |
| `MEDIA_ORIGINALS_PER_USER`                  | `4`                                  | Одновременные запросы оригиналов на пользователя                                                  |
| `MEDIA_TRUSTED_HOSTS`                       | —                                    | Точные имена внутренних хостов импорта через запятую, с портом, если он указан в URL              |
| `MEDIA_FFMPEG`                              | `ffmpeg` из PATH                     | Путь к FFmpeg для миниатюр                                                                        |
| `S3_ENDPOINT`                               | —                                    | S3-совместимый endpoint для бинарной установки. При пустом значении используется `DATA_DIR/files` |
| `S3_BUCKET` / `S3_REGION`                   | `appercot` / `us-east-1`             | Существующий бакет и его регион для бинарной установки                                            |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | —                                    | Пара учётных данных S3 для бинарной установки                                                     |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`   | `appercot` / —                       | Учётные данные MinIO в Compose                                                                    |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`    | —                                    | Пара ключей Web Push; задаются только вместе                                                      |
| `NODE_ENV`                                  | `development`; `production` в Docker | Отключает GraphQL Playground в production                                                         |

Сгенерировать VAPID-ключи:

```bash
bun -e "import { generateVAPIDKeys } from 'web-push'; console.log(generateVAPIDKeys())"
```

Пустые необязательные переменные считаются незаданными. Не публикуйте `.env` и токены ботов.

Для миниатюр в бинарной установке установите FFmpeg. Он уже входит в контейнер приложения. Просмотр видео зависит от поддержки кодека браузером. API отправки ботом и схема хранения описаны в [документации медиа](.agents/server/media.md).

## Бэкап и восстановление

Сохраняйте `DATA_DIR/totp.key` вместе с резервной копией БД, если кто-либо включил 2FA. При восстановлении верните ключ в `DATA_DIR` до запуска сервера. Ограничьте доступ к ключу и копии БД.

Для бинарной установки остановите запись новых файлов или делайте копию в период низкой активности. SQLite `.backup` создаёт консистентную копию работающей БД:

```bash
mkdir -p backups/files
sqlite3 .data/appercot.sqlite ".backup 'backups/appercot.sqlite'"
cp -a .data/files/. backups/files/
```

При настроенном S3 включайте бакет в ту же резервную копию, что и SQLite. Сохраняйте объекты с исходными ключами. В Compose копируйте том `appercot-media` при остановленном MinIO либо экспортируйте бакет средствами S3. Перед запуском приложения после восстановления верните и SQLite, и соответствующий бакет.

Для Docker:

```bash
mkdir -p backups
docker compose exec app sqlite3 /data/appercot.sqlite ".backup '/data/appercot-backup.sqlite'"
docker compose cp app:/data/appercot-backup.sqlite backups/appercot.sqlite
docker compose cp app:/data/files/. backups/files/
docker compose exec app rm /data/appercot-backup.sqlite
```

Восстановление в Docker выполняется на остановленном приложении:

```bash
docker compose stop caddy app
docker compose cp backups/appercot.sqlite app:/data/appercot.sqlite
docker compose cp backups/files/. app:/data/files/
docker compose run --rm --user root --entrypoint chown app -R 10001:10001 /data
docker compose start app caddy
```

После восстановления проверьте вход владельца, историю сообщений и доступность файлов.

## Очистка данных

Фоновая задача каждый час очищает обновления старше 30 дней, outbox старше 7 дней и файлы, которые больше суток не привязаны к сообщению. При очистке чата срок для его файлов отсчитывается с момента удаления истории. Обновление образа сохраняет данные в томах.
