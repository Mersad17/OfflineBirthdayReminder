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