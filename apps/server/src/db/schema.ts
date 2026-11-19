import type { BotEvent, ClientUpdate, MessageContent } from '@appercot/protocol'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  bio: text('bio').notNull().default(''),
  guestUntil: integer('guest_until'),
  totpSecret: text('totp_secret'),
  totpCounter: integer('totp_counter'),
  totpRecoveryHash: text('totp_recovery_hash'),
  totpPending: text('totp_pending'),
  totpPendingUntil: integer('totp_pending_until'),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  role: text('role', { enum: ['user', 'admin', 'owner'] })
    .notNull()
    .default('user'),
  createdAt: integer('created_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
  userAgent: text('user_agent'),
})

export const invites = sqliteTable('invites', {
  code: text('code').primaryKey(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  maxUses: integer('max_uses'),
  uses: integer('uses').notNull().default(0),
  expiresAt: integer('expires_at'),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),
  revokedAt: integer('revoked_at'),
  createdAt: integer('created_at').notNull(),
})

export const bots = sqliteTable('bots', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  avatar: text('avatar'),
  welcome: text('welcome').notNull().default(''),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  tokenHash: text('token_hash').notNull().unique(),
  listed: integer('listed', { mode: 'boolean' }).notNull().default(true),
  guestAccess: integer('guest_access', { mode: 'boolean' }).notNull().default(false),
  access: text('access', { enum: ['public', 'by_link'] })
    .notNull()
    .default('public'),
  inviteHash: text('invite_hash'),
  inviteExpiresAt: integer('invite_expires_at'),
  inviteRoles: text('invite_roles', { mode: 'json' }).$type<string[]>().notNull().default([]),
  roles: text('roles', { mode: 'json' }).$type<string[]>().notNull().default([]),
  roleLabels: text('role_labels', { mode: 'json' })
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  defaultRoles: text('default_roles', { mode: 'json' }).$type<string[]>().notNull().default([]),
  commandsRev: integer('commands_rev').notNull().default(0),
  createdAt: integer('created_at').notNull(),
})

export const botInvites = sqliteTable(
  'bot_invites',
  {
    id: text('id').primaryKey(),
    botId: text('bot_id')
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    code: text('code'),
    tokenHash: text('token_hash').notNull().unique(),
    roles: text('roles', { mode: 'json' }).$type<string[]>().notNull(),
    maxUses: integer('max_uses'),
    uses: integer('uses').notNull().default(0),
    expiresAt: integer('expires_at'),
    revokedAt: integer('revoked_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('bot_invites_bot_idx').on(table.botId)],
)

export const botAvatars = sqliteTable('bot_avatars', {
  botId: text('bot_id')
    .primaryKey()
    .references(() => bots.id, { onDelete: 'cascade' }),
  image: text('image').notNull(),
})

export const botInviteUses = sqliteTable(
  'bot_invite_uses',
  {
    inviteId: text('invite_id')
      .notNull()
      .references(() => botInvites.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.inviteId, table.userId] })],
)

export const botCommands = sqliteTable(
  'bot_commands',
  {
    botId: text('bot_id')
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    roles: text('roles', { mode: 'json' }).$type<string[] | null>(),
    sort: integer('sort').notNull(),
    shortcut: text('shortcut'),
  },
  (table) => [primaryKey({ columns: [table.botId, table.name] })],
)

export const chats = sqliteTable(
  'chats',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    botId: text('bot_id')
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    roles: text('roles', { mode: 'json' }).$type<string[]>().notNull().default([]),
    guest: integer('guest', { mode: 'boolean' }).notNull().default(false),
    blockedAt: integer('blocked_at'),
    revokedAt: integer('revoked_at'),
    hiddenAt: integer('hidden_at'),
    notifications: text('notifications', { enum: ['all', 'silent', 'off'] })
      .notNull()
      .default('all'),
    lastMessageAt: integer('last_message_at'),
    lastReadSeq: integer('last_read_seq').notNull().default(0),
    nextSeq: integer('next_seq').notNull().default(1),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('chats_user_bot_unique').on(table.userId, table.botId),
    index('chats_user_idx').on(table.userId),
  ],
)

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    sender: text('sender', { enum: ['user', 'bot', 'system'] }).notNull(),
    content: text('content', { mode: 'json' }).$type<MessageContent>().notNull(),
    status: text('status', { enum: ['accepted', 'processed'] }).notNull(),
    clientId: text('client_id'),
    replyTo: text('reply_to'),
    createdAt: integer('created_at').notNull(),
    editedAt: integer('edited_at'),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    uniqueIndex('messages_chat_seq_unique').on(table.chatId, table.seq),
    uniqueIndex('messages_chat_client_unique').on(table.chatId, table.clientId),
    index('messages_chat_seq_idx').on(table.chatId, table.seq),
  ],
)

export const files = sqliteTable(
  'files',
  {
    id: text('id').primaryKey(),
    ownerType: text('owner_type', { enum: ['user', 'bot'] }).notNull(),
    ownerId: text('owner_id').notNull(),
    chatId: text('chat_id').references(() => chats.id, { onDelete: 'set null' }),
    originChatId: text('origin_chat_id'),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    name: text('name').notNull(),
    width: integer('width'),
    height: integer('height'),
    storage: text('storage', { enum: ['local', 's3'] })
      .notNull()
      .default('local'),
    previewState: text('preview_state', { enum: ['pending', 'ready', 'unavailable'] }),
    detachedAt: integer('detached_at'),
    attached: integer('attached', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('files_chat_idx').on(table.chatId),
    index('files_preview_idx').on(table.previewState, table.id),
  ],
)

export const chatKv = sqliteTable(
  'chat_kv',
  {
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    size: integer('size').notNull(),
  },
  (table) => [primaryKey({ columns: [table.chatId, table.key] })],
)

export const botEvents = sqliteTable(
  'bot_events',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    botId: text('bot_id')
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    payload: text('payload', { mode: 'json' }).$type<BotEvent>().notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('bot_events_bot_seq_idx').on(table.botId, table.seq)],
)

export const userUpdates = sqliteTable(
  'user_updates',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    payload: text('payload', { mode: 'json' }).$type<ClientUpdate>().notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('user_updates_user_seq_idx').on(table.userId, table.seq)],
)

export const pushSubs = sqliteTable('push_subs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const testFileDeletions = sqliteTable('test_file_deletions', {
  fileId: text('file_id').primaryKey(),
  storage: text('storage', { enum: ['local', 's3'] }).notNull(),
  createdAt: integer('created_at').notNull(),
})

export const testSyncResets = sqliteTable('test_sync_resets', {
  userId: text('user_id').primaryKey(),
  seq: integer('seq').notNull(),
})
