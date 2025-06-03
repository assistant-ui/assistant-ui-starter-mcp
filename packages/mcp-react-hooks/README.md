# @b-mcp/mcp-react-hooks

React hooks for Model Context Protocol (MCP) client interactions.

## Installation

```bash
npm install @b-mcp/mcp-react-hooks
# or
yarn add @b-mcp/mcp-react-hooks
# or
pnpm add @b-mcp/mcp-react-hooks
```

## Usage

```tsx
import { useMcpClient } from '@b-mcp/mcp-react-hooks';

function MyComponent() {
  const { mcpClient, capabilities, resources, tools, isLoading, error } =
    useMcpClient({
      clientName: 'MyApp',
      clientVersion: '1.0.0',
    });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>MCP Capabilities</h2>
      <pre>{JSON.stringify(capabilities, null, 2)}</pre>
    </div>
  );
}
```

## API

### `useMcpClient(options?)`

#### Options

- `clientName` (optional): Name of your MCP client. Default: 'MyMcpClient'
- `clientVersion` (optional): Version of your MCP client. Default: '0.1.0'

#### Returns

- `mcpClient`: The MCP client instance
- `capabilities`: Server capabilities
- `resources`: Available resources
- `tools`: Available tools
- `isLoading`: Loading state
- `error`: Error state

## License

MIT
