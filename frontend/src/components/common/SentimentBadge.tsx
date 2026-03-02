interface SentimentBadgeProps {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number;
}

const SENTIMENT_CONFIG = {
  bullish: { label: '긍정적', bgClass: 'bg-green-100 text-green-800', barClass: 'bg-green-500' },
  bearish: { label: '부정적', bgClass: 'bg-red-100 text-red-800', barClass: 'bg-red-500' },
  neutral: { label: '중립', bgClass: 'bg-gray-100 text-gray-800', barClass: 'bg-gray-500' },
};

export function SentimentBadge({ sentiment, score }: SentimentBadgeProps) {
  const config = SENTIMENT_CONFIG[sentiment];

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.bgClass}`}>
        {config.label}
      </span>
      <div className="flex items-center gap-2 flex-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${config.barClass}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-8 text-right">{score}%</span>
      </div>
    </div>
  );
}
