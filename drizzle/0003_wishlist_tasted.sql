ALTER TABLE `wishlist` ADD `barcode` text;--> statement-breakpoint
ALTER TABLE `wishlist` ADD `image_file` text;--> statement-breakpoint
ALTER TABLE `wishlist` ADD `rating` real;--> statement-breakpoint
ALTER TABLE `wishlist` ADD `tasted_on` integer;--> statement-breakpoint
ALTER TABLE `wishlist` ADD `tasted_where` text;--> statement-breakpoint
CREATE INDEX `wishlist_barcode_idx` ON `wishlist` (`user_id`,`barcode`);