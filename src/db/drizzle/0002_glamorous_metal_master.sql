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
CREATE UNIQUE INDEX `unique_custom_info_value_per_entry_field` ON `custom_info_value` (`entry_id`,`field_id`);