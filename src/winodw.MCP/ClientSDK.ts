// Filename: mcp-window-client.ts
import type {
    CallToolResult,
    GetPromptResult,
    ListPromptsResult,
    ListResourcesResult,
    ListToolsResult,
    McpNotification,
    ReadResourceResult,
    ServerCapabilities,
    ServerInfo,
    WindowMcpApi
} from './mcp-window-types.ts';


export class McpWindowClient {
    private provider: WindowMcpApi;
    public serverInfo?: ServerInfo;
    public serverCapabilities?: ServerCapabilities;

    constructor(namespace = 'mcp') {
        if (!(window as any)[namespace]) {
            throw new Error(`MCP Provider not found on window.${namespace}`);
        }
        this.provider = (window as any)[namespace] as WindowMcpApi;
    }

    async connect(): Promise<{ serverInfo: ServerInfo, serverCapabilities: ServerCapabilities }> {
        this.serverInfo = await this.provider.getServerInfo();
        this.serverCapabilities = await this.provider.getCapabilities();
        return { serverInfo: this.serverInfo, serverCapabilities: this.serverCapabilities };
    }

    // Resources
    async listResources(): Promise<ListResourcesResult> {
        if (!this.serverCapabilities?.resources) return { resources: [] };
        return this.provider.listResources();
    }

    async readResource(uri: string): Promise<ReadResourceResult> {
        if (!this.serverCapabilities?.resources) throw new Error("Server does not support resources.");
        return this.provider.readResource({ uri });
    }

    // Tools
    async listTools(): Promise<ListToolsResult> {
        if (!this.serverCapabilities?.tools) return { tools: [] };
        return this.provider.listTools();
    }

    async callTool(name: string, args?: any): Promise<CallToolResult> {
        if (!this.serverCapabilities?.tools) throw new Error("Server does not support tools.");
        return this.provider.callTool({ name, arguments: args });
    }

    // Prompts
    async listPrompts(): Promise<ListPromptsResult> {
        if (!this.serverCapabilities?.prompts) return { prompts: [] };
        return this.provider.listPrompts();
    }

    async getPrompt(name: string, args?: any): Promise<GetPromptResult> {
        if (!this.serverCapabilities?.prompts) throw new Error("Server does not support prompts.");
        return this.provider.getPrompt({ name, arguments: args });
    }

    // Notifications
    onNotification(callback: (notification: McpNotification) => void): () => void {
        const handler = (event: Event) => {
            const mcpEvent = event as CustomEvent<McpNotification>;
            if (mcpEvent.detail) {
                callback(mcpEvent.detail);
            }
        };
        this.provider.addEventListener("mcpNotification", handler);
        return () => this.provider.removeEventListener("mcpNotification", handler);
    }

    onResourcesListChanged(callback: () => void): () => void {
        return this.onNotification(notification => {
            if (notification.type === "resourcesListChanged") callback();
        });
    }

    onToolsListChanged(callback: () => void): () => void {
         return this.onNotification(notification => {
            if (notification.type === "toolsListChanged") callback();
        });
    }

    onPromptsListChanged(callback: () => void): () => void {
         return this.onNotification(notification => {
            if (notification.type === "promptsListChanged") callback();
        });
    }

    onResourceUpdated(callback: (uri: string) => void): () => void {
        return this.onNotification(notification => {
            if (notification.type === "resourceUpdated" && notification.payload?.uri) {
                callback(notification.payload.uri);
            }
        });
    }
}