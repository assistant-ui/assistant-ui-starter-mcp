import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
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
  const {
    messages,
    system,
    tools,
  }: { messages: UIMessage[]; system?: string; tools?: Record<string, any> } =
    await req.json();

  const result = streamText({
    model: openai.responses("gpt-5-nano"),
    messages: await convertToModelMessages(messages),
    system,
    tools: {
      ...mcpTools,
      ...frontendTools(tools ?? {}),
      // add backend tools here
    },
    providerOptions: {
      openai: {
        reasoningEffort: "low",
        reasoningSummary: "auto",
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
