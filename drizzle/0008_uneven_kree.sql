CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text,
	`owner_user_id` text NOT NULL,
	`relationship_id` text,
	`title` text NOT NULL,
	`event_date` text NOT NULL,
	`city` text NOT NULL,
	`facts_json` text DEFAULT '{}' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`media_id` text,
	`contribution_shared` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memories_schedule_owner` ON `memories` (`schedule_id`,`owner_user_id`);--> statement-breakpoint
CREATE INDEX `idx_memories_owner_date` ON `memories` (`owner_user_id`,`event_date`);--> statement-breakpoint
ALTER TABLE `schedules` ADD `completion_requested_by_user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `schedules` ADD `completed_at` text;