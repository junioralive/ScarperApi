import { pgTable, text, timestamp, integer, boolean, serial } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoURL: text('photo_url'),
  requestsUsed: integer('requests_used').default(0).notNull(),
  requestsLimit: integer('requests_limit').default(1000).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow(),
});

export const apiKeysTable = pgTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.uid),
  keyName: text('key_name').notNull(),
  keyValue: text('key_value').notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  requestsUsed: integer('requests_used').default(0).notNull(),
  requestsLimit: integer('requests_limit').default(1000).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type ApiKey = typeof apiKeysTable.$inferSelect;
