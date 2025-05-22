import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import "./globals.css";
import './index.css';

import { z } from 'zod';
import App from './App.tsx';
import { McpWindowProvider } from './winodw.MCP/serverSDK.ts';

const myPageProvider = new McpWindowProvider(
  { name: "MyAwesomePageContext", version: "1.0.0" },
  { resources: true, tools: true, prompts: false }
);

// Expose current page title as a resource
myPageProvider.addResource(
  { uri: "page://title", name: "Page Title", mimeType: "text/plain" },
  async () => ({ contents: [{ uri: "page://title", text: document.title }] })
);

// Expose a tool to change the background color
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

myPageProvider.exposeOnWindow(); // Exposes as window.mcp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
