import { zValidator } from '@hono/zod-validator';
import { Hono } from "hono";
import { z } from "zod";

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText } from "ai";

const PostRequestBodySchema = z.object({
  messages: z.array(z.any()),
  system: z.string().optional(),
  tools: z.any().optional(),
});

const app = new Hono<{Bindings: Env}>();

app.post("/api/chat", zValidator("json", PostRequestBodySchema), async (c) => {
  const { messages, system, tools } = c.req.valid("json");
  const gemini = createGoogleGenerativeAI({
    apiKey: c.env.GEMINI_API_KEY,
  });

  const result = streamText({
    model: gemini("gemini-2.5-flash-preview-05-20"),
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
