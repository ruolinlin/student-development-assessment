import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const assessmentDrafts = sqliteTable('assessment_drafts', {
  tokenHash: text('token_hash').primaryKey(),
  bankVersion: text('bank_version').notNull(),
  preferredName: text('preferred_name').notNull(),
  answers: text('answers').notNull(),
  currentIndex: integer('current_index').notNull(),
  revision: integer('revision').notNull(),
  status: text('status').notNull(),
  personalInformation: text('personal_information').notNull().default('{"grade":"","strengthSubjects":"","achievementExperience":"","achievementReason":""}'),
  currentProfileStep: integer('current_profile_step').notNull().default(0),
  completedProfileSteps: integer('completed_profile_steps').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});
