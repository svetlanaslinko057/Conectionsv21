/**
 * Admin Connections Page - Control Plane for Connections Module
 * 
 * Tabs:
 * - Overview: Module status & stats
 * - Config: View/edit configuration
 * - Stability: Tuning matrix results
 * - Alerts: Preview & manage alerts
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Settings, 
  Shield, 
  Bell, 
  Power, 
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAdminAuth } from '../../context/AdminAuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// ============================================================
// TAB COMPONENTS
// ============================================================

// Overview Tab
const OverviewTab = ({ data, token, onRefresh }) => {
  const [toggling, setToggling] = useState(false);
  const [changingSource, setChangingSource] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await fetch(`${BACKEND_URL}/api/admin/connections/toggle`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !data.enabled }),
      });
      onRefresh();
    } catch (err) {
      console.error('Toggle error:', err);
    }
    setToggling(false);
  };

  const handleSourceChange = async (mode) => {
    setChangingSource(true);
    try {
      await fetch(`${BACKEND_URL}/api/admin/connections/source`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mode }),
      });
      onRefresh();
    } catch (err) {
      console.error('Source change error:', err);
    }
    setChangingSource(false);
  };

  if (!data) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Module Status */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Power className="w-4 h-4" />
            Module Status
          </h3>
          <Button
            variant={data.enabled ? "destructive" : "default"}
            size="sm"
            onClick={handleToggle}
            disabled={toggling}
          >
            {toggling ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
              data.enabled ? <><Pause className="w-4 h-4 mr-1" /> Disable</> : 
              <><Play className="w-4 h-4 mr-1" /> Enable</>}
          </Button>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className={`font-bold text-lg flex items-center gap-2 ${data.enabled ? 'text-green-600' : 'text-red-600'}`}>
              {data.enabled ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {data.enabled ? 'ENABLED' : 'DISABLED'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Health</div>
            <div className={`font-bold text-lg ${data.health?.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
              {data.health?.status?.toUpperCase() || 'UNKNOWN'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Uptime</div>
            <div className="font-bold text-lg">{data.health?.uptime_hours || 0}h</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Last Run</div>
            <div className="font-medium text-sm">
              {data.last_run ? new Date(data.last_run).toLocaleTimeString() : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Data Source */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Database className="w-4 h-4" />
          Data Source
        </h3>
        <div className="flex gap-3">
          {['mock', 'sandbox', 'twitter_live'].map(mode => (
            <button
              key={mode}
              onClick={() => handleSourceChange(mode)}
              disabled={changingSource || data.source_mode === mode}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                data.source_mode === mode
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${changingSource ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {mode === 'mock' && '🎭 Mock'}
              {mode === 'sandbox' && '📦 Sandbox'}
              {mode === 'twitter_live' && '🐦 Twitter Live'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Current: <strong>{data.source_mode}</strong>. 
          {data.source_mode === 'mock' && ' Using generated test data.'}
          {data.source_mode === 'sandbox' && ' Using saved real data snapshot.'}
          {data.source_mode === 'twitter_live' && ' Connected to live Twitter API.'}
        </p>
      </div>

      {/* Processing Stats */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4" />
          Processing Stats (24h)
        </h3>
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Accounts" value={data.stats?.accounts_24h || 0} color="blue" />
          <StatCard label="Early Signals" value={data.stats?.early_signals || 0} color="yellow" />
          <StatCard label="Breakouts" value={data.stats?.breakouts || 0} color="green" />
          <StatCard label="Alerts Generated" value={data.stats?.alerts_generated || 0} color="purple" />
          <StatCard label="Alerts Sent" value={data.stats?.alerts_sent || 0} color="indigo" />
        </div>
      </div>

      {/* Errors */}
      {data.errors?.length > 0 && (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4" />
            Recent Errors
          </h3>
          <div className="space-y-2">
            {data.errors.map((err, idx) => (
              <div key={idx} className="text-sm text-red-700 bg-red-100 rounded px-3 py-2">
                {err}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Config Tab
const ConfigTab = ({ token, onRefresh }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/connections/config`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.ok) setConfig(data.data);
      } catch (err) {
        console.error('Config fetch error:', err);
      }
      setLoading(false);
    };
    fetchConfig();
  }, [token]);

  if (loading) return <div className="text-gray-500">Loading configuration...</div>;
  if (!config) return <div className="text-red-500">Failed to load configuration</div>;

  return (
    <div className="space-y-6">
      {/* Version Info */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            v{config.version}
          </span>
        </div>
        {config.last_modified && (
          <p className="text-xs text-gray-500 mb-4">
            Last modified: {new Date(config.last_modified).toLocaleString()}
          </p>
        )}

        {/* Trend Adjusted Config */}
        <ConfigSection title="Trend-Adjusted Score" config={config.config.trend_adjusted} />
        
        {/* Early Signal Config */}
        <ConfigSection title="Early Signal" config={config.config.early_signal} />
      </div>

      {/* Version History */}
      {config.history?.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Version History
          </h3>
          <div className="space-y-2">
            {config.history.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                <span className="font-mono text-blue-600">v{h.version}</span>
                <span className="text-gray-500">{new Date(h.timestamp).toLocaleString()}</span>
                <span className="text-gray-400">by {h.admin_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Stability Tab
const StabilityTab = ({ token }) => {
  const [tuning, setTuning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchTuning = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/tuning/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setTuning(data.data);
    } catch (err) {
      console.error('Tuning fetch error:', err);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchTuning(); }, [fetchTuning]);

  const runTuning = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/tuning/run`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ dataset_size: 25 }),
      });
      await res.json();
      await fetchTuning();
    } catch (err) {
      console.error('Tuning run error:', err);
    }
    setRunning(false);
  };

  if (loading) return <div className="text-gray-500">Loading stability data...</div>;

  return (
    <div className="space-y-6">
      {/* Overall Stability */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Model Stability
          </h3>
          <Button size="sm" onClick={runTuning} disabled={running}>
            {running ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            Run Analysis
          </Button>
        </div>

        {tuning && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className={`text-5xl font-bold ${
                tuning.overall_stability >= 0.8 ? 'text-green-500' :
                tuning.overall_stability >= 0.6 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {(tuning.overall_stability * 100).toFixed(0)}%
              </div>
              <div>
                <div className="text-lg font-medium">
                  {tuning.overall_stability >= 0.8 ? '✅ Stable' :
                   tuning.overall_stability >= 0.6 ? '⚠️ Moderate' : '❌ Unstable'}
                </div>
                <div className="text-sm text-gray-500">
                  Last run: {tuning.last_run ? new Date(tuning.last_run).toLocaleTimeString() : 'Never'}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              {tuning.recommendations?.map((rec, idx) => (
                <div key={idx} className={`text-sm p-3 rounded-lg ${
                  rec.startsWith('✅') ? 'bg-green-50 text-green-700' :
                  rec.startsWith('⚠️') ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'
                }`}>
                  {rec}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Parameter Details */}
      {tuning?.parameters && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Parameter Sensitivity
          </h3>
          <div className="space-y-3">
            {tuning.parameters.map((param, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-blue-600">{param.name}</span>
                  <span className={`text-sm font-medium ${
                    param.best_stability >= 0.8 ? 'text-green-600' :
                    param.best_stability >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(param.best_stability * 100).toFixed(0)}% stable
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Safe range: [{param.safe_range[0]}, {param.safe_range[1]}] | 
                  Optimal: {param.optimal_delta}
                </div>
                {param.warning && (
                  <div className="text-xs text-red-600 mt-1">⚠️ {param.warning}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Alerts Tab
const AlertsTab = ({ token }) => {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/alerts/preview`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setAlerts(data.data);
    } catch (err) {
      console.error('Alerts fetch error:', err);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleAction = async (alertId, action) => {
    try {
      await fetch(`${BACKEND_URL}/api/admin/connections/alerts/${action}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ alert_id: alertId }),
      });
      await fetchAlerts();
    } catch (err) {
      console.error('Alert action error:', err);
    }
  };

  const toggleAlertType = async (type, enabled) => {
    try {
      await fetch(`${BACKEND_URL}/api/admin/connections/alerts/config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          types: { [type]: { ...alerts.config.types[type], enabled } } 
        }),
      });
      await fetchAlerts();
    } catch (err) {
      console.error('Alert config error:', err);
    }
  };

  if (loading) return <div className="text-gray-500">Loading alerts...</div>;
  if (!alerts) return <div className="text-red-500">Failed to load alerts</div>;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4" />
          Alerts Summary
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total" value={alerts.summary.total} color="gray" />
          <StatCard label="Preview" value={alerts.summary.preview} color="blue" />
          <StatCard label="Sent" value={alerts.summary.sent} color="green" />
          <StatCard label="Suppressed" value={alerts.summary.suppressed} color="red" />
        </div>
      </div>

      {/* Alert Types Config */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Alert Types
        </h3>
        <div className="space-y-3">
          {Object.entries(alerts.config.types).map(([type, config]) => (
            <div key={type} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div>
                <div className="font-medium text-gray-900">{type.replace(/_/g, ' ')}</div>
                <div className="text-xs text-gray-500">
                  Severity ≥ {config.severity_min} | Cooldown: {config.cooldown_minutes}min
                </div>
              </div>
              <button
                onClick={() => toggleAlertType(type, !config.enabled)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config.enabled 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {config.enabled ? <><Eye className="w-4 h-4 inline mr-1" /> ON</> : 
                  <><EyeOff className="w-4 h-4 inline mr-1" /> OFF</>}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Preview List */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Recent Alerts
        </h3>
        {alerts.alerts.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No alerts</div>
        ) : (
          <div className="space-y-3">
            {alerts.alerts.map(alert => (
              <div key={alert.id} className={`rounded-lg p-4 border ${
                alert.status === 'preview' ? 'bg-blue-50 border-blue-200' :
                alert.status === 'sent' ? 'bg-green-50 border-green-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      alert.type === 'EARLY_BREAKOUT' ? 'bg-green-100 text-green-700' :
                      alert.type === 'STRONG_ACCELERATION' ? 'bg-yellow-100 text-yellow-700' :
                      alert.type === 'RISK_SPIKE' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {alert.type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">@{alert.account.username}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    alert.status === 'preview' ? 'bg-blue-200 text-blue-700' :
                    alert.status === 'sent' ? 'bg-green-200 text-green-700' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {alert.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">{alert.reason}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(alert.timestamp).toLocaleString()} | Severity: {(alert.severity * 100).toFixed(0)}%
                  </span>
                  {alert.status === 'preview' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAction(alert.id, 'send')}
                        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                      >
                        <Send className="w-3 h-3 inline mr-1" /> Send
                      </button>
                      <button 
                        onClick={() => handleAction(alert.id, 'suppress')}
                        className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                      >
                        <XCircle className="w-3 h-3 inline mr-1" /> Suppress
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ label, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    gray: 'bg-gray-50 text-gray-600',
  };
  return (
    <div className={`rounded-lg p-4 ${colors[color] || colors.gray}`}>
      <div className="text-xs opacity-75 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

const ConfigSection = ({ title, config }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left font-medium text-gray-700 flex items-center justify-between hover:bg-gray-50"
      >
        {title}
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminConnectionsPage() {
  const { token } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/overview`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setOverview(data.data);
    } catch (err) {
      console.error('Overview fetch error:', err);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'config', label: 'Config', icon: Settings },
    { id: 'stability', label: 'Stability', icon: Shield },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Connections Admin</h1>
                <p className="text-sm text-gray-500">Control Plane for Connections Module</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchOverview} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <OverviewTab data={overview} token={token} onRefresh={fetchOverview} />
        )}
        {activeTab === 'config' && (
          <ConfigTab token={token} onRefresh={fetchOverview} />
        )}
        {activeTab === 'stability' && (
          <StabilityTab token={token} />
        )}
        {activeTab === 'alerts' && (
          <AlertsTab token={token} />
        )}
      </div>
    </div>
  );
}
