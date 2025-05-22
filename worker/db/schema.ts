import { relations } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull().unique(),
  // Add any other user fields you need, e.g., email, password hash, etc.
});

export const todos = sqliteTable('todos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  text: text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Foreign key to users table
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  todos: many(todos),
}));

export const todosRelations = relations(todos, ({ one }) => ({
  user: one(users, {
    fields: [todos.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertTodoSchema = createInsertSchema(todos);
export const selectTodoSchema = createSelectSchema(todos);

export type User = z.infer<typeof selectUserSchema>;
export type Todo = z.infer<typeof selectTodoSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type NewTodo = z.infer<typeof insertTodoSchema>;
