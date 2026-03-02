import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useStockQuote } from '../hooks/useStockQuote';
import { useStockChart } from '../hooks/useStockChart';
import { useAppStore } from '../store/app.store';
import { StockHeader } from '../components/stock/StockHeader';
import { StockChart } from '../components/stock/StockChart';
import { StockNewsList } from '../components/stock/StockNewsList';
import { AISummary } from '../components/stock/AISummary';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';

export function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const addRecentSearch = useAppStore(s => s.addRecentSearch);

  useEffect(() => {
    if (ticker) addRecentSearch(ticker);
  }, [ticker, addRecentSearch]);

  const market = ticker && /^\d{6}$/.test(ticker) ? 'KR' : 'US';
  const { data: quote, isLoading: quoteLoading, error: quoteError } = useStockQuote(ticker || '', market);
  const { data: chartData, isLoading: chartLoading } = useStockChart(ticker || '', 30, market);

  if (!ticker) return <ErrorMessage message="종목 코드가 필요합니다." />;
  if (quoteLoading) return <LoadingSpinner text="종목 정보 로딩 중..." />;
  if (quoteError || !quote) return <ErrorMessage message="종목 정보를 불러올 수 없습니다." />;

  return (
    <div className="space-y-4 max-w-5xl">
      <StockHeader quote={quote} />

      {chartLoading ? (
        <LoadingSpinner text="차트 로딩 중..." />
      ) : chartData && chartData.length > 0 ? (
        <StockChart data={chartData} market={quote.market} />
      ) : (
        <div className="card text-center py-8 text-sm text-gray-400">
          차트 데이터를 불러올 수 없습니다.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AISummary ticker={ticker} stockName={quote.name} market={quote.market} />
        <StockNewsList ticker={ticker} stockName={quote.name} market={quote.market} />
      </div>
    </div>
  );
}
