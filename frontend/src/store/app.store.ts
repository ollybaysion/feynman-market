import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  marketFilter: 'ALL' | 'KR' | 'US';
  favorites: string[];         // tickers
  recentSearches: string[];    // tickers
  setMarketFilter: (filter: 'ALL' | 'KR' | 'US') => void;
  toggleFavorite: (ticker: string) => void;
  addRecentSearch: (ticker: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      marketFilter: 'ALL',
      favorites: [],
      recentSearches: [],

      setMarketFilter: (filter) => set({ marketFilter: filter }),

      toggleFavorite: (ticker) => {
        const { favorites } = get();
        if (favorites.includes(ticker)) {
          set({ favorites: favorites.filter(t => t !== ticker) });
        } else {
          set({ favorites: [...favorites, ticker] });
        }
      },

      addRecentSearch: (ticker) => {
        const { recentSearches } = get();
        const filtered = recentSearches.filter(t => t !== ticker);
        set({ recentSearches: [ticker, ...filtered].slice(0, 10) });
      },
    }),
    { name: 'market-app-store' }
  )
);
