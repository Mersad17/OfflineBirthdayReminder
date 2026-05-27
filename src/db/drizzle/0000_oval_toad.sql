CREATE TABLE `app_setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `app_setting_updated_idx` ON `app_setting` (`updated_at`);--> statement-breakpoint
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
	`met_at` text,
	`known_since` text,
	`relationship_label` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`talk_every_days` integer,
	`talk_last_at` text,
	`talk_next_at` text,
	`photo_uri` text,
	`short_description` text,
	`talk_notified_at` text,
	FOREIGN KEY (`group_id`) REFERENCES `contact_group`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `contact_user_favorite_idx` ON `contact` (`user_id`,`is_favorite`);--> statement-breakpoint
CREATE INDEX `contact_user_birthday_idx` ON `contact` (`user_id`,`birthday`);--> statement-breakpoint
CREATE INDEX `contact_user_group_idx` ON `contact` (`user_id`,`group_id`);--> statement-breakpoint
CREATE INDEX `contact_user_talk_next_idx` ON `contact` (`user_id`,`talk_next_at`);--> statement-breakpoint
CREATE INDEX `contact_name_idx` ON `contact` (`first_name`,`last_name`);--> statement-breakpoint
CREATE TABLE `contact_album` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`contact_id` text NOT NULL,
	`title` text NOT NULL,
	`cover_photo_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_album_user_contact_idx` ON `contact_album` (`user_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `contact_album_contact_sort_idx` ON `contact_album` (`contact_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `contact_album_photo` (
	`id` text PRIMARY KEY NOT NULL,
	`album_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`uri` text NOT NULL,
	`width` integer,
	`height` integer,
	`taken_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`album_id`) REFERENCES `contact_album`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_album_photo_album_sort_idx` ON `contact_album_photo` (`album_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `contact_album_photo_contact_album_idx` ON `contact_album_photo` (`contact_id`,`album_id`);--> statement-breakpoint
CREATE TABLE `contact_event` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`contact_id` text NOT NULL,
	`title` text NOT NULL,
	`type` integer DEFAULT 6 NOT NULL,
	`start_date` text NOT NULL,
	`start_time` text,
	`end_date` text,
	`end_time` text,
	`is_recurring` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_event_user_contact_idx` ON `contact_event` (`user_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `contact_event_contact_start_idx` ON `contact_event` (`contact_id`,`start_date`);--> statement-breakpoint
CREATE INDEX `contact_event_user_start_idx` ON `contact_event` (`user_id`,`start_date`);--> statement-breakpoint
CREATE INDEX `contact_event_type_idx` ON `contact_event` (`type`);--> statement-breakpoint
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
CREATE TABLE `contact_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`text` text NOT NULL,
	`memory_type` text DEFAULT 'note' NOT NULL,
	`date` text,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_memory_contact_type_idx` ON `contact_memory` (`contact_id`,`memory_type`);--> statement-breakpoint
CREATE INDEX `contact_memory_contact_pinned_idx` ON `contact_memory` (`contact_id`,`is_pinned`);--> statement-breakpoint
CREATE INDEX `contact_memory_date_idx` ON `contact_memory` (`date`);--> statement-breakpoint
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
CREATE INDEX `contact_relationship_group_idx` ON `contact_relationship` (`relationship_group`);--> statement-breakpoint
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
CREATE INDEX `contact_tag_link_tag_idx` ON `contact_tag_link` (`tag_id`);--> statement-breakpoint
CREATE TABLE `custom_info_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`section_id`) REFERENCES `custom_info_section`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `custom_info_entry_contact_idx` ON `custom_info_entry` (`contact_id`);--> statement-breakpoint
CREATE INDEX `custom_info_entry_section_contact_idx` ON `custom_info_entry` (`section_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `custom_info_entry_sort_idx` ON `custom_info_entry` (`section_id`,`contact_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `custom_info_field` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`label` text NOT NULL,
	`field_key` text NOT NULL,
	`field_type` text DEFAULT 'text' NOT NULL,
	`placeholder` text,
	`options_json` text,
	`is_required` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`section_id`) REFERENCES `custom_info_section`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `custom_info_field_section_idx` ON `custom_info_field` (`section_id`);--> statement-breakpoint
CREATE INDEX `custom_info_field_sort_idx` ON `custom_info_field` (`section_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `custom_info_section` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`contact_id` text,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`icon` text,
	`color` text,
	`scope` text DEFAULT 'contact' NOT NULL,
	`is_repeatable` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `custom_info_section_user_idx` ON `custom_info_section` (`user_id`);--> statement-breakpoint
CREATE INDEX `custom_info_section_contact_idx` ON `custom_info_section` (`user_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `custom_info_section_scope_idx` ON `custom_info_section` (`user_id`,`scope`);--> statement-breakpoint
CREATE INDEX `custom_info_section_sort_idx` ON `custom_info_section` (`user_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `custom_info_value` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`field_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`value_text` text,
	`value_number` integer,
	`value_date` text,
	`value_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`entry_id`) REFERENCES `custom_info_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `custom_info_field`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `custom_info_value_entry_idx` ON `custom_info_value` (`entry_id`);--> statement-breakpoint
CREATE INDEX `custom_info_value_field_idx` ON `custom_info_value` (`field_id`);--> statement-breakpoint
CREATE INDEX `custom_info_value_contact_idx` ON `custom_info_value` (`contact_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_custom_info_value_per_entry_field` ON `custom_info_value` (`entry_id`,`field_id`);--> statement-breakpoint
CREATE TABLE `event_type` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`color` text,
	`icon` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_event_type_per_user` ON `event_type` (`user_id`,`value`);--> statement-breakpoint
CREATE INDEX `event_type_user_value_idx` ON `event_type` (`user_id`,`value`);--> statement-breakpoint
CREATE TABLE `interaction` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`happened_at` integer NOT NULL,
	`duration_minutes` integer,
	`note` text,
	`type` integer DEFAULT 5 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `interaction_contact_happened_idx` ON `interaction` (`contact_id`,`happened_at`);--> statement-breakpoint
CREATE INDEX `interaction_type_idx` ON `interaction` (`type`);--> statement-breakpoint
CREATE TABLE `reminder` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`days_before` integer,
	`absolute_datetime` integer,
	`time_of_day` text,
	`status` integer DEFAULT 1 NOT NULL,
	`send_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`notification_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `contact_event`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminder_status_idx` ON `reminder` (`status`);--> statement-breakpoint
CREATE INDEX `reminder_send_at_idx` ON `reminder` (`send_at`);--> statement-breakpoint
CREATE INDEX `reminder_event_idx` ON `reminder` (`event_id`);--> statement-breakpoint
CREATE INDEX `reminder_event_active_idx` ON `reminder` (`event_id`,`is_active`);