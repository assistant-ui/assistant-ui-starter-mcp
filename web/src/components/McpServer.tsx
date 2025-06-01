import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Play,
  Server,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import useMcpContextProvider from '../hooks/useMcpContextProvider';

// Add this helper function to parse and format MCP errors
function formatMcpError(error: any): {
  title: string;
  description: React.ReactNode;
} {
  const errorMessage = error.message || 'Tool execution failed';

  // Check if this is an MCP validation error with JSON data
  const mcpErrorMatch = errorMessage.match(/MCP error (-?\d+):\s*(.+)/);

  if (mcpErrorMatch) {
    const errorCode = mcpErrorMatch[1];
    const errorDetails = mcpErrorMatch[2];

    // Try to extract JSON validation errors
    const jsonMatch = errorDetails.match(/\[(.*)\]/s);

    if (jsonMatch) {
      try {
        // Parse the JSON array
        const validationErrors = JSON.parse(`[${jsonMatch[1]}]`);

        return {
          title: `MCP Error ${errorCode}`,
          description: (
            <div className="space-y-2">
              <p className="text-xs">Invalid arguments provided:</p>
              <div className="space-y-1">
                {validationErrors.map((err: any, index: number) => (
                  <div
                    key={index}
                    className="bg-destructive/10 rounded p-2 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {err.path?.join('.') || 'field'}
                      </Badge>
                      <span className="text-xs font-medium">{err.message}</span>
                    </div>
                    {err.validation && (
                      <p className="text-xs text-muted-foreground">
                        Expected: {err.validation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ),
        };
      } catch (e) {
        // If JSON parsing fails, return a cleaner version
        return {
          title: `MCP Error ${errorCode}`,
          description: (
            <p className="text-xs">
              {errorDetails.replace(/\[.*\]/, '').trim()}
            </p>
          ),
        };
      }
    }

    // Non-JSON MCP error
    return {
      title: `MCP Error ${errorCode}`,
      description: <p className="text-xs">{errorDetails}</p>,
    };
  }

  // Regular error
  return {
    title: 'Execution Failed',
    description: <p className="text-xs">{errorMessage}</p>,
  };
}

export default function McpServer() {
  const { mcpClient, capabilities, isLoading, error, resources, mcpTools } =
    useMcpContextProvider();

  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [callingTools, setCallingTools] = useState<Set<string>>(new Set());

  // Create Zod schemas for each tool dynamically
  const toolSchemas = useMemo(() => {
    const schemas: Record<string, z.ZodObject<any>> = {};

    mcpTools.forEach((tool) => {
      if (tool.inputSchema?.properties) {
        const schemaShape: Record<string, z.ZodType<any>> = {};

        Object.entries(tool.inputSchema.properties).forEach(
          ([key, prop]: [string, any]) => {
            let zodType: z.ZodType<any>;

            // Handle different types
            switch (prop.type) {
              case 'string':
                if (prop.enum) {
                  // Handle enum as a select field
                  zodType = z.enum(prop.enum as [string, ...string[]]);
                } else {
                  zodType = z.string();
                }
                break;
              case 'number':
                zodType = z.number();
                break;
              case 'boolean':
                zodType = z.boolean();
                break;
              case 'array':
                zodType = z.array(z.any());
                break;
              case 'object':
                zodType = z.object({});
                break;
              default:
                zodType = z.any();
            }

            // Apply additional validators
            if (prop.minLength && zodType instanceof z.ZodString) {
              zodType = zodType.min(prop.minLength);
            }
            if (prop.maxLength && zodType instanceof z.ZodString) {
              zodType = zodType.max(prop.maxLength);
            }
            if (prop.minimum !== undefined && zodType instanceof z.ZodNumber) {
              zodType = zodType.min(prop.minimum);
            }
            if (prop.maximum !== undefined && zodType instanceof z.ZodNumber) {
              zodType = zodType.max(prop.maximum);
            }

            // Handle required fields
            const isRequired =
              tool.inputSchema.required?.includes(key) || false;
            if (!isRequired && prop.type !== 'boolean') {
              zodType = zodType.optional();
            }

            schemaShape[key] = zodType;
          }
        );

        schemas[tool.name] = z.object(schemaShape);
      }
    });

    return schemas;
  }, [mcpTools]);

  if (isLoading) {
    return (
      <div className="h-full p-2">
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-2">
        <Alert variant="destructive" className="w-full">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="text-sm">MCP Error</AlertTitle>
          <AlertDescription className="text-xs">
            {error.message || 'Failed to connect to MCP server'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const toggleToolExpanded = (toolName: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolName)) {
      newExpanded.delete(toolName);
    } else {
      newExpanded.add(toolName);
    }
    setExpandedTools(newExpanded);
  };

  const callTool = async (toolName: string, data: any) => {
    if (!mcpClient) return;
    setCallingTools((prev) => new Set([...prev, toolName]));

    // Show loading toast
    const loadingToastId = toast.loading(`Calling ${toolName}...`, {
      description: 'Please wait while the tool executes',
    });

    try {
      const result = await mcpClient.callTool({
        name: toolName,
        arguments: data,
      });

      // Dismiss loading toast and show success with result
      toast.dismiss(loadingToastId);

      // Format the result for display
      const resultText =
        typeof result === 'object'
          ? JSON.stringify(result, null, 2).substring(0, 500) +
            (JSON.stringify(result).length > 500 ? '...' : '')
          : String(result);

      toast.success(`${toolName} completed`, {
        description: (
          <div className="mt-2 w-full overflow-hidden">
            <div className="text-xs font-medium mb-1">Result:</div>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto overflow-y-auto max-h-32 max-w-full whitespace-pre-wrap break-all">
              {resultText}
            </pre>
          </div>
        ),
        icon: <CheckCircle className="h-4 w-4" />,
        duration: 8000,
      });
    } catch (error: any) {
      // Dismiss loading toast and show error
      toast.dismiss(loadingToastId);

      // Format the error nicely
      const { title, description } = formatMcpError(error);

      toast.error(`${toolName} failed: ${title}`, {
        description,
        icon: <XCircle className="h-4 w-4" />,
        duration: 7000,
        action: {
          label: 'Retry',
          onClick: () => {
            const form = document.querySelector(
              `[data-tool-form="${toolName}"]`
            ) as HTMLFormElement;
            if (form) {
              form.requestSubmit();
            }
          },
        },
      });
    } finally {
      setCallingTools((prev) => {
        const newSet = new Set(prev);
        newSet.delete(toolName);
        return newSet;
      });
    }
  };

  return (
    <div className="h-full overflow-auto space-y-3 p-2">
      {/* Server Info */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Server className="h-4 w-4" />
          <span className="font-medium text-sm">MCP Server</span>
        </div>

        {capabilities && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(capabilities).map(([key, enabled]) => (
              <Badge
                key={key}
                variant={enabled ? 'default' : 'secondary'}
                className="text-xs"
              >
                {key}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Tools */}
      {capabilities?.tools && (
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-4 w-4" />
            <span className="font-medium text-sm">
              Tools ({mcpTools.length})
            </span>
          </div>

          {mcpTools.length === 0 ? (
            <p className="text-muted-foreground text-xs">No tools available</p>
          ) : (
            <div className="space-y-2">
              {mcpTools.map((tool) => (
                <ToolCard
                  key={tool.name}
                  tool={tool}
                  isExpanded={expandedTools.has(tool.name)}
                  onToggle={() => toggleToolExpanded(tool.name)}
                  onCall={callTool}
                  isCalling={callingTools.has(tool.name)}
                  schema={toolSchemas[tool.name]}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Resources */}
      {capabilities?.resources && resources.length > 0 && (
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4" />
            <span className="font-medium text-sm">
              Resources ({resources.length})
            </span>
          </div>

          <div className="space-y-2">
            {resources.map((resource) => (
              <Card key={resource.uri} className="p-2 bg-muted/50">
                <div className="font-medium text-xs truncate">
                  {resource.name || resource.uri}
                </div>
                {resource.description && (
                  <div className="text-muted-foreground text-xs truncate mt-1">
                    {resource.description}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface ToolCardProps {
  tool: any;
  isExpanded: boolean;
  onToggle: () => void;
  onCall: (toolName: string, data: any) => void;
  isCalling: boolean;
  schema?: z.ZodObject<any>;
}

function ToolCard({
  tool,
  isExpanded,
  onToggle,
  onCall,
  isCalling,
  schema,
}: ToolCardProps) {
  const form = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: getDefaultValues(tool.inputSchema),
  });

  const onSubmit = (data: any) => {
    onCall(tool.name, data);
  };

  return (
    <Card className="border">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex flex-col space-y-1 flex-1 min-w-0">
          <CardTitle className="text-xs font-medium truncate">
            {tool.name}
          </CardTitle>
          {tool.description && (
            <p className="text-xs text-muted-foreground truncate">
              {tool.description}
            </p>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-2 pt-0 space-y-3">
          {' '}
          {/* Increased space-y for better separation */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3" // Increased space-y for better separation
              data-tool-form={tool.name}
            >
              {/* Tool Parameters */}
              {tool.inputSchema?.properties &&
                Object.keys(tool.inputSchema.properties).length > 0 && (
                  <div className="space-y-2">
                    {' '}
                    {/* Added container for parameters */}
                    {Object.entries(tool.inputSchema.properties).map(
                      ([paramName, paramSchema]: [string, any]) => (
                        <FormField
                          key={paramName}
                          control={form.control}
                          name={paramName}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">
                                {' '}
                                {/* Added font-medium */}
                                {paramName}
                                {tool.inputSchema.required?.includes(
                                  paramName
                                ) && (
                                  <span className="text-destructive ml-1">
                                    *
                                  </span>
                                )}
                              </FormLabel>
                              {renderFormControl(field, paramSchema)}
                              {paramSchema.description && (
                                <FormDescription className="text-xs">
                                  {paramSchema.description}
                                </FormDescription>
                              )}
                              <FormMessage className="text-xs" />{' '}
                              {/* Added text-xs */}
                            </FormItem>
                          )}
                        />
                      )
                    )}
                  </div>
                )}

              {/* Call Tool Button */}
              <Button
                type="submit"
                disabled={isCalling}
                size="sm"
                className="w-full h-7 text-xs" // Added text-xs
              >
                {isCalling ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-1" />
                    <span>Calling...</span>{' '}
                    {/* Removed text-xs here, already on button */}
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    <span>Call</span>{' '}
                    {/* Removed text-xs here, already on button */}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      )}
    </Card>
  );
}

function renderFormControl(field: any, paramSchema: any) {
  // Handle enum fields as select
  if (paramSchema.enum && Array.isArray(paramSchema.enum)) {
    return (
      <FormControl>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <SelectTrigger className="text-xs h-7">
            <SelectValue placeholder={`Select ${field.name}`} />
          </SelectTrigger>
          <SelectContent>
            {paramSchema.enum.map((value: string) => (
              <SelectItem key={value} value={value} className="text-xs">
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
    );
  }

  // Handle different input types
  switch (paramSchema.type) {
    case 'boolean':
      return (
        <FormControl>
          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
        </FormControl>
      );

    case 'string':
      if (paramSchema.maxLength && paramSchema.maxLength > 100) {
        return (
          <FormControl>
            <Textarea
              {...field}
              placeholder={paramSchema.description || `Enter ${field.name}`}
              className="text-xs min-h-[60px]"
              rows={2}
            />
          </FormControl>
        );
      }
      return (
        <FormControl>
          <Input
            {...field}
            placeholder={paramSchema.description || `Enter ${field.name}`}
            className="text-xs h-7"
          />
        </FormControl>
      );

    case 'number':
      return (
        <FormControl>
          <Input
            {...field}
            type="number"
            onChange={(e) =>
              field.onChange(e.target.value ? Number(e.target.value) : '')
            }
            placeholder={paramSchema.description || `Enter ${field.name}`}
            className="text-xs h-7"
          />
        </FormControl>
      );

    default:
      return (
        <FormControl>
          <Input
            {...field}
            placeholder={paramSchema.description || `Enter ${field.name}`}
            className="text-xs h-7"
          />
        </FormControl>
      );
  }
}

function getDefaultValues(inputSchema: any) {
  const defaults: Record<string, any> = {};

  if (inputSchema?.properties) {
    Object.entries(inputSchema.properties).forEach(
      ([key, prop]: [string, any]) => {
        switch (prop.type) {
          case 'boolean':
            defaults[key] = false;
            break;
          case 'number':
            defaults[key] = prop.default ?? '';
            break;
          case 'string':
            defaults[key] = prop.default ?? '';
            break;
          case 'array':
            defaults[key] = [];
            break;
          case 'object':
            defaults[key] = {};
            break;
          default:
            defaults[key] = '';
        }
      }
    );
  }

  return defaults;
}
