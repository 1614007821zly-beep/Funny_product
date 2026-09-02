type MediaObject = { object_key: string };

const partnerFor = (table: string) => `(SELECT member.user_id FROM relationship_members member
  WHERE member.relationship_id=${table}.relationship_id AND member.user_id<>?
  ORDER BY member.joined_at ASC LIMIT 1)`;

const hasPartnerFor = (table: string) => `EXISTS (SELECT 1 FROM relationship_members member
  WHERE member.relationship_id=${table}.relationship_id AND member.user_id<>?)`;

export async function deleteAccountData(db: D1Database, media: R2Bucket, userId: string, now: string) {
  const uploaded = await db.prepare("SELECT object_key FROM user_media WHERE owner_user_id=?")
    .bind(userId).all<MediaObject>();

  // Delete blobs first. If object storage is unavailable, keep the database
  // account intact so the user can retry instead of leaving private files
  // detached from their deletion request.
  for (const item of uploaded.results ?? []) await media.delete(item.object_key);

  const scheduleHasPartner = hasPartnerFor("schedules");
  const schedulePartner = partnerFor("schedules");
  const legacyHasPartner = hasPartnerFor("shared_schedules");
  const legacyPartner = partnerFor("shared_schedules");
  const importantHasPartner = hasPartnerFor("important_days");
  const importantPartner = partnerFor("important_days");
  const taskHasPartner = hasPartnerFor("relationship_tasks");
  const taskPartner = partnerFor("relationship_tasks");

  const statements = [
    db.prepare(`UPDATE relationship_members SET left_at=? WHERE left_at IS NULL AND relationship_id IN
      (SELECT relationship_id FROM relationship_members WHERE user_id=?)`).bind(now, userId),
    db.prepare(`UPDATE relationships SET status='ended',ended_at=COALESCE(ended_at,?) WHERE status='active' AND id IN
      (SELECT relationship_id FROM relationship_members WHERE user_id=?)`).bind(now, userId),
    db.prepare(`DELETE FROM relationship_invites WHERE inviter_user_id=? OR accepted_by_user_id=? OR relationship_id IN
      (SELECT relationship_id FROM relationship_members WHERE user_id=?)`).bind(userId, userId, userId),

    db.prepare(`DELETE FROM schedule_share_links WHERE created_by_user_id=? OR schedule_id IN
      (SELECT id FROM schedules WHERE created_by_user_id=? AND
        (visibility='personal' OR relationship_id IS NULL OR NOT ${scheduleHasPartner}))`).bind(userId, userId, userId),
    db.prepare(`DELETE FROM memories WHERE owner_user_id=? OR schedule_id IN
      (SELECT id FROM schedules WHERE created_by_user_id=? AND
        (visibility='personal' OR relationship_id IS NULL OR NOT ${scheduleHasPartner}))`).bind(userId, userId, userId),
    db.prepare(`DELETE FROM schedules WHERE created_by_user_id=? AND
      (visibility='personal' OR relationship_id IS NULL OR NOT ${scheduleHasPartner})`).bind(userId, userId),
    db.prepare(`UPDATE schedules SET
      created_by_user_id=CASE WHEN created_by_user_id=? THEN ${schedulePartner} ELSE created_by_user_id END,
      accepted_by_user_id=CASE WHEN accepted_by_user_id=? THEN NULL ELSE accepted_by_user_id END,
      completion_requested_by_user_id=CASE WHEN completion_requested_by_user_id=? THEN NULL ELSE completion_requested_by_user_id END,
      updated_at=?,version=version+1
      WHERE created_by_user_id=? OR accepted_by_user_id=? OR completion_requested_by_user_id=?`)
      .bind(userId, userId, userId, userId, now, userId, userId, userId),

    db.prepare(`DELETE FROM shared_schedules WHERE created_by_user_id=? AND NOT ${legacyHasPartner}`).bind(userId, userId),
    db.prepare(`UPDATE shared_schedules SET
      created_by_user_id=CASE WHEN created_by_user_id=? THEN ${legacyPartner} ELSE created_by_user_id END,
      accepted_by_user_id=CASE WHEN accepted_by_user_id=? THEN NULL ELSE accepted_by_user_id END,
      updated_at=? WHERE created_by_user_id=? OR accepted_by_user_id=?`)
      .bind(userId, userId, userId, now, userId, userId),

    db.prepare(`DELETE FROM important_days WHERE created_by_user_id=? AND
      (visibility='personal' OR relationship_id IS NULL OR NOT ${importantHasPartner})`).bind(userId, userId),
    db.prepare(`UPDATE important_days SET
      created_by_user_id=CASE WHEN created_by_user_id=? THEN ${importantPartner} ELSE created_by_user_id END,
      accepted_by_user_id=CASE WHEN accepted_by_user_id=? THEN NULL ELSE accepted_by_user_id END,
      updated_at=?,version=version+1
      WHERE created_by_user_id=? OR accepted_by_user_id=?`)
      .bind(userId, userId, userId, now, userId, userId),

    db.prepare(`DELETE FROM relationship_tasks WHERE created_by_user_id=? AND NOT ${taskHasPartner}`).bind(userId, userId),
    db.prepare(`UPDATE relationship_tasks SET
      created_by_user_id=CASE WHEN created_by_user_id=? THEN ${taskPartner} ELSE created_by_user_id END,
      accepted_by_user_id=CASE WHEN accepted_by_user_id=? THEN NULL ELSE accepted_by_user_id END,
      completion_requested_by_user_id=CASE WHEN completion_requested_by_user_id=? THEN NULL ELSE completion_requested_by_user_id END,
      updated_at=?,version=version+1
      WHERE created_by_user_id=? OR accepted_by_user_id=? OR completion_requested_by_user_id=?`)
      .bind(userId, userId, userId, userId, now, userId, userId, userId),

    db.prepare("DELETE FROM user_media WHERE owner_user_id=?").bind(userId),
    db.prepare("DELETE FROM recommendation_feedback WHERE user_id=?").bind(userId),
    db.prepare("DELETE FROM feedback_entries WHERE user_id=?").bind(userId),
    db.prepare("DELETE FROM user_preferences WHERE user_id=?").bind(userId),
    db.prepare("DELETE FROM ai_usage_limits WHERE user_id=?").bind(userId),
    db.prepare("DELETE FROM relationship_members WHERE user_id=?").bind(userId),
    db.prepare("DELETE FROM users WHERE id=?").bind(userId),
  ];

  await db.batch(statements);
}
