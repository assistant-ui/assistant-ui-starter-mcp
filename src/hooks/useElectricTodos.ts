/**
 * @deprecated This hook has been refactored into separate concerns:
 * - Use `useTodoSortParams` from './useTodoSortParams' for sort parameter management
 * - Use `useTodoMutations` from './useTodoMutations' for mutation functions
 * - Use `useLiveQuery` directly in components for querying todos
 * 
 * See Todos.tsx for an example of the new pattern.
 */

// Re-export the new hooks for backward compatibility
export { useTodoMutations } from './useTodoMutations';
export { useTodoSortParams } from './useTodoSortParams';

// Re-export utilities
export { getSortParamsFromStorage as getSortParams, resetSortParams, updateSortParams } from '../services/todoService';

