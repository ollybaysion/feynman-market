import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import type { OHLCV } from '../../types/stock';

interface StockChartProps {
  data: OHLCV[];
  market: string;
  height?: number;
}

export function StockChart({ data, market, height = 350 }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const isKR = market === 'KOSPI' || market === 'KOSDAQ' || market === 'KR';

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: '#6b7280',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
      },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: false,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: isKR ? '#ef4444' : '#22c55e',
      downColor: isKR ? '#3b82f6' : '#ef4444',
      borderUpColor: isKR ? '#ef4444' : '#22c55e',
      borderDownColor: isKR ? '#3b82f6' : '#ef4444',
      wickUpColor: isKR ? '#ef4444' : '#22c55e',
      wickDownColor: isKR ? '#3b82f6' : '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, isKR]);

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const formatted = data.map(d => ({
      time: d.date as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    seriesRef.current.setData(formatted);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="card p-0 overflow-hidden">
      <div ref={containerRef} />
    </div>
  );
}
