# botloft — план реализации MVP (v2)

Self-hosted PWA-платформа для ботов: альтернатива Telegram Bot Platform для регионов с жёсткими ограничениями.
Документ рассчитан на исполнение моделями уровня Sonnet/Kimi: фазы выполняются строго по порядку, в конце каждой — проверка «Критерии готовности».

---

## 0. Название

Рабочее имя — **appercot** (пакеты `@appercot/protocol`, `@appercot/chat`). Название собирается из **app** (приложение) и **cot** (дом) и созвучно с **uppercot**. Домены не проверены.

Проверено `botloft` на 2026-11-17: свободно в npm, свободен GitHub user/org, свободны `botloft.dev`, `botloft.app`, `botloft.io` (занят только `botloft.com` — не критично).

Альтернативы того же класса (тоже свободны в npm+GitHub): **botcove**, **chatlet**, **relaynest**, **cothouse**.
Перед публикацией — быстрая проверка на товарный знак. Переименование = глобальный поиск-замена `botloft`.

---

## 1. Правила для исполнителя

1. **Только Bun.** Никаких `npm`/`pnpm`/`node`. Скрипты `bun run <x>`, тесты `bun test`.
2. **Не добавляй зависимости вне §3.** Нужно очень — `// TODO(dep):` и продолжай.
3. После каждой фазы `bun run check` (biome → steiger → codegen-сверка → typecheck → tests) должен быть зелёным.
4. Контракты живут только в `packages/protocol` (zod). Сервер, `packages/chat` и веб импортируют их, не дублируют.
5. Никаких внешних CDN, шрифтов, аналитики, внешних API. Работает в изолированной сети.
6. ID — `Bun.randomUUIDv7()`, время — `Date.now()` (ms, int).
7. Код пишется «самодокументируемым»: имена несут смысл, комментарии — только для неочевидных контрактов и причин (см. §14).
8. Не реализуй ничего из «Вне MVP» (§16).

---

## 2. Ключевые решения (и что изменилось относительно v1)

| Тема                | Решение                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Деплой              | Один процесс `apps/server`: GraphQL + файлы + 2 WS-эндпоинта + статика SPA. `bun build --compile` → один бинарь                                                                                            |
| БД                  | SQLite (`bun:sqlite`) + Drizzle, WAL                                                                                                                                                                       |
| HTTP                | **Свой роутер ~60 строк** поверх `Bun.serve` (Hono не нужен: маршрутов мало, а upgrade нужно контролировать вручную)                                                                                       |
| Фронт ↔ сервер      | **GraphQL**: `graphql-yoga` + `@pothos/core`, типы клиента — `@graphql-codegen/client-preset`. Вывод — типизированные чтения, `JSON`-скаляр на входе сложных content-объектов с zod-валидацией в резолвере |
| Реактивность        | Свой WS `GET /api/ws` (не graphql-ws) + журнал обновлений с `seq` для догона после офлайна                                                                                                                 |
| Бот ↔ сервер        | Один WS `GET /api/bot/ws`, фреймы `req/res/evt/ack`, outbox в БД (at-least-once)                                                                                                                           |
| Файлы               | HTTP: `POST /api/files` (юзер), `POST /api/bot/files` (бот), `GET /api/files/:id`. В content — только `fileId`, никогда не URL (защита от SSRF)                                                            |
| Мастера             | Только в `packages/chat`, mutable-builder с вложениями. Сервер о них не знает; состояние — в KV чата                                                                                                       |
| Пользователи        | Логин+пароль (`Bun.password`), сессия в httpOnly cookie, регистрация по инвайту. Первый админ — из env при первом старте                                                                                   |
| Админка             | **UI внутри веб-приложения** для роли `admin` (юзеры, инвайты, боты, токены). CLI — не нужен                                                                                                               |
| Каталог ботов       | Кнопка **Browse**: список ботов с кнопкой «Добавить». Инвайт-ссылок бота нет                                                                                                                               |
| Сессия              | `user` и `chat` приходят боту как часть данных события; отдельного `getChat` нет                                                                                                                           |
| Аватары ботов       | Не загружаются: монограмма + детерминированный цвет из `bot.id`. В переписке аватар не показывается вообще                                                                                                 |
| Системные сообщения | Отдельный `sender: 'system'` с визуально отличимым оформлением (не пузырь и не полноширинный текст бота)                                                                                                   |
| Пуши                | Web Push (VAPID) best-effort + in-app через WS. Ограничения FCM/APNs — §12.5                                                                                                                               |

Принятые упрощения: опросы = кнопки + KV (отдельного типа нет); удаление сообщений — hard delete; один процесс/БД/диск; без Redis/S3/Postgres.

---

## 3. Стек и зависимости (исчерпывающе)

Корень: `@biomejs/biome`, `lefthook`, `steiger`, `@feature-sliced/steiger-plugin`, `typescript`, `@types/bun`.

- `packages/protocol`: `zod@4`.
- `apps/server`: `graphql@17`, `graphql-yoga@6`, `@pothos/core@4`, `drizzle-orm`, `drizzle-kit` (dev), `web-push`.
- `apps/web`: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tailwindcss@4`, `@tailwindcss/vite`, `vite-plugin-pwa`, `wouter`, `zustand`, `react-markdown`, `remark-gfm`, `lucide-react`, `graphql-request`, `@graphql-codegen/cli` + `@graphql-codegen/client-preset` (dev), shadcn/ui (тянет `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `sonner`).
- `packages/chat`: только `@botloft/protocol`; транспорт — нативный `WebSocket` Bun.
- `examples/*`: только `@botloft/chat`.

Версии зафиксировать в `package.json` точными/каретки и не обновлять в процессе.
Если `@graphql-codegen/client-preset` конфликтует с `@graphql-codegen/cli` — поставить обе последние совместимые (`bun add -d` без версий). Если codegen ломается принципиально: fallback — закоммитить `generated.ts`, сгенерированный один раз, и не запускать codegen в `check` (типы всё равно останутся).

---

## 4. Структура монорепо

```
/
├─ package.json                 # workspaces: apps/*, packages/*, examples/*
├─ tsconfig.base.json           # strict, noUncheckedIndexedAccess, moduleResolution bundler
├─ biome.json
├─ lefthook.yml
├─ steiger.config.ts            # FSD-линтинг для apps/web
├─ .env.example
├─ apps/
│  ├─ server/
│  │  ├─ src/
│  │  │  ├─ index.ts            # Bun.serve: роутер, ws handlers, static
│  │  │  ├─ env.ts              # zod-валидация env + bootstrap admin
│  │  │  ├─ http/{router.ts,files.ts,static.ts,respond.ts}
│  │  │  ├─ graphql/{builder.ts,types/*.ts,queries.ts,mutations.ts,context.ts,admin.ts}
│  │  │  ├─ ws/{hub.ts,client-ws.ts,bot-ws.ts,frames.ts}
│  │  │  ├─ domain/{chats.ts,messages.ts,commands.ts,kv.ts,events.ts,updates.ts,roles.ts,files.ts,push.ts,system-messages.ts}
│  │  │  ├─ db/{schema.ts,client.ts,migrate.ts}
│  │  │  └─ auth/{password.ts,session.ts,context.ts}
│  │  ├─ drizzle/
│  │  └─ test/
│  └─ web/
│     ├─ index.html, vite.config.ts, components.json
│     └─ src/                   # Feature-Sliced Design, см. §4.2
├─ packages/
│  ├─ protocol/src/{index.ts,content.ts,limits.ts,errors.ts,bot-rpc.ts,bot-events.ts,client-updates.ts,entities.ts}
│  └─ chat/src/{index.ts,bot.ts,connection.ts,context.ts,storage.ts,flow/{index.ts,builder.ts,runtime.ts,validate.ts}}
└─ examples/{echo-bot,wizard-bot}/index.ts
```

Корневые скрипты:

```json
{
  "dev": "bun run --filter '@botloft/server' dev & bun run --filter '@botloft/web' dev",
  "build": "bun run graphql:schema && bun run --filter '@botloft/web' build && bun run --filter '@botloft/server' build",
  "graphql:schema": "bun run --filter '@botloft/server' schema:print",
  "codegen": "bun run --filter '@botloft/web' codegen",
  "check": "biome check . && bun run steiger && bun run codegen:check && bun run typecheck && bun test",
  "steiger": "bun run --filter '@botloft/web' steiger",
  "codegen:check": "git diff --exit-code apps/web/src/shared/api/graphql/generated",
  "typecheck": "bun run --filter '*' typecheck"
}
```

`lefthook.yml`:

```yaml
pre-commit:
  commands:
    biome: { glob: "*.{ts,tsx,json}", run: bunx biome check --write --no-errors-on-unmatched {staged_files}, stage_fixed: true }
pre-push:
  commands:
    steiger: { run: bun run steiger }
    typecheck: { run: bun run typecheck }
    test: { run: bun test }
```

### 4.1 FSD и steiger

- FSD применяется **только к `apps/web/src`**. Сервер — обычные слои `http → graphql → domain → db`, без FSD.
- `steiger.config.ts`:

  ```ts
  import { defineConfig } from "steiger";
  import fsd from "@feature-sliced/steiger-plugin";

  export default defineConfig([
    ...fsd.configs.recommended,
    { ignores: ["**/shared/api/graphql/generated/**"] },
    { files: ["./src/shared/**"], rules: { "fsd/public-api": "off" } },
    { files: ["./src/pages/**"], rules: { "fsd/insignificant-slice": "off" } },
  ]);
  ```

  Правило `fsd/public-api` требует `index.ts` в каждом слайсе — это обязательное требование, не отключай его для слоёв выше `shared`.

- `components.json` shadcn: `aliases.ui` = `@/shared/ui`, `aliases.utils` = `@/shared/lib/cn`, `aliases.components` = `@/shared/ui`.
- Алиас `@/*` → `apps/web/src/*` в `tsconfig.json` и `vite.config.ts`.
- Сгенерированный codegen-файл лежит в `shared/api/graphql/generated/` и игнорируется steiger/biome.

### 4.2 Дерево `apps/web/src` (FSD)

```
app/            index.tsx, styles/, routing/ (wouter routes), providers/ (ws bootstrap, toasts)
pages/          login/ register/ chat/ browse/ admin/ not-found/      (+ export в index.ts корня pages? нет — импорт по пути слайса)
widgets/        chat-list/ chat-view/ bot-catalog/ admin-dashboard/
features/       login-form/ register-form/ send-message/ add-bot/ block-bot/ clear-chat/
                command-menu/ upload-media/ bot-token-manage/ create-invite/ push-subscribe/
entities/       session/ user/ bot/ chat/ message/
shared/         api/ (graphql client + generated + ws transport) lib/ ui/ config/
```

Правила:

- Каждый слайс: `index.ts` (публичный API) + сегменты `ui/`, `model/`, `api/`, `lib/`.
- Импорт только вниз по слоям и только через `index.ts` слайса.
- `entities/*` не знают о GraphQL-деталях: маппинг DTO → домен в `entities/*/api/`.

---

## 5. Данные (SQLite, Drizzle) — `apps/server/src/db/schema.ts`

```
users          id PK, username UNIQUE, display_name, password_hash, is_admin INT, created_at
sessions       id PK (sha256 токена), user_id, expires_at, created_at, user_agent
invites        code PK, created_by, max_uses NULL, uses, expires_at NULL, created_at
bots           id PK, username UNIQUE ^[a-z][a-z0-9_]{2,31}bot$, name, description,
               owner_id NULL, token_hash UNIQUE, listed INT DEFAULT 1,
               access 'public'|'by_link', roles JSON '[]', default_roles JSON '[]', commands_rev INT, created_at
bot_commands   bot_id, name, description, roles JSON NULL, sort INT; PK(bot_id,name)
chats          id PK, user_id, bot_id, roles JSON '[]', blocked_at NULL,
               last_message_at, last_read_seq INT 0, next_seq INT 1, created_at; UNIQUE(user_id,bot_id)
messages       id PK, chat_id, seq INT, sender 'user'|'bot'|'system', content JSON,
               status 'accepted'|'processed', client_id NULL, reply_to NULL,
               created_at, edited_at NULL; UNIQUE(chat_id,seq); UNIQUE(chat_id,client_id)
files          id PK, owner_type 'user'|'bot', owner_id, chat_id NULL, mime, size,
               name, width NULL, height NULL, created_at
chat_kv        chat_id, key, value TEXT(JSON), size INT; PK(chat_id,key)
bot_events     seq INTEGER PK AUTOINCREMENT, bot_id, chat_id, payload JSON, created_at   -- outbox
user_updates   seq INTEGER PK AUTOINCREMENT, user_id, payload JSON, created_at          -- журнал синхронизации
push_subs      id PK, user_id, endpoint UNIQUE, p256dh, auth, created_at
```

Правила:

- PRAGMA на старте: `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`, `synchronous=NORMAL`.
- Индексы: `messages(chat_id, seq)`, `user_updates(user_id, seq)`, `bot_events(bot_id, seq)`, `chats(user_id)`, `files(chat_id)`.
- `seq` сообщения берётся из `chats.next_seq` в той же транзакции (UPDATE ... RETURNING).
- Hard delete сообщений; очистка чата = `DELETE FROM messages WHERE chat_id=?` + `chats.next_seq` не сбрасывается (монотонность важнее).
- KV после очистки чата **не** трогаем (данные бота).
- Токен бота: `<botId>:<32 random bytes base64url>`, в БД — sha256.
- Миграции — `drizzle-kit generate`, применяются автоматически при старте.

---

## 6. Протокол ботов — `packages/protocol`

### 6.1 Контент

```ts
Button =
  | { text: string; callback: string }   // ≤ 256 байт
  | { text: string; url: string }        // только http/https
  | { text: string; command: string }    // отправляет /name от имени пользователя
Media = { fileId: string; kind: 'image' | 'video' | 'audio' | 'file'; caption?: string }
MessageContent = {
  text?: string        // markdown GFM, ≤ 8192 симв., raw HTML запрещён
  media?: Media[]      // ≤ 10
  buttons?: Button[][] // ≤ 10 рядов × 5
}
UserContent = { text?: string; media?: Media[] }   // без buttons
```

`limits.ts`: `KV_QUOTA=5MiB`, `KV_KEY_MAX=256`, `MAX_FILE=50MiB`, `TEXT_MAX=8192`, `BUTTONS_MAX_ROWS=10`...
`errors.ts`: `BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | BOT_BLOCKED | KV_QUOTA | RATE_LIMIT | INTERNAL`.

### 6.2 Общие типы (`entities.ts`)

```ts
UserRef  = { id, username, displayName }
BotRef   = { id, username, name, description, online }
ChatRef  = { id, roles: string[], blocked: boolean, createdAt }
Message  = { id, chatId, seq, sender: 'user'|'bot'|'system', content, status, replyTo?, createdAt, editedAt? }
```

### 6.3 Транспорт бота: `GET /api/bot/ws`

Заголовок `Authorization: Bearer <token>` (fallback `?token=`).

```
S→B  { t:'hello', protocol: 1, bot: BotRef, commands: BotCommand[] }
B→S  { t:'req', id: string, method: string, params: unknown }
S→B  { t:'res', id, ok:true, result } | { t:'res', id, ok:false, error:{ code, message } }
S→B  { t:'evt', seq: number, event: BotEvent }
B→S  { t:'ack', seq: number }     // «обработано» → две галочки; удаляет событие из outbox
```

- Одно соединение на бота; новое закрывает старое (close `4001 replaced`).
- После `hello` сервер досылает все неподтверждённые события по `seq`; окно in-flight ≤ 100.
- Плохой токен → close `4401`. Ping: `Bun.serve` `sendPings` + `idleTimeout: 60`.

### 6.4 События бота (`bot-events.ts`)

Все события несут `chat` и `user` (сессионные данные):

```
chat_started   { chat, user }
message        { chat, user, message }
command        { chat, user, message, name }        // текст ровно /name
callback       { chat, user, messageId, data, callbackId }
chat_updated   { chat, user }                      // роли изменились
bot_blocked    { chat, user }
bot_unblocked  { chat, user }
chat_cleared   { chat, user }
```

### 6.5 Методы бота (`bot-rpc.ts`)

```
getMe         {}                              → BotRef
setCommands   { commands: {name, description, roles?}[] }  → ok
setRoles      { roles: string[], defaultRoles?, listed?, access? } → ok
sendMessage   { chatId, content, replyTo? }   → Message
editMessage   { chatId, messageId, content }  → Message   // только свои
deleteMessage { chatId, messageId }           → ok        // любые в чате
answerCallback{ callbackId, toast? }          → ok
sendTyping    { chatId }                      → ok        // 5 сек
setChatRoles  { chatId, roles: string[] }     → ok
kvGet         { chatId, keys? }               → Record<string, Json>   // без keys — всё
kvSet         { chatId, entries: Record<string, Json|null> } → { used } // null = удалить
kvClear       { chatId }                      → ok
```

Методы `getChat`, `createInvite` **убраны** (сессия приходит с событием; инвайт-ссылок нет).

---

## 7. GraphQL (фронт ↔ сервер)

Эндпоинт `POST /graphql`. Аутентификация — cookie `sid`. Playground только при `NODE_ENV!=production`.

Схема (Pothos, code-first; `JSON` — кастомный скаляр):

```graphql
type User {
  id: ID!
  username: String!
  displayName: String!
  isAdmin: Boolean!
}
type Bot {
  id: ID!
  username: String!
  name: String!
  description: String!
  online: Boolean!
  listed: Boolean!
}
type Chat {
  id: ID!
  bot: Bot!
  roles: [String!]!
  blocked: Boolean!
  unread: Int!
  lastMessageAt: Int
}

type Connection {
  id: ID!
  bot: Bot!
  roles: [String!]!
  blocked: Boolean!
} # = чат
type Message {
  id: ID!
  chatId: ID!
  seq: Int!
  sender: String!
  content: JSON!
  status: String!
  replyTo: ID
  createdAt: Int!
  editedAt: Int
}

type Session {
  user: User!
  chats: [Connection!]!
  vapidPublicKey: String
}
type SyncPayload {
  updates: [Update!]!
  resetRequired: Boolean
}
type Update {
  seq: Int!
  payload: JSON!
}

input SendMessageInput {
  chatId: ID!
  clientId: String!
  content: JSON!
}

type Query {
  session: Session!
  messages(chatId: ID!, before: Int, limit: Int = 50): [Message!]!
  browseBots(query: String): [Bot!]!
  sync(since: Int!): SyncPayload!
  # admin
  adminUsers(query: String): [User!]!
  adminInvites: [Invite!]!
  adminBots: [Bot!]!
}
type Mutation {
  login(username: String!, password: String!): Session!
  register(
    username: String!
    password: String!
    displayName: String!
    invite: String!
  ): Session!
  logout: Boolean!
  addBot(username: String!): Connection!
  sendMessage(input: SendMessageInput!): Message!
  pressButton(chatId: ID!, messageId: ID!, data: String!): ButtonResult!
  markRead(chatId: ID!, seq: Int!): Boolean!
  clearChat(chatId: ID!): Boolean!
  blockBot(chatId: ID!, blocked: Boolean!): Boolean!
  subscribePush(subscription: JSON!): Boolean!
  unsubscribePush(endpoint: String!): Boolean!
  # admin
  createInvite(maxUses: Int, expiresInDays: Int): Invite!
  createBot(username: String!, name: String!, description: String!): BotToken!
  resetBotToken(botId: ID!): BotToken!
  setBotOwner(botId: ID!, username: String): Boolean!
}
type ButtonResult {
  toast: String
}
type BotToken {
  bot: Bot!
  token: String!
}
type Invite {
  code: String!
  uses: Int!
  maxUses: Int
  url: String!
}
```

Правила:

- Входные `content` — `JSON`-скаляр, в резолвере `MessageContentSchema.parse()` / `UserContentSchema.parse()`. Выходные объекты — строго типизированы (клиент получает типы из codegen).
- Ошибки: `GraphQLError` с `extensions.code` из `errors.ts`; клиент маппит в toast.
- `sendMessage` идемпотентен по `(chatId, clientId)`.
- `pressButton` → событие боту, ждёт `answerCallback` ≤ 10 с, затем `{ toast }` (или `null`).
- Codegen: `schema: apps/server/schema.graphql` (генерится скриптом `schema:print` через `printSchema`), `documents: apps/web/src/**/*.graphql.ts` (`graphql()` из client-preset), output → `apps/web/src/shared/api/graphql/generated/`.
- N+1: для `session.chats` и списков ботов использовать `drizzle`-запросы с ручной джойн-загрузкой (без DataLoader; объёмы малые).

### 7.1 Реактивность — `GET /api/ws` (cookie)

```
S→C { t:'upd', seq, update: ClientUpdate }
C→S { t:'focus', chatId: string|null }   // подавление пушей по открытому чату
C→S { t:'ping' }  S→C { t:'pong' }
```

`ClientUpdate` (`client-updates.ts`):

```
message.new      { message }
message.edited   { message }
message.deleted  { chatId, messageId }
message.status   { chatId, messageId, status }
chat.updated     { chat }
chat.cleared     { chatId }
chat.removed     { chatId }
bot.typing       { chatId }
bot.presence     { botId, online }
```

- `seq` монотонен **на пользователя**, каждая мутация пишет запись в `user_updates` и рассылается во все сокеты юзера (несколько вкладок — норма, дубли отсекаются по `seq`).
- Догон: при старте, реконнекте и `visibilitychange` → `sync(since: lastSeq)`. Если журнал не покрывает `since` → `resetRequired: true` и клиент перезагружает `session` + открытый чат.
- Статус сообщения не откатывается назад (монотонность `accepted → processed`).

### 7.2 Прочие HTTP маршруты

```
POST /api/files         (cookie, multipart: file, chatId) → { fileId }
POST /api/bot/files     (Bearer bot token, multipart: file, chatId) → { fileId }
GET  /api/files/:id     (cookie, проверка участия; Range для видео; immutable cache)
GET  /api/ws            (cookie)  |  GET /api/bot/ws (Bearer)  |  GET /healthz
GET  /*                 → статика SPA (index.html fallback)
```

---

## 8. Серверная логика (потоки)

**Отправка сообщения пользователем** (`sendMessage`):

1. Чат принадлежит юзеру; `blocked_at` → `GRAPHQL error FORBIDDEN`.
2. Идемпотентность: `(chat_id, client_id)` уже есть → вернуть существующее.
3. Транзакция: `next_seq`, insert message `status='accepted'`, обновить `last_message_at`.
4. Классификация: `text` матчит `^/([a-z0-9_]{1,32})$` и нет media → `command`; иначе `message`.
5. Роли: команда зарегистрирована с `roles`, у чата нет пересечения → боту **не** отправляем, создаём system-сообщение «Недостаточно прав» (не раскрывая существование команды).
6. Insert в `bot_events`; если бот онлайн — отправить сразу.
7. Запись `message.new` в `user_updates` + рассылка другим вкладкам; вернуть Message.

**Ack бота**: удалить `bot_events` по `seq`; для событий `message`/`command` → `status='processed'` + `message.status` клиенту.

**Хаб** (`ws/hub.ts`): `Map<userId, Set<ws>>`, `Map<botId, ws>`, `Map<ws, chatId|null>`. `pushUpdate(userId, update)` = insert в `user_updates` → все сокеты → если ни одна вкладка не в фокусе на этом чате и update = `message.new` от бота → Web Push.

**Блокировка**: `blocked_at`, событие `bot_blocked`; `sendMessage/editMessage` → `BOT_BLOCKED`. Разблокировка симметрично + `bot_unblocked`.

**Очистка**: удаление сообщений + событие `chat_cleared` + `chat.cleared` клиенту. Активный мастер у бота обязан сброситься (в SDK).

**KV**: `kvSet` в транзакции считает суммарный UTF-8 размер ключей+значений; > 5 MiB → `KV_QUOTA`, откат.

**Rate limit** (in-memory): бот 30 req/s, юзер 5 msg/s, `pressButton` 10/s → `RATE_LIMIT`.

**Фоновые задачи** (интервал 1 ч): prune `user_updates` > 30 дней, `bot_events` > 7 дней, осиротевшие файлы > 1 суток.

**Presence**: connect/disconnect бота → `bot.presence` всем юзерам с чатом этого бота.

---

## 9. `packages/chat` — SDK бота

```ts
import { createBot } from '@botloft/chat'

const bot = createBot({
  url: 'wss://host/api/bot/ws',
  token: process.env.BOT_TOKEN!,
})

bot.command('start', (ctx) => ctx.reply(`Привет, **${ctx.user.displayName}**`))
bot.command('admin', { roles: ['admin'] }, (ctx) => ctx.reply('Панель'))
bot.on('message', (ctx) => ctx.reply({ text: `Эхо: ${ctx.text}` }))
bot.on('callback', (ctx) => ctx.answer('ок'))
bot.on('chat_started', (ctx) => ctx.reply('Это бот. /help'))
bot.on('bot_blocked', () => {})

await bot.start({
  roles: ['admin', 'manager'],
  commands: [
    { name: 'start', description: 'Начать' },
    { name: 'order', description: 'Заказать' },
  ],
})
```

- `connection.ts`: WS с автопереподключением (backoff 0.5→30 c, jitter), `call(method, params)` → Promise по `id`, таймаут 15 c, типизация из `BotMethods`.
- Порядок: **последовательно внутри чата, параллельно между чатами** (`Map<chatId, Promise<unknown>>`), чтобы мастер не получал гонок.
- `ack` отправляется после завершения хендлера (в т.ч. при ошибке, по умолчанию `ackOnError: true`).
- `acks` пачкой (до 50 или ~100 мс) — меньше фреймов при всплесках.
- `Context`: `user`, `chat`, `roles`, `text`, `message`, `reply(content|string)`, `edit(messageId, content)`, `delete(messageId)`, `answer(toast?)`, `typing()`, `storage`, `flow`, `hasRole(r)`.
- `storage`: `get<T>`, `set`, `delete`, `all`; кэш на время обработки события, запись сразу.
- `bot.api` — прямой доступ ко всем методам (для рассылок вне контекста).

### 9.1 Мастера: mutable-builder с вложениями

Билдер мутабельный (методы меняют его и возвращают `this`), вложенность — через колбэки и именованные группы. Состояние — в KV под `__flow :<id>`, экран — **редактируемое** сообщение бота.

```ts
const order = bot
  .flow('order')
  .state(() => ({ size: '', qty: 1 })) // draft, сериализуется в KV на каждом переходе
  .start('size')

order
  .screen('size')
  .text('Выберите размер')
  .button('S', (s) => {
    s.size = 'S'
  })
  .to('qty')
  .button('M', (s) => {
    s.size = 'M'
  })
  .to('qty')
  .button('Отмена')
  .cancel()

order
  .screen('qty')
  .text((s) => `Размер ${s.size}. Сколько штук?`)
  .input((s, text) => {
    const n = Number(text)
    if (!Number.isInteger(n) || n < 1) return 'Нужно целое число ≥ 1' // строка = ошибка валидации
    s.qty = n
  })
  .to('confirm')

order
  .screen('confirm')
  .text((s) => `${s.qty} × ${s.size}. Подтвердить?`)
  .button('Да')
  .on(async (s, ctx) => {
    await saveOrder(s)
    return ctx.finish('Заказ принят ✅')
  })
  .button('Изменить')
  .to('size')

order
  .group('shipping') // вложенная группа: адресуется как 'shipping/address'
  .screen('address')
  .text('Адрес?')
  .input((s, t) => {
    s.address = t
  })
  .to('zip')
  .screen('zip')
  .text('Индекс?')
  .input((s, t) => {
    s.zip = t
  })
  .to('/confirm')

bot.command('order', (ctx) => order.start(ctx))
```

Требования к реализации:

- `screen()` возвращает screen-билдер и регистрирует его в потоке; повторный вызов `screen(name)` с тем же именем — ошибка. Допустима и форма с колбэком: `order.screen('size', (s) => { s.text('...').button(...) })`.
- `.to(id)` принимает `'screen'`, `'group/screen'` (локально), `'/screen'` (корень). `.enter(id)` — переход в начало группы. `.cancel()`/`.back()` — встроенные действия.
- `.on(async (state, ctx) => ...)` — действие без перехода; возврат `ctx.finish(content?)` завершает поток, `ctx.to(id)` — переход.
- `validate()` вызывается в `bot.start()`: уникальность id, существование всех `.to()`-таргетов, у экрана есть `text` и хотя бы один способ выхода, id ≤ 24 символов.
- Callback data: `f:<flowId>:<screenId>:<actionIndex>:<v>` (≤ 256 байт; состояние в data **не** кладём). Смена `screenId` в данных → `answer('Устаревшая кнопка')`.
- `input(s, text)`: возврат строки = показать ошибку (toast при callback, короткое сообщение при тексте); `undefined` = успех.
- Команда во время активного потока → поток отменяется, команда обрабатывается штатно. `chat_cleared` → состояние потока удаляется.
- `w.finish(content?)`: заменить экран на content без кнопок (или удалить экран) и очистить KV-ключ.

---

## 10. Веб-клиент

### 10.1 Макет

- Desktop: сайдбар 320px (сессия/юзер, кнопка **Browse**, поиск, список чатов с превью, unread, индикатор онлайн) + чат.
- Mobile (<768px): список и чат — отдельные маршруты (`/`, `/c/:id`), back-кнопка, `env(safe-area-inset-*)`, `100dvh`.
- Маршруты: `/login`, `/register?invite=`, `/` (список), `/c/:chatId`, `/browse`, `/admin`.

### 10.2 Чат (стиль ChatGPT)

- Сообщения бота: на всю ширину, без пузыря и **без аватара**; markdown (`react-markdown` + `remark-gfm`, `skipHtml`), код-блоки с копированием; разделение — отступом и типографикой.
- Сообщения пользователя: пузырь справа, max-width 80%, `StatusTicks`: `pending` спиннер, `accepted` ✓, `processed` ✓✓, `failed` «!» + «Повторить».
- Сообщения системы (`sender='system'`): по центру, мелкий приглушённый пилл с фоном; без пузыря и без тиков. Используются для «Недостаточно прав», «Чат очищен», «Бот заблокирован», «Бот недоступен».
- Кнопки: сетка рядов под сообщением; нажатие → спиннер на кнопке до ответа, `toast` через `sonner`; URL-кнопки — `AlertDialog` с подтверждением; `command`-кнопки отправляют `/name`.
- Медиа: превью картинок + lightbox (`Dialog`), видео `<video controls>`, файлы — карточка.
- «Бот печатает…» — 5 сек после `bot.typing`. Офлайн-плашка «Сообщения будут доставлены позже». Заблокирован → вместо композера «Разблокировать».
- Шапка: меню (`DropdownMenu`) — «Очистить чат», «Заблокировать» (с `AlertDialog`).

### 10.3 Композер

- Авторастущий `Textarea`; Enter — отправка, Shift+Enter — перенос (на мобильных Enter = перенос, кнопка отправки).
- Ввод `/` → `CommandMenu` (shadcn `Command`) с командами бота (сервер уже фильтрует по ролям). Пункт меню вызывает тот же код, что ручной ввод → отправляется чистый `/name`.
- Скрепка → `POST /api/files`, затем сообщение с `media`.

### 10.4 Состояние и синхронизация

- `zustand`: `session`, `chats`, `messagesByChat`, `pendingByChat`, `lastSeq` (в `localStorage`).
- Оптимистичная отправка: локальное сообщение с `clientId`; успех → замена серверным; ошибка → `failed`; ретрай с тем же `clientId`.
- История: подгрузка вверх по `before=minSeq`. Без виртуализации (MVP).
- WS-подключение одно на вкладку; `visibilitychange: visible` → `sync`.
- Сеть определяем по heartbeat WS + ошибкам запросов, не по `navigator.onLine`.

### 10.5 PWA

- `vite-plugin-pwa` в `injectManifest`, свой `sw.ts`: precache shell, `push` → `showNotification(title, { body, tag: chatId, data: { url: '/c/<id>' } })`, `notificationclick` → фокус/навигация.
- Manifest: `display: standalone`, иконки 192/512/maskable — локальные файлы.
- Разрешение на пуши — только по кнопке (iOS требует жест и установку на домашний экран).
- CSP (заголовок от сервера): `default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'`.

### 10.6 Админка (`pages/admin`, роль `admin`)

- Пользователи: список, поиск, отметить админа.
- Инвайты: создать (max uses / срок), список со ссылкой и копированием.
- Боты: создать (username/name/description) → **показать токен один раз** с копированием; сбросить токен; сменить владельца; переключить `listed`.
- Первый админ создаётся из env при первом старте (`ADMIN_USERNAME`, `ADMIN_PASSWORD`), иначе — первый зарегистрированный по env-инвайту `BOOTSTRAP_INVITE`.

### 10.7 Каталог ботов (`/browse`)

- Кнопка **Browse** в сайдбаре → страница со списком `listed` ботов: монограмма, имя, `@username`, описание, статус онлайн, кнопка «Добавить»/«Открыть».
- Поиск по имени и username. Добавление = `addBot(username)` → создаётся чат + `chat_started`.

---

## 11. Оценка сложности и сроков

Оценки для разработчика, знающего стек; «с агентами» — реальный срок, если фазы делает Sonnet/Kimi с ревью человеком.

| #   | Фаза                                                                         | Сложность | Часы       | С агентами |
| --- | ---------------------------------------------------------------------------- | --------- | ---------- | ---------- |
| 1   | Скаффолд (bun, biome, lefthook, steiger, FSD-каркас)                         | S         | 4          | 0.5 д      |
| 2   | `packages/protocol` (zod, контент, RPC, события)                             | M         | 10         | 1 д        |
| 3   | Сервер: БД, env, auth, bootstrap админа                                      | M         | 10         | 1 д        |
| 4   | GraphQL-каркас (Pothos, JSON-скаляр, codegen, контекст)                      | M         | 10         | 1.5 д      |
| 5   | Бот-WS: handshake, диспетчер, outbox, presence                               | M         | 10         | 1.5 д      |
| 6   | Чаты/сообщения/команды/callback/блокировка/очистка/KV + клиентский WS + sync | L         | 18         | 3 д        |
| 7   | `packages/chat` + echo-bot + интеграционные тесты                            | M         | 12         | 2 д        |
| 8   | Веб: FSD-каркас, auth, сайдбар, чат (текст, тики, оптимистика, sync)         | L         | 20         | 3 д        |
| 9   | Веб: markdown, клавиатуры, команды, typing, офлайн, block/clear, unread      | M         | 12         | 2 д        |
| 10  | Веб: Browse + админка                                                        | M         | 12         | 2 д        |
| 11  | Файлы и медиа (загрузка, отдача, Range, превью)                              | M         | 10         | 1.5 д      |
| 12  | Мастера (билдер, рантайм, валидатор) + wizard-bot + тесты                    | L         | 18         | 3 д        |
| 13  | PWA + Web Push                                                               | M         | 10         | 1.5 д      |
| 14  | Сборка в бинарь, Docker, README, полировка                                   | M         | 10         | 1.5 д      |
|     | **Итого**                                                                    |           | **~166 ч** | **~24 д**  |

Реалистичный календарь: **5–6 недель** с агентами при полном дне, **3 недели** в режиме «только критичное» (без мастера-групп, без админки-поиска, без Range у видео, пуши в конце).
Критический путь: 2 → 3 → 4 → 6 → 7 → 8 → 12.

---

## 12. Оценка нагрузки и точек отказа

### 12.1 Расчётные пределы (один Bun-процесс, SQLite WAL, скромный VPS 2 vCPU / 2 GB)

| Метрика                     | Реалистичный предел          | Узкое место                 |
| --------------------------- | ---------------------------- | --------------------------- |
| Одновременные WS (юзеры)    | 3–5 тыс.                     | память (~30–60 KB на сокет) |
| Одновременные WS (боты)     | 200–500                      | окно outbox, in-flight      |
| Сообщений/с: запись         | 200–400                      | единственный writer SQLite  |
| Сообщений/с: чтение GraphQL | 1–2 тыс.                     | CPU/парсинг zod             |
| Журнал `user_updates`       | ~1.5 GB на 10M записей/30 дн | нужен prune                 |
| Размер БД при 1M сообщений  | 1–2 GB                       | рост без архивации          |
| Файлы                       | диск минус запас 20%         | нет дедупликации            |

### 12.2 Точки отказа и что делать

| Точка                              | Симптом                                               | Митигация (в MVP или явно отложено)                                                   |
| ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Процесс сервера                    | всё падает                                            | systemd `Restart=always`; после рестарта журналы в БД восстанавливают состояние       |
| SQLite writer                      | `SQLITE_BUSY` при всплеске                            | `busy_timeout`, короткие транзакции, batch ack, один процесс; далее — очередь записи  |
| Память при многих WS               | OOM                                                   | `idleTimeout`, лимит соединений на юзера (8), мониторинг RSS                          |
| Reconnect-шторм ботов              | лавина досылок outbox                                 | backoff в SDK, окно in-flight 100, лимит отправок в секунду на бота                   |
| Рост `bot_events` при мёртвом боте | диск/БД пухнет                                        | prune > 7 дней, счётчик недоставленных в админке                                      |
| Рост `user_updates`                | запросы `sync` замедляются                            | prune 30 дней + `resetRequired`                                                       |
| Диск под файлы                     | запись падает                                         | лимит 50 MB на файл, проверка свободного места, 507 в ответе                          |
| Web Push в Китае/Иране             | пуши не приходят                                      | in-app через WS как основной канал; UnifiedPush/ntfy или нативная обёртка — после MVP |
| iOS PWA                            | нет пушей до установки; хранилище может быть вычищено | UI-подсказка «установить», сервер как источник истины                                 |
| Публичный Bot API                  | спам-боты создают чаты                                | rate limit на `addBot`, флаг `listed`, блокировка бота админом                        |
| Один узел = нет HA                 | плановые работы = простой                             | бэкап (см. §14), приёмлемо для self-hosted                                            |

---

## 13. Фазы (по порядку)

### Фаза 1 — Скаффолд

Дерево §4, корневой `package.json` (workspaces/скрипты), `tsconfig.base.json`, `biome.json` (2 пробела, single quotes, без `;`, lineWidth 100, `recommended`), `lefthook.yml`, `steiger.config.ts`, `.gitignore`, `.env.example`.
`apps/web`: Vite + React + Tailwind v4 + `bunx shadcn@latest init` с `aliases.ui=@/shared/ui`; добавить button, input, textarea, dialog, alert-dialog, dropdown-menu, command, avatar, badge, scroll-area, sheet, sonner, tooltip, skeleton. Пустые слайсы FSD с `index.ts`, маршрут-заглушка `/`.
✅ `bun install`, `bun run check`, `bun run dev` — открывается пустая страница, steiger не ругается.

### Фаза 2 — `packages/protocol`

Схемы §6 целиком (content, limits, errors, entities, bot-rpc, bot-events, client-updates). Тип-хелперы `Params<M>`, `Result<M>`, `BotEventListener`.
Тесты: валидный/невалидный content, url-кнопка с `javascript:` → ошибка, лимиты, парсинг фреймов.
✅ `bun test packages/protocol` зелёный.

### Фаза 3 — Сервер: БД, env, auth

`env.ts` (PORT, DATA*DIR, PUBLIC_URL, ADMIN_USERNAME/PASSWORD, BOOTSTRAP_INVITE, VAPID*\*), Drizzle-схема §5 + миграции + автоприменение, пароли (`Bun.password` argon2id), сессии (cookie `sid`, HttpOnly, SameSite=Lax, Secure при https, 90 дней), `auth/context.ts` (`requireUser`, `requireAdmin`).
Тесты: bootstrap админа один раз, регистрация по инвайту, исчерпание инвайта, логин, logout, истёкшая сессия.
✅ тесты зелёные.

### Фаза 4 — GraphQL-каркас

Pothos builder, `JSON`-скаляр, `context.ts` (user, db, hub, now), `/graphql` в роутере, `schema:print`, codegen, запрос `session`. Проверка: playground отдаёт `session` с cookie.
✅ `bun run codegen` даёт `generated/`, `bun run check` зелёный.

### Фаза 5 — Бот-WS + outbox

`ws/frames.ts` (парсинг через protocol), `bot-ws.ts` (auth в upgrade, hello, диспетчер `Record<method, handler>`, ошибки), `domain/events.ts` (`enqueue`, `flush`, `ack`), методы `getMe, setCommands, setRoles, setChatRoles, kvGet, kvSet, kvClear`, presence.
Тесты: плохой токен → 4401; `kvSet` сверх квоты → `KV_QUOTA`; события досылаются после реконнекта; ack удаляет запись; `setCommands` перезаписывает набор.
✅ тесты зелёные.

### Фаза 6 — Чаты, сообщения, клиентский WS, sync

Домен §8 + GraphQL queries/mutations §7 (кроме admin и файлов) + `ws/hub.ts` + `/api/ws` + `user_updates` + `sync` + команды/роли/callback/блокировка/очистка + rate limit + prune-джоба.
Интеграционный тест на реальном `Bun.serve` (порт 0): юзер `sendMessage` → бот получает `message` → `sendMessage` + `ack` → юзер получает `message.status=processed` и `message.new`; `/name` → событие `command`; команда без роли → system-сообщение и боту ничего не пришло.
✅ тест зелёный.

### Фаза 7 — `packages/chat` + echo-bot

§9 без мастеров. `examples/echo-bot`: `/start`, `/help`, эхо, кнопки с callback, счётчик в storage, `chat_started`.
Интеграционный тест фазы 6 переписать на SDK.
✅ echo-бот крутится против dev-сервера; `bun test packages/chat` зелёный.

### Фаза 8 — Веб: каркас и текстовый чат

FSD-слои/слайсы §4.2, GraphQL-клиент (`graphql-request` + generated), ws-транспорт, `session` bootstrap, Login/Register (инвайт из URL), Sidebar/ChatList, ChatView, MessageList, BotMessage (markdown), UserMessage + StatusTicks, Composer, оптимистичная отправка, sync, mobile/desktop раскладка.
✅ С echo-ботом: спиннер → ✓ → ✓✓; перезагрузка не теряет историю; вторая вкладка видит сообщения; бот офлайн → ✓, после запуска → ✓✓.

### Фаза 9 — Веб: интерактив и управление чатом

Клавиатуры (callback/url/command + toast), CommandMenu, typing, офлайн-плашка, clear/block/unblock, unread + `markRead`, system-сообщения, пустые состояния, ошибки GraphQL → toast.
✅ ручная проверка всех пунктов §10.2–10.4.

### Фаза 10 — Browse + админка

`/browse` (список, поиск, добавить), `/admin` (юзеры, инвайты, боты/токены), guard по `isAdmin`.
✅ можно создать бота в админке, получить токен, запустить `examples/echo-bot`, найти бота в Browse и добавить.

### Фаза 11 — Файлы и медиа

`http/files.ts` + оба upload-эндпоинта + отдача с проверкой доступа, Range, immutable cache; whitelist MIME (image: png/jpeg/webp/gif без SVG; video: mp4 H.264/AAC, webm; audio: mp3/ogg/m4a; остальное — `file`); `bot.uploadFile()`; UI: скрепка, превью, Media-компоненты.
✅ бот шлёт картинку и видео, юзер шлёт картинку, чужой файл → 403, видео перематывается.

### Фаза 12 — Мастера

`flow/{builder,runtime,validate}.ts` §9.1 + `examples/wizard-bot` (3 шага + текстовый ввод + группа + назад/отмена).
Тесты с mock-API: переходы, `input` с ошибкой валидации, устаревшая кнопка, команда во время потока, `chat_cleared` → сброс, `validate()` ловит битый `.to()`.
✅ тесты зелёные, сценарий проходит в UI.

### Фаза 13 — PWA и пуши

`vite-plugin-pwa` (`injectManifest`) + `sw.ts` + manifest + иконки; сервер: `web-push`, `subscribe/unsubscribe`, отправка при `message.new` без фокуса; UI-кнопка разрешения.
✅ установка на Android Chrome и iOS Safari 16.4+; пуш при свёрнутом приложении; клик открывает нужный чат.

### Фаза 14 — Сборка, деплой, доки

`bun build --compile` (статика веба копируется рядом с бинарём в `dist/public`), `Dockerfile` (oven/bun, multi-stage), `docker-compose.yml` + Caddy с авто-TLS, `README.md` (быстрый старт, env, бэкап: `sqlite3 .backup` + `DATA_DIR/files`, обновление, cron-prune).
✅ `docker compose up` → рабочий инстанс по https, echo-бот подключается.

---

## 14. Стандарты кода, качество, эксплуатация

**Автокомментируемый код**

- Имена — полные и предметные (`enqueueBotEvent`, а не `send`; `visibleMessages`, а не `list`). Никаких `data`, `res`, `tmp` вне 3-строчных блоков.
- Комментарий объясняет **почему**, а не что: `// ack до записи в БД: ретрай бота не должен дублировать событие`.
- JSDoc — только на публичных API `packages/*` и на нетривиальных контрактах (`@throws` коды ошибок).
- Никакого мёртвого кода, `TODO` без имени фазы, закомментированных блоков.

**Современный TS**

- `typescript 7` вместо старых версий.
- `strict` + `noUncheckedIndexedAccess`; без `any` и `as` (кроме `as const`/тестов).
- `const`-объекты вместо `enum`; дискриминированные юнионы вместо булевых флагов; `satisfies` для конфигов.
- zod-парсинг на всех границах (WS-фреймы, GraphQL-аргументы, env, файлы); внутри — уже типы.
- `const fn = () => {}` вместо `function fn() {}`.
- `Readonly<>` в доменных типах; нет мутаций входных аргументов.
- Bun-нативные API: `Bun.serve`, `Bun.file`, `Bun.password`, `bun:sqlite`, `Bun.randomUUIDv7`, `Bun.sleep`.
- Оптимизация по факту: индексы под реальные запросы, `EXPLAIN QUERY PLAN` для `messages`/`sync`, без преждевременных кешей.
- Фронт: серверное состояние в FSD-`entities/*/api`, локальное UI-состояние — рядом с компонентом; `zustand` для сквозного чата; никаких `useEffect`-цепочек для синхронизации.

**Чек-лист перед сдачей**

- [ ] Ни одного запроса к внешним доменам (DevTools → Network).
- [ ] Markdown не исполняет HTML/JS; url-кнопки только http(s); SVG не принимается.
- [ ] Чужие файлы и чужие чаты → 403/`FORBIDDEN`.
- [ ] Рестарт сервера при офлайн-клиентах и ботах ничего не теряет.
- [ ] Повтор `sendMessage` с тем же `clientId` не создаёт дубль.
- [ ] `bun run check` зелёный, `bun test` покрывает домен (чаты, роли, kv-квота, outbox, sync).
- [ ] Бэкап/восстановление проверены вручную.

---

## 15. Что взято из `research/` и что отброшено

Взято: отдельный `sender: 'system'`; монотонность статусов; идемпотентность по `clientId`; журнал изменений + `resetRequired`; команда как отдельное событие с форматом `/[a-z][a-z0-9_]*` и скрытием прав; wizard с версией экрана и TTL; `at-least-once` + ack + `maxInflight`; KV двух областей с лимитами; markdown без raw HTML, SVG запрещён; MP4 H.264 как основной профиль; запрет серверу скачивать внешние URL; push с `tag`/deep link; поведение iOS (16.4+, только установленная PWA).

Отброшено как переусложнённое: микросервисы/Rust/Postgres/Redis Streams; отдельный HTTPS-контур мутаций; по-устройственные `delivered`/`viewed`; `revision` для ролей и команд; chunked-snapshot KV; CRDT; пересылка сообщений; ротация креденшелов и dead-letter с ручным replay.

---

## 16. Вне MVP

Групповые чаты; редактирование/удаление сообщений пользователем; каналы и рассылки; опросы как тип контента; inline-режим; платежи; E2E; S3/Postgres; горизонтальное масштабирование; federation; passkeys; i18n (строки в одном `shared/config/strings.ts`, язык один); групповые мастера с ветвлением по нескольким экранам-веткам; аналитика.
