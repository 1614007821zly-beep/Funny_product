import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  nickname: text("nickname").notNull(),
  birthday: text("birthday"),
  city: text("city").notNull().default("杭州"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [uniqueIndex("idx_users_email").on(table.email)]);

export const relationships = sqliteTable("relationships", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  endedAt: text("ended_at"),
});

export const relationshipMembers = sqliteTable("relationship_members", {
  relationshipId: text("relationship_id").notNull().references(() => relationships.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  joinedAt: text("joined_at").notNull(),
  leftAt: text("left_at"),
  historySharingMode: text("history_sharing_mode"),
  historySharingReviewedAt: text("history_sharing_reviewed_at"),
}, table => [
  uniqueIndex("idx_relationship_members_pair").on(table.relationshipId, table.userId),
  uniqueIndex("idx_relationship_members_one_active").on(table.userId).where(sql`${table.leftAt} is null`),
  index("idx_relationship_members_user_active").on(table.userId, table.leftAt),
]);

export const relationshipInvites = sqliteTable("relationship_invites", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  inviterUserId: text("inviter_user_id").notNull().references(() => users.id),
  relationshipId: text("relationship_id").references(() => relationships.id),
  partnerNote: text("partner_note"),
  status: text("status").notNull().default("pending"),
  expiresAt: text("expires_at").notNull(),
  acceptedByUserId: text("accepted_by_user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
  acceptedAt: text("accepted_at"),
}, table => [
  uniqueIndex("idx_relationship_invites_code").on(table.code),
  index("idx_relationship_invites_inviter_status").on(table.inviterUserId, table.status),
]);

export const sharedSchedules = sqliteTable("shared_schedules", {
  id: text("id").primaryKey(),
  relationshipId: text("relationship_id").notNull().references(() => relationships.id),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  acceptedByUserId: text("accepted_by_user_id").references(() => users.id),
  title: text("title").notNull(),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  city: text("city").notNull(),
  status: text("status").notNull().default("pending_partner"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [
  index("idx_shared_schedules_relationship_status").on(table.relationshipId, table.status),
  index("idx_shared_schedules_relationship_date").on(table.relationshipId, table.eventDate),
]);

// `shared_schedules` is retained for a reversible migration. New reads and
// writes use this unified table so personal and shared plans have one durable
// source of truth.
export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  relationshipId: text("relationship_id").references(() => relationships.id),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  acceptedByUserId: text("accepted_by_user_id").references(() => users.id),
  visibility: text("visibility").notNull(),
  title: text("title").notNull(),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  city: text("city").notNull(),
  status: text("status").notNull(),
  source: text("source").notNull().default("manual"),
  sourceReference: text("source_reference"),
  factsJson: text("facts_json").notNull().default("{}"),
  completionRequestedByUserId: text("completion_requested_by_user_id").references(() => users.id),
  completedAt: text("completed_at"),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
}, table => [
  index("idx_schedules_owner_date").on(table.createdByUserId, table.eventDate),
  index("idx_schedules_relationship_date").on(table.relationshipId, table.eventDate),
  index("idx_schedules_relationship_status").on(table.relationshipId, table.status),
  uniqueIndex("idx_schedules_owner_source_reference").on(table.createdByUserId, table.sourceReference),
]);

// Each participant keeps their own factual copy. Personal contributions are
// read from their owner's row, never copied into the other participant's row.
export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").references(() => schedules.id),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  relationshipId: text("relationship_id").references(() => relationships.id),
  title: text("title").notNull(),
  eventDate: text("event_date").notNull(),
  city: text("city").notNull(),
  factsJson: text("facts_json").notNull().default("{}"),
  note: text("note").notNull().default(""),
  mediaId: text("media_id"),
  contributionShared: integer("contribution_shared", { mode: "boolean" }).notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
}, table => [
  uniqueIndex("idx_memories_schedule_owner").on(table.scheduleId, table.ownerUserId),
  index("idx_memories_owner_date").on(table.ownerUserId, table.eventDate),
]);

export const importantDays = sqliteTable("important_days", {
  id: text("id").primaryKey(),
  relationshipId: text("relationship_id").references(() => relationships.id),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  acceptedByUserId: text("accepted_by_user_id").references(() => users.id),
  visibility: text("visibility").notNull(),
  title: text("title").notNull(),
  eventDate: text("event_date").notNull(),
  repeatRule: text("repeat_rule").notNull().default("yearly"),
  reminderDays: integer("reminder_days").notNull().default(7),
  status: text("status").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
}, table => [
  index("idx_important_days_owner_date").on(table.createdByUserId, table.eventDate),
  index("idx_important_days_relationship_date").on(table.relationshipId, table.eventDate),
]);

export const relationshipTasks = sqliteTable("relationship_tasks", {
  id: text("id").primaryKey(),
  relationshipId: text("relationship_id").notNull().references(() => relationships.id),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  acceptedByUserId: text("accepted_by_user_id").references(() => users.id),
  completionRequestedByUserId: text("completion_requested_by_user_id").references(() => users.id),
  title: text("title").notNull(),
  status: text("status").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [
  index("idx_relationship_tasks_relationship_status").on(table.relationshipId, table.status),
  uniqueIndex("idx_relationship_tasks_one_open").on(table.relationshipId).where(sql`${table.status} in ('pending_partner','active','completion_pending')`),
]);

export const aiUsageLimits = sqliteTable("ai_usage_limits", {
  keyHash: text("key_hash").primaryKey(),
  userId: text("user_id").notNull(),
  bucket: text("bucket").notNull(),
  windowStartedAt: integer("window_started_at").notNull(),
  requestCount: integer("request_count").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [
  index("idx_ai_usage_limits_user_bucket").on(table.userId, table.bucket),
]);

export const aiServiceState = sqliteTable("ai_service_state", {
  id: text("id").primaryKey(),
  failureCount: integer("failure_count").notNull().default(0),
  openedUntil: text("opened_until"),
  updatedAt: text("updated_at").notNull(),
});

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id),
  scheduleReminders: integer("schedule_reminders", { mode: "boolean" }).notNull().default(true),
  importantDayReminders: integer("important_day_reminders", { mode: "boolean" }).notNull().default(true),
  partnerUpdates: integer("partner_updates", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull(),
});

export const feedbackEntries = sqliteTable("feedback_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull(),
}, table => [index("idx_feedback_entries_user_created").on(table.userId, table.createdAt)]);

export const scheduleShareLinks = sqliteTable("schedule_share_links", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => schedules.id),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull(),
}, table => [
  uniqueIndex("idx_schedule_share_links_token").on(table.tokenHash),
  index("idx_schedule_share_links_creator").on(table.createdByUserId, table.revokedAt),
]);

export const userMedia = sqliteTable("user_media", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  relationshipId: text("relationship_id").references(() => relationships.id),
  objectKey: text("object_key").notNull(),
  purpose: text("purpose").notNull().default("memory"),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  visibility: text("visibility").notNull().default("personal"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  retractedAt: text("retracted_at"),
}, table => [
  uniqueIndex("idx_user_media_object_key").on(table.objectKey),
  index("idx_user_media_owner_status").on(table.ownerUserId, table.status),
  index("idx_user_media_relationship_status").on(table.relationshipId, table.status),
]);
