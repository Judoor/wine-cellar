ALTER TABLE `wines` ADD `barcode` text;--> statement-breakpoint
ALTER TABLE `wines` ADD `pairings` text;--> statement-breakpoint
CREATE INDEX `wines_barcode_idx` ON `wines` (`user_id`,`barcode`);