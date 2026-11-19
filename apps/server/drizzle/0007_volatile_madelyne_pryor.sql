ALTER TABLE `bot_commands` ADD `shortcut` text;--> statement-breakpoint
ALTER TABLE `bots` ADD `guest_access` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bots` ADD `role_labels` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `chats` ADD `guest` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `guest_until` integer;--> statement-breakpoint
UPDATE `chats` SET `roles` = json_array(json_extract(`roles`, '$[0]')) WHERE json_array_length(`roles`) > 1;--> statement-breakpoint
UPDATE `bot_invites` SET `roles` = json_array(json_extract(`roles`, '$[0]')) WHERE json_array_length(`roles`) > 1;--> statement-breakpoint
UPDATE `bots` SET `default_roles` = json_array(json_extract(`default_roles`, '$[0]')) WHERE json_array_length(`default_roles`) > 1;
