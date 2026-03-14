import { useState, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { useIndicatorQuotes, useIndicatorChart } from '../hooks/useIndicators';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { IndicatorQuote } from '../types/indicators';

const CATEGORY_LABELS: Record<string, string> = {
  forex: '환율',
  commodity: '원자재',
  bond: '채권',
  volatility: '변동성',
  crypto: '암호화폐',
};

const CATEGORY_ORDER = ['forex', 'commodity', 'bond', 'volatility', 'crypto'];

function QuoteCard({
  quote,
  isSelected,
  onClick,
}: {
  quote: IndicatorQuote;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isPositive = quote.change > 0;
  const isNegative = quote.change < 0;

  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 font-medium">{quote.name}</span>
        {isPositive ? (
          <TrendingUp size={12} className="text-red-500" />
        ) : isNegative ? (
          <TrendingDown size={12} className="text-blue-500" />
        ) : (
          <Minus size={12} className="text-gray-400" />
        )}
      </div>
      <div className="text-sm font-semibold text-gray-900">
        {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={`text-xs font-medium ${isPositive ? 'text-red-500' : isNegative ? 'text-blue-500' : 'text-gray-400'}`}>
        {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
      </div>
    </button>
  );
}

function ChartPanel({ symbol, name }: { symbol: string; name: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [days, setDays] = useState(90);
  const { data, isLoading, error } = useIndicatorChart(symbol, days);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#6b7280',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      rightPriceScale: {
        borderColor: '#e5e7eb',
      },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: false,
      },
      crosshair: {
        horzLine: { color: '#9ca3af', style: 2 },
        vertLine: { color: '#9ca3af', style: 2 },
      },
    });

    const series = chart.addAreaSeries({
      topColor: 'rgba(59, 130, 246, 0.3)',
      bottomColor: 'rgba(59, 130, 246, 0.02)',
      lineColor: '#3b82f6',
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !data?.data) return;
    const chartData = data.data.map((d) => ({
      time: d.date as string,
      value: d.close,
    }));
    seriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{name} ({symbol})</h3>
        <div className="flex gap-1">
          {[30, 90, 180].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                days === d
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {isLoading && <LoadingSpinner text="차트 데이터 로딩 중..." />}
      {error && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">차트를 불러올 수 없습니다.</p>
        </div>
      )}
      <div ref={chartContainerRef} className={isLoading || error ? 'hidden' : ''} />
    </div>
  );
}

export function IndicatorsPage() {
  const { data: quotes, isLoading, error, refetch, isFetching } = useIndicatorQuotes();
  const [selected, setSelected] = useState<IndicatorQuote | null>(null);

  // Group quotes by category
  const grouped = quotes
    ? CATEGORY_ORDER.reduce<Record<string, IndicatorQuote[]>>((acc, cat) => {
        const items = quotes.filter((q) => q.category === cat);
        if (items.length > 0) acc[cat] = items;
        return acc;
      }, {})
    : {};

  // Auto-select first quote
  useEffect(() => {
    if (quotes && quotes.length > 0 && !selected) {
      setSelected(quotes[0]);
    }
  }, [quotes, selected]);

  if (isLoading) return <LoadingSpinner text="지표 데이터 로딩 중..." />;

  if (error || !quotes) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-gray-500">지표를 불러올 수 없습니다.</p>
        <p className="text-xs text-gray-400 mt-1">API 키를 확인해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">시장 지표</h1>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-gray-400 hover:text-primary-600 p-1.5 disabled:opacity-40 transition-colors"
          title="새로고침"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category}>
          <h2 className="text-sm font-semibold text-gray-600 mb-2">
            {CATEGORY_LABELS[category] || category}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {items.map((q) => (
              <QuoteCard
                key={q.symbol}
                quote={q}
                isSelected={selected?.symbol === q.symbol}
                onClick={() => setSelected(q)}
              />
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <ChartPanel key={selected.symbol} symbol={selected.symbol} name={selected.name} />
      )}
    </div>
  );
}
