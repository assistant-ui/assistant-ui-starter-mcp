import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Shadcn Alert
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Shadcn Card
import { Checkbox } from "@/components/ui/checkbox"; // Shadcn Checkbox
import { Skeleton } from "@/components/ui/skeleton"; // Shadcn Skeleton
import { hc } from 'hono/client';
import { Terminal } from "lucide-react"; // Icon for Alert
import { useEffect, useState } from 'react';
import type { Todo } from "worker/db/schema";
import type { AppType } from '../worker';

const client = hc<AppType>(location.origin);

export default function Todos() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // TODO: Replace this with a dynamic userId from auth context or props
    const placeholderUserId = "test-user-123"; // Example User ID

    useEffect(() => {
        const fetchTodos = async () => {
            if (!placeholderUserId) {
                setError("User ID is not available.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const migrationRes = await client.api.migrate.$get({}).then(a => a.json())

                if(!migrationRes.success){
                    throw new Error(migrationRes.message)
                }
                // Updated API call to fetch todos for a specific user
                const res = await client.api.users[':userId'].todos.$get({
                    param: { userId: placeholderUserId },
                });

                if (!res.ok) {
                    if (res.status === 404) {
                        const errorData = await res.json();
                        if (errorData.error === "User not found") {
                             // User doesn't exist, so they won't have any todos.
                             // You might want to prompt to create a user or handle this differently.
                            setTodos([]);
                            setError(null); // Or set a specific message like "User not found, create one?"
                            console.warn(`User with ID ${placeholderUserId} not found. Displaying empty todo list.`);
                        } else {
                            throw new Error(`Failed to fetch todos: ${errorData.error || res.statusText} (${res.status})`);
                        }
                    } else {
                        throw new Error(`Failed to fetch todos: ${res.statusText} (${res.status})`);
                    }
                } else {
                    const data = (await res.json()) as Todo[]; // Ensure data is typed as Todo[]
                    setTodos(data);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
                setError(errorMessage);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTodos();
    }, [placeholderUserId]); // Re-run effect if placeholderUserId changes (though it's constant here)

    if (loading) {
        return (
            <div className="w-1/2 h-full p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <Skeleton className="h-6 w-1/4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-3 p-3">
                                <Skeleton className="h-5 w-5 rounded" />
                                <Skeleton className="h-5 w-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-1/2 h-full p-4 flex items-center justify-center">
                <Alert variant="destructive" className="w-full max-w-md">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error Fetching Todos</AlertTitle>
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="w-1/2 h-full p-4 overflow-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold">
                        Todos for {placeholderUserId}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {todos.length === 0 ? (
                        <p className="text-gray-500">No todos yet. Great job!</p>
                    ) : (
                        <ul className="space-y-3">
                            {todos.map((todo, index) => (
                                <li
                                    key={todo.id}
                                    className={`
                                        flex items-center space-x-3 p-3 rounded-lg border
                                        bg-card text-card-foreground shadow-sm
                                        transition-all duration-300 ease-out
                                        hover:shadow-md hover:bg-muted/50
                                        animate-fadeInUp`}
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <Checkbox
                                        id={`todo-${todo.id}`}
                                        checked={todo.completed}
                                        disabled // Read-only
                                        className="cursor-not-allowed"
                                    />
                                    <label
                                        htmlFor={`todo-${todo.id}`}
                                        className={`flex-grow text-sm font-medium leading-none ${
                                            todo.completed ? 'line-through text-muted-foreground' : ''
                                        } cursor-not-allowed`}
                                    >
                                        {todo.text}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Add this to your global CSS (e.g., src/index.css or src/App.css)
/*
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeInUp {
  animation: fadeInUp 0.5s ease-out forwards;
  opacity: 0; // Start with opacity 0 to ensure animation runs correctly
}
*/