UPDATE `relationship_members`
SET `left_at` = COALESCE(
  (SELECT `ended_at` FROM `relationships` WHERE `relationships`.`id` = `relationship_members`.`relationship_id`),
  CURRENT_TIMESTAMP
)
WHERE `left_at` IS NULL
  AND `relationship_id` IN (SELECT `id` FROM `relationships` WHERE `status` = 'ended');
--> statement-breakpoint
UPDATE `relationship_invites`
SET `status` = 'cancelled'
WHERE `status` = 'pending'
  AND `inviter_user_id` IN (
    SELECT `user_id` FROM `relationship_members`
    WHERE `relationship_id` IN (SELECT `id` FROM `relationships` WHERE `status` = 'ended')
  );
--> statement-breakpoint
PRAGMA optimize;
