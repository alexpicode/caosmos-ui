import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@presentation/layout/AppShell';
import '@shared/bootstrap'; // wire X-Sim-Tick → world store
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 0,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
