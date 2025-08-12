import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { experimental_createMCPClient as createMCPClient } from "ai";

const mcpClient = await createMCPClient({
  // TODO adjust this to point to your MCP server URL
  transport: {
    type: "sse",
    url: "http://localhost:8000/sse",
  },
});

const mcpTools = await mcpClient.tools();

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    tools: {
      ...mcpTools,
    },
    onError: console.log,
  });

  return result.toUIMessageStreamResponse();
}
