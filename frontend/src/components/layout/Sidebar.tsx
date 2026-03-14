import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Star, Clock, Globe, Flag, FileText, Crosshair, BarChart3 } from 'lucide-react';
import { useAppStore } from '../../store/app.store';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { marketFilter, setMarketFilter, favorites, recentSearches } = useAppStore();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-56 bg-white border-r border-gray-200 h-[calc(100vh-3.5rem)] overflow-y-auto shrink-0 hidden lg:block">
      <nav className="p-3 space-y-1">
        <button
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive('/') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <LayoutDashboard size={16} />
          대시보드
        </button>
        <button
          onClick={() => navigate('/reports')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            location.pathname.startsWith('/reports') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FileText size={16} />
          시장 리포트
        </button>
        <button
          onClick={() => navigate('/issues')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            location.pathname.startsWith('/issues') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Crosshair size={16} />
          이슈 트래커
        </button>
        <button
          onClick={() => navigate('/indicators')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            location.pathname.startsWith('/indicators') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <BarChart3 size={16} />
          시장 지표
        </button>
      </nav>

      <div className="px-3 py-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">시장 필터</p>
        <div className="flex gap-1">
          {(['ALL', 'KR', 'US'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={`flex-1 py-1 text-xs rounded-md transition-colors ${
                marketFilter === m
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m === 'ALL' ? '전체' : m === 'KR' ? (
                <span className="flex items-center justify-center gap-1"><Flag size={10} />한국</span>
              ) : (
                <span className="flex items-center justify-center gap-1"><Globe size={10} />미국</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Star size={10} /> 즐겨찾기
          </p>
          <div className="space-y-0.5">
            {favorites.map(ticker => (
              <button
                key={ticker}
                onClick={() => navigate(`/stock/${ticker}`)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-md"
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>
      )}

      {recentSearches.length > 0 && (
        <div className="px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock size={10} /> 최근 검색
          </p>
          <div className="space-y-0.5">
            {recentSearches.slice(0, 5).map(ticker => (
              <button
                key={ticker}
                onClick={() => navigate(`/stock/${ticker}`)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-md"
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 mt-auto">
        <p className="text-[9px] text-gray-400 text-center leading-relaxed">
          본 서비스는 투자 권유 목적이 아닌<br/>정보 제공 목적입니다.
        </p>
      </div>
    </aside>
  );
}
