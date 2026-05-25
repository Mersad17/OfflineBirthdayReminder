CREATE TABLE `contact` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`birthday` text,
	`phone` text,
	`email` text,
	`group_id` text,
	`is_favorite` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`talk_every_days` integer,
	`talk_last_at` text,
	`talk_next_at` text,
	`photo_uri` text,
	`notes` text,
	`talk_notified_at` text,
	FOREIGN KEY (`group_id`) REFERENCES `contact_group`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `contact_user_favorite_idx` ON `contact` (`user_id`,`is_favorite`);--> statement-breakpoint
CREATE INDEX `contact_user_birthday_idx` ON `contact` (`user_id`,`birthday`);--> statement-breakpoint
CREATE INDEX `contact_user_group_idx` ON `contact` (`user_id`,`group_id`);--> statement-breakpoint
CREATE INDEX `contact_user_talk_next_idx` ON `contact` (`user_id`,`talk_next_at`);--> statement-breakpoint
CREATE INDEX `contact_name_idx` ON `contact` (`first_name`,`last_name`);--> statement-breakpoint
CREATE TABLE `contact_group` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`color` text,
	`icon` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_contact_group_per_user` ON `contact_group` (`user_id`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `contact_group_user_normalized_idx` ON `contact_group` (`user_id`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `contact_group_name_idx` ON `contact_group` (`name`);--> statement-breakpoint
CREATE TABLE `contact_tag` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_contact_tag_per_user` ON `contact_tag` (`user_id`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `contact_tag_user_normalized_idx` ON `contact_tag` (`user_id`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `contact_tag_name_idx` ON `contact_tag` (`name`);--> statement-breakpoint
CREATE TABLE `contact_tag_link` (
	`contact_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`contact_id`, `tag_id`),
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `contact_tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_tag_link_contact_idx` ON `contact_tag_link` (`contact_id`);--> statement-breakpoint
CREATE INDEX `contact_tag_link_tag_idx` ON `contact_tag_link` (`tag_id`);