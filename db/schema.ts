import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const testOrders = sqliteTable('test_orders', {
  orderId: text('order_id').primaryKey(),
  productName: text('product_name').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').notNull(),
  recordedAt: text('recorded_at').notNull(),
}, (t) => [check('test_amount', sql`${t.amount} = 19000`), check('test_status', sql`${t.status} IN ('READY','DONE','FAILED','CANCELED','UNKNOWN')`)]);
