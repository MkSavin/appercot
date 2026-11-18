# Appercot

Self-hosted PWA-платформа для чат-ботов: GraphQL, WebSocket, SQLite и Bot SDK в одном Bun-процессе. Внешние CDN, аналитика и облачные API не используются.

## Быстрый старт для разработки

Требуется Bun 1.4.3.

```bash
cp .env.example .env
# Задайте ADMIN_PASSWORD в .env (минимум 8 символов).
bun install --frozen-lockfile
bun run dev
```

Веб-клиент открывается на `http://localhost:5173`, API — на `http://localhost:3000`. По умолчанию создаётся администратор `admin` с паролем из `ADMIN_PASSWORD`.

После создания бота в `/admin` скопируйте его токен и запустите пример:

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
DATA_DIR=.data NODE_ENV=production ADMIN_PASSWORD='change-me' ./apps/server/dist/appercot
```

Сервер раздаёт SPA, GraphQL, файлы и оба WebSocket-эндпоинта на `PORT`.

## Docker Compose с HTTPS

1. Направьте DNS A/AAAA-запись домена на сервер и откройте порты 80 и 443.
2. Скопируйте `.env.example` в `.env` и задайте как минимум `DOMAIN` и `ADMIN_PASSWORD`.
3. Запустите:

```bash
docker compose up --build -d
```

Caddy автоматически получает и обновляет TLS-сертификат. Приложение доступно по `https://DOMAIN`; SQLite и файлы хранятся в volume `appercot-data`. Проверить состояние можно через `docker compose ps` и `docker compose logs app`.

Для обновления локальной сборки:

```bash
git pull
docker compose up --build -d
```

CI проверяет код, production-сборку и Docker image. После успешных проверок ветки `master` и тегов `v*` workflow Release публикует образ в `ghcr.io/<owner>/appercot`.

## Переменные окружения

| Переменная                               | По умолчанию                         | Назначение                                        |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------- |
| `PORT`                                   | `3000`                               | Порт HTTP и WebSocket                             |
| `DATA_DIR`                               | `.data`; `/data` в Docker            | SQLite и загруженные файлы                        |
| `PUBLIC_URL`                             | `http://localhost:3000`              | Публичный origin для инвайтов и push              |
| `DOMAIN`                                 | —                                    | Домен для Compose и Caddy                         |
| `ADMIN_USERNAME`                         | `admin`                              | Логин первого администратора                      |
| `ADMIN_PASSWORD`                         | —                                    | Пароль первого администратора, минимум 8 символов |
| `BOOTSTRAP_INVITE`                       | —                                    | Необязательный инвайт для первой регистрации      |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | —                                    | Пара ключей Web Push; задаются только вместе      |
| `NODE_ENV`                               | `development`; `production` в Docker | Отключает GraphQL Playground в production         |

Сгенерировать VAPID-ключи:

```bash
bun -e "import { generateVAPIDKeys } from 'web-push'; console.log(generateVAPIDKeys())"
```

Пустые необязательные переменные считаются незаданными. Не публикуйте `.env` и токены ботов.

## Бэкап и восстановление

Для бинарной установки остановите запись новых файлов или делайте копию в период низкой активности. SQLite `.backup` создаёт консистентную копию работающей БД:

```bash
mkdir -p backups/files
sqlite3 .data/appercot.sqlite ".backup 'backups/appercot.sqlite'"
cp -a .data/files/. backups/files/
```

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

После восстановления проверьте вход администратора, историю сообщений и доступность файлов.

## Очистка данных

Фоновая задача запускается каждый час: журнал пользовательских обновлений хранится 30 дней, outbox ботов — 7 дней, непривязанные файлы — 1 сутки. Дополнительный cron не требуется. Данные в `DATA_DIR` не удаляются при обновлении образа.
