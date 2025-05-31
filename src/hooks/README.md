# Todo Hooks Refactoring

This directory contains the refactored todo-related hooks that follow separation of concerns principles.

## Structure

### `useTodoSortParams.ts`
Manages todo sort parameters with localStorage persistence and cross-tab synchronization.

**Features:**
- Syncs with localStorage for persistence across sessions
- Broadcasts changes to other tabs/windows via storage events
- Provides type-safe parameter updates
- Supports filtering by completion status and search text
- Handles sorting by various fields with ascending/descending order

**Usage:**
```typescript
import { useTodoSortParams } from './hooks/useTodoSortParams';

const { sortParams, updateSortParams, resetSortParams, getSortDescription } = useTodoSortParams();
```

### `useTodoMutations.ts`
Provides optimistic mutation functions for todos using a single generic mutation function.

**Features:**
- Optimistic updates for instant UI feedback
- Automatic rollback on server errors
- Electric collection sync support
- Type-safe operations with full TypeScript support
- Single mutation function handles all operations (create, update, delete)

**Usage:**
```typescript
import { useTodoMutations } from './hooks/useTodoMutations';

const { createTodo, updateTodo, deleteTodo } = useTodoMutations(todoCollection, userId);
```

### `../mutations/todoMutations.ts`
Contains a single generic mutation function that handles all todo operations.

**Features:**
- Framework-agnostic mutation function
- Automatically determines operation type (insert, update, delete)
- Electric collection synchronization
- Error handling with automatic rollback
- Can be used in any context (React, Node.js, etc.)

**Usage:**
```typescript
import { todoMutationFn } from '../mutations/todoMutations';

// Use with useOptimisticMutation - handles all operation types automatically
const todoMutation = useOptimisticMutation({
  mutationFn: todoMutationFn,
});
```

### `../services/collections.ts`
Provides collection factories for different todo collection types.

**Features:**
- User-specific todo collections with caching
- General todo collection (all todos)
- Electric collection configuration
- Factory functions for dynamic collection creation

**Usage:**
```typescript
import { createUserTodoCollection, createTodoCollection } from '../services/collections';

// Create user-specific collection
const userTodos = createUserTodoCollection(userId);

// Create general collection (all todos)
const allTodos = createTodoCollection();
```

## Migration from `useElectricTodos`

The original `useElectricTodos` hook has been deprecated and refactored into separate concerns:

### Before:
```typescript
const {
  todos,
  sortParams,
  createTodo,
  updateTodo,
  deleteTodo,
} = useElectricTodos(userId);
```

### After:
```typescript
// Get the collection
const todoCollection = useMemo(() => createUserTodoCollection(userId), [userId]);

// Get sort params
const { sortParams, getSortDescription } = useTodoSortParams();

// Get mutation functions
const { createTodo, updateTodo, deleteTodo } = useTodoMutations(todoCollection, userId);

// Use live query directly
const { data: todos = [] } = useLiveQuery((query) => {
  let baseQuery = query.from({ todoCollection: todoCollection });
  
  // Apply filters and sorting
  if (sortParams.completed !== undefined) {
    baseQuery = baseQuery.where('@todoCollection.completed', '=', sortParams.completed);
  }
  
  if (sortParams.search) {
    baseQuery = baseQuery.where('@todoCollection.text', 'like', `%${sortParams.search}%`);
  }
  
  const sortOrder = sortParams.sortOrder === 'desc' ? 'desc' : 'asc';
  baseQuery = baseQuery.orderBy({ [`@todoCollection.${sortParams.sortBy}`]: sortOrder } as any);
  
  return baseQuery
    .keyBy('@id')
    .select(
      '@todoCollection.id',
      '@todoCollection.text', 
      '@todoCollection.completed',
      '@todoCollection.userId',
      '@todoCollection.created_at',
      '@todoCollection.updated_at'
    );
}, [todoCollection, sortParams]);
```

## Generic Mutation Function

The new approach uses a single `todoMutationFn` that automatically handles all todo operations:

```typescript
// The mutation function automatically determines the operation type
// based on the collection operation performed:

// Insert operation
todoMutation.mutate(() => {
  todoCollection.insert(newTodo); // Triggers 'insert' type
});

// Update operation  
todoMutation.mutate(() => {
  todoCollection.update(existingTodo, (draft) => {
    draft.completed = true; // Triggers 'update' type
  });
});

// Delete operation
todoMutation.mutate(() => {
  todoCollection.delete(existingTodo); // Triggers 'delete' type
});
```

## Collection Types

### User-Specific Collections
- Filter todos by user ID using Electric shapes
- Cached for performance
- Automatically sync only user's todos

### General Collections  
- Contains all todos (not user-filtered)
- Useful for admin views or cross-user features
- Single shared instance

## Benefits of the Refactoring

1. **Separation of Concerns**: Each hook has a single responsibility
2. **Reusability**: Mutation function can be used outside React
3. **Testability**: Pure functions are easier to test
4. **Maintainability**: Smaller, focused modules are easier to maintain
5. **Flexibility**: Components can compose functionality as needed
6. **Type Safety**: Better TypeScript support with focused interfaces
7. **Simplicity**: Single mutation function handles all operations
8. **Performance**: Collection caching and optimized sync

## See Also

- `src/Todos.tsx` - Example implementation using the new pattern
- `src/mutations/todoMutations.ts` - Generic mutation function
- `src/services/todoService.ts` - API service functions
- `src/services/collections.ts` - Collection factories 