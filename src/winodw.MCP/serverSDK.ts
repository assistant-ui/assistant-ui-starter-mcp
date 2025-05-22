// Filename: mcp-window-provider.ts
import { ZodSchema, z } from 'zod'; // Optional: for schema validation
import type {
    CallToolResult,
    GetPromptResult,
    ListPromptsResult,
    ListResourcesResult, ListToolsResult,
    McpEvent, McpNotification,
    Prompt,
    ReadResourceResult,
    Resource,
    ServerCapabilities,
    ServerInfo,
    Tool,
    ToolInputSchema,
    WindowMcpApi
} from './mcp-window-types.ts';

type ResourceHandler = (params: { uri: string }) => Promise<ReadResourceResult>;
type ToolHandler = (params: { name: string; arguments?: any }) => Promise<CallToolResult>;
type PromptHandler = (params: { name: string; arguments?: any }) => Promise<GetPromptResult>;

// A helper to make a class an EventTarget
class McpEventTarget extends EventTarget {
    constructor() {
        super();
    }

    // Helper to dispatch typed events
    dispatchMcpEvent(type: McpEvent, payload?: any) {
        const event = new CustomEvent<McpNotification>("mcpNotification", {
            detail: { type, payload },
        });
        this.dispatchEvent(event);
    }
}


export class McpWindowProvider extends McpEventTarget implements WindowMcpApi {
    private serverInfo: ServerInfo;
    private capabilities: ServerCapabilities;

    private resources: Map<string, Resource & { handler: ResourceHandler }> = new Map();
    private tools: Map<string, Tool & { handler: ToolHandler; inputValidator?: ZodSchema<any, ZodTypeDef, any> }> = new Map();
    private prompts: Map<string, Prompt & { handler: PromptHandler; argsValidator?: ZodSchema<any, ZodTypeDef, any> }> = new Map();

    constructor(serverInfo: ServerInfo, capabilities: ServerCapabilities) {
        super();
        this.serverInfo = serverInfo;
        this.capabilities = {
            resources: capabilities.resources ?? false,
            tools: capabilities.tools ?? false,
            prompts: capabilities.prompts ?? false,
            logging: capabilities.logging ?? false,
            completions: capabilities.completions ?? false,
        };
    }

    // --- SDK Methods for Website to Register Features ---

    addResource(resource: Resource, handler: ResourceHandler): void {
        if (!this.capabilities.resources) throw new Error("Resource capability not enabled.");
        this.resources.set(resource.uri, { ...resource, handler });
        this.dispatchMcpEvent("resourcesListChanged");
    }

    removeResource(uri: string): void {
        this.resources.delete(uri);
        this.dispatchMcpEvent("resourcesListChanged");
    }

    // Using Zod for schema validation is optional but recommended
    addTool<T extends z.ZodRawShape>(
        tool: Omit<Tool, 'inputSchema'> & { inputSchemaDef?: T, inputSchema?: ToolInputSchema },
        handler: (args: z.infer<z.ZodObject<T>>) => Promise<CallToolResult>
    ): void {
        if (!this.capabilities.tools) throw new Error("Tool capability not enabled.");
        let validator;
        if (tool.inputSchemaDef) {
            validator = z.object(tool.inputSchemaDef);
        }
        this.tools.set(tool.name, {
            ...tool,
            inputSchema: tool.inputSchema || (tool.inputSchemaDef ? this.zodToMcpSchema(validator!) : { type: 'object', properties: {} }),
            handler: async (params) => {
                let validatedArgs = params.arguments;
                if (validator) {
                    const result = validator.safeParse(params.arguments);
                    if (!result.success) {
                        return {
                            content: [{ type: 'text', text: `Invalid arguments: ${result.error.format()}` }],
                            isError: true,
                        };
                    }
                    validatedArgs = result.data;
                }
                return handler(validatedArgs);
            },
            inputValidator: validator,
        });
        this.dispatchMcpEvent("toolsListChanged");
    }

    private zodToMcpSchema(schema: ZodSchema<any, ZodTypeDef, any>): ToolInputSchema {
        // Basic Zod to JSON Schema-like conversion (can be made more robust)
        if (schema instanceof z.ZodObject) {
            const properties: ToolInputSchema['properties'] = {};
            const shape = schema.shape as Record<string, ZodSchema<any, ZodTypeDef, any>>;
            for (const key in shape) {
                const fieldSchema = shape[key];
                let type = 'any';
                if (fieldSchema instanceof z.ZodString) type = 'string';
                else if (fieldSchema instanceof z.ZodNumber) type = 'number';
                else if (fieldSchema instanceof z.ZodBoolean) type = 'boolean';
                else if (fieldSchema instanceof z.ZodArray) type = 'array';
                else if (fieldSchema instanceof z.ZodObject) type = 'object';
                properties[key] = { type, description: fieldSchema.description };
            }
            return { type: 'object', properties, required: Object.keys(shape) /* simplistic */ };
        }
        return { type: 'object', properties: {} };
    }


    removeTool(name: string): void {
        this.tools.delete(name);
        this.dispatchMcpEvent("toolsListChanged");
    }

    addPrompt<T extends z.ZodRawShape>(
        prompt: Prompt & { argsSchemaDef?: T },
        handler: (args: z.infer<z.ZodObject<T>>) => Promise<GetPromptResult>
    ): void {
        if (!this.capabilities.prompts) throw new Error("Prompt capability not enabled.");
        let validator;
        if (prompt.argsSchemaDef) {
            validator = z.object(prompt.argsSchemaDef);
        }
        this.prompts.set(prompt.name, {
            ...prompt,
            handler: async (params) => {
                let validatedArgs = params.arguments;
                if (validator) {
                     const result = validator.safeParse(params.arguments);
                    if (!result.success) {
                        // For prompts, usually the LLM client handles args, so an error might not be ideal.
                        // Instead, we might return a modified prompt indicating the issue or just pass through.
                        // For now, let's be strict.
                         return { messages: [{ role: 'assistant', content: { type: 'text', text: `Error: Invalid arguments for prompt ${prompt.name}. ${result.error.format()}`}}]};
                    }
                    validatedArgs = result.data;
                }
                return handler(validatedArgs);
            },
            argsValidator: validator,
        });
        this.dispatchMcpEvent("promptsListChanged");
    }

    removePrompt(name: string): void {
        this.prompts.delete(name);
        this.dispatchMcpEvent("promptsListChanged");
    }

    // --- Implementation of WindowMcpApi ---

    async getServerInfo(): Promise<ServerInfo> {
        return this.serverInfo;
    }

    async getCapabilities(): Promise<ServerCapabilities> {
        return this.capabilities;
    }

    async listResources(): Promise<ListResourcesResult> {
        if (!this.capabilities.resources) return { resources: [] };
        return { resources: Array.from(this.resources.values()).map(({ handler, ...res }) => res) };
    }

    async readResource(params: { uri: string }): Promise<ReadResourceResult> {
        if (!this.capabilities.resources) throw new Error("Resource capability not enabled.");
        const resource = this.resources.get(params.uri);
        if (!resource) throw new Error(`Resource not found: ${params.uri}`);
        return resource.handler(params);
    }

    async listTools(): Promise<ListToolsResult> {
        if (!this.capabilities.tools) return { tools: [] };
        return { tools: Array.from(this.tools.values()).map(({ handler, inputValidator, ...tool }) => tool) };
    }

    async callTool(params: { name: string; arguments?: any }): Promise<CallToolResult> {
        if (!this.capabilities.tools) throw new Error("Tool capability not enabled.");
        const tool = this.tools.get(params.name);
        if (!tool) throw new Error(`Tool not found: ${params.name}`);
        return tool.handler(params);
    }

    async listPrompts(): Promise<ListPromptsResult> {
        if (!this.capabilities.prompts) return { prompts: [] };
        return { prompts: Array.from(this.prompts.values()).map(({ handler, argsValidator, ...prompt }) => prompt) };
    }

    async getPrompt(params: { name: string; arguments?: any }): Promise<GetPromptResult> {
        if (!this.capabilities.prompts) throw new Error("Prompt capability not enabled.");
        const prompt = this.prompts.get(params.name);
        if (!prompt) throw new Error(`Prompt not found: ${params.name}`);
        return prompt.handler(params);
    }

    // --- Expose on Window ---
    exposeOnWindow(namespace = 'mcp'): void {
        (window as any)[namespace] = this;
        console.log(`MCP Provider exposed on window.${namespace}`);
    }
}