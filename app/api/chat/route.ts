import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";

export const maxDuration = 30;

const mcpClient = await createMCPClient({
  // TODO adjust this to point to your MCP server URL
  transport: {
    type: "http",
    url: "http://localhost:8000/mcp",
  },
});

const mcpTools = await mcpClient.tools();

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    system,
    stopWhen: stepCountIs(10),
    tools: {
      ...mcpTools,
      ...frontendTools(tools),
      // add backend tools here
    },
  });

  return result.toUIMessageStreamResponse();
}
