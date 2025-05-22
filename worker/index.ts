import { zValidator } from '@hono/zod-validator';
import { Hono } from "hono";
import { z } from "zod";

import { createOpenAI } from '@ai-sdk/openai';
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText } from "ai";

const PostRequestBodySchema = z.object({
  messages: z.array(z.any()),
  system: z.string().optional(),
  tools: z.any().optional(),
});

const app = new Hono<{ Bindings: Env }>();

app.post("/api/chat", zValidator("json", PostRequestBodySchema), async (c) => {
  const { messages, system, tools } = c.req.valid("json");
  const gemini = createOpenAI({
    apiKey: c.env.OPENAI_API_KEY,
  });
  console.log(JSON.stringify({tools, frontendTools:frontendTools(tools) },null, 2))

  

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
});

export default app;
