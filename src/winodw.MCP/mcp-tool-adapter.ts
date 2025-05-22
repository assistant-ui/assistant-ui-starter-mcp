// Filename: mcp-tool-adapter.ts
import { tool as assistantToolHelper } from '@assistant-ui/react';
import { z, ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod'; // Assuming you'll use Zod for schema on MCP side too
import { McpWindowClient } from './ClientSDK';
import type { CallToolParams, CallToolResult, McpInputSchema, Tool as McpTool } from './mcp-window-types'; // Your MCP types

// Helper to convert MCP's simplified/JSON schema-like input to Zod.
// This is a basic version and might need to be more robust for complex schemas.
function mcpSchemaToZod(mcpSchema: McpInputSchema | any): ZodObject<ZodRawShape> {
    if (!mcpSchema || mcpSchema.type !== 'object' || !mcpSchema.properties) {
        return z.object({}); // Default to an empty object schema if invalid or not object
    }

    const shape: ZodRawShape = {};
    for (const key in mcpSchema.properties) {
        const prop = mcpSchema.properties[key];
        let fieldSchema: ZodTypeAny = z.any(); // Default to z.any()

        // Basic type mapping (can be expanded)
        switch (prop.type) {
            case 'string':
                fieldSchema = z.string();
                break;
            case 'number':
                fieldSchema = z.number();
                break;
            case 'boolean':
                fieldSchema = z.boolean();
                break;
            // Add more types like array, object, enum as needed
        }
        if (prop.description) {
            fieldSchema = fieldSchema.describe(prop.description);
        }
        // Handle 'required' - Zod fields are required by default unless .optional()
        const isRequired = mcpSchema.required?.includes(key);
        if (!isRequired) {
            fieldSchema = fieldSchema.optional();
        }
        shape[key] = fieldSchema;
    }
    return z.object(shape);
}


export function convertMcpToolToAssistantTool(
    mcpTool: McpTool,
    mcpClient: McpWindowClient // Pass the client to make the call
) {
    const zodParams = mcpSchemaToZod(mcpTool.inputSchema);

    return assistantToolHelper({
        name: mcpTool.name, // Assistant UI expects name directly on the tool object
        description: mcpTool.description,
        parameters: zodParams,
        execute: async (args: CallToolParams['arguments']) => {
            try {
                const result: CallToolResult = await mcpClient.callTool(mcpTool.name, args);
                if (result.isError) {
                    // Assistant UI might expect errors to be thrown or a specific error format
                    // For now, let's return the error content as a string.
                    const errorText = result.content
                        .filter(c => c.type === 'text' && c.text)
                        .map(c => c.text)
                        .join('\n');
                    throw new Error(errorText || `MCP tool '${mcpTool.name}' reported an error.`);
                }
                // Assistant UI tools expect a plain object as result.
                // We need to decide how to represent MCP's potentially multi-part content.
                // Option 1: Concatenate all text parts
                // Option 2: Return structuredContent if available
                // Option 3: Return the raw CallToolResult (might not be what assistant-ui expects)

                if (result.structuredContent) {
                    return result.structuredContent;
                }

                const textResults = result.content
                    .filter(c => c.type === 'text' && c.text)
                    .map(c => c.text);

                if (textResults.length > 0) {
                    return { result: textResults.join('\n') }; // Common pattern for simple results
                }
                
                // If no text or structured content, maybe return the raw content array or an indicator
                return { rawMcpContent: result.content };

            } catch (error: any) {
                console.error(`Error executing MCP tool ${mcpTool.name}:`, error);
                // Re-throw for assistant-ui to handle, or return a structured error
                throw new Error(`Execution of MCP tool '${mcpTool.name}' failed: ${error.message}`);
            }
        },
    });
}