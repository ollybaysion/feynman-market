import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { PageLayout } from './components/layout/PageLayout';
import { DashboardPage } from './pages/DashboardPage';
import { StockDetailPage } from './pages/StockDetailPage';
import { SearchPage } from './pages/SearchPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PageLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/stock/:ticker" element={<StockDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </PageLayout>
        <Toaster position="bottom-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
