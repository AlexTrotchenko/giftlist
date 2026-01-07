ALTER TABLE `claims` ADD `purchased_at` integer;--> statement-breakpoint
ALTER TABLE `items` ADD `status` text DEFAULT 'active' NOT NULL;