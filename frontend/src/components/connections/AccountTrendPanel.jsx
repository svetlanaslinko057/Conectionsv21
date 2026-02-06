/**
 * Account Trend Panel Component
 * 
 * Shows sparkline, velocity, acceleration, and trend state.
 * Explains WHY the account is where it is in the Radar.
 */
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

// Simple sparkline using SVG
const Sparkline = ({ data, color = '#3b82f6', height = 40, width = 200 }) => {
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

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-10 text-gray-400 text-sm">
        Недостаточно данных
      </div>
    );
  }

  const isPositive = data[data.length - 1] > data[0];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#sparkGradient-${color})`}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={parseFloat(points.split(' ').pop()?.split(',')[1] || height / 2)}
        r="4"
        fill={color}
      />
    </svg>
  );
};

// Trend State Badge
const TrendStateBadge = ({ state }) => {
  const configs = {
    growing: { 
      label: 'Рост', 
      emoji: '🚀', 
      className: 'bg-green-100 text-green-700 border-green-300',
      description: 'Влияние стабильно растёт'
    },
    cooling: { 
      label: 'Падение', 
      emoji: '📉', 
      className: 'bg-red-100 text-red-700 border-red-300',
      description: 'Влияние снижается'
    },
    volatile: { 
      label: 'Волатильно', 
      emoji: '⚡', 
      className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      description: 'Нестабильная динамика'
    },
    stable: { 
      label: 'Стабильно', 
      emoji: '➖', 
      className: 'bg-gray-100 text-gray-600 border-gray-300',
      description: 'Без значимых изменений'
    },
  };
  
  const config = configs[state] || configs.stable;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${config.className}`}>
      <span>{config.emoji}</span>
      <span className="font-medium">{config.label}</span>
    </div>
  );
};

// Velocity/Acceleration Metric
const TrendMetric = ({ label, value, unit, positive }) => {
  const isPositive = positive ?? value > 0;
  const formattedValue = value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`font-mono font-bold text-lg ${isPositive ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'}`}>
        {formattedValue}
        <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
      </div>
    </div>
  );
};

/**
 * Main Trend Panel Component
 */
export default function AccountTrendPanel({ 
  history = [], 
  trend = {},
  influence_base = 0,
  influence_adjusted = 0,
  period = '30d'
}) {
  const { velocity = 0, acceleration = 0, state = 'stable' } = trend;
  
  // Generate mock history if not provided
  const chartData = useMemo(() => {
    if (history.length >= 2) {
      return history.map(h => h.influence_adjusted || h.score || 0);
    }
    
    // Generate mock data based on trend
    const points = period === '7d' ? 7 : 30;
    const data = [];
    let current = influence_base;
    
    for (let i = 0; i < points; i++) {
      // Add some noise + trend direction
      const noise = (Math.random() - 0.5) * 50;
      const trendImpact = velocity * (i / points) * 100;
      current = Math.max(0, Math.min(1000, influence_base + trendImpact + noise));
      data.push(current);
    }
    
    // Ensure last point matches adjusted
    data[data.length - 1] = influence_adjusted;
    
    return data;
  }, [history, velocity, influence_base, influence_adjusted, period]);

  // Trend impact calculation
  const trendImpact = influence_adjusted - influence_base;
  const trendImpactPercent = influence_base > 0 
    ? ((trendImpact / influence_base) * 100).toFixed(1) 
    : 0;

  // Choose sparkline color based on state
  const sparkColor = state === 'growing' ? '#22c55e' : 
                     state === 'cooling' ? '#ef4444' : 
                     state === 'volatile' ? '#eab308' : '#6b7280';

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Trend Dynamics
        </h3>
        <TrendStateBadge state={state} />
      </div>

      {/* Sparkline */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Influence ({period})</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">{influence_base}</span>
            <span className="text-gray-300">→</span>
            <span className={`font-bold ${trendImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {influence_adjusted}
            </span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <Sparkline data={chartData} color={sparkColor} height={60} width={350} />
        </div>
      </div>

      {/* Trend Impact */}
      <div className={`mb-6 p-4 rounded-lg ${
        trendImpact > 0 ? 'bg-green-50 border border-green-200' :
        trendImpact < 0 ? 'bg-red-50 border border-red-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          {trendImpact > 0 ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : trendImpact < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-600" />
          ) : (
            <Activity className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm font-medium">Trend Impact</span>
        </div>
        <div className={`text-lg font-bold ${
          trendImpact > 0 ? 'text-green-700' : trendImpact < 0 ? 'text-red-700' : 'text-gray-600'
        }`}>
          {trendImpact > 0 ? '+' : ''}{trendImpact} pts ({trendImpact > 0 ? '+' : ''}{trendImpactPercent}%)
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {trendImpact > 20 && 'Тренд значительно усиливает текущее влияние.'}
          {trendImpact <= 20 && trendImpact > 0 && 'Положительный тренд немного усиливает влияние.'}
          {trendImpact === 0 && 'Тренд не оказывает влияния на текущий рейтинг.'}
          {trendImpact < 0 && trendImpact >= -20 && 'Негативный тренд слегка снижает влияние.'}
          {trendImpact < -20 && 'Тренд существенно снижает текущее влияние.'}
        </p>
      </div>

      {/* Velocity & Acceleration Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <TrendMetric 
          label="Velocity (скорость)" 
          value={velocity} 
          unit="pts/day" 
        />
        <TrendMetric 
          label="Acceleration (ускорение)" 
          value={acceleration} 
          unit="Δ/day" 
        />
      </div>

      {/* Explanation */}
      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
        <div className="font-medium text-gray-700 mb-1">Что это значит:</div>
        {velocity > 0.3 && acceleration > 0.1 && (
          <p>📈 Аккаунт активно набирает влияние. Рост ускоряется — последние посты дают больший эффект.</p>
        )}
        {velocity > 0.1 && acceleration <= 0.1 && acceleration >= -0.1 && (
          <p>📊 Стабильный рост влияния. Динамика ровная, без резких скачков.</p>
        )}
        {velocity > 0 && acceleration < -0.1 && (
          <p>⚠️ Рост замедляется. Хотя аккаунт ещё растёт, темп снижается.</p>
        )}
        {velocity <= 0 && velocity >= -0.1 && (
          <p>➖ Влияние практически не меняется. Аккаунт в стабильной фазе.</p>
        )}
        {velocity < -0.1 && acceleration >= 0 && (
          <p>📉 Влияние снижается, но темп падения замедляется.</p>
        )}
        {velocity < -0.1 && acceleration < 0 && (
          <p>🔻 Влияние активно падает. Негативный тренд усиливается.</p>
        )}
      </div>
    </div>
  );
}
