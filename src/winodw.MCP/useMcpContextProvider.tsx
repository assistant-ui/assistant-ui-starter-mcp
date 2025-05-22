// Filename: useMcpContextProvider.ts
import { tool as assistantToolHelper, makeAssistantTool, useAssistantRuntime } from '@assistant-ui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { McpWindowClient } from './ClientSDK';
import { convertMcpToolToAssistantTool } from './mcp-tool-adapter';
import type {
    Resource as McpResource,
    ServerCapabilities as McpServerCapabilities,
    ServerInfo as McpServerInfo,
    Tool as McpTool,
} from './mcp-window-types'; // Your MCP types

interface AssistantTool {
  name: string;
  description?: string;
  parameters: any; // Zod schema from assistant-ui
  execute: (args: any) => Promise<any>;
}


export interface McpContext {
    mcpClient: McpWindowClient | null;
    serverInfo: McpServerInfo | null;
    capabilities: McpServerCapabilities | null;
    isLoading: boolean;
    error: Error | null;
    resources: McpResource[];
    mcpTools: McpTool[]; // Original MCP tools
}

export default function useMcpContextProvider(mcpClientNamespace = 'mcp'): McpContext {
    const assistantRuntime = useAssistantRuntime();
    const [mcpClient, setMcpClient] = useState<McpWindowClient | null>(null);
    const [serverInfo, setServerInfo] = useState<McpServerInfo | null>(null);
    const [capabilities, setCapabilities] = useState<McpServerCapabilities | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const [mcpResources, setMcpResources] = useState<McpResource[]>([]);
    const [mcpTools, setMcpTools] = useState<McpTool[]>([]); // Store original MCP tools

    // Memoize the client instance
    const clientInstance = useMemo(() => {
        try {
            return new McpWindowClient(mcpClientNamespace);
        } catch (e: any) {
            setError(e);
            setIsLoading(false);
            return null;
        }
    }, [mcpClientNamespace]);

    const fetchInitialData = useCallback(async () => {
        if (!clientInstance) return;

        setIsLoading(true);
        setError(null);
        try {
            const { serverInfo: sInfo, serverCapabilities: caps } = await clientInstance.connect();
            setServerInfo(sInfo);
            setCapabilities(caps);
            setMcpClient(clientInstance);

            if (caps?.resources) {
                const resourcesResult = await clientInstance.listResources();
                setMcpResources(resourcesResult.resources);
            }
            if (caps?.tools) {
                const toolsResult = await clientInstance.listTools();
                setMcpTools(toolsResult.tools);
            }
        } catch (e: any) {
            console.error("MCP Connection Error:", e);
            setError(e);
            setMcpClient(null); // Ensure client is null on error
        } finally {
            setIsLoading(false);
        }
    }, [clientInstance]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]); // Run once on mount due to clientInstance dependency

    // Effect for registering with Assistant UI and handling dynamic updates
    useEffect(() => {
        if (!mcpClient || !assistantRuntime || isLoading || error) {
            return;
        }

        // --- Convert MCP Tools to Assistant UI Tools ---
        const assistantToolsList: AssistantTool[] = mcpClient.serverCapabilities?.tools
            ? mcpTools.map(mcpT => convertMcpToolToAssistantTool(mcpT, mcpClient))
            : [];

        const toolsForAssistant: Record<string, AssistantTool> = {};
        assistantToolsList.forEach(t => {
            // makeAssistantTool(t);
            toolsForAssistant[t.name] = t;
        });

        // --- Prepare System Instructions from MCP Resources (example) ---
        // This is a basic example; you might want more sophisticated logic.
        let systemInstructionsFromMcp = "";
        if (mcpClient.serverCapabilities?.resources && mcpResources.length > 0) {
            systemInstructionsFromMcp += "\nThe following context from the current page is available:\n";
            mcpResources.forEach(res => {
                systemInstructionsFromMcp += `- ${res.name} (uri: ${res.uri}): ${res.description || 'No description.'}\n`;
                // You could even pre-fetch some key resources here if small, but be careful.
                // e.g. if (res.uri === "page://title") {
                //    client.readResource(res.uri).then(data => systemInstructionsFromMcp += `Current Title: ${data.contents[0]?.text}\n`);
                // }
            });
             systemInstructionsFromMcp += "You can use the 'readResource' tool to get the content of these resources if needed, or I will provide them if I think they are relevant.\n";
        }

        // --- Register Context Provider ---
        const unregister = assistantRuntime.registerModelContextProvider({
            // Unique ID for this provider
            id: `mcp-window-provider-${mcpClientNamespace}`,
            // Order of execution (lower numbers run first) - adjust as needed
            order: 100,
            getModelContext: () => {
                // Potentially re-fetch resources/tools if you expect them to change
                // and don't rely solely on notifications for critical updates.
                // For now, we use the state.

                // Construct system message. You might combine MCP server instructions
                // with resource list.
                let systemMessage = "";
                if (mcpClient.serverInfo?.name) {
                    // Note: client.getInstructions() from official MCP returns server-provided instructions.
                    // We don't have a direct equivalent in mcp-window-types yet,
                    // but serverInfo could be expanded or a new method added.
                    // systemMessage += `Interacting with MCP Provider: ${mcpClient.serverInfo.name}\n`;
                }
                systemMessage += systemInstructionsFromMcp;


                // Create a dedicated "readResource" tool if resources are available
                // const allToolsForAssistant = { ...toolsForAssistant };
                // if (mcpClient.serverCapabilities?.resources && mcpResources.length > 0) {
                //     allToolsForAssistant['readMcpResource'] = assistantToolHelper({
                //         name: 'readMcpResource',
                //         description: 'Reads the content of an available MCP resource from the current page.',
                //         parameters: z.object({
                //             uri: z.string().describe(`The URI of the resource to read. Available URIs: ${mcpResources.map(r => r.uri).join(', ')}`)
                //         }),
                //         execute: async ({ uri }) => {
                //             try {
                //                 const res = await mcpClient.readResource(uri);
                //                 // Decide how to format this for the assistant
                //                 const textContent = res.contents.filter(c => c.text).map(c => c.text).join("\n\n");
                //                 return { content: textContent || "Resource read, but no text content found." };
                //             } catch (e: any) {
                //                 return { error: `Failed to read resource ${uri}: ${e.message}` };
                //             }
                //         }
                //     });
                // }

                console.log({toolsForAssistant})
                return {
                    system: systemMessage.trim() || undefined, // Ensure it's undefined if empty
                    tools: toolsForAssistant,
                };
            },
        });

        // --- Handle dynamic updates from MCP Provider ---
        const unsubs: (() => void)[] = [];
        if (mcpClient.serverCapabilities?.tools) {
            unsubs.push(mcpClient.onToolsListChanged(async () => {
                console.log("MCP tools list changed, re-fetching...");
                const toolsResult = await mcpClient.listTools();
                setMcpTools(toolsResult.tools);
                // Assistant UI should ideally pick up changes on next getModelContext call,
                // or you might need to force a context refresh if assistant-ui supports it.
            }));
        }
        if (mcpClient.serverCapabilities?.resources) {
            unsubs.push(mcpClient.onResourcesListChanged(async () => {
                console.log("MCP resources list changed, re-fetching...");
                const resourcesResult = await mcpClient.listResources();
                setMcpResources(resourcesResult.resources);
            }));
            // Potentially listen to onResourceUpdated too for more granular updates
        }

        return () => {
            unregister();
            unsubs.forEach(u => u());
        };
    }, [
        mcpClient,
        assistantRuntime,
        isLoading,
        error,
        mcpResources,
        mcpTools,
        mcpClientNamespace, // Include namespace in deps
    ]);

    return {
        mcpClient,
        serverInfo,
        capabilities,
        isLoading,
        error,
        resources: mcpResources,
        mcpTools: mcpTools,
    };
}

