CREATE TABLE `bot_avatars` (
	`bot_id` text PRIMARY KEY NOT NULL,
	`image` text NOT NULL,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `chats` ADD `hidden_at` integer;