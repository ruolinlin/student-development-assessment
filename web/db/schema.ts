import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const assessmentDrafts = sqliteTable('assessment_drafts', {
  tokenHash: text('token_hash').primaryKey(),
  bankVersion: text('bank_version').notNull(),
  preferredName: text('preferred_name').notNull(),
  answers: text('answers').notNull(),
  currentIndex: integer('current_index').notNull(),
  revision: integer('revision').notNull(),
  status: text('status').notNull(),
  updatedAt: text('updated_at').notNull(),
});
