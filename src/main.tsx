import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import "./globals.css";
import './index.css';

import { hc } from 'hono/client';
import { z } from 'zod';
import type { NewTodo, NewUser } from '../worker/db/schema.js'; // Adjusted path
import type { AppType } from '../worker/index.js'; // Adjusted path
import App from './App.tsx';
import { McpWindowProvider } from './winodw.MCP/serverSDK.ts';

// Initialize Hono client for API interaction
const apiClient = hc<AppType>(location.origin);

apiClient.api.users.$post({
   json: {}
})

const myPageProvider = new McpWindowProvider(
  { name: "MyAwesomePageContext", version: "1.0.0" },
  { resources: true, tools: true, prompts: false }
);

myPageProvider.addResource(
  { uri: "page://title", name: "Page Title", mimeType: "text/plain" },
  async () => ({ contents: [{ uri: "page://title", text: document.title }] })
);

myPageProvider.addTool(
  {
      name: "showalert",
      description: "Shows an alert box with a custom message.",
      inputSchemaDef: { message: z.string().describe("The message to display in the alert.") },
      annotations: { openWorldHint: false } // Doesn't interact outside the page
  },
  async (args) => {
      try {
          alert(args.message);
          return { content: [{ type: 'text', text: `Alert shown with message: "${args.message}"` }] };
      } catch (e: any) {
          // alert() is unlikely to throw, but keeping the structure
          return { content: [{ type: 'text', text: `Error showing alert: ${e.message}` }], isError: true };
      }
  }
);

// --- New Tools for API Interaction ---
const placeholderUserId = "test-user-123";


// 1. Create User Tool
myPageProvider.addTool(
  {
    name: "createUser",
    description: "Creates a new user.",
    inputSchemaDef: { username: z.string().describe("The desired username for the new user.") },
    annotations: { openWorldHint: true } // Interacts with the backend
  },
  async (args: { username: string}) => {
    try {
      const res = await apiClient.api.users.$post({ json: { username: args.username, id: placeholderUserId } });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `API Error: ${res.status} ${res.statusText}`);
      }
      const newUser = await res.json();
      return { content: [{ type: 'json', data: newUser, text: `User created successfully: ${JSON.stringify(newUser)}` }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error creating user: ${e.message}` }], isError: true };
    }
  }
);

// 2. Create Todo Tool
myPageProvider.addTool(
  {
    name: "createTodo",
    description: "Creates a new todo for a specified user.",
    inputSchemaDef: {
      text: z.string().describe("The content of the todo item."),
    },
    annotations: { openWorldHint: true }
  },
  async (args: { text: string }) => {
    try {
      const res = await apiClient.api.todos.$post({ json: { text: args.text, userId: placeholderUserId } });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `API Error: ${res.status} ${res.statusText}`);
      }
      const newTodo = await res.json();
      return { content: [{ type: 'json', data: newTodo, text: `Todo created successfully: ${JSON.stringify(newTodo)}` }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error creating todo: ${e.message}` }], isError: true };
    }
  }
);

// 3. Update Todo Tool
myPageProvider.addTool(
  {
    name: "updateTodo",
    description: "Updates an existing todo item.",
    inputSchemaDef: {
      id: z.string().describe("The ID of the todo to update."),
      text: z.string().optional().describe("The new text for the todo. (Optional)"),
      completed: z.boolean().optional().describe("The new completion status. (Optional)")
    },
    annotations: { openWorldHint: true }
  },
  async (args: { id: string, text?: string, completed?: boolean }) => {
    try {
      const payload: Partial<Pick<NewTodo, 'text' | 'completed'>> = {};
      if (args.text !== undefined) payload.text = args.text;
      if (args.completed !== undefined) payload.completed = args.completed;

      if (Object.keys(payload).length === 0) {
        return { content: [{ type: 'text', text: "No updates provided for the todo." }], isError: false };
      }

      const res = await apiClient.api.todos[':id'].$put({
        param: { id: args.id },
        json: payload
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `API Error: ${res.status} ${res.statusText}`);
      }
      const updatedTodo = await res.json();
      return { content: [{ type: 'json', data: updatedTodo, text: `Todo updated successfully: ${JSON.stringify(updatedTodo)}` }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error updating todo: ${e.message}` }], isError: true };
    }
  }
);

// 4. Delete Todo Tool
myPageProvider.addTool(
  {
    name: "deleteTodo",
    description: "Deletes a todo item by its ID.",
    inputSchemaDef: { id: z.string().describe("The ID of the todo to delete.") },
    annotations: { openWorldHint: true }
  },
  async (args: { id: string }) => {
    try {
      const res = await apiClient.api.todos[':id'].$delete({
        param: { id: args.id }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `API Error: ${res.status} ${res.statusText}`);
      }
      const result = await res.json(); // Should be { message: "Todo deleted" }
      return { content: [{ type: 'text', text: result.message || "Todo deleted successfully." }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error deleting todo: ${e.message}` }], isError: true };
    }
  }
);

myPageProvider.exposeOnWindow(); // Exposes as window.mcp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
