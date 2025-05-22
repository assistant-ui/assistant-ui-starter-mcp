import useMcpContextProvider from "./useMcpContextProvider";

export default function McpContextProviderComponent({ children, mcpClientNamespace }: { children: React.ReactNode, mcpClientNamespace?: string}) {
    useMcpContextProvider(mcpClientNamespace);
    return <>{children}</>;
 }