CREATE TABLE `assessment_drafts` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`bank_version` text NOT NULL,
	`preferred_name` text NOT NULL,
	`answers` text NOT NULL,
	`current_index` integer NOT NULL,
	`revision` integer NOT NULL,
	`status` text NOT NULL,
	`updated_at` text NOT NULL
);
