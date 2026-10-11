CREATE TABLE `test_orders` (
	`order_id` text PRIMARY KEY NOT NULL,
	`product_name` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text NOT NULL,
	`recorded_at` text NOT NULL,
	CONSTRAINT "test_amount" CHECK("test_orders"."amount" = 19000),
	CONSTRAINT "test_status" CHECK("test_orders"."status" IN ('READY','DONE','FAILED','CANCELED','UNKNOWN'))
);
