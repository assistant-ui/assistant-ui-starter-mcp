import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Shadcn Alert
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Shadcn Card
import { Checkbox } from "@/components/ui/checkbox"; // Shadcn Checkbox
import { Skeleton } from "@/components/ui/skeleton"; // Shadcn Skeleton
import { useLiveQuery } from '@tanstack/react-db';
import { Terminal } from "lucide-react"; // Icon for Alert
import { useTodoSortParams } from "./hooks/useTodoSortParams";
import { userId } from "./lib/utils";
import { userTodoCollection } from "./services/collections";


export default function Todos() {
    const { sortParams, getSortDescription } = useTodoSortParams();
    const { data: todos = [] } = useLiveQuery((query) => {
        let baseQuery = query.from({ userTodoCollection });
        
        // if (sortParams.completed !== undefined) {
        //     baseQuery = baseQuery.where('@userTodoCollection.completed', '=', sortParams.completed);
        // }
        
        if (sortParams.search) {
            baseQuery = baseQuery.where('@userTodoCollection.text', 'like', `%${sortParams.search}%`);
        }
        
        const sortOrder = sortParams.sortOrder === 'desc' ? 'desc' : 'asc';
        baseQuery = baseQuery.orderBy({ [`@userTodoCollection.${sortParams.sortBy}`]: sortOrder } as any);
        
        return baseQuery
            .keyBy('@id')
            .select(
                '@userTodoCollection.id',
                '@userTodoCollection.text', 
                '@userTodoCollection.completed',
                '@userTodoCollection.userId',
                '@userTodoCollection.created_at',
                '@userTodoCollection.updated_at'
            );
    }, [userTodoCollection, sortParams]);

    const isLoading = false;
    const error: Error | null = null;
    const isMutating = false;

    if (isLoading) {
        return (
            <div className="h-full p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <Skeleton className="h-5 w-1/2" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-3 p-2">
                                <Skeleton className="h-4 w-4 rounded" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full p-4 flex items-center justify-center">
                <Alert variant="destructive" className="w-full">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error Fetching Todos</AlertTitle>
                    <AlertDescription className="text-xs">
                        {(error as Error)?.message || "An unexpected error occurred"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }


    return (
        <div className="h-full p-4 overflow-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                        ⚡ Todos
                        {isMutating && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        {userId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Sort: {getSortDescription()}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {todos.length === 0 ? (
                        <p className="text-gray-500 text-sm">No todos yet. Great job!</p>
                    ) : (
                        <ul className="space-y-3">
                            {todos.map((todo, index) => (
                                <li
                                    key={todo.id}
                                    className={`
                                        flex items-center space-x-3 p-2 rounded-lg border
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
                                        className="cursor-not-allowed flex-shrink-0"
                                    />
                                    <label
                                        htmlFor={`todo-${todo.id}`}
                                        className={`flex-grow text-xs font-medium leading-tight ${
                                            todo.completed ? 'line-through text-muted-foreground' : ''
                                        } cursor-not-allowed break-words`}
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