import { sql } from "drizzle-orm";
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
