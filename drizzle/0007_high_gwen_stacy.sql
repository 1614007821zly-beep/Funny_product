CREATE TABLE `feedback_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_entries_user_created` ON `feedback_entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `schedule_share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_schedule_share_links_token` ON `schedule_share_links` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_schedule_share_links_creator` ON `schedule_share_links` (`created_by_user_id`,`revoked_at`);--> statement-breakpoint
CREATE TABLE `user_media` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`relationship_id` text,
	`object_key` text NOT NULL,
	`purpose` text DEFAULT 'memory' NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`visibility` text DEFAULT 'personal' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`retracted_at` text,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_media_object_key` ON `user_media` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_user_media_owner_status` ON `user_media` (`owner_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_user_media_relationship_status` ON `user_media` (`relationship_id`,`status`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`schedule_reminders` integer DEFAULT true NOT NULL,
	`important_day_reminders` integer DEFAULT true NOT NULL,
	`partner_updates` integer DEFAULT true NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
