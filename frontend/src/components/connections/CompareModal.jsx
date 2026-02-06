/**
 * Compare Modal Component
 * 
 * Side-by-side comparison of two accounts with:
 * - Influence comparison (base → adjusted)
 * - Trend comparison (sparklines, velocity, acceleration)
 * - Early Signal comparison
 * - Verdict explaining who wins and why
 */
import { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Rocket, Activity, Scale, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Simple sparkline
const MiniSparkline = ({ data, color = '#3b82f6', height = 30, width = 120 }) => {
  const points = useMemo(() => {
    if (!data || data.length < 2) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    return data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4);
      return `${x},${y}`;
    }).join(' ');
  }, [data, height, width]);

  if (!data || data.length < 2) return <div className="h-8 text-gray-400 text-xs">No data</div>;

  return (
    <svg width={width} height={height}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

// Trend State Badge (small)
const TrendBadge = ({ state }) => {
  const configs = {
    growing: { emoji: '🚀', color: 'text-green-600' },
    cooling: { emoji: '📉', color: 'text-red-600' },
    volatile: { emoji: '⚡', color: 'text-yellow-600' },
    stable: { emoji: '➖', color: 'text-gray-500' },
  };
  const config = configs[state] || configs.stable;
  return <span className={config.color}>{config.emoji}</span>;
};

// Early Signal Badge
const EarlySignalBadge = ({ badge, score }) => {
  const configs = {
    breakout: { label: 'Прорыв', emoji: '🚀', className: 'bg-green-100 text-green-700' },
    rising: { label: 'Рост', emoji: '📈', className: 'bg-yellow-100 text-yellow-700' },
    none: { label: 'Нет', emoji: '➖', className: 'bg-gray-100 text-gray-500' },
  };
  const config = configs[badge] || configs.none;
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.emoji} {config.label} <span className="text-xs opacity-75">({score})</span>
    </div>
  );
};

// Winner indicator
const WinnerIndicator = ({ winner, side }) => {
  if (winner !== side && winner !== 'tie') return null;
  if (winner === 'tie') {
    return <span className="text-xs text-gray-500 ml-1">≈</span>;
  }
  return <span className="ml-1 text-green-500 text-xs font-bold">✓ WIN</span>;
};

/**
 * Compare Modal
 */
export default function CompareModal({ 
  accountA, 
  accountB, 
  isOpen, 
  onClose,
  onSelectAccount 
}) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch comparison data from backend
  useEffect(() => {
    if (!isOpen || !accountA || !accountB) return;

    const fetchComparison = async () => {
      setLoading(true);
      try {
        // Get trend-adjusted comparison
        const trendCompareRes = await fetch(`${BACKEND_URL}/api/connections/trend-adjusted/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            a: {
              influence_score: accountA.influence_base,
              velocity_norm: accountA.trend?.velocity_norm || 0,
              acceleration_norm: accountA.trend?.acceleration_norm || 0,
            },
            b: {
              influence_score: accountB.influence_base,
              velocity_norm: accountB.trend?.velocity_norm || 0,
              acceleration_norm: accountB.trend?.acceleration_norm || 0,
            },
          }),
        });
        const trendData = await trendCompareRes.json();

        // Get early signal comparison
        const earlyCompareRes = await fetch(`${BACKEND_URL}/api/connections/early-signal/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            a: {
              influence_base: accountA.influence_base,
              influence_adjusted: accountA.influence_adjusted,
              trend: accountA.trend,
              risk_level: accountA.risk_level,
              profile: accountA.profile,
            },
            b: {
              influence_base: accountB.influence_base,
              influence_adjusted: accountB.influence_adjusted,
              trend: accountB.trend,
              risk_level: accountB.risk_level,
              profile: accountB.profile,
            },
          }),
        });
        const earlyData = await earlyCompareRes.json();

        setComparison({
          trend: trendData.data,
          early: earlyData.data,
        });
      } catch (err) {
        console.error('Compare error:', err);
        // Generate local comparison
        const influenceWinner = accountA.influence_adjusted > accountB.influence_adjusted + 50 ? 'a' :
                                accountB.influence_adjusted > accountA.influence_adjusted + 50 ? 'b' : 'tie';
        const trendWinner = accountA.trend?.velocity_norm > accountB.trend?.velocity_norm + 0.1 ? 'a' :
                            accountB.trend?.velocity_norm > accountA.trend?.velocity_norm + 0.1 ? 'b' : 'tie';
        const earlyWinner = (accountA.early_signal?.score || 0) > (accountB.early_signal?.score || 0) + 50 ? 'a' :
                            (accountB.early_signal?.score || 0) > (accountA.early_signal?.score || 0) + 50 ? 'b' : 'tie';
        
        setComparison({
          trend: {
            comparison: {
              winner: influenceWinner,
              trend_impact: generateTrendImpact(accountA, accountB, influenceWinner),
            },
          },
          early: {
            comparison: {
              stronger: earlyWinner,
              recommendation: generateRecommendation(accountA, accountB, earlyWinner),
            },
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [isOpen, accountA, accountB]);

  if (!isOpen) return null;

  // Determine overall winner
  const influenceWinner = comparison?.trend?.comparison?.winner;
  const earlyWinner = comparison?.early?.comparison?.stronger;

  // Generate sparkline data
  const generateSparkData = (account) => {
    const base = account?.influence_base || 500;
    const velocity = account?.trend?.velocity_norm || 0;
    return Array.from({ length: 14 }, (_, i) => 
      base + velocity * (i / 14) * 100 + (Math.random() - 0.5) * 30
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Scale className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">Compare Accounts</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Comparing accounts...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Account Headers */}
            <div className="grid grid-cols-2 gap-6">
              <AccountHeader account={accountA} label="A" winner={influenceWinner === 'a'} />
              <AccountHeader account={accountB} label="B" winner={influenceWinner === 'b'} />
            </div>

            {/* Influence Comparison */}
            <ComparisonSection title="Influence Score" icon={TrendingUp}>
              <div className="grid grid-cols-2 gap-6">
                <InfluenceBlock 
                  account={accountA} 
                  winner={influenceWinner === 'a'}
                />
                <InfluenceBlock 
                  account={accountB} 
                  winner={influenceWinner === 'b'}
                />
              </div>
            </ComparisonSection>

            {/* Trend Comparison */}
            <ComparisonSection title="Trend Dynamics" icon={Activity}>
              <div className="grid grid-cols-2 gap-6">
                <TrendBlock 
                  account={accountA} 
                  sparkData={generateSparkData(accountA)}
                />
                <TrendBlock 
                  account={accountB} 
                  sparkData={generateSparkData(accountB)}
                />
              </div>
              {comparison?.trend?.comparison?.trend_impact && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    {comparison.trend.comparison.trend_impact}
                  </p>
                </div>
              )}
            </ComparisonSection>

            {/* Early Signal Comparison */}
            <ComparisonSection title="Early Signal" icon={Rocket}>
              <div className="grid grid-cols-2 gap-6">
                <EarlySignalBlock 
                  account={accountA}
                  winner={earlyWinner === 'a'}
                />
                <EarlySignalBlock 
                  account={accountB}
                  winner={earlyWinner === 'b'}
                />
              </div>
              {comparison?.early?.comparison?.recommendation && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-purple-800 text-sm">
                    {comparison.early.comparison.recommendation}
                  </p>
                </div>
              )}
            </ComparisonSection>

            {/* Verdict */}
            <VerdictBlock 
              accountA={accountA}
              accountB={accountB}
              influenceWinner={influenceWinner}
              earlyWinner={earlyWinner}
              trendImpact={comparison?.trend?.comparison?.trend_impact}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={onClose}>Close</Button>
              {onSelectAccount && accountA && (
                <Button onClick={() => onSelectAccount(accountA.author_id)}>
                  View @{accountA.username}
                </Button>
              )}
              {onSelectAccount && accountB && (
                <Button onClick={() => onSelectAccount(accountB.author_id)}>
                  View @{accountB.username}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Account Header
function AccountHeader({ account, label, winner }) {
  return (
    <div className={`p-4 rounded-xl border-2 ${winner ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
          label === 'A' ? 'bg-blue-500' : 'bg-purple-500'
        }`}>
          {label}
        </div>
        <div className="flex-1">
          <div className="font-bold text-gray-900">@{account?.username || 'unknown'}</div>
          <div className="text-sm text-gray-500 capitalize">{account?.profile || 'retail'}</div>
        </div>
        {winner && (
          <div className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
            LEADER
          </div>
        )}
      </div>
    </div>
  );
}

// Section wrapper
function ComparisonSection({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

// Influence Block
function InfluenceBlock({ account, winner }) {
  const base = account?.influence_base || 0;
  const adjusted = account?.influence_adjusted || 0;
  const delta = adjusted - base;
  
  return (
    <div className={`p-4 rounded-lg ${winner ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">Base</span>
        <span className="font-mono text-gray-600">{base}</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">Adjusted</span>
        <span className="font-mono font-bold text-lg">{adjusted}</span>
      </div>
      <div className={`text-sm ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {delta >= 0 ? '+' : ''}{delta} от тренда
      </div>
    </div>
  );
}

// Trend Block
function TrendBlock({ account, sparkData }) {
  const velocity = account?.trend?.velocity_norm || 0;
  const accel = account?.trend?.acceleration_norm || 0;
  const state = account?.trend?.state || 'stable';
  
  const color = state === 'growing' ? '#22c55e' : 
                state === 'cooling' ? '#ef4444' : '#6b7280';
  
  return (
    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
      <div className="mb-3">
        <MiniSparkline data={sparkData} color={color} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Velocity:</span>{' '}
          <span className={velocity > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {velocity > 0 ? '+' : ''}{velocity.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Accel:</span>{' '}
          <span className={accel > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {accel > 0 ? '+' : ''}{accel.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <TrendBadge state={state} />
        <span className="text-sm text-gray-500 capitalize">{state}</span>
      </div>
    </div>
  );
}

// Early Signal Block
function EarlySignalBlock({ account, winner }) {
  const badge = account?.early_signal?.badge || 'none';
  const score = account?.early_signal?.score || 0;
  
  return (
    <div className={`p-4 rounded-lg ${winner ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <EarlySignalBadge badge={badge} score={score} />
        {winner && (
          <span className="text-green-500 text-xs font-bold">✓</span>
        )}
      </div>
      <div className="mt-2 text-sm text-gray-600">
        {badge === 'breakout' && 'Высокий потенциал прорыва'}
        {badge === 'rising' && 'Положительная динамика'}
        {badge === 'none' && 'Нет сигналов роста'}
      </div>
    </div>
  );
}

// Verdict Block
function VerdictBlock({ accountA, accountB, influenceWinner, earlyWinner, trendImpact }) {
  // Determine overall verdict
  let verdict = '';
  let verdictType = 'neutral';
  
  if (influenceWinner === earlyWinner && influenceWinner !== 'tie') {
    verdict = influenceWinner === 'a' 
      ? `@${accountA?.username} выигрывает по всем показателям.`
      : `@${accountB?.username} выигрывает по всем показателям.`;
    verdictType = 'clear';
  } else if (influenceWinner !== earlyWinner) {
    const inflWinner = influenceWinner === 'a' ? accountA : accountB;
    const earlyWinnerAcc = earlyWinner === 'a' ? accountA : accountB;
    verdict = `@${inflWinner?.username} имеет больший текущий influence, но @${earlyWinnerAcc?.username} показывает более сильный ранний сигнал и может обогнать в будущем.`;
    verdictType = 'mixed';
  } else {
    verdict = 'Аккаунты имеют схожие показатели. Различия в деталях.';
    verdictType = 'tie';
  }

  return (
    <div className={`p-5 rounded-xl border-2 ${
      verdictType === 'clear' ? 'bg-green-50 border-green-300' :
      verdictType === 'mixed' ? 'bg-yellow-50 border-yellow-300' :
      'bg-gray-50 border-gray-300'
    }`}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Scale className="w-4 h-4" />
        Verdict
      </h3>
      <p className="text-gray-800 leading-relaxed">{verdict}</p>
      {trendImpact && (
        <p className="text-sm text-gray-600 mt-2 italic">{trendImpact}</p>
      )}
    </div>
  );
}

// Helper functions
function generateTrendImpact(a, b, winner) {
  if (winner === 'tie') return 'Оба аккаунта имеют схожую динамику.';
  const stronger = winner === 'a' ? a : b;
  const weaker = winner === 'a' ? b : a;
  
  if (stronger.trend?.velocity_norm > weaker.trend?.velocity_norm) {
    return `@${stronger.username} растёт быстрее — тренд усиливает лидерство.`;
  }
  return `@${stronger.username} имеет более сильное текущее влияние.`;
}

function generateRecommendation(a, b, winner) {
  if (winner === 'tie') return 'Оба аккаунта имеют схожий потенциал раннего роста.';
  const stronger = winner === 'a' ? a : b;
  
  if (stronger.early_signal?.badge === 'breakout') {
    return `@${stronger.username} демонстрирует сильный сигнал прорыва — рекомендуется приоритетное наблюдение.`;
  }
  return `@${stronger.username} показывает более сильную динамику раннего роста.`;
}
