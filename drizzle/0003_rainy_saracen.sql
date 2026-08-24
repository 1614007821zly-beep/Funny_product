CREATE TABLE `shared_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`accepted_by_user_id` text,
	`title` text NOT NULL,
	`event_date` text NOT NULL,
	`event_time` text NOT NULL,
	`city` text NOT NULL,
	`status` text DEFAULT 'pending_partner' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shared_schedules_relationship_status` ON `shared_schedules` (`relationship_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_shared_schedules_relationship_date` ON `shared_schedules` (`relationship_id`,`event_date`);