-- Custom SQL migration file, put your code below! --
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
CREATE INDEX `contact_album_user_contact_idx` ON `contact_album` (`user_id`,`contact_id`);
--> statement-breakpoint
CREATE INDEX `contact_album_contact_sort_idx` ON `contact_album` (`contact_id`,`sort_order`);
--> statement-breakpoint

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
CREATE INDEX `contact_album_photo_album_sort_idx` ON `contact_album_photo` (`album_id`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `contact_album_photo_contact_album_idx` ON `contact_album_photo` (`contact_id`,`album_id`);