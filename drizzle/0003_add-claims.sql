CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer,
	`expires_at` integer,
	`created_at` integer,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `claims_item_idx` ON `claims` (`item_id`);--> statement-breakpoint
CREATE INDEX `claims_user_idx` ON `claims` (`user_id`);--> statement-breakpoint
CREATE INDEX `claims_expires_idx` ON `claims` (`expires_at`);