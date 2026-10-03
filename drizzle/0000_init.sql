CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bottles` (
	`id` text PRIMARY KEY NOT NULL,
	`wine_id` text NOT NULL,
	`location_id` text,
	`rack_id` text,
	`row` integer,
	`col` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`rack_id`) REFERENCES `racks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `bottles_wine_idx` ON `bottles` (`wine_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bottles_slot_unique` ON `bottles` (`rack_id`,`row`,`col`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `locations_user_idx` ON `locations` (`user_id`);--> statement-breakpoint
CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`wine_id` text NOT NULL,
	`direction` text NOT NULL,
	`reason` text NOT NULL,
	`quantity` integer NOT NULL,
	`date` integer NOT NULL,
	`note` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `movements_user_idx` ON `movements` (`user_id`);--> statement-breakpoint
CREATE INDEX `movements_wine_idx` ON `movements` (`wine_id`);--> statement-breakpoint
CREATE TABLE `racks` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`name` text NOT NULL,
	`rows` integer NOT NULL,
	`cols` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `racks_location_idx` ON `racks` (`location_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `tasting_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`wine_id` text NOT NULL,
	`date` integer NOT NULL,
	`rating` real,
	`notes` text,
	`occasion` text,
	`companions` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tasting_notes_wine_idx` ON `tasting_notes` (`wine_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `wines` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`producer` text NOT NULL,
	`name` text,
	`vintage` integer,
	`color` text NOT NULL,
	`country` text,
	`region` text,
	`appellation` text,
	`grapes` text,
	`alcohol` real,
	`bottle_size_ml` integer DEFAULT 750 NOT NULL,
	`purchase_price` real,
	`estimated_value` real,
	`drink_from` integer,
	`peak_from` integer,
	`peak_until` integer,
	`drink_until` integer,
	`notes` text,
	`image_file` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wines_user_idx` ON `wines` (`user_id`);--> statement-breakpoint
CREATE TABLE `wishlist` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`producer` text NOT NULL,
	`name` text,
	`vintage` integer,
	`color` text,
	`appellation` text,
	`target_price` real,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wishlist_user_idx` ON `wishlist` (`user_id`);