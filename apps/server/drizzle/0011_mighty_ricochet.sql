CREATE TABLE `test_file_deletions` (
	`file_id` text PRIMARY KEY NOT NULL,
	`storage` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_sync_resets` (
	`user_id` text PRIMARY KEY NOT NULL,
	`seq` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `files` ADD `origin_chat_id` text;