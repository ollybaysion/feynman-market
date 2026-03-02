import { Activity } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';

export function Header() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 sticky top-0 z-30">
      <a href="/" className="flex items-center gap-2 text-primary-600 font-bold text-lg shrink-0">
        <Activity size={22} />
        <span className="hidden sm:inline">주식 시장 분석</span>
      </a>
      <div className="flex-1 max-w-md mx-auto">
        <SearchBar />
      </div>
      <div className="shrink-0 text-xs text-gray-400">
        실시간 분석
      </div>
    </header>
  );
}
