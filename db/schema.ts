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
