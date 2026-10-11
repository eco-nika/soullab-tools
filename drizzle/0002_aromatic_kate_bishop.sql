CREATE TABLE `agent_learning_records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`scope` text NOT NULL,
	`audience` text NOT NULL,
	`task_key` text NOT NULL,
	`fingerprint` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "learning_record_kind" CHECK("agent_learning_records"."kind" IN ('run','feedback','candidate','rubric','experiment','decision','retirement'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_learning_records_fingerprint_unique` ON `agent_learning_records` (`fingerprint`);