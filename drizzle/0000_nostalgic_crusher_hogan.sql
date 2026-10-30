CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`host_hash` text NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
