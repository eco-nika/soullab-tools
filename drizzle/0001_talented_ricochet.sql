CREATE TABLE `knowledge_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`chunk` text NOT NULL,
	`model` text NOT NULL,
	`dims` integer NOT NULL,
	`embedding` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_learning_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text,
	`draft` text NOT NULL,
	`rating` text NOT NULL,
	`reason` text NOT NULL,
	`is_sample` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `agent_learning_goals`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "feedback_rating" CHECK("agent_learning_feedback"."rating" IN ('good','bad'))
);
--> statement-breakpoint
CREATE TABLE `agent_learning_feedback_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`feedback_id` text,
	`model` text NOT NULL,
	`dims` integer NOT NULL,
	`embedding` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`feedback_id`) REFERENCES `agent_learning_feedback`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `agent_learning_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`goal` text NOT NULL,
	`is_sample` integer NOT NULL,
	`model` text NOT NULL,
	`dims` integer NOT NULL,
	`embedding` text NOT NULL,
	`created_at` text NOT NULL
);
