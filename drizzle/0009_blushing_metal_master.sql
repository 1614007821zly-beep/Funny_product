ALTER TABLE `users` ADD `onboarding_completed_at` text;

UPDATE `users`
SET `onboarding_completed_at` = `updated_at`
WHERE `onboarding_completed_at` IS NULL
  AND EXISTS (
    SELECT 1 FROM `relationship_members`
    WHERE `relationship_members`.`user_id` = `users`.`id`
  );
