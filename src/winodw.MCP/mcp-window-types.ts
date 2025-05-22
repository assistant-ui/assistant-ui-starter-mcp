// Filename: mcp-window-types.ts

// --- Constants (can be imported or redefined) ---
export const LATEST_PROTOCOL_VERSION = "2025-03-26";
export const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2024-11-05",
  "2024-10-07",
];

// --- Core MCP-Window Specific Types ---

/**
 * Describes the name and version of an MCP-Window provider or client.
 */
export interface Implementation {
  name: string;
  version: string;
  // passthrough for any additional fields
  [key: string]: any;
}

export interface ServerInfo extends Implementation {}
export interface ClientInfo extends Implementation {} // For LLM UI Info

/**
 * Capabilities an MCP-Window provider may support.
 */
export interface ServerCapabilities {
  experimental?: { [key: string]: any };
  logging?: { [key: string]: any } | boolean; // boolean for simple true/false
  completions?: { [key: string]: any } | boolean;
  prompts?: { listChanged?: boolean; [key: string]: any } | boolean;
  resources?: { subscribe?: boolean; listChanged?: boolean; [key: string]: any } | boolean;
  tools?: { listChanged?: boolean; [key: string]: any } | boolean;
  // passthrough for any additional fields
  [key: string]: any;
}

/**
 * Capabilities an MCP-Window client (LLM UI) may conceptually have.
 * In the window.mcp model, the client has fewer capabilities to announce to the provider.
 */
export interface ClientCapabilities {
  experimental?: { [key: string]: any };
  // Example: a client might declare if it can handle specific rich content types from tools
  // Passthrough for any additional fields
  [key:string]: any;
}

// --- Error Handling ---
// We'll use standard JS Error, but can define a custom error class
// if specific error codes/data are needed for window.mcp,
// similar to McpError but without JSON-RPC specifics.
export class McpWindowError extends Error {
  constructor(message: string, public data?: any) {
    super(message);
    this.name = "McpWindowError";
  }
}

// --- Resources ---
export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  size?: number; // Added from schema.ts draft (not in 2024-11-05)
  // passthrough
  [key: string]: any;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64 encoded
  // passthrough
  [key: string]: any;
}

export interface ReadResourceParams {
  uri: string;
  // _meta?: RequestMeta; // If you want to support progress tokens etc.
}
export interface ReadResourceResult {
  contents: ResourceContent[];
  // _meta?: ResultMeta;
}

export interface ListResourcesParams {
  cursor?: string;
  // _meta?: RequestMeta;
}
export interface ListResourcesResult {
  resources: Resource[];
  nextCursor?: string;
  // _meta?: ResultMeta;
}

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
  // passthrough
  [key: string]: any;
}
export interface ListResourceTemplatesParams {
  cursor?: string;
  // _meta?: RequestMeta;
}
export interface ListResourceTemplatesResult {
  resourceTemplates: ResourceTemplate[];
  nextCursor?: string;
  // _meta?: ResultMeta;
}

export interface SubscribeResourceParams {
  uri: string;
  // _meta?: RequestMeta;
}
// No result for subscribe typically, or an empty one
export interface SubscribeResourceResult {
  // _meta?: ResultMeta;
}


export interface UnsubscribeResourceParams {
  uri: string;
  // _meta?: RequestMeta;
}
export interface UnsubscribeResourceResult {
  // _meta?: ResultMeta;
}


// --- Tools ---
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  // passthrough
  [key: string]: any;
}

// For Tool input/output schemas, we can either use `any` for max flexibility
// or define a structure similar to JSON Schema's core parts.
// Using `any` for now to keep it simple, but JSON Schema or Zod defs are better.
export interface McpInputSchema {
    type: "object";
    properties?: { [key: string]: { type: string; description?: string; [key: string]: any } };
    required?: string[];
    // passthrough
    [key: string]: any;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema: McpInputSchema | any; // Could be a Zod schema object in the provider
  outputSchema?: McpInputSchema | any; // Optional
  annotations?: ToolAnnotations;
  // passthrough
  [key: string]: any;
}

export interface CallToolParams {
  name: string;
  arguments?: { [key: string]: any }; // Or a more specific type if using generated types from schemas
  // _meta?: RequestMeta;
}

export interface ToolResultContentItem {
    type: "text" | "image" | "audio" | "resource";
    text?: string;
    data?: string; // base64 for image/audio
    mimeType?: string;
    resource?: ResourceContent; // For embedding a resource directly
    // passthrough
    [key: string]: any;
}

export interface CallToolResult {
  content: ToolResultContentItem[];
  structuredContent?: { [key: string]: any }; // if outputSchema is defined
  isError?: boolean;
  // _meta?: ResultMeta;
}

export interface ListToolsParams {
  cursor?: string;
  // _meta?: RequestMeta;
}
export interface ListToolsResult {
  tools: Tool[];
  nextCursor?: string;
  // _meta?: ResultMeta;
}

// --- Prompts ---
export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
  // passthrough
  [key: string]: any;
}

export interface Prompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
  // passthrough
  [key: string]: any;
}

export interface GetPromptParams {
  name: string;
  arguments?: { [key: string]: string }; // Per schema, value is string
  // _meta?: RequestMeta;
}

export interface PromptMessageContent {
  type: "text" | "image" | "audio" | "resource";
  text?: string;
  data?: string; // base64 for image/audio
  mimeType?: string;
  resource?: ResourceContent; // For embedding a resource directly
  // passthrough
  [key: string]: any;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: PromptMessageContent;
  // passthrough
  [key: string]: any;
}

export interface GetPromptResult {
  description?: string;
  messages: PromptMessage[];
  // _meta?: ResultMeta;
}

export interface ListPromptsParams {
  cursor?: string;
  // _meta?: RequestMeta;
}
export interface ListPromptsResult {
  prompts: Prompt[];
  nextCursor?: string;
  // _meta?: ResultMeta;
}

// --- Logging (Provider to Client via Notifications) ---
export type LoggingLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical"
  | "alert"
  | "emergency";

// Client tells Provider what level to log (optional method)
export interface SetLoggingLevelParams {
  level: LoggingLevel;
  // _meta?: RequestMeta;
}
// No result or empty result
export interface SetLoggingLevelResult {
    // _meta?: ResultMeta;
}


// --- Completions (for prompt/resource arguments) ---
export interface ResourceReference {
  type: "ref/resource";
  uri: string;
  // passthrough
  [key: string]: any;
}

export interface PromptReference {
  type: "ref/prompt";
  name: string;
  // passthrough
  [key: string]: any;
}

export interface CompleteParams {
  ref: ResourceReference | PromptReference;
  argument: {
    name: string;
    value: string;
    // passthrough
    [key: string]: any;
  };
  // _meta?: RequestMeta;
}

export interface CompleteResult {
  completion: {
    values: string[]; // max 100
    total?: number;
    hasMore?: boolean;
    // passthrough
    [key: string]: any;
  };
  // _meta?: ResultMeta;
}

// --- Notifications (Provider to Client) ---
// These define the `event.detail` structure for CustomEvents

export interface ResourceListChangedNotificationPayload {
  // No specific payload needed, signals a refresh
  // _meta?: NotificationMeta;
}

export interface ResourceUpdatedNotificationPayload {
  uri: string;
  // _meta?: NotificationMeta;
}

export interface ToolListChangedNotificationPayload {
  // No specific payload needed
  // _meta?: NotificationMeta;
}

export interface PromptListChangedNotificationPayload {
  // No specific payload needed
  // _meta?: NotificationMeta;
}

export interface LoggingMessageNotificationPayload {
  level: LoggingLevel;
  logger?: string;
  data: any; // JSON serializable
  // _meta?: NotificationMeta;
}

// Union type for all possible notification details
export type McpNotificationDetail =
  | ({ type: "resourcesListChanged" } & ResourceListChangedNotificationPayload)
  | ({ type: "resourceUpdated" } & ResourceUpdatedNotificationPayload)
  | ({ type: "toolsListChanged" } & ToolListChangedNotificationPayload)
  | ({ type: "promptsListChanged" } & PromptListChangedNotificationPayload)
  | ({ type: "loggingMessage" } & LoggingMessageNotificationPayload); // Renamed from "notifications/message"

// The CustomEvent detail type
export interface McpNotificationEventDetail {
  type: McpNotificationDetail['type']; // The specific notification type
  payload?: Omit<McpNotificationDetail, 'type'>; // The payload for that type
}


// --- window.mcp Provider API Interface ---
// This is what the website will implement and expose
export interface WindowMcpApi extends EventTarget {
  // Lifecycle & Info
  getServerInfo: () => Promise<ServerInfo>;
  getCapabilities: () => Promise<ServerCapabilities>;

  // Resources
  listResources: (params?: ListResourcesParams) => Promise<ListResourcesResult>;
  readResource: (params: ReadResourceParams) => Promise<ReadResourceResult>;
  listResourceTemplates?: (params?: ListResourceTemplatesParams) => Promise<ListResourceTemplatesResult>; // Optional
  subscribeResource?: (params: SubscribeResourceParams) => Promise<SubscribeResourceResult>; // Optional if supported
  unsubscribeResource?: (params: UnsubscribeResourceParams) => Promise<UnsubscribeResourceResult>; // Optional if supported

  // Tools
  listTools: (params?: ListToolsParams) => Promise<ListToolsResult>;
  callTool: (params: CallToolParams) => Promise<CallToolResult>;

  // Prompts
  listPrompts: (params?: ListPromptsParams) => Promise<ListPromptsResult>;
  getPrompt: (params: GetPromptParams) => Promise<GetPromptResult>;

  // Logging (optional method for client to set level on provider)
  setLoggingLevel?: (params: SetLoggingLevelParams) => Promise<SetLoggingLevelResult>;

  // Completions (optional)
  complete?: (params: CompleteParams) => Promise<CompleteResult>;
}