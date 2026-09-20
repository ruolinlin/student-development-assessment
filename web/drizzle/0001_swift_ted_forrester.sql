ALTER TABLE `assessment_drafts` ADD `personal_information` text DEFAULT '{"grade":"","strengthSubjects":"","achievementExperience":"","achievementReason":""}' NOT NULL;--> statement-breakpoint
ALTER TABLE `assessment_drafts` ADD `current_profile_step` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `assessment_drafts` ADD `completed_profile_steps` integer DEFAULT 0 NOT NULL;