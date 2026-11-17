CREATE TABLE `bot_commands` (
	`bot_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`roles` text,
	`sort` integer NOT NULL,
	PRIMARY KEY(`bot_id`, `name`),
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bot_events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bot_id` text NOT NULL,
	`chat_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bot_events_bot_seq_idx` ON `bot_events` (`bot_id`,`seq`);--> statement-breakpoint
CREATE TABLE `bots` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`owner_id` text,
	`token_hash` text NOT NULL,
	`listed` integer DEFAULT true NOT NULL,
	`access` text DEFAULT 'public' NOT NULL,
	`roles` text DEFAULT '[]' NOT NULL,
	`default_roles` text DEFAULT '[]' NOT NULL,
	`commands_rev` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bots_username_unique` ON `bots` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `bots_token_hash_unique` ON `bots` (`token_hash`);--> statement-breakpoint
CREATE TABLE `chat_kv` (
	`chat_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`size` integer NOT NULL,
	PRIMARY KEY(`chat_id`, `key`),
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bot_id` text NOT NULL,
	`roles` text DEFAULT '[]' NOT NULL,
	`blocked_at` integer,
	`last_message_at` integer,
	`last_read_seq` integer DEFAULT 0 NOT NULL,
	`next_seq` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chats_user_bot_unique` ON `chats` (`user_id`,`bot_id`);--> statement-breakpoint
CREATE INDEX `chats_user_idx` ON `chats` (`user_id`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`chat_id` text,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`name` text NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `files_chat_idx` ON `files` (`chat_id`);--> statement-breakpoint
CREATE TABLE `invites` (
	`code` text PRIMARY KEY NOT NULL,
	`created_by` text,
	`max_uses` integer,
	`uses` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`seq` integer NOT NULL,
	`sender` text NOT NULL,
	`content` text NOT NULL,
	`status` text NOT NULL,
	`client_id` text,
	`reply_to` text,
	`created_at` integer NOT NULL,
	`edited_at` integer,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_chat_seq_unique` ON `messages` (`chat_id`,`seq`);--> statement-breakpoint
CREATE UNIQUE INDEX `messages_chat_client_unique` ON `messages` (`chat_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `messages_chat_seq_idx` ON `messages` (`chat_id`,`seq`);--> statement-breakpoint
CREATE TABLE `push_subs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subs_endpoint_unique` ON `push_subs` (`endpoint`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_updates` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_updates_user_seq_idx` ON `user_updates` (`user_id`,`seq`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);