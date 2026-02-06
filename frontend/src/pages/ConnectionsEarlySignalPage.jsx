/**
 * Early Signal Watchlist Page - Radar View
 * 
 * Shows accounts that may become significant soon.
 * NOT a rating/leaderboard - it's an early alpha radar.
 * 
 * Uses existing API endpoints:
 * - /api/connections/accounts
 * - /api/connections/early-signal
 * - /api/connections/trend-adjusted
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Radar, 
  Table2, 
  Filter, 
  X, 
  ChevronRight, 
  Rocket, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  RefreshCw,
  Info,
  Scale
} from 'lucide-react';
import { Button } from '../components/ui/button';
import CompareModal from '../components/connections/CompareModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// ============================================================
// TYPES
// ============================================================

/**
 * @typedef {Object} EarlySignalAccount
 * @property {string} author_id
 * @property {string} username
 * @property {'retail'|'influencer'|'whale'} profile
 * @property {'low'|'medium'|'high'} risk_level
 * @property {number} influence_base
 * @property {number} influence_adjusted
 * @property {{velocity_norm: number, acceleration_norm: number, state: string}} trend
 * @property {{score: number, badge: string, confidence: number}} early_signal
 */

// ============================================================
// BADGE COMPONENTS
// ============================================================

const EarlySignalBadge = ({ badge }) => {
  const badges = {
    breakout: { 
      label: 'Прорыв', 
      emoji: '🚀', 
      className: 'bg-green-100 text-green-700 border-green-300 animate-pulse' 
    },
    rising: { 
      label: 'Рост', 
      emoji: '📈', 
      className: 'bg-yellow-100 text-yellow-700 border-yellow-300' 
    },
    none: { 
      label: 'Нет', 
      emoji: '➖', 
      className: 'bg-gray-100 text-gray-500 border-gray-200' 
    },
  };
  
  const config = badges[badge] || badges.none;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
};

const ProfileBadge = ({ profile }) => {
  const profiles = {
    retail: { label: 'Retail', className: 'bg-blue-50 text-blue-600' },
    influencer: { label: 'Influencer', className: 'bg-purple-50 text-purple-600' },
    whale: { label: 'Whale', className: 'bg-indigo-50 text-indigo-600' },
  };
  const config = profiles[profile] || profiles.retail;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

const RiskIndicator = ({ level }) => {
  const colors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${colors[level] || 'bg-gray-400'}`} />
      <span className="text-xs text-gray-500 capitalize">{level}</span>
    </div>
  );
};

const TrendArrow = ({ state, velocity }) => {
  const configs = {
    growing: { icon: '↗', color: 'text-green-500', label: 'Рост' },
    cooling: { icon: '↘', color: 'text-red-500', label: 'Падение' },
    volatile: { icon: '↕', color: 'text-yellow-500', label: 'Волатильность' },
    stable: { icon: '→', color: 'text-gray-400', label: 'Стабильно' },
  };
  const config = configs[state] || configs.stable;
  return (
    <div className="flex items-center gap-1">
      <span className={`text-lg ${config.color}`}>{config.icon}</span>
      <span className="text-xs text-gray-500">{config.label}</span>
    </div>
  );
};

// ============================================================
// FILTERS BAR
// ============================================================

const EarlySignalFiltersBar = ({ filters, onChange }) => {
  const toggleProfile = (profile) => {
    const profiles = filters.profiles.includes(profile)
      ? filters.profiles.filter(p => p !== profile)
      : [...filters.profiles, profile];
    onChange({ ...filters, profiles });
  };

  const toggleBadge = (badge) => {
    const badges = filters.badges.includes(badge)
      ? filters.badges.filter(b => b !== badge)
      : [...filters.badges, badge];
    onChange({ ...filters, badges });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Profile Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase">Profile:</span>
        {['retail', 'influencer', 'whale'].map(profile => (
          <button
            key={profile}
            onClick={() => toggleProfile(profile)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filters.profiles.includes(profile)
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            {profile.charAt(0).toUpperCase() + profile.slice(1)}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Badge Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase">Signal:</span>
        <button
          onClick={() => toggleBadge('breakout')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
            filters.badges.includes('breakout')
              ? 'bg-green-500 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
          }`}
        >
          🚀 Breakout
        </button>
        <button
          onClick={() => toggleBadge('rising')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
            filters.badges.includes('rising')
              ? 'bg-yellow-500 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-yellow-300'
          }`}
        >
          📈 Rising
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Risk Filter */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.hideHighRisk}
          onChange={(e) => onChange({ ...filters, hideHighRisk: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
        />
        <span className="text-xs font-medium text-gray-600">Hide High Risk</span>
      </label>
    </div>
  );
};

// ============================================================
// RADAR VIEW (SCATTER PLOT)
// ============================================================

const EarlySignalRadar = ({ data, onSelect, selectedId, compareSelection = [] }) => {
  // Radar dimensions
  const WIDTH = 800;
  const HEIGHT = 500;
  const PADDING = { top: 40, right: 40, bottom: 60, left: 80 };
  
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  // Hover state - separate from selection
  const [hoveredId, setHoveredId] = useState(null);

  // Scale functions
  const xScale = useCallback((accel) => {
    // acceleration_norm: -1 to 1 → map to 0 to innerWidth
    return PADDING.left + ((accel + 1) / 2) * innerWidth;
  }, [innerWidth]);

  const yScale = useCallback((influence) => {
    // influence: 0 to 1000 → map to innerHeight to 0 (inverted for SVG)
    return PADDING.top + innerHeight - (influence / 1000) * innerHeight;
  }, [innerHeight]);

  const rScale = useCallback((score) => {
    // early_signal_score: 0-1000 → radius 8-40
    return 8 + (score / 1000) * 32;
  }, []);

  const getColor = useCallback((account) => {
    if (account.early_signal.badge === 'breakout') return '#22c55e'; // green
    if (account.early_signal.badge === 'rising') return '#eab308'; // yellow
    if (account.risk_level === 'high') return '#ef4444'; // red
    if (account.risk_level === 'medium') return '#f97316'; // orange
    return '#94a3b8'; // gray
  }, []);

  const getOpacity = useCallback((account) => {
    if (account.early_signal.badge === 'none') return 0.3;
    return 0.8;
  }, []);

  // Axis ticks
  const xTicks = [-1, -0.5, 0, 0.5, 1];
  const yTicks = [0, 250, 500, 750, 1000];

  return (
    <div className="relative bg-gray-900 rounded-xl p-4 overflow-hidden">
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-gray-800/80 backdrop-blur rounded-lg p-3 text-xs space-y-2">
        <div className="text-gray-400 font-medium mb-2">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-300">Breakout</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-gray-300">Rising</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500 opacity-30" />
          <span className="text-gray-300">No Signal</span>
        </div>
      </div>

      {/* Zone labels */}
      <div className="absolute top-12 left-20 text-xs text-gray-500">Инертные</div>
      <div className="absolute top-12 right-20 text-xs text-green-400 font-bold">🔥 Alpha Zone</div>
      <div className="absolute bottom-16 left-20 text-xs text-gray-500">Шум</div>
      <div className="absolute bottom-16 right-20 text-xs text-yellow-400">Разогрев</div>

      <svg width={WIDTH} height={HEIGHT} className="mx-auto">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect 
          x={PADDING.left} 
          y={PADDING.top} 
          width={innerWidth} 
          height={innerHeight} 
          fill="url(#grid)" 
        />

        {/* Alpha Zone highlight */}
        <rect
          x={xScale(0.3)}
          y={yScale(1000)}
          width={xScale(1) - xScale(0.3)}
          height={yScale(500) - yScale(1000)}
          fill="#22c55e"
          opacity={0.1}
          rx={8}
        />

        {/* X-axis */}
        <line
          x1={PADDING.left}
          y1={HEIGHT - PADDING.bottom}
          x2={WIDTH - PADDING.right}
          y2={HEIGHT - PADDING.bottom}
          stroke="#4b5563"
          strokeWidth={2}
        />
        {xTicks.map(tick => (
          <g key={tick}>
            <line
              x1={xScale(tick)}
              y1={HEIGHT - PADDING.bottom}
              x2={xScale(tick)}
              y2={HEIGHT - PADDING.bottom + 6}
              stroke="#6b7280"
            />
            <text
              x={xScale(tick)}
              y={HEIGHT - PADDING.bottom + 20}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize={11}
            >
              {tick > 0 ? `+${tick}` : tick}
            </text>
          </g>
        ))}
        <text
          x={WIDTH / 2}
          y={HEIGHT - 10}
          textAnchor="middle"
          fill="#d1d5db"
          fontSize={12}
          fontWeight={500}
        >
          Acceleration (ускорение роста) →
        </text>

        {/* Y-axis */}
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={HEIGHT - PADDING.bottom}
          stroke="#4b5563"
          strokeWidth={2}
        />
        {yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={PADDING.left - 6}
              y1={yScale(tick)}
              x2={PADDING.left}
              y2={yScale(tick)}
              stroke="#6b7280"
            />
            <text
              x={PADDING.left - 12}
              y={yScale(tick) + 4}
              textAnchor="end"
              fill="#9ca3af"
              fontSize={11}
            >
              {tick}
            </text>
          </g>
        ))}
        <text
          x={20}
          y={HEIGHT / 2}
          textAnchor="middle"
          fill="#d1d5db"
          fontSize={12}
          fontWeight={500}
          transform={`rotate(-90, 20, ${HEIGHT / 2})`}
        >
          ↑ Adjusted Influence
        </text>

        {/* Data points */}
        {data.map((account, i) => {
          const cx = xScale(account.trend.acceleration_norm);
          const cy = yScale(account.influence_adjusted);
          const r = rScale(account.early_signal.score);
          const color = getColor(account);
          const opacity = getOpacity(account);
          const isSelected = selectedId === account.author_id;

          return (
            <g
              key={account.author_id}
              onClick={() => onSelect(account.author_id)}
              style={{ cursor: 'pointer' }}
              className="transition-all duration-200"
            >
              {/* Glow effect for selected */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 8}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  opacity={0.5}
                  className="animate-ping"
                />
              )}
              
              {/* Main bubble */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                opacity={opacity}
                stroke={isSelected ? '#fff' : 'transparent'}
                strokeWidth={isSelected ? 3 : 0}
                className="hover:opacity-100 transition-opacity"
              />
              
              {/* Username label for breakout */}
              {account.early_signal.badge === 'breakout' && (
                <text
                  x={cx}
                  y={cy - r - 6}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={10}
                  fontWeight={500}
                >
                  @{account.username}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ============================================================
// TABLE VIEW
// ============================================================

const EarlySignalTable = ({ data, onSelect, selectedId }) => {
  const [sortBy, setSortBy] = useState('early_signal');
  const [sortDir, setSortDir] = useState('desc');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'early_signal':
          aVal = a.early_signal.score;
          bVal = b.early_signal.score;
          break;
        case 'acceleration':
          aVal = a.trend.acceleration_norm;
          bVal = b.trend.acceleration_norm;
          break;
        case 'influence':
          aVal = a.influence_adjusted;
          bVal = b.influence_adjusted;
          break;
        default:
          return 0;
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [data, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ field, children }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === field && (
          <span className="text-blue-500">{sortDir === 'desc' ? '↓' : '↑'}</span>
        )}
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profile
              </th>
              <SortHeader field="influence">Influence</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trend
              </th>
              <SortHeader field="early_signal">Early Signal</SortHeader>
              <SortHeader field="acceleration">Accel</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map(account => (
              <tr 
                key={account.author_id}
                onClick={() => onSelect(account.author_id)}
                className={`cursor-pointer transition-colors ${
                  selectedId === account.author_id 
                    ? 'bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {account.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="font-medium text-gray-900">@{account.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ProfileBadge profile={account.profile} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">{account.influence_base}</span>
                    <span className="text-gray-300">→</span>
                    <span className="font-medium text-gray-900">{account.influence_adjusted}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <TrendArrow state={account.trend.state} velocity={account.trend.velocity_norm} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <EarlySignalBadge badge={account.early_signal.badge} />
                    <span className="text-sm text-gray-500">{account.early_signal.score}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`font-mono text-sm ${
                    account.trend.acceleration_norm > 0.3 
                      ? 'text-green-600 font-medium' 
                      : account.trend.acceleration_norm < -0.3 
                        ? 'text-red-600' 
                        : 'text-gray-500'
                  }`}>
                    {account.trend.acceleration_norm > 0 ? '+' : ''}{account.trend.acceleration_norm.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <RiskIndicator level={account.risk_level} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link 
                    to={`/connections/${account.author_id}`}
                    className="text-blue-500 hover:text-blue-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================
// DETAILS PANEL
// ============================================================

const EarlySignalDetailsPanel = ({ account, onClose }) => {
  if (!account) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
            {account.username?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">@{account.username}</h3>
            <ProfileBadge profile={account.profile} />
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Early Signal */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <Rocket className="w-4 h-4" />
            Early Signal
          </h4>
          <div className="flex items-center justify-between mb-3">
            <EarlySignalBadge badge={account.early_signal.badge} />
            <span className="text-2xl font-bold text-gray-900">{account.early_signal.score}</span>
          </div>
          <div className="text-sm text-gray-600">
            {account.early_signal.badge === 'breakout' && (
              <p>🚀 Обнаружен ранний сигнал: аккаунт быстро усиливает влияние и может стать значимым.</p>
            )}
            {account.early_signal.badge === 'rising' && (
              <p>📈 Аккаунт демонстрирует положительную динамику и заслуживает наблюдения.</p>
            )}
            {account.early_signal.badge === 'none' && (
              <p>➖ Ранних сигналов роста не обнаружено.</p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Confidence: {(account.early_signal.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Influence */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Influence Score
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Base</span>
            <span className="font-medium">{account.influence_base}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Adjusted</span>
            <span className="font-bold text-lg">{account.influence_adjusted}</span>
          </div>
          {account.influence_adjusted !== account.influence_base && (
            <div className={`text-sm ${
              account.influence_adjusted > account.influence_base 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {account.influence_adjusted > account.influence_base ? '+' : ''}
              {account.influence_adjusted - account.influence_base} от тренда
            </div>
          )}
        </div>

        {/* Trend */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500">Trend Dynamics</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Velocity</div>
              <div className={`font-mono font-medium ${
                account.trend.velocity_norm > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {account.trend.velocity_norm > 0 ? '+' : ''}{account.trend.velocity_norm.toFixed(3)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Acceleration</div>
              <div className={`font-mono font-medium ${
                account.trend.acceleration_norm > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {account.trend.acceleration_norm > 0 ? '+' : ''}{account.trend.acceleration_norm.toFixed(3)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-gray-400 text-sm">State</span>
            <TrendArrow state={account.trend.state} />
          </div>
        </div>

        {/* Risk */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Risk Level
          </h4>
          <RiskIndicator level={account.risk_level} />
        </div>

        {/* Action */}
        <Link 
          to={`/connections/${account.author_id}`}
          className="block w-full"
        >
          <Button className="w-full flex items-center justify-center gap-2">
            Open Full Profile
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

// Generate mock base accounts for demo when DB is empty
const generateMockBaseAccounts = (count) => {
  const names = [
    'cryptowizard', 'defi_hunter', 'nft_collector', 'blockchain_dev', 'token_master',
    'whale_watcher', 'alpha_seeker', 'yield_farmer', 'dao_builder', 'web3_explorer',
    'sol_maxi', 'eth_bull', 'btc_hodler', 'meme_trader', 'airdrop_hunter',
    'liquidity_pro', 'gas_optimizer', 'bridge_master', 'layer2_fan', 'zk_enthusiast',
    'depin_builder', 'ai_crypto', 'gaming_guild', 'metaverse_ape', 'rwa_investor',
    'staking_king', 'validator_node', 'mev_searcher', 'oracle_watcher', 'cross_chain'
  ];
  
  const profiles = ['retail', 'influencer', 'whale'];
  const risks = ['low', 'medium', 'high'];
  
  return Array.from({ length: count }, (_, i) => {
    const profile = profiles[i % 3];
    const risk = risks[Math.floor(Math.random() * 3)];
    const baseInfluence = profile === 'whale' ? 600 + Math.random() * 300 :
                          profile === 'influencer' ? 400 + Math.random() * 300 :
                          200 + Math.random() * 400;
    
    return {
      author_id: `demo_${i.toString().padStart(3, '0')}`,
      username: names[i % names.length] + (i >= names.length ? `_${Math.floor(i / names.length)}` : ''),
      influence_score: Math.round(baseInfluence),
      profile,
      risk_level: risk,
      trend: {
        velocity_norm: (Math.random() - 0.3) * 1.5,
        acceleration_norm: (Math.random() - 0.3) * 1.2,
      },
    };
  });
};

const ConnectionsEarlySignalPage = () => {
  const [view, setView] = useState('radar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    profiles: ['retail', 'influencer'],
    badges: ['breakout', 'rising'],
    hideHighRisk: true,
    minAcceleration: null,
  });

  // Handle account selection for compare
  const handleAccountSelect = (accountId) => {
    if (compareMode) {
      if (compareSelection.includes(accountId)) {
        setCompareSelection(compareSelection.filter(id => id !== accountId));
      } else if (compareSelection.length < 2) {
        const newSelection = [...compareSelection, accountId];
        setCompareSelection(newSelection);
        if (newSelection.length === 2) {
          setCompareOpen(true);
        }
      }
    } else {
      setSelectedAccountId(accountId);
    }
  };

  // Fetch and enrich data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch base accounts
      const accountsRes = await fetch(`${BACKEND_URL}/api/connections/accounts`);
      if (!accountsRes.ok) throw new Error('Failed to fetch accounts');
      const accountsData = await accountsRes.json();
      
      let baseAccounts = accountsData.data?.accounts || accountsData.accounts || [];
      
      // If no accounts in DB, generate mock data for demo
      if (baseAccounts.length === 0) {
        console.log('[Radar] No accounts in DB, generating mock data for demo');
        baseAccounts = generateMockBaseAccounts(30);
      }
      
      // Enrich with early signal for each account
      const enrichedAccounts = await Promise.all(
        baseAccounts.slice(0, 50).map(async (acc) => {
          try {
            // Generate trend values if not present
            const velocity = acc.trend?.velocity_norm ?? (Math.random() - 0.3) * 1.5;
            const accel = acc.trend?.acceleration_norm ?? (Math.random() - 0.3) * 1.2;
            
            // Get trend-adjusted score
            const trendRes = await fetch(`${BACKEND_URL}/api/connections/trend-adjusted`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                influence_score: acc.influence_score || acc.score || 500,
                x_score: acc.x_score || 300,
                velocity_norm: velocity,
                acceleration_norm: accel,
                state: acc.trend?.state || (velocity > 0.2 ? 'growing' : velocity < -0.2 ? 'cooling' : 'stable'),
              }),
            });
            const trendData = await trendRes.json();
            
            const adjustedScore = trendData.data?.influence?.adjusted_score || acc.influence_score || 500;
            const state = velocity > 0.2 ? 'growing' : velocity < -0.2 ? 'cooling' : Math.abs(accel) > 0.3 ? 'volatile' : 'stable';
            
            // Get early signal
            const earlyRes = await fetch(`${BACKEND_URL}/api/connections/early-signal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                influence_base: acc.influence_score || acc.score || 500,
                influence_adjusted: adjustedScore,
                trend: {
                  velocity_norm: velocity,
                  acceleration_norm: accel,
                },
                signal_noise: acc.signal_noise || 5,
                risk_level: acc.risk_level || 'low',
                profile: acc.profile || 'retail',
              }),
            });
            const earlyData = await earlyRes.json();
            
            return {
              author_id: acc.author_id || acc.id || `account_${Math.random().toString(36).substr(2, 9)}`,
              username: acc.username || acc.handle || 'unknown',
              profile: acc.profile || 'retail',
              risk_level: acc.risk_level || 'low',
              influence_base: acc.influence_score || acc.score || 500,
              influence_adjusted: adjustedScore,
              trend: {
                velocity_norm: velocity,
                acceleration_norm: accel,
                state,
              },
              early_signal: {
                score: earlyData.data?.early_signal_score || 0,
                badge: earlyData.data?.badge || 'none',
                confidence: earlyData.data?.confidence || 0,
              },
            };
          } catch (err) {
            // Return computed data on API error
            const velocity = acc.trend?.velocity_norm ?? (Math.random() - 0.3) * 1.5;
            const accel = acc.trend?.acceleration_norm ?? (Math.random() - 0.3) * 1.2;
            const base = acc.influence_score || acc.score || Math.round(300 + Math.random() * 500);
            const adjusted = Math.round(Math.min(1000, Math.max(0, base * (1 + 0.35 * velocity + 0.15 * accel))));
            const state = velocity > 0.2 ? 'growing' : velocity < -0.2 ? 'cooling' : 'stable';
            
            // Compute early signal locally
            const growthPressure = 0.6 * accel + 0.4 * velocity;
            const relativeGap = (adjusted - base) / Math.max(base, 1);
            const profileFactor = acc.profile === 'whale' ? 0.4 : acc.profile === 'influencer' ? 0.75 : 1.0;
            const riskPenalty = acc.risk_level === 'high' ? 0.5 : acc.risk_level === 'medium' ? 0.2 : 0;
            const earlyRaw = growthPressure * profileFactor + relativeGap - riskPenalty;
            const earlyScore = Math.round(Math.max(0, Math.min(1, earlyRaw)) * 1000);
            const badge = earlyScore >= 700 && accel >= 0.4 && acc.risk_level !== 'high' ? 'breakout' :
                          earlyScore >= 450 ? 'rising' : 'none';
            
            return {
              author_id: acc.author_id || acc.id || `account_${Math.random().toString(36).substr(2, 9)}`,
              username: acc.username || acc.handle || 'unknown',
              profile: acc.profile || 'retail',
              risk_level: acc.risk_level || 'low',
              influence_base: base,
              influence_adjusted: adjusted,
              trend: { velocity_norm: velocity, acceleration_norm: accel, state },
              early_signal: { score: earlyScore, badge, confidence: Math.random() * 0.5 + 0.3 },
            };
          }
        })
      );
      
      setAccounts(enrichedAccounts);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
      
      // Generate mock data on error
      const mockAccounts = generateMockBaseAccounts(30).map(acc => {
        const velocity = acc.trend.velocity_norm;
        const accel = acc.trend.acceleration_norm;
        const base = acc.influence_score;
        const adjusted = Math.round(Math.min(1000, Math.max(0, base * (1 + 0.35 * velocity + 0.15 * accel))));
        const state = velocity > 0.2 ? 'growing' : velocity < -0.2 ? 'cooling' : 'stable';
        
        const growthPressure = 0.6 * accel + 0.4 * velocity;
        const relativeGap = (adjusted - base) / Math.max(base, 1);
        const profileFactor = acc.profile === 'whale' ? 0.4 : acc.profile === 'influencer' ? 0.75 : 1.0;
        const riskPenalty = acc.risk_level === 'high' ? 0.5 : acc.risk_level === 'medium' ? 0.2 : 0;
        const earlyRaw = growthPressure * profileFactor + relativeGap - riskPenalty;
        const earlyScore = Math.round(Math.max(0, Math.min(1, earlyRaw)) * 1000);
        const badge = earlyScore >= 700 && accel >= 0.4 && acc.risk_level !== 'high' ? 'breakout' :
                      earlyScore >= 450 ? 'rising' : 'none';
        
        return {
          ...acc,
          influence_base: base,
          influence_adjusted: adjusted,
          trend: { velocity_norm: velocity, acceleration_norm: accel, state },
          early_signal: { score: earlyScore, badge, confidence: Math.random() * 0.5 + 0.3 },
        };
      });
      setAccounts(mockAccounts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      // Profile filter
      if (!filters.profiles.includes(acc.profile)) return false;
      
      // Badge filter - show if badge matches OR if badge is 'none' but we want all
      const hasBadgeFilter = filters.badges.length > 0;
      if (hasBadgeFilter) {
        // If account has no badge, only show if 'none' would be visible
        if (acc.early_signal.badge === 'none') {
          // Show 'none' badges only if we're explicitly showing them (no badge filter active means show all)
          // Or if score is somewhat significant
          if (acc.early_signal.score < 200) return false;
        } else {
          // Account has a badge - check if it matches filter
          if (!filters.badges.includes(acc.early_signal.badge)) return false;
        }
      }
      if (filters.hideHighRisk && acc.risk_level === 'high') return false;
      if (filters.minAcceleration && acc.trend.acceleration_norm < filters.minAcceleration) return false;
      return true;
    });
  }, [accounts, filters]);

  // Selected account
  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.author_id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  // Stats
  const stats = useMemo(() => {
    const breakouts = filteredAccounts.filter(a => a.early_signal.badge === 'breakout').length;
    const rising = filteredAccounts.filter(a => a.early_signal.badge === 'rising').length;
    return { breakouts, rising, total: filteredAccounts.length };
  }, [filteredAccounts]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl">
                <Radar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Early Signal Radar</h1>
                <p className="text-sm text-gray-500">Кто может стать важным в ближайшее время</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">🚀</span>
                  <span className="font-medium">{stats.breakouts}</span>
                  <span className="text-gray-400 text-sm">breakout</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">📈</span>
                  <span className="font-medium">{stats.rising}</span>
                  <span className="text-gray-400 text-sm">rising</span>
                </div>
              </div>

              {/* Compare Mode Toggle */}
              <Button 
                variant={compareMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCompareMode(!compareMode);
                  setCompareSelection([]);
                }}
                className="flex items-center gap-1.5"
              >
                <Scale className="w-4 h-4" />
                {compareMode ? `Compare (${compareSelection.length}/2)` : 'Compare'}
              </Button>

              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('radar')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    view === 'radar' 
                      ? 'bg-white shadow text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Radar className="w-4 h-4" />
                  Radar
                </button>
                <button
                  onClick={() => setView('table')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    view === 'table' 
                      ? 'bg-white shadow text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Table2 className="w-4 h-4" />
                  Table
                </button>
              </div>

              {/* Refresh */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Compare Mode Info Banner */}
      {compareMode && (
        <div className="bg-blue-600 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <span className="font-medium">Compare Mode:</span>
              <span>Select 2 accounts to compare</span>
              {compareSelection.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm">
                  Selected: {compareSelection.map(id => accounts.find(a => a.author_id === id)?.username || id).join(' vs ')}
                </span>
              )}
            </div>
            <button 
              onClick={() => { setCompareMode(false); setCompareSelection([]); }}
              className="text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <EarlySignalFiltersBar filters={filters} onChange={setFilters} />

        {/* Info banner */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <strong>Alpha Zone</strong> (правый верх) — аккаунты с высоким ускорением роста и влиянием. 
            Это кандидаты, которых рынок ещё не заметил.
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Загрузка данных...</p>
              </div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Radar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-lg">No early signals detected</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting filters</p>
              </div>
            </div>
          ) : view === 'radar' ? (
            <EarlySignalRadar 
              data={filteredAccounts}
              onSelect={handleAccountSelect}
              selectedId={compareMode ? null : selectedAccountId}
              compareSelection={compareMode ? compareSelection : []}
            />
          ) : (
            <EarlySignalTable
              data={filteredAccounts}
              onSelect={handleAccountSelect}
              selectedId={compareMode ? null : selectedAccountId}
              compareSelection={compareMode ? compareSelection : []}
            />
          )}
        </div>
      </div>

      {/* Details Panel */}
      {selectedAccount && !compareMode && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedAccountId(null)}
          />
          <EarlySignalDetailsPanel 
            account={selectedAccount}
            onClose={() => setSelectedAccountId(null)}
          />
        </>
      )}

      {/* Compare Modal */}
      <CompareModal
        isOpen={compareOpen}
        onClose={() => {
          setCompareOpen(false);
          setCompareSelection([]);
          setCompareMode(false);
        }}
        accountA={accounts.find(a => a.author_id === compareSelection[0])}
        accountB={accounts.find(a => a.author_id === compareSelection[1])}
        onSelectAccount={(id) => {
          setCompareOpen(false);
          setCompareSelection([]);
          setCompareMode(false);
          setSelectedAccountId(id);
        }}
      />
    </div>
  );
};

export default ConnectionsEarlySignalPage;
