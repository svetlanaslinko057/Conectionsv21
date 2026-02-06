/**
 * ConnectionsPage - Main page with accounts table
 * Based on provided design mockups
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, ChevronDown, X, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Risk level badge component
const RiskBadge = ({ level }) => {
  const styles = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
    unknown: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[level] || styles.unknown}`}>
      {level?.charAt(0).toUpperCase() + level?.slice(1) || 'Unknown'}
    </span>
  );
};

// Score display component
const ScoreDisplay = ({ value, max = 1000 }) => {
  const percent = (value / max) * 100;
  let color = 'bg-gray-300';
  if (percent >= 70) color = 'bg-green-500';
  else if (percent >= 40) color = 'bg-yellow-500';
  else if (percent > 0) color = 'bg-red-500';
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-700">{Math.round(value)}</span>
    </div>
  );
};

// Filter Panel Component
const FilterPanel = ({ filters, setFilters, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      influenceMin: 0,
      influenceMax: 1000,
      riskLevel: [],
      activity: 'all',
      timeWindow: 30,
    };
    setLocalFilters(resetFilters);
    setFilters(resetFilters);
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-5 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Influence Score Range */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Influence Score</label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={0}
            max={1000}
            value={localFilters.influenceMin}
            onChange={(e) => setLocalFilters({ ...localFilters, influenceMin: Number(e.target.value) })}
            className="w-20 text-center"
          />
          <span className="text-gray-400">—</span>
          <Input
            type="number"
            min={0}
            max={1000}
            value={localFilters.influenceMax}
            onChange={(e) => setLocalFilters({ ...localFilters, influenceMax: Number(e.target.value) })}
            className="w-20 text-center"
          />
        </div>
        <input
          type="range"
          min={0}
          max={1000}
          value={localFilters.influenceMax}
          onChange={(e) => setLocalFilters({ ...localFilters, influenceMax: Number(e.target.value) })}
          className="w-full mt-2 accent-blue-600"
        />
      </div>

      {/* Risk Level */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
        <div className="flex gap-2">
          {['low', 'medium', 'high'].map((level) => (
            <button
              key={level}
              onClick={() => {
                const current = localFilters.riskLevel || [];
                setLocalFilters({
                  ...localFilters,
                  riskLevel: current.includes(level)
                    ? current.filter((l) => l !== level)
                    : [...current, level],
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                (localFilters.riskLevel || []).includes(level)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Time Window */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Time Window</label>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setLocalFilters({ ...localFilters, timeWindow: days })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                localFilters.timeWindow === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-3 border-t border-gray-100">
        <Button variant="outline" onClick={handleReset} className="flex-1">
          Reset
        </Button>
        <Button onClick={handleApply} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

// Compare Modal Component
const CompareModal = ({ isOpen, onClose, accounts, selectedAccounts, setSelectedAccounts }) => {
  const [compareResult, setCompareResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (selectedAccounts.length !== 2) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/connections/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          left: selectedAccounts[0],
          right: selectedAccounts[1],
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCompareResult(data.data);
      }
    } catch (err) {
      console.error('Compare error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedAccounts.length === 2) {
      handleCompare();
    } else {
      setCompareResult(null);
    }
  }, [selectedAccounts]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Compare Accounts</DialogTitle>
        </DialogHeader>

        {/* Account Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[0, 1].map((idx) => (
            <div key={idx} className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Account {idx + 1}</label>
              <select
                value={selectedAccounts[idx] || ''}
                onChange={(e) => {
                  const newSelected = [...selectedAccounts];
                  newSelected[idx] = e.target.value;
                  setSelectedAccounts(newSelected);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select account...</option>
                {accounts.map((acc) => (
                  <option key={acc.author_id} value={acc.handle}>
                    @{acc.handle}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Compare Results */}
        {loading && (
          <div className="text-center py-8 text-gray-500">Loading comparison...</div>
        )}

        {compareResult && (
          <div className="space-y-6">
            {/* Audience Overlap */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Audience Overlap</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(compareResult.audience_overlap.a_to_b * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">A → B</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {(compareResult.audience_overlap.b_to_a * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">B → A</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-700">
                    {compareResult.audience_overlap.shared_users.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Shared</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {(compareResult.audience_overlap.jaccard_similarity * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Jaccard</div>
                </div>
              </div>
              {compareResult.interpretation && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="text-sm font-medium text-gray-700">
                    {compareResult.interpretation.relationship.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {compareResult.interpretation.description}
                  </div>
                </div>
              )}
            </div>

            {/* Comparison Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Metric</th>
                    <th className="px-4 py-3 text-center text-gray-600 font-medium">@{compareResult.left.handle}</th>
                    <th className="px-4 py-3 text-center text-gray-600 font-medium">@{compareResult.right.handle}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-gray-600">Influence Score</td>
                    <td className="px-4 py-3 text-center font-medium">{compareResult.left.influence_score}</td>
                    <td className="px-4 py-3 text-center font-medium">{compareResult.right.influence_score}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-600">Active Audience</td>
                    <td className="px-4 py-3 text-center font-medium">{compareResult.left.active_audience_size?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-medium">{compareResult.right.active_audience_size?.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !compareResult && selectedAccounts.length < 2 && (
          <div className="text-center py-8 text-gray-400">
            Select two accounts to compare
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Main Page Component
export default function ConnectionsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'scores.influence_score', direction: 'desc' });
  const [filters, setFilters] = useState({
    influenceMin: 0,
    influenceMax: 1000,
    riskLevel: [],
    activity: 'all',
    timeWindow: 30,
  });

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/connections/accounts?limit=100`);
        const data = await res.json();
        if (data.ok) {
          setAccounts(data.data.items || []);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
      setLoading(false);
    };
    fetchAccounts();
  }, []);

  // Filter and sort accounts
  const filteredAccounts = useMemo(() => {
    let result = [...accounts];

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((acc) => acc.handle?.toLowerCase().includes(s));
    }

    // Influence filter
    result = result.filter((acc) => {
      const score = acc.scores?.influence_score || 0;
      return score >= filters.influenceMin && score <= filters.influenceMax;
    });

    // Risk level filter
    if (filters.riskLevel.length > 0) {
      result = result.filter((acc) => filters.riskLevel.includes(acc.scores?.risk_level));
    }

    // Sort
    result.sort((a, b) => {
      const aVal = sortConfig.key.split('.').reduce((o, k) => o?.[k], a) || 0;
      const bVal = sortConfig.key.split('.').reduce((o, k) => o?.[k], b) || 0;
      return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [accounts, search, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
              <p className="text-sm text-gray-500 mt-1">
                Analyze Twitter account influence and engagement metrics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCompare(true)}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Compare
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-gray-200"
            />
          </div>
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filters.riskLevel.length > 0 || filters.influenceMin > 0 || filters.influenceMax < 1000) && (
                <span className="w-2 h-2 bg-blue-600 rounded-full" />
              )}
            </Button>
            {showFilters && (
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                onClose={() => setShowFilters(false)}
              />
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{accounts.length}</div>
            <div className="text-sm text-gray-500">Total Accounts</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {accounts.filter((a) => a.scores?.risk_level === 'low').length}
            </div>
            <div className="text-sm text-gray-500">Low Risk</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-2xl font-bold text-yellow-600">
              {accounts.filter((a) => a.scores?.risk_level === 'medium').length}
            </div>
            <div className="text-sm text-gray-500">Medium Risk</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-2xl font-bold text-red-600">
              {accounts.filter((a) => a.scores?.risk_level === 'high').length}
            </div>
            <div className="text-sm text-gray-500">High Risk</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading accounts...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No accounts found. Add test data via API.
            </div>
          ) : (
            <table className="w-full" data-testid="connections-table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('handle')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                    >
                      Account
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('scores.influence_score')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                    >
                      Influence Score
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('scores.risk_level')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                    >
                      Risk
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-sm font-semibold text-gray-600">Followers</span>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-sm font-semibold text-gray-600">Engagement</span>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-sm font-semibold text-gray-600">Posts</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAccounts.map((acc) => (
                  <tr
                    key={acc.author_id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/connections/${acc.author_id}`}
                        className="flex items-center gap-3"
                        data-testid={`account-link-${acc.author_id}`}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {acc.handle?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">@{acc.handle}</div>
                          <div className="text-xs text-gray-400">{acc.author_id}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <ScoreDisplay value={acc.scores?.influence_score || 0} />
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge level={acc.scores?.risk_level} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {(acc.followers || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {((acc.activity?.avg_engagement_quality || 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {acc.activity?.posts_count || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Compare Modal */}
      <CompareModal
        isOpen={showCompare}
        onClose={() => setShowCompare(false)}
        accounts={accounts}
        selectedAccounts={selectedAccounts}
        setSelectedAccounts={setSelectedAccounts}
      />
    </div>
  );
}
