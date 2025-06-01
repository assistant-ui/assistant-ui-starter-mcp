import { QueryClientProvider } from '@tanstack/react-query';
import { Assistant } from './Assistant';
import { queryClient } from './lib/utils';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full h-screen">
        <Assistant />
      </div>
    </QueryClientProvider>
  );
}

export default App;
