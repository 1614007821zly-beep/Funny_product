CREATE UNIQUE INDEX `idx_relationship_members_one_active` ON `relationship_members` (`user_id`) WHERE "relationship_members"."left_at" is null;--> statement-breakpoint
PRAGMA optimize;
