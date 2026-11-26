ALTER TABLE `messages` ADD `search_text` text GENERATED ALWAYS AS (coalesce(json_extract(`content`, '$.text'), '')) VIRTUAL;--> statement-breakpoint
CREATE VIRTUAL TABLE `message_search` USING fts5(`search_text`, content='messages', content_rowid='rowid', tokenize='unicode61');--> statement-breakpoint
CREATE TRIGGER `messages_search_insert` AFTER INSERT ON `messages` BEGIN
  INSERT INTO `message_search`(`rowid`, `search_text`) VALUES (new.`rowid`, new.`search_text`);
END;--> statement-breakpoint
CREATE TRIGGER `messages_search_delete` AFTER DELETE ON `messages` BEGIN
  INSERT INTO `message_search`(`message_search`, `rowid`, `search_text`) VALUES ('delete', old.`rowid`, old.`search_text`);
END;--> statement-breakpoint
CREATE TRIGGER `messages_search_update` AFTER UPDATE OF `content` ON `messages` BEGIN
  INSERT INTO `message_search`(`message_search`, `rowid`, `search_text`) VALUES ('delete', old.`rowid`, old.`search_text`);
  INSERT INTO `message_search`(`rowid`, `search_text`) VALUES (new.`rowid`, new.`search_text`);
END;--> statement-breakpoint
INSERT INTO `message_search`(`rowid`, `search_text`) SELECT `rowid`, `search_text` FROM `messages`;
