import {
    BrowserClientTransport,
    type ExtensionClientTransport,
} from '@b-mcp/transports';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type {
    Tool as McpTool,
    Resource,
    ServerCapabilities,
} from '@modelcontextprotocol/sdk/types.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface UseMcpClientOptions {
  clientName?: string;
  clientVersion?: string;
  transport?: BrowserClientTransport | ExtensionClientTransport;
}

export interface UseMcpClientResult {
  mcpClient: Client | null;
  capabilities: ServerCapabilities | null;
  resources: Resource[];
  tools: McpTool[];
  isLoading: boolean;
  error: Error | null;
}

export function useMcpClient({
  clientName = 'MyMcpClient',
  clientVersion = '0.1.0',
  transport: providedTransport,
}: UseMcpClientOptions = {}): UseMcpClientResult {
  // Memoize the transport to ensure it's only created once
  const transport = useMemo(
    () => providedTransport || new BrowserClientTransport(),
    [] // Empty deps array ensures this is only created once
  );

  const [mcpClient, setMcpClient] = useState<Client | null>(null);
  const [capabilities, setCapabilities] = useState<ServerCapabilities | null>(
    null
  );
  const [resources, setResources] = useState<Resource[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInitialData = useCallback(
    async (signal: AbortSignal) => {
      if (!mcpClient) {
        const clientInstance = new Client({
          name: clientName,
          version: clientVersion,
        });
        try {
          await clientInstance.connect(transport);
          if (signal.aborted) return;
          setMcpClient(clientInstance);
          setError(null);
        } catch (e: unknown) {
          if (signal.aborted) return;
          setError(e instanceof Error ? e : new Error(String(e)));
          setMcpClient(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const serverCaps = mcpClient.getServerCapabilities();
        if (signal.aborted) return;
        setCapabilities(serverCaps ?? null);

        if (serverCaps?.resources) {
          const res = await mcpClient.listResources();
          if (signal.aborted) return;
          setResources(res.resources);
        } else {
          setResources([]);
        }

        if (serverCaps?.tools) {
          const toolsRes = await mcpClient.listTools();
          if (signal.aborted) return;
          setTools(toolsRes.tools);
        } else {
          setTools([]);
        }

        setError(null);
      } catch (e: unknown) {
        if (signal.aborted) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [mcpClient, clientName, clientVersion, transport]
  );

  useEffect(() => {
    const ac = new AbortController();
    fetchInitialData(ac.signal);
    return () => ac.abort();
  }, [fetchInitialData]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Disconnect the client when the component unmounts
      mcpClient?.close().catch(console.error);
    };
  }, [mcpClient]);

  return { mcpClient, capabilities, resources, tools, isLoading, error };
}
