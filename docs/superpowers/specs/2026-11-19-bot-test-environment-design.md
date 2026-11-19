# Тестовое окружение для разработчиков ботов

Дата: 2026-11-19
Статус: уточнено по результатам сверки с кодом

## Цель

Дать разработчикам ботов повторяемое окружение с настоящими Appercot server, SQLite, GraphQL, WebSocket, файлами и SPA. Один клиент `@appercot/test` должен работать в `bun:test`, Vitest и Jest. Headed/headless-браузер остаётся ответственностью внешнего E2E-runner; пакет не управляет браузером.

Дополнительно:

- основные контролы SPA получают стабильные `data-test-id`;
- статические и bot-defined шорткаты работают независимо от раскладки;
- JSON описывает как настройки запуска, так и исходных пользователей, ботов, чаты и сообщения.

## Нефункциональные требования

- Не имитировать Telegram-подобное окружение mocks: тесты идут через production code paths.
- Не импортировать runner-specific API в `@appercot/test`.
- Не регистрировать test control API в обычном production-сервере.
- Не очищать целиком внешний S3-бакет или произвольный каталог.
- Сохранить существующие инварианты доступа, идемпотентности и bot outbox.

## Архитектура

Новый workspace-пакет `@appercot/test` содержит:

1. CLI `appercot-test-server`, запускающий настоящий сервер с test control API.
2. `AppercotTestClient` — runner-agnostic fixture-клиент на стандартных `fetch` и `AbortSignal`. Импорт клиента под Bun и Node не тянет Bun API или серверный entry point. Боты подключаются по WebSocket через `@appercot/chat`, SPA использует свой штатный транспорт.
3. Общие типы конфигурации, fixture-манифеста и ответов control API.
4. Адаптеры не требуются: примеры используют штатные `beforeAll`, `afterAll`, `beforeEach` каждого runner.

CLI работает под Bun и запускается до тестов. После успешного старта он печатает в stdout одну JSON-строку вида `{"endpoint":"http://127.0.0.1:3100"}`. Диагностика идёт в stderr. Запускающий скрипт читает строку и передаёт endpoint и токен тестовому процессу через `BOT_APPERCOT_TEST_ENDPOINT` и `BOT_APPERCOT_TEST_TOKEN`. При фиксированном порте эти переменные можно задать заранее и дождаться `ready()`. Клиент принимает обязательные `endpoint` и `token`. Браузерный runner использует тот же origin. `--headed` или headless-режим не меняют серверную библиотеку.

Control API размещается под `/_appercot/test/*` и подключается только из тестового CLI. В обычном сервере этот префикс возвращает `404` до SPA fallback, в том числе при `NODE_ENV=test`. Все маршруты control API, включая `ready()`, требуют bearer-токен и отвечают с `Cache-Control: no-store`. Токены сравниваются в постоянное время по хэшам одинаковой длины. `ready()` проверяет авторизацию и завершение seed. Тестовый hostname по умолчанию — `127.0.0.1`. Для удалённого запуска нужны явный HTTPS `publicUrl`, TLS на прокси и доступ к HTTP-порту Bun только со стороны прокси. Браузеру передаётся origin, control token остаётся в тестовом процессе.

Reset и delete сериализуются. До изменения БД сервер приостанавливает приём новых операций с состоянием и WebSocket upgrades, отзывает затронутые сокеты и дожидается уже начатых записей либо отменяет их. Барьер охватывает GraphQL, bot RPC и ACK, uploads, генерацию превью, callbacks и prune. Долгие ожидания callbacks отменяются до ожидания активных операций. Новые HTTP-операции с состоянием во время сброса получают `503 TEST_RESET_IN_PROGRESS`; старые запросы и кадры не выполняются после снятия барьера. Закрытие bot-сокета во время сброса не публикует старые presence-обновления в восстановленное состояние.

Полный сброс отзывает все сессии и сбрасывает серверное состояние в памяти, включая callbacks и rate limit. Для `flushUser` и `deleteUser` отзываются сессии этого пользователя. Для `flushChat` и `deleteChat` сессии сохраняются, а журнал затронутого пользователя должен обеспечить полный refresh через штатную синхронизацию после переподключения, даже если прежний checkpoint относился к соседнему чату. Запоздалый ответ старой загрузки истории не должен перезаписать результат refresh. Глобальные последовательности outbox и пользовательских updates сохраняют монотонность. Повторное использование ID baseline и сброс счётчика сообщений внутри чата допустимы, повторное использование номеров outbox и updates недопустимо.

Между тестами runner завершает работу предыдущего экземпляра бота и создаёт чистый browser context. Переподключение работающего SDK с исходным токеном поддерживается для сохранившихся ботов. Переподключение транспорта само по себе не останавливает уже выполняющийся обработчик в процессе бота.

## Публичный API клиента

```ts
const appercot = new AppercotTestClient({
  endpoint: process.env.BOT_APPERCOT_TEST_ENDPOINT!,
  token: process.env.BOT_APPERCOT_TEST_TOKEN!,
})

await appercot.ready()
const fixtures = await appercot.fixtures()

const alice = await appercot.createUser({
  username: 'alice_e2e',
  displayName: 'Alice E2E',
  password: 'test-password',
})
const bot = await appercot.createBot({
  username: 'echo_e2e_bot',
  name: 'Echo E2E',
  ownerId: alice.id,
})
const chat = await appercot.createChat({ userId: alice.id, botId: bot.id })
await appercot.sendMessage({
  chatId: chat.id,
  sender: 'user',
  clientId: 'hello-1',
  content: { text: 'hello' },
})

await appercot.flushChat(chat.id)
await appercot.deleteChat(chat.id)
await appercot.flushUser(alice.id)
await appercot.deleteUser(alice.id)
await appercot.flushState()
```

Методы создания возвращают типизированный fixture-объект и исходные credentials, где применимо. `fixtures()` возвращает манифест исходного baseline со стабильными ID и credentials, включая токены для `createBot` SDK. Манифест не меняется от runtime-операций. `sendMessage` принимает `sender: 'user' | 'bot'`, выводит actor из чата и использует штатный путь отправки соответствующей стороны. Для пользовательской отправки вызывающий задаёт `clientId` и повторно использует его при retry. Валидация контента, права стороны чата, доставка updates и outbox сохраняются. Очистка и удаление возвращают `void`. Ошибки HTTP и валидации преобразуются в `AppercotTestClientError` с `status`, `code`, сообщением и необязательным `path`. Сетевые ошибки и таймауты имеют собственные коды без HTTP-статуса. Таймаут настраивается в конструкторе.

### Семантика очистки

- `flushState()` удаляет всё runtime-состояние окружения и транзакционно восстанавливает конфигурационный baseline с теми же ID, credentials, ботами, чатами и сообщениями. Удаляются только файлы и S3-объекты, зарегистрированные этим окружением.
- `flushUser(id)` сохраняет саму учётную запись с её текущими credentials и настройками профиля. Удаляются sessions, push subscriptions, пользовательские чаты и связанные messages/KV/outbox/updates/files, включая незакреплённые загрузки пользователя. Созданные пользователем боты остаются, поскольку являются отдельными fixture-сущностями. Очистка сама не пересоздаёт конфигурационные чаты. Их исходные ID и история восстанавливаются при `flushState()`.
- `deleteUser(id)` удаляет учётную запись по обычным доменным foreign-key правилам и всё зависимое пользовательское состояние. Принадлежащие пользователю боты не удаляются молча; их owner становится пустым по существующему правилу БД.
- `flushChat(id)` очищает runtime messages/KV/outbox/updates/files. Для чата из конфигурации затем восстанавливает исходные membership/roles/settings/messages и соответствующие baseline read/sequence state. Если текущие роли бота или правила членства не позволяют восстановить такой baseline, возвращает `409 TEST_FIXTURE_CONFLICT` без изменения чата. Для runtime-created чата сохраняет текущие membership/settings и сбрасывает read/sequence state до пустого чата.
- `deleteChat(id)` физически удаляет fixture-чат, членство и связанные сообщения, KV, outbox, updates и файлы. Соседние чаты сохраняются. Штатная GraphQL-операция `deleteChat` по-прежнему скрывает чат с сохранением членства.

Для очистки отсоединённых файлов сохраняется принадлежность исходному чату. Удаление строк и постановка физических объектов на удаление фиксируются одной SQLite-транзакцией. Физические удаления выполняются после commit по этому списку, включая превью. При ошибке I/O контрольная операция сообщает о неполной очистке, а сохранённый список позволяет повторить удаление при следующем вызове очистки или старте CLI. Транзакция seed не включает файловую систему или S3.

Повторный flush существующего объекта не дублирует baseline-сущности и даёт то же итоговое состояние. Удаление или очистка отсутствующего ID возвращает `404 TEST_FIXTURE_NOT_FOUND`, а не молча создаёт объект.

## JSON-конфигурация

`--config` тестового CLI имеет приоритет над `APPERCOT_CONFIG`. Обычный сервер сохраняет запуск через env без файла и может загрузить параметры запуска из `APPERCOT_CONFIG`. Секции `users`, `bots`, `chats` и `test` разрешены только в тестовом CLI. JSON строго валидируется Zod. Параметры запуска разрешаются в порядке «встроенные defaults → JSON → существующие переменные окружения». Итоговые значения используют действующие проверки `AppEnv`. Credentials в fixture-секциях и `test` задаются явно или через placeholders. Наличие `BOT_APPERCOT_TEST_TOKEN` само по себе не включает control API.

Пример:

```json
{
  "server": {
    "hostname": "127.0.0.1",
    "port": 3100,
    "dataDir": ".test-data/bots"
  },
  "registration": { "enabled": true, "userInvites": true },
  "admin": {
    "username": "admin",
    "password": "${ADMIN_PASSWORD}"
  },
  "users": [
    {
      "id": "user-alice",
      "username": "alice",
      "displayName": "Alice",
      "password": "${ALICE_PASSWORD}"
    }
  ],
  "bots": [
    {
      "id": "bot-echo",
      "username": "echo_bot",
      "name": "Echo",
      "owner": "alice",
      "token": "${ECHO_BOT_TOKEN}",
      "tags": ["testing", "echo"],
      "listed": true,
      "access": "public",
      "defaultRoles": [],
      "commands": [{ "name": "start", "description": "Start", "shortcut": "Alt+S" }]
    }
  ],
  "chats": [
    {
      "id": "chat-alice-echo",
      "user": "alice",
      "bot": "echo_bot",
      "messages": [{ "sender": "bot", "content": { "text": "Ready" } }]
    }
  ],
  "test": { "token": "${BOT_APPERCOT_TEST_TOKEN}" }
}
```

JSON покрывает все существующие `AppEnv`: server/data/public URL, admin/bootstrap invite, registration/user invites, media limits/trusted hosts/FFmpeg, S3, VAPID и NODE_ENV. `test.token` не имеет production default и обязателен для тестового CLI.

Для работы с SPA CLI использует собранный `apps/web/dist` в workspace или `public` в комплекте с сервером. `server.publicDir` позволяет указать другой каталог собранной SPA. CLI завершает запуск с диагностикой, если отсутствует `index.html`.

По умолчанию тестовый CLI создаёт отдельный временный `dataDir`. Явно указанный каталог, в том числе через `DATA_DIR`, должен быть пустым или иметь маркер тестового окружения. CLI эксклюзивно занимает его до shutdown. Обычный сервер отказывается открывать каталог с тестовым маркером. Для S3 каждому окружению выделяется собственный префикс, сохранённый в этом каталоге. При очистке удаляются только зарегистрированные ключи окружения, без очистки всего префикса или бакета.

### Placeholders

- `$NAME` и `${NAME}` требуют присутствия переменной.
- `${NAME:-default}` использует default только при отсутствии или пустом значении.
- Подстановка рекурсивно выполняется только в строках JSON; ключи объектов не изменяются.
- Обратная косая черта перед `$` экранирует подстановку. В JSON это записывается как `"\\$NAME"`.
- Неизвестная обязательная переменная выдаёт ошибку с именем переменной и точным JSON path.
- Сначала выполняется expansion, затем строгая schema validation. Секреты не выводятся в ошибках и логах.

CLI подставляет значения из окружения, которое уже загрузил Bun. При отдельном запуске CLI `.env.test` выбирается по `NODE_ENV=test`, заданному до старта Bun, либо через `--env-file`. Запуск `bun test` в другом процессе на выбор env-файла CLI не влияет. [Загрузка переменных окружения в Bun](https://bun.com/docs/runtime/environment-variables)

### Seed

Миграции применяются до seed, порт открывается только после успешной транзакции. ID пользователей, ботов, чатов и сообщений можно указать явно. Отсутствующие ID выделяются один раз при запуске и возвращаются в fixture-манифесте. ID bootstrap-администратора также сохраняется при сбросах. Ссылки `owner`, `user`, `bot` используют username и проверяются после загрузки всех сущностей. Проверяются действующие ограничения имён, ролей, команд и уникальность пары пользователь–бот. Учётная запись из `admin` не может дублироваться в `users`.

В SQLite пароли и токены ботов сохраняются в штатном хэшированном виде. Токен бота из JSON задаётся в штатном формате `<botId>:<secret>`. Если `id` указан, префикс токена должен совпадать с ним. Если `id` отсутствует, он берётся из полного токена или генерируется вместе с токеном, когда оба поля отсутствуют. Исходные credentials baseline выдаются только через защищённый манифест. Дубликаты ID/username, неизвестные поля, неверные ссылки и типы останавливают запуск.

Сообщения baseline валидируются штатными схемами соответствующего отправителя. Они представляют существующую историю в порядке массива, без генерации outbox, realtime-обновлений или push. Seed поддерживает текст и бот-клавиатуры. Вложения для runtime-сценариев загружаются штатным API, чтобы файлы получили корректного владельца и привязку к чату. В примере `ECHO_BOT_TOKEN` задаётся в виде `bot-echo:<secret>`.

Относительные файловые пути в JSON разрешаются от каталога конфигурации, а пути из env — от рабочего каталога. Имя команды FFmpeg без компонентов пути разрешается через `PATH`. Если `publicUrl` не задан, CLI использует фактический origin listener, в том числе при `port: 0`, и передаёт его в серверную конфигурацию до обработки запросов. Явный `publicUrl` задаёт внешний origin для CLI, тестов и SPA, а `hostname` и `port` задают адрес listener.

## Стабильные `data-test-id`

В `shared/lib` создаётся типизированный реестр и helper для атрибута `data-test-id`. Значения не зависят от перевода, CSS или DOM-вложенности.

Статические примеры:

- `auth.login.username`, `auth.login.password`, `auth.login.submit`;
- `navigation.chats`, `navigation.catalog`, `navigation.settings`;
- `chats.search`, `catalog.search`, `chat.composer.input`, `chat.composer.send`;
- `command-palette.input`;
- `settings.bot.tags`, `settings.save`, `dialog.confirm`, `dialog.cancel`.

Динамические значения строятся функциями реестра:

- `chats.item.<chat-id>`;
- `catalog.bot.<bot-id>`;
- `message.item.<message-id>`;
- `message.button.<message-id>:<row-index>:<column-index>`;
- `command-palette.command.<command-name>`;
- `command-palette.button.<message-id>:<row-index>:<column-index>`.

Используются серверные ID. Индексы строки и колонки начинаются с нуля и следуют существующему ключу кнопки конкретного сообщения, поскольку protocol button не имеет собственного ID. ID повторяемых действий, таких как `dialog.confirm` и `settings.save`, разрешаются внутри активного диалога или формы. Атрибут ставится на интерактивный элемент, который браузерный тест нажимает или заполняет. Основные контролы покрываются во всех страницах. Декоративные элементы и внутренние узлы shadcn не требуют атрибутов.

## Шорткаты и раскладки

Публичное представление остаётся массивом `ShortcutCombination`, например `[MetaKey.Control, '/']`. Для отображения и ARIA используется логическая клавиша `/`.

`matchesShortcut` сопоставляет поддерживаемые клавиши по `KeyboardEvent.code`:

- `/` — `Slash`, `NumpadDivide`;
- буквы — `KeyA`…`KeyZ`;
- цифры — `Digit0`…`Digit9` и `Numpad0`…`Numpad9`, причём цифровой блок соответствует цифрам только при включённом Num Lock, чтобы не перехватывать навигацию.

Для поддерживаемой физической клавиши `code` имеет приоритет над `key`, чтобы два действия не срабатывали на одно нажатие в раскладках с переставленными буквами. При отсутствии распознанного `code` остаётся сравнение `key` без учёта регистра. Модификаторы, `repeat`, composition и AltGraph сохраняют текущие проверки. Русский `Ctrl+/` с `key: '.'` и `code: 'Slash'` открывает палитру. Тот же matcher используется для статических, сгенерированных и явно заданных ботом шорткатов. Синтаксис `ShortcutSchema` для команд и кнопок сохраняется, включая ограничение основной клавиши до `[A-Z0-9]`. Приоритет зарезервированных сочетаний и правила доступности действий внутри и вне палитры сохраняются.

## Обработка ошибок и диагностика

- CLI печатает endpoint только после migrations, seed и успешного listen.
- Ошибка конфигурации содержит JSON path, но не secret value.
- HTTP control errors имеют машиночитаемый `code` и корректный status.
- Fixture client использует timeout и отменяет запрос через `AbortSignal`.
- При shutdown CLI прекращает приём работы, закрывает WebSocket, останавливает prune job, дожидается завершения либо отмены фоновых операций, закрывает SQLite и освобождает каталог. Артефакты теста остаются для диагностики.
- Параллельные независимые suites должны использовать отдельные endpoint/dataDir. Один endpoint не обещает изоляцию параллельных `flushState`.

## Проверки

### Unit и integration

- Layout aliases: русский и английский `key`, конфликт `code` и `key` в переставленной раскладке, fallback без `code`, NumPad и Num Lock, модификаторы, composition, палитра и bot-defined сочетания.
- Config expansion: все формы, escaping, missing env, defaults, env overrides, секреты в ошибках.
- Schema: неизвестные поля, дубликаты, ссылки, media/S3/push validation.
- Seed: стабильные ID и credentials, штатный вход пользователя и бота, одинаковая история после `flushState` и отсутствие seed-событий в outbox.
- Каждый reset/delete: messages, KV, outbox, updates, sessions, files и изоляция соседних сущностей. Отдельно проверить гонку с RPC/ACK, upload или превью, переподключение SPA с checkpoint соседнего чата и повтор удаления после ошибки S3.
- Control API: без токена или с неверным токеном — `401`. Обычный сервер с собранной SPA и `NODE_ENV=test` возвращает `404`. CLI не открывает занятый или непустой немаркированный dataDir.
- SDK flow: configured bot token, command, callback, reconnect после reset.
- UI: основные flows используют только `data-test-id`, без localized text и CSS selectors.

### Runner compatibility

Один набор сценариев выполняется в Bun, Vitest и Jest против отдельно запущенного CLI. Тонкие entry points тестов импортируют хуки и регистрацию сценариев из соответствующего runner, при этом сценарии и сам `@appercot/test` общие. Отдельный Playwright-пример запускается по умолчанию headless и командой `playwright test --headed` в headed. Production build и существующий `bun run check` должны оставаться зелёными.

## Документация

Обновить README и `.agents/sdk.md`: запуск CLI, env, конфиг, lifecycle Bun/Vitest/Jest, Playwright headless/headed, reset semantics, selector registry и правило сначала искать существующий fixture/selector. Обновить `.agents/web.md` и AGENTS.md для `data-test-id` и layout-independent shortcuts. Добавить безопасный example config без реальных секретов.
