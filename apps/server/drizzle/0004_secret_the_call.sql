CREATE TABLE `bot_invite_uses` (
	`invite_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`invite_id`, `user_id`),
	FOREIGN KEY (`invite_id`) REFERENCES `bot_invites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bot_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`code` text,
	`token_hash` text NOT NULL,
	`roles` text NOT NULL,
	`max_uses` integer,
	`uses` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bot_invites_token_hash_unique` ON `bot_invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `bot_invites_bot_idx` ON `bot_invites` (`bot_id`);--> statement-breakpoint
ALTER TABLE `bots` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `bots` ADD `welcome` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `chats` ADD `notifications` text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `invites` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `invites` ADD `revoked_at` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_counter` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_recovery_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_pending` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_pending_until` integer;--> statement-breakpoint
INSERT INTO `bot_invites` (`id`, `bot_id`, `token_hash`, `roles`, `expires_at`, `created_at`)
SELECT 'legacy-' || `id`, `id`, `invite_hash`, `invite_roles`, `invite_expires_at`, `created_at`
FROM `bots` WHERE `invite_hash` IS NOT NULL;--> statement-breakpoint
UPDATE `bots` SET `access` = 'by_link' WHERE `listed` = 0;--> statement-breakpoint
UPDATE `bots` SET `listed` = (`access` = 'public');
