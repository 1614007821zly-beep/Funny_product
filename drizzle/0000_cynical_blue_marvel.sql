CREATE TABLE `relationship_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`inviter_user_id` text NOT NULL,
	`relationship_id` text,
	`partner_note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_by_user_id` text,
	`created_at` text NOT NULL,
	`accepted_at` text,
	FOREIGN KEY (`inviter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_relationship_invites_code` ON `relationship_invites` (`code`);--> statement-breakpoint
CREATE INDEX `idx_relationship_invites_inviter_status` ON `relationship_invites` (`inviter_user_id`,`status`);--> statement-breakpoint
CREATE TABLE `relationship_members` (
	`relationship_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` text NOT NULL,
	`left_at` text,
	FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_relationship_members_pair` ON `relationship_members` (`relationship_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_relationship_members_user_active` ON `relationship_members` (`user_id`,`left_at`);--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`ended_at` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`nickname` text NOT NULL,
	`birthday` text,
	`city` text DEFAULT '杭州' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
PRAGMA optimize;
