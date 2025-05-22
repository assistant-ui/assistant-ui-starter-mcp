import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from "hono";
import { z } from "zod";

import { createOpenAI } from '@ai-sdk/openai';
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText } from "ai";

// Import Drizzle schemas and types
import * as schema from './db/schema';
import { insertTodoSchema, insertUserSchema, selectTodoSchema, selectUserSchema } from './db/schema';

const PostRequestBodySchema = z.object({
  messages: z.array(z.any()),
  system: z.string().optional(),
  tools: z.any().optional(),
});

// The old in-memory todos array is no longer needed.

const app = new Hono<{ Bindings: Env }>()
  .use('*', async (c, next) => {
    // Initialize Drizzle client for each request
    c.set('db', drizzle(c.env.DB, { schema }));
    await next();
  })
  .post("/api/chat", zValidator("json", PostRequestBodySchema), async (c) => {
    const { messages, system, tools } = c.req.valid("json");
    const gemini = createOpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });
    console.log(JSON.stringify({ tools, frontendTools: frontendTools(tools) }, null, 2))

    const result = streamText({
      model: gemini("gpt-4o-mini"),
      messages,
      toolCallStreaming: true,
      system,
      tools: {
        ...frontendTools(tools),
      },
      onError: console.log,
    });

    return result.toDataStreamResponse();
  })
  // --- User Endpoints ---
  .post("/api/users", zValidator("json", insertUserSchema.pick({ id: true, username: true })), async (c) => {
    const db = drizzle(c.env.DB, { schema });
    const { id, username } = c.req.valid("json");
    try {
      const newUser = await db.insert(schema.users).values({ id, username }).returning().get();
      return c.json(newUser, 201);
    } catch (error: any) {
      // Basic error handling, you might want to check for unique constraint violation specifically
      if (error.message?.includes('UNIQUE constraint failed')) {
        return c.json({ error: "Username already exists" }, 409);
      }
      console.error("Error creating user:", error);
      return c.json({ error: "Failed to create user" }, 500);
    }
  })
  .get("/api/users/:userId/todos", async (c) => {
    const db = drizzle(c.env.DB, { schema });
    const userId = c.req.param("userId");
    // Ensure user exists (optional, depends on your requirements)
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    const userTodos = await db.query.todos.findMany({
      where: eq(schema.todos.userId, userId),
    });
    return c.json(userTodos);
  })

  // --- Todo Endpoints (now associated with users) ---
  .get("/api/todos", async (c) => { // This likely needs a userId now, or be admin-only
    const db = drizzle(c.env.DB, { schema });
    // If you want to get ALL todos (admin)
    // const allTodos = await db.select().from(schema.todos);
    // return c.json(allTodos);
    // For now, let's assume this endpoint is removed or modified to require a user context
    return c.json({ message: "Please specify a user to get todos, e.g., /api/users/:userId/todos" }, 400);
  })
  .post("/api/todos", zValidator("json", insertTodoSchema.pick({ text: true, userId: true })), async (c) => {
    const db = drizzle(c.env.DB, { schema });
    const todoData = c.req.valid("json");

    // You'd typically get userId from auth, or require it in the body.
    // For this example, we'll expect it in the body.
    // Ensure the user exists before creating a todo for them
    const userExists = await db.query.users.findFirst({ where: eq(schema.users.id, todoData.userId) });
    if (!userExists) {
      return c.json({ error: "User not found" }, 404);
    }

    const newTodo = await db.insert(schema.todos)
      .values({
        text: todoData.text,
        userId: todoData.userId,
        // completed defaults to false in schema
      })
      .returning()
      .get();
    return c.json(newTodo, 201);
  })
  .get("/api/todos/:id", async (c) => {
    const db = drizzle(c.env.DB, { schema });
    const id = c.req.param("id");
    const todo = await db.query.todos.findFirst({
      where: eq(schema.todos.id, id),
      // If you want to include user info:
      // with: { user: true }
    });
    if (!todo) {
      return c.json({ error: "Todo not found" }, 404);
    }
    return c.json(todo);
  })
  .put("/api/todos/:id", zValidator("json", insertTodoSchema.pick({ text: true, completed: true }).partial()), async (c) => {
    const db = drizzle(c.env.DB, { schema });
    const id = c.req.param("id");
    const todoData = c.req.valid("json");

    // Ensure todo exists
    const existingTodo = await db.query.todos.findFirst({ where: eq(schema.todos.id, id) });
    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    // Here, you might also want to check if the authenticated user owns this todo
    // e.g., if (existingTodo.userId !== authenticatedUserId) return c.json({ error: "Forbidden" }, 403);

    const updatedTodo = await db.update(schema.todos)
      .set(todoData)
      .where(eq(schema.todos.id, id))
      .returning()
      .get();
    return c.json(updatedTodo);
  })
  .delete("/api/todos/:id", async (c) => {
    const db = drizzle(c.env.DB, { schema });
    const id = c.req.param("id");

    // Ensure todo exists
    const existingTodo = await db.query.todos.findFirst({ where: eq(schema.todos.id, id) });
    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }
    // Similar to PUT, add ownership check if necessary

    await db.delete(schema.todos).where(eq(schema.todos.id, id));
    return c.json({ message: "Todo deleted" });
  }).get("/api/migrate", async (c) => {
    const db = drizzle(c.env.DB, { schema });
    const migrationSQL = `
CREATE TABLE IF NOT EXISTS \`todos\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`text\` text NOT NULL,
	\`completed\` integer DEFAULT false NOT NULL,
	\`user_id\` text NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS \`users\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`username\` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS \`users_username_unique\` ON \`users\` (\`username\`);
    `;
    try {
      // D1 expects statements to be separated by newline, not necessarily by semicolon for batch execution.
      // However, to be safe and handle various SQL structures, it's better to split by semicolon
      // and filter out empty statements.
      const statements = migrationSQL.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);
      const batchQueries = statements.map(stmt => db.run(sql.raw(stmt)));

      // Execute all statements. D1's batch operation is often preferred.
      // For simplicity here, we'll execute them sequentially.
      // For more robust migration, consider using Drizzle Kit's programmatic API if available
      // or a more sophisticated batching approach if your SQL is complex.
      // Cloudflare D1's `db.batch()` is ideal for this.

      // Using D1 batch if available on the drizzle(c.env.DB) instance or executing one by one
      // The `drizzle-orm/d1` adapter for D1Database in Hono/Workers might not directly expose a `batch` method
      // on the `db` instance in the same way `env.DB.batch` works.
      // We will execute them individually. If one fails, subsequent ones won't run.
      for (const stmt of statements) {
        await db.run(sql.raw(stmt + ";")); // Ensure each statement ends with a semicolon for individual execution
      }

      return c.json({ success: true, message: "Migrations applied successfully." });
    } catch (error: any) {
      console.error("Migration failed:", error);
      return c.json({ success: false, message: "Migration failed.", error: error.message }, 500);
    }
  })
  // --- User Endpoints ---
  .post("/api/users", zValidator("json", insertUserSchema.pick({ username: true })), async (c) => {
    // ... existing code ...
    return c.json({ message: "Todo deleted" });
  });

export default app;

export type AppType = typeof app;

// // Define Env type to include D1 binding and Drizzle client
// export interface Env {
//   DB: D1Database;
//   OPENAI_API_KEY: string;
//   // Add other bindings from your wrangler.toml if needed
// }

// // Interface for Hono context with Drizzle client
// interface HonoContext {
//   Variables: {
//     db: ReturnType<typeof drizzle<typeof schema>>;
//   };
//   Bindings: Env;
// }