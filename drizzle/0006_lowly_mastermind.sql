CREATE TABLE `important_days` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text,
	`created_by_user_id` text NOT NULL,
	`accepted_by_user_id` text,
	`visibility` text NOT NULL,
	`title` text NOT NULL,
	`event_date` text NOT NULL,
	`repeat_rule` text DEFAULT 'yearly' NOT NULL,
	`reminder_days` integer DEFAULT 7 NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_important_days_owner_date` ON `important_days` (`created_by_user_id`,`event_date`);--> statement-breakpoint
CREATE INDEX `idx_important_days_relationship_date` ON `important_days` (`relationship_id`,`event_date`);--> statement-breakpoint
CREATE TABLE `relationship_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`accepted_by_user_id` text,
	`completion_requested_by_user_id` text,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completion_requested_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_relationship_tasks_relationship_status` ON `relationship_tasks` (`relationship_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_relationship_tasks_one_open` ON `relationship_tasks` (`relationship_id`) WHERE "relationship_tasks"."status" in ('pending_partner','active','completion_pending');