// src/hooks/useMcpContextProvider.tsx  
import { mcpToolToJSONSchema } from '@/lib/utils';
import { tool, useAssistantRuntime } from '@assistant-ui/react';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Tool as McpTool, Resource, ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { useEffect, useMemo, useRef } from 'react';
import { useMcpClient } from './useMcpClient';

interface McpContext {  
  mcpClient: Client | null;  
  capabilities: ServerCapabilities | null;  
  isLoading: boolean;  
  error: Error | null;  
  resources: Resource[];  
  mcpTools: McpTool[];  
}  

export default function useMcpContextProvider(): McpContext {  
  const runtime = useAssistantRuntime();  
  const { mcpClient, capabilities, resources, tools: mcpTools, isLoading, error } =  
    useMcpClient({ clientName: "MyMcpClient", clientVersion: "0.1.0" });  
    
  const registeredToolNamesRef = useRef<Set<string>>(new Set());

  const assistantTools = useMemo(() => {  
    if (!mcpClient) return [];  
    return mcpTools.map(mcpT => ({  
      name: mcpT.name,  
      assistantTool: tool({  
        type: "frontend",  
        description: mcpT.description,  
        parameters: mcpToolToJSONSchema(mcpT.inputSchema),  
        execute: async (args: Record<string, unknown>) => {  
          if (!mcpClient) throw new Error(`Tool ${mcpT.name}: MCP client not available`);  
          try {  
            return await mcpClient.callTool({ name: mcpT.name, arguments: args });  
          } catch (err: any) {  
            throw new Error(err.message || `Error executing ${mcpT.name}`);  
          }  
        },  
      }),  
    }));  
  }, [mcpClient, mcpTools]);  


  console.log({assistantTools})

  useEffect(() => {  
    if (!mcpClient || !runtime) return;  
    
    const current = new Set(assistantTools.map(t => t.name));  
    const prev = registeredToolNamesRef.current;  
    const changed = prev.size !== current.size  
      || [...current].some(n => !prev.has(n))  
      || [...prev].some(n => !current.has(n));  
    if (!changed) return;  

    const unregister = runtime.registerModelContextProvider({  
      getModelContext: () => ({  
        system: "TOOLS:",  
        tools: Object.fromEntries(assistantTools.map(t => [t.name, t.assistantTool])),  
      }),  
    });  
    
    registeredToolNamesRef.current = current;  

    return () => {  
      unregister();  
    };  
  }, [mcpClient, runtime, assistantTools]);  

  return { mcpClient, capabilities, isLoading, error, resources, mcpTools };  
}  