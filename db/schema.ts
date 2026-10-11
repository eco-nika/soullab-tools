import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const testOrders = sqliteTable('test_orders', {
  orderId: text('order_id').primaryKey(),
  productName: text('product_name').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').notNull(),
  recordedAt: text('recorded_at').notNull(),
}, (t) => [check('test_amount', sql`${t.amount} = 19000`), check('test_status', sql`${t.status} IN ('READY','DONE','FAILED','CANCELED','UNKNOWN')`)]);

export const knowledgeEmbeddings = sqliteTable('knowledge_embeddings', {
  id: text('id').primaryKey(), source: text('source').notNull(), title: text('title').notNull(),
  chunk: text('chunk').notNull(), model: text('model').notNull(), dims: integer('dims').notNull(),
  embedding: text('embedding').notNull(), createdAt: text('created_at').notNull(),
});
// D1 is SQLite: a table prefix represents the agent_learning namespace.
export const learningGoals = sqliteTable('agent_learning_goals', {
  id: text('id').primaryKey(), goal: text('goal').notNull(), isSample: integer('is_sample').notNull(),
  model: text('model').notNull(), dims: integer('dims').notNull(), embedding: text('embedding').notNull(),
  createdAt: text('created_at').notNull(),
});
export const learningFeedback = sqliteTable('agent_learning_feedback', {
  id: text('id').primaryKey(), goalId: text('goal_id').references(()=>learningGoals.id),
  draft: text('draft').notNull(), rating: text('rating').notNull(), reason: text('reason').notNull(),
  isSample: integer('is_sample').notNull(), createdAt: text('created_at').notNull(),
}, t=>[check('feedback_rating',sql`${t.rating} IN ('good','bad')`)]);
export const learningFeedbackEmbeddings = sqliteTable('agent_learning_feedback_embeddings', {
  id: text('id').primaryKey(), feedbackId: text('feedback_id').references(()=>learningFeedback.id),
  model: text('model').notNull(), dims: integer('dims').notNull(), embedding: text('embedding').notNull(),
  createdAt: text('created_at').notNull(),
});
