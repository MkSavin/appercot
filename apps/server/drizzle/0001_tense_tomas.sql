ALTER TABLE `bots` ADD `invite_hash` text;--> statement-breakpoint
ALTER TABLE `bots` ADD `invite_expires_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
UPDATE `users` SET `role` = 'admin' WHERE `is_admin` = 1;--> statement-breakpoint
UPDATE `users` SET `role` = 'owner'
WHERE `id` = (SELECT `id` FROM `users` WHERE `role` = 'admin' ORDER BY `created_at`, `id` LIMIT 1);
