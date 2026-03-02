import { MarketOverview } from '../components/dashboard/MarketOverview';
import { MarketIssueSummary } from '../components/dashboard/MarketIssueSummary';
import { NewsFeed } from '../components/dashboard/NewsFeed';

export function DashboardPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <MarketOverview />
      <MarketIssueSummary />
      <NewsFeed />
    </div>
  );
}
