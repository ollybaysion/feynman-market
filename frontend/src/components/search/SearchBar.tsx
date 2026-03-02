import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { useAppStore } from '../../store/app.store';
import { MarketBadge } from '../common/MarketBadge';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const addRecentSearch = useAppStore(s => s.addRecentSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results } = useSearch(debouncedQuery);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(ticker: string) {
    addRecentSearch(ticker);
    setQuery('');
    setIsOpen(false);
    navigate(`/stock/${ticker}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="종목명 또는 티커 검색..."
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 rounded-lg border border-transparent focus:bg-white focus:border-primary-300 focus:outline-none transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && results && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-72 overflow-y-auto z-50">
          {results.map(stock => (
            <button
              key={stock.ticker}
              onClick={() => handleSelect(stock.ticker)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-sm text-gray-900">{stock.ticker}</span>
              <span className="text-xs text-gray-500 truncate flex-1">{stock.name}</span>
              <MarketBadge market={stock.market} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
