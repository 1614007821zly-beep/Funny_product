CREATE TABLE `recommendation_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`sentiment` text NOT NULL,
	`reason` text,
	`place_ids_json` text DEFAULT '[]' NOT NULL,
	`brand_keys_json` text DEFAULT '[]' NOT NULL,
	`category` text,
	`distance_band_m` integer,
	`cost_band_yuan` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recommendation_feedback_user_created` ON `recommendation_feedback` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `service_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`service` text NOT NULL,
	`source` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`outcome` text NOT NULL,
	`failure_type` text,
	`fallback_triggered` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_service_runs_service_created` ON `service_runs` (`service`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_service_runs_created` ON `service_runs` (`created_at`);