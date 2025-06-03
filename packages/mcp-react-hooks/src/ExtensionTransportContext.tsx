import { ExtensionClientTransport } from '@b-mcp/transports';
import { createContext, ReactNode, useContext, useMemo } from 'react';

interface ExtensionTransportContextValue {
  transport: ExtensionClientTransport;
}

const ExtensionTransportContext = createContext<ExtensionTransportContextValue | null>(null);

export interface ExtensionTransportProviderProps {
  children: ReactNode;
  port?: any; // Use 'any' to avoid chrome namespace issues in non-extension environments
  clientInstanceId?: string;
}

/**
 * Provider component that creates and shares a single ExtensionClientTransport instance
 * across all child components. This ensures all MCP clients use the same transport
 * and client ID, preventing message routing issues.
 */
export function ExtensionTransportProvider({ 
  children, 
  port,
  clientInstanceId 
}: ExtensionTransportProviderProps) {
  const transport = useMemo(() => {
    return new ExtensionClientTransport({
      port,
      clientInstanceId,
      connectionTimeout: 30000,
      reconnectionOptions: {
        maxReconnectionDelay: 30000,
        initialReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.5,
        maxRetries: 2,
      }
    });
  }, []); // Empty deps ensures this is created only once

  return (
    <ExtensionTransportContext.Provider value={{ transport }}>
      {children}
    </ExtensionTransportContext.Provider>
  );
}

/**
 * Hook to access the shared ExtensionClientTransport instance.
 * Must be used within an ExtensionTransportProvider.
 */
export function useExtensionTransport(): ExtensionClientTransport {
  const context = useContext(ExtensionTransportContext);
  if (!context) {
    throw new Error('useExtensionTransport must be used within an ExtensionTransportProvider');
  }
  return context.transport;
} 