CREATE TABLE `contact_relationship` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`pair_key` text NOT NULL,
	`contact_id` text NOT NULL,
	`related_contact_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`reverse_relationship_type` text NOT NULL,
	`relationship_group` text DEFAULT 'other' NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_relationship_pair_unique_idx` ON `contact_relationship` (`pair_key`);--> statement-breakpoint
CREATE INDEX `contact_relationship_contact_idx` ON `contact_relationship` (`contact_id`);--> statement-breakpoint
CREATE INDEX `contact_relationship_related_contact_idx` ON `contact_relationship` (`related_contact_id`);--> statement-breakpoint
CREATE INDEX `contact_relationship_group_idx` ON `contact_relationship` (`relationship_group`);