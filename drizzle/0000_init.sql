CREATE TABLE `answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`position` integer,
	`source` text NOT NULL,
	`question_id` integer NOT NULL,
	`selected` text,
	`is_correct` integer DEFAULT false NOT NULL,
	`correct_option` text NOT NULL,
	`flagged` integer DEFAULT false NOT NULL,
	`seconds_spent` integer DEFAULT 0 NOT NULL,
	`answered_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `test_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `answers_question_idx` ON `answers` (`question_id`,`answered_at`);--> statement-breakpoint
CREATE INDEX `answers_answered_idx` ON `answers` (`answered_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `answers_session_position_idx` ON `answers` (`session_id`,`position`);--> statement-breakpoint
CREATE TABLE `test_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`label` text,
	`retest_of` integer,
	`question_count` integer NOT NULL,
	`time_limit_seconds` integer NOT NULL,
	`ends_at` integer,
	`remaining_seconds` integer NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `test_sessions_status_idx` ON `test_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `test_sessions_created_idx` ON `test_sessions` (`created_at`);