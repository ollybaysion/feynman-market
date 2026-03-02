import type { NewsArticle } from '../../types/news';
import { formatRelative } from '../../utils/format';
import { MarketBadge } from '../common/MarketBadge';
import { ExternalLink } from 'lucide-react';

export function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card flex gap-3 hover:shadow-md transition-shadow group cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <MarketBadge market={article.market} />
          {article.source && (
            <span className="text-[10px] text-gray-400">{article.source}</span>
          )}
          <span className="text-[10px] text-gray-400">{formatRelative(article.publishedAt)}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.description}</p>
        )}
      </div>
      <ExternalLink size={14} className="text-gray-300 group-hover:text-primary-400 shrink-0 mt-1" />
    </a>
  );
}
