CREATE TABLE `ai_service_state` (
	`id` text PRIMARY KEY NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`opened_until` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_usage_limits` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bucket` text NOT NULL,
	`window_started_at` integer NOT NULL,
	`request_count` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_usage_limits_user_bucket` ON `ai_usage_limits` (`user_id`,`bucket`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text,
	`created_by_user_id` text NOT NULL,
	`accepted_by_user_id` text,
	`visibility` text NOT NULL,
	`title` text NOT NULL,
	`event_date` text NOT NULL,
	`event_time` text NOT NULL,
	`city` text NOT NULL,
	`status` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_reference` text,
	`facts_json` text DEFAULT '{}' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_schedules_owner_date` ON `schedules` (`created_by_user_id`,`event_date`);--> statement-breakpoint
CREATE INDEX `idx_schedules_relationship_date` ON `schedules` (`relationship_id`,`event_date`);--> statement-breakpoint
CREATE INDEX `idx_schedules_relationship_status` ON `schedules` (`relationship_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_schedules_owner_source_reference` ON `schedules` (`created_by_user_id`,`source_reference`);--> statement-breakpoint
INSERT OR IGNORE INTO `schedules` (
	`id`, `relationship_id`, `created_by_user_id`, `accepted_by_user_id`,
	`visibility`, `title`, `event_date`, `event_time`, `city`, `status`,
	`source`, `source_reference`, `facts_json`, `version`,
	`created_at`, `updated_at`, `deleted_at`
)
SELECT
	`id`, `relationship_id`, `created_by_user_id`, `accepted_by_user_id`,
	'shared', `title`, `event_date`, `event_time`, `city`, `status`,
	'legacy_shared', 'shared:' || `id`, '{}', 1,
	`created_at`, `updated_at`, NULL
FROM `shared_schedules`;--> statement-breakpoint
PRAGMA optimize;
