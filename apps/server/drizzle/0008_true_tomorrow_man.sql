ALTER TABLE `files` ADD `storage` text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `preview_state` text;--> statement-breakpoint
ALTER TABLE `files` ADD `detached_at` integer;--> statement-breakpoint
CREATE INDEX `files_preview_idx` ON `files` (`preview_state`,`id`);