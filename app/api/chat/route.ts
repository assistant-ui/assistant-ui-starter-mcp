import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";

export const maxDuration = 30;

const mcpClient = await createMCPClient({
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
  }: { messages: UIMessage[]; system?: string; tools?: any } = await req.json();

  const result = streamText({
    model: openai.responses("gpt-5-nano"),
    messages: convertToModelMessages(messages),
    system,
    tools: {
      ...mcpTools,
      ...frontendTools(tools),
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
