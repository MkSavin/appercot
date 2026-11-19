ALTER TABLE `push_subs` ADD `session_id` text REFERENCES sessions(id) ON DELETE CASCADE;
