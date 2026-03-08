import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink, Flag, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useReport } from '../hooks/useReports';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { SentimentBadge } from '../components/common/SentimentBadge';
import { PriceChange } from '../components/common/PriceChange';
import type { MarketRegionBrief } from '../types/news';

function AnalysisCard({ region, analysis, label }: { region: 'KR' | 'US'; analysis: MarketRegionBrief; label: string }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        {region === 'KR' ? <Flag size={14} className="text-primary-600" /> : <Globe size={14} className="text-primary-600" />}
        <h3 className="text-sm font-bold text-gray-900">{label}</h3>
      </div>

      <SentimentBadge sentiment={analysis.sentiment} score={analysis.sentimentScore} />

      {analysis.keyIssues.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">주요 이슈</p>
          <ul className="space-y-1">
            {analysis.keyIssues.map((issue, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                <span className="text-primary-400 mt-0.5">&#8226;</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.summary && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">요약</p>
          <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
        </div>
      )}
    </div>
  );
}

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reportId = Number(id) || 0;
  const { data: report, isLoading, error, refetch } = useReport(reportId);

  if (!id || reportId <= 0) return <ErrorMessage message="유효하지 않은 리포트 ID입니다." />;
  if (isLoading) return <LoadingSpinner text="리포트 로딩 중..." />;
  if (error || !report) return <ErrorMessage message="리포트를 불러올 수 없습니다." onRetry={() => refetch()} />;

  const dateObj = new Date(report.date);
  const formattedDate = format(dateObj, 'yyyy년 M월 d일 (EEE)', { locale: ko });

  const krSources = report.sources.filter(s => s.market === 'KR');
  const usSources = report.sources.filter(s => s.market === 'US');

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft size={14} />
          리포트 목록
        </button>
        <div className="flex items-start gap-2">
          <FileText size={22} className="text-primary-600 mt-0.5 shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">{report.title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* Market Indices */}
      {report.indicesSnapshot.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-2">주요 지수</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {report.indicesSnapshot.map(idx => {
              const market = ['KOSPI', 'KOSDAQ'].includes(idx.symbol) ? 'KR' : 'US';
              return (
                <div key={idx.symbol} className="card p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">{idx.symbol}</p>
                  <p className="text-xs text-gray-600 truncate">{idx.name}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    {idx.value.toLocaleString(market === 'KR' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 2 })}
                  </p>
                  <PriceChange change={idx.change} changePercent={idx.changePercent} market={market} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalysisCard region="KR" analysis={report.krAnalysis} label="한국 시장 분석" />
        <AnalysisCard region="US" analysis={report.usAnalysis} label="미국 시장 분석" />
      </div>

      {/* Sources */}
      {report.sources.length > 0 && (
        <div className="card p-4 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">참고 기사</h2>

          {krSources.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                <Flag size={10} /> 한국
              </p>
              <ul className="space-y-1.5">
                {krSources.map((src, i) => (
                  <li key={i}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline flex items-start gap-1.5"
                    >
                      <ExternalLink size={12} className="mt-0.5 shrink-0" />
                      <span className="flex-1">{src.title}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{src.source}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {usSources.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                <Globe size={10} /> 미국
              </p>
              <ul className="space-y-1.5">
                {usSources.map((src, i) => (
                  <li key={i}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline flex items-start gap-1.5"
                    >
                      <ExternalLink size={12} className="mt-0.5 shrink-0" />
                      <span className="flex-1">{src.title}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{src.source}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Generated timestamp */}
      {report.createdAt && (
        <p className="text-[10px] text-gray-400 text-right">
          생성 시각: {format(new Date(report.createdAt * 1000), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
        </p>
      )}
    </div>
  );
}
