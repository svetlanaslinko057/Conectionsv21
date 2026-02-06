/**
 * Admin Connections Page - Control Plane for Connections Module
 * 
 * P1.1 POLISH UPDATE:
 * - Overview: 3 logical blocks (Status, Activity, Warnings)
 * - Config: Grouped sections, read-only/editable distinction, apply flow
 * - Stability: Summary block with clear thresholds
 * - Alerts: Preview table with filters and controls
 * 
 * Tabs:
 * - Overview: Module status & stats
 * - Config: View/edit configuration
 * - Stability: Tuning matrix results
 * - Alerts: Preview & manage alerts
 */
import { useState, useEffect, useCallback, Component } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  EyeOff,
  Clock,
  TrendingUp,
  Zap,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Info,
  Filter,
  X,
  MessageSquare
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAdminAuth } from '../../context/AdminAuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { InfoTooltip, ADMIN_TOOLTIPS } from '../../components/admin/InfoTooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// ============================================================
// COMMON UI COMPONENTS
// ============================================================

// Status Badge with color coding
const StatusBadge = ({ status, size = 'md' }) => {
  const styles = {
    enabled: 'bg-green-100 text-green-700 border-green-300',
    disabled: 'bg-red-100 text-red-700 border-red-300',
    healthy: 'bg-green-100 text-green-700 border-green-300',
    degraded: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    error: 'bg-red-100 text-red-700 border-red-300',
    unknown: 'bg-gray-100 text-gray-600 border-gray-300',
    ok: 'bg-green-100 text-green-700 border-green-300',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    danger: 'bg-red-100 text-red-700 border-red-300',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base font-bold',
  };

  const normalizedStatus = status?.toLowerCase() || 'unknown';
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${styles[normalizedStatus] || styles.unknown} ${sizeClasses[size]}`}>
      {normalizedStatus === 'enabled' || normalizedStatus === 'healthy' || normalizedStatus === 'ok' ? (
        <CheckCircle className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      ) : normalizedStatus === 'disabled' || normalizedStatus === 'error' || normalizedStatus === 'danger' ? (
        <XCircle className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      ) : (
        <AlertTriangle className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      )}
      {status?.toUpperCase()}
    </span>
  );
};

// Health Indicator dot
const HealthDot = ({ status }) => {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    error: 'bg-red-500',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status?.toLowerCase()] || 'bg-gray-400'}`} />
  );
};

// Stat Card with consistent styling
const StatCard = ({ label, value, icon: Icon, color = 'gray', trend = null }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
  };
  
  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-75">{label}</span>
        {Icon && <Icon className="w-4 h-4 opacity-50" />}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend !== null && (
          <span className={`text-xs ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
};

// Section Card wrapper
const SectionCard = ({ title, icon: Icon, children, action, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {title}
      </h3>
      {action}
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

// Warning Banner
const WarningBanner = ({ children, severity = 'warning' }) => {
  const styles = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  
  return (
    <div className={`rounded-lg px-4 py-3 border flex items-start gap-3 ${styles[severity]}`}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm">{children}</div>
    </div>
  );
};

// Timestamp display
const Timestamp = ({ date, label }) => (
  <div className="text-xs text-gray-400 flex items-center gap-1">
    <Clock className="w-3 h-3" />
    {label && <span>{label}:</span>}
    <span>{date ? new Date(date).toLocaleString() : '—'}</span>
  </div>
);

// Toast notification (simple)
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className={`fixed bottom-4 right-4 ${styles[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-75">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================
// TAB: OVERVIEW
// ============================================================

const OverviewTab = ({ data, token, onRefresh }) => {
  const [toggling, setToggling] = useState(false);
  const [changingSource, setChangingSource] = useState(false);
  const [toast, setToast] = useState(null);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/toggle`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !data.enabled }),
      });
      const result = await res.json();
      if (result.ok) {
        setToast({ message: `Module ${!data.enabled ? 'enabled' : 'disabled'}`, type: 'success' });
        onRefresh();
      }
    } catch (err) {
      setToast({ message: 'Failed to toggle module', type: 'error' });
    }
    setToggling(false);
  };

  const handleSourceChange = async (mode) => {
    setChangingSource(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/source`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mode }),
      });
      const result = await res.json();
      if (result.ok) {
        setToast({ message: `Source changed to ${mode}`, type: 'success' });
        onRefresh();
      }
    } catch (err) {
      setToast({ message: 'Failed to change source', type: 'error' });
    }
    setChangingSource(false);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Calculate warnings
  const warnings = [];
  if (data.health?.status !== 'healthy') {
    warnings.push({ message: `Module health is ${data.health?.status?.toUpperCase()}`, severity: 'warning' });
  }
  if (data.stability && data.stability < 0.7) {
    warnings.push({ message: `Stability score is low (${(data.stability * 100).toFixed(0)}%)`, severity: 'warning' });
  }
  if (data.stats?.alerts_suppressed > 0) {
    warnings.push({ message: `${data.stats.alerts_suppressed} alerts suppressed in last 24h`, severity: 'info' });
  }
  if (data.config_changed_recently) {
    warnings.push({ message: 'Configuration was recently modified', severity: 'info' });
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* BLOCK A: STATUS */}
      <SectionCard 
        title="Module Status" 
        icon={Power}
        action={
          <Button
            variant={data.enabled ? "destructive" : "default"}
            size="sm"
            onClick={handleToggle}
            disabled={toggling}
            data-testid="toggle-module-btn"
          >
            {toggling ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
              data.enabled ? <><Pause className="w-4 h-4 mr-1" /> Disable</> : 
              <><Play className="w-4 h-4 mr-1" /> Enable</>}
          </Button>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Module</div>
            <StatusBadge status={data.enabled ? 'enabled' : 'disabled'} size="lg" />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Health <HealthDot status={data.health?.status} />
            </div>
            <StatusBadge status={data.health?.status || 'unknown'} size="lg" />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Source Mode</div>
            <div className="text-lg font-bold text-gray-900">
              {data.source_mode === 'mock' && '🎭 Mock'}
              {data.source_mode === 'sandbox' && '📦 Sandbox'}
              {data.source_mode === 'twitter_live' && '🐦 Twitter'}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Last Run</div>
            <div className="text-lg font-medium text-gray-700">
              {data.last_run ? new Date(data.last_run).toLocaleTimeString() : '—'}
            </div>
            <Timestamp date={data.last_run} />
          </div>
        </div>

        {/* Data Source Selector */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Database className="w-3 h-3" /> Change Data Source
          </div>
          <div className="flex gap-2 flex-wrap">
            {['mock', 'sandbox', 'twitter_live'].map(mode => (
              <button
                key={mode}
                onClick={() => handleSourceChange(mode)}
                disabled={changingSource || data.source_mode === mode}
                data-testid={`source-${mode}-btn`}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  data.source_mode === mode
                    ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${changingSource ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {mode === 'mock' && '🎭 Mock'}
                {mode === 'sandbox' && '📦 Sandbox'}
                {mode === 'twitter_live' && '🐦 Twitter Live'}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* BLOCK B: ACTIVITY (24h) */}
      <SectionCard title="Activity (24h)" icon={Activity}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard 
            label="Accounts Processed" 
            value={data.stats?.accounts_24h || 0} 
            icon={Database}
            color="blue" 
          />
          <StatCard 
            label="Early Signals" 
            value={data.stats?.early_signals || 0} 
            icon={Zap}
            color="yellow" 
          />
          <StatCard 
            label="Breakouts" 
            value={data.stats?.breakouts || 0} 
            icon={TrendingUp}
            color="green" 
          />
          <StatCard 
            label="Alerts Generated" 
            value={data.stats?.alerts_generated || 0} 
            icon={Bell}
            color="purple" 
          />
          <StatCard 
            label="Alerts Sent" 
            value={data.stats?.alerts_sent || 0} 
            icon={Send}
            color="indigo" 
          />
        </div>
        <Timestamp date={new Date()} label="Last updated" />
      </SectionCard>

      {/* BLOCK C: WARNINGS */}
      {warnings.length > 0 && (
        <SectionCard title="Warnings" icon={AlertTriangle}>
          <div className="space-y-3">
            {warnings.map((w, idx) => (
              <WarningBanner key={idx} severity={w.severity}>
                {w.message}
              </WarningBanner>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Errors (if any) */}
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

// ============================================================
// TAB: CONFIG
// ============================================================

const ConfigTab = ({ token, onRefresh }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/connections/config`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.ok) {
          setConfig(data.data);
        } else {
          setError(data.message || 'Failed to load config');
        }
      } catch (err) {
        setError(err.message || 'Network error');
      }
      setLoading(false);
    };
    fetchConfig();
  }, [token]);

  const handleApply = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(pendingChanges),
      });
      const result = await res.json();
      if (result.ok) {
        setToast({ message: `Config applied (v${result.version || 'new'})`, type: 'success' });
        setPendingChanges({});
        setEditMode(false);
        // Refresh config
        const res2 = await fetch(`${BACKEND_URL}/api/admin/connections/config`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data2 = await res2.json();
        if (data2.ok) setConfig(data2.data);
      } else {
        setToast({ message: 'Failed to apply config', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Failed to apply config', type: 'error' });
    }
    setShowConfirm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading configuration...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Failed to load configuration</span>
        </div>
        <p className="text-sm text-red-500 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Changes</h3>
            <p className="text-gray-600 mb-4">
              This may affect alerts and rankings. Are you sure you want to apply these changes?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button onClick={handleApply}>Apply Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Version Info */}
      <SectionCard 
        title="Configuration" 
        icon={Settings}
        action={
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              v{config?.version || '0.0.0'}
            </span>
            {Object.keys(pendingChanges).length > 0 && (
              <Button size="sm" onClick={() => setShowConfirm(true)} data-testid="apply-config-btn">
                Apply Changes
              </Button>
            )}
          </div>
        }
      >
        {config?.last_modified && (
          <Timestamp date={config.last_modified} label="Last modified" />
        )}

        {/* Config Sections */}
        <div className="mt-4 space-y-4">
          <ConfigSection 
            title="Trend Adjust" 
            description="Parameters affecting trend-adjusted scoring"
            config={config?.config?.trend_adjusted}
            readOnly={true}
          />
          
          <ConfigSection 
            title="Early Signal" 
            description="Thresholds for early signal detection"
            config={config?.config?.early_signal}
            readOnly={true}
          />

          <ConfigSection 
            title="Alerts" 
            description="Alert generation thresholds (editable)"
            config={config?.config?.alerts}
            readOnly={false}
            onChange={(key, value) => setPendingChanges(prev => ({ ...prev, [key]: value }))}
          />

          <ConfigSection 
            title="Risk / Profile" 
            description="Risk assessment parameters"
            config={config?.config?.risk}
            readOnly={true}
          />
        </div>
      </SectionCard>

      {/* Version History */}
      {config?.history?.length > 0 && (
        <SectionCard title="Version History" icon={Clock}>
          <div className="space-y-2">
            {config.history.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-4 py-3">
                <span className="font-mono text-blue-600 font-medium">v{h.version}</span>
                <span className="text-gray-500">{new Date(h.timestamp).toLocaleString()}</span>
                <span className="text-gray-400 text-xs">by {h.admin_id || 'system'}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
};

// Config Section Component
const ConfigSection = ({ title, description, config, readOnly = true, onChange }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!config) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {readOnly ? (
            <Lock className="w-4 h-4 text-gray-400" />
          ) : (
            <Unlock className="w-4 h-4 text-blue-500" />
          )}
          <div>
            <span className="font-medium text-gray-900">{title}</span>
            {!readOnly && <span className="ml-2 text-xs text-blue-500">(editable)</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {readOnly && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">read-only</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className={`px-4 py-4 border-t border-gray-200 ${readOnly ? 'bg-gray-50' : 'bg-white'}`}>
          {description && (
            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
              <Info className="w-3 h-3" /> {description}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className={`p-3 rounded-lg ${readOnly ? 'bg-white' : 'bg-blue-50 border border-blue-100'}`}>
                <div className="text-xs text-gray-500 font-mono mb-1">{key}</div>
                <div className="font-medium text-gray-900">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </div>
              </div>
            ))}
          </div>
          {!readOnly && (
            <p className="text-xs text-yellow-600 mt-3 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Changing affects alerts and radar
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// TAB: STABILITY / TUNING
// ============================================================

const StabilityTab = ({ token }) => {
  const [tuning, setTuning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchTuning = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/tuning/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setTuning(data.data);
      } else {
        setError(data.message || 'Failed to load tuning data');
      }
    } catch (err) {
      setError(err.message || 'Network error');
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
      const result = await res.json();
      if (result.ok) {
        setToast({ message: 'Analysis completed', type: 'success' });
        await fetchTuning();
      }
    } catch (err) {
      setToast({ message: 'Analysis failed', type: 'error' });
    }
    setRunning(false);
  };

  // Determine stability status
  const getStabilityStatus = (score) => {
    if (score >= 0.9) return { status: 'ok', label: 'Stable', color: 'green' };
    if (score >= 0.7) return { status: 'warning', label: 'Moderate', color: 'yellow' };
    return { status: 'danger', label: 'Unstable', color: 'red' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading stability data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Failed to load stability data</span>
        </div>
        <p className="text-sm text-red-500 mt-2">{error}</p>
      </div>
    );
  }

  const stabilityInfo = getStabilityStatus(tuning?.overall_stability || 0);

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Stability Warning */}
      {tuning?.overall_stability < 0.7 && (
        <WarningBanner severity="warning">
          <strong>Low stability detected.</strong> The model may produce inconsistent results. 
          Consider reviewing recent config changes before making updates.
        </WarningBanner>
      )}

      {/* Summary Block */}
      <SectionCard 
        title="Model Stability" 
        icon={Shield}
        action={
          <Button size="sm" onClick={runTuning} disabled={running} data-testid="run-analysis-btn">
            {running ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            Run Analysis
          </Button>
        }
      >
        {tuning && (
          <div className="flex items-start gap-8">
            {/* Big Score Display */}
            <div className="text-center">
              <div className={`text-6xl font-bold ${
                stabilityInfo.color === 'green' ? 'text-green-500' :
                stabilityInfo.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {(tuning.overall_stability * 100).toFixed(0)}%
              </div>
              <div className="mt-2">
                <StatusBadge status={stabilityInfo.status} size="md" />
              </div>
            </div>

            {/* Status Info */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Rank Shift</div>
                  <div className="font-bold text-lg">{tuning.rank_shift || '0'}%</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Flip Rate</div>
                  <div className="font-bold text-lg">{tuning.flip_rate || '0'}%</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Last Run</div>
                  <div className="font-medium text-sm">
                    {tuning.last_run ? new Date(tuning.last_run).toLocaleTimeString() : 'Never'}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {tuning.recommendations?.length > 0 && (
                <div className="space-y-2">
                  {tuning.recommendations.map((rec, idx) => (
                    <div key={idx} className={`text-sm p-3 rounded-lg flex items-start gap-2 ${
                      rec.startsWith('✅') ? 'bg-green-50 text-green-700' :
                      rec.startsWith('⚠️') ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'
                    }`}>
                      {rec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Parameter Details */}
      {tuning?.parameters?.length > 0 && (
        <SectionCard title="Parameter Sensitivity" icon={Settings}>
          <div className="space-y-3">
            {tuning.parameters.map((param, idx) => {
              const paramStability = getStabilityStatus(param.best_stability);
              return (
                <div key={idx} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-blue-600 font-medium">{param.name}</span>
                    <StatusBadge status={paramStability.status} size="sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Stability:</span>
                      <span className={`ml-2 font-medium ${
                        paramStability.color === 'green' ? 'text-green-600' :
                        paramStability.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(param.best_stability * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Safe range:</span>
                      <span className="ml-2 font-mono">[{param.safe_range?.[0]}, {param.safe_range?.[1]}]</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Optimal:</span>
                      <span className="ml-2 font-mono">{param.optimal_delta}</span>
                    </div>
                  </div>
                  {param.warning && (
                    <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {param.warning}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {tuning?.parameters?.some(p => p.best_stability < 0.7) && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>High flip rate may cause UI instability. Consider reviewing parameters with low stability scores.</span>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
};

// ============================================================
// TAB: ALERTS
// ============================================================

const AlertsTab = ({ token }) => {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [hideSupressed, setHideSupressed] = useState(false);
  const [toast, setToast] = useState(null);
  const [runningBatch, setRunningBatch] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/alerts/preview`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setAlerts(data.data);
      } else {
        setError(data.message || 'Failed to load alerts');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // P2.1: Run Alerts Batch
  const runAlertsBatch = async () => {
    setRunningBatch(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/alerts/run`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await res.json();
      if (result.ok) {
        setToast({ 
          message: `Batch complete: ${result.data.alerts_generated} alerts generated`, 
          type: 'success' 
        });
        await fetchAlerts();
      } else {
        setToast({ message: 'Batch failed', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Batch failed', type: 'error' });
    }
    setRunningBatch(false);
  };

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
      setToast({ message: `Alert ${action === 'send' ? 'marked as sent (preview)' : 'suppressed'}`, type: 'success' });
      await fetchAlerts();
    } catch (err) {
      setToast({ message: `Failed to ${action} alert`, type: 'error' });
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
          types: { [type]: { enabled } } 
        }),
      });
      setToast({ message: `Alert type ${enabled ? 'enabled' : 'disabled'}`, type: 'success' });
      await fetchAlerts();
    } catch (err) {
      setToast({ message: 'Failed to update alert config', type: 'error' });
    }
  };

  // Severity badge colors
  const getSeverityColor = (severity) => {
    if (severity >= 0.8) return 'bg-red-100 text-red-700';
    if (severity >= 0.5) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  // Alert type icons
  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'EARLY_BREAKOUT': return <TrendingUp className="w-4 h-4" />;
      case 'STRONG_ACCELERATION': return <Zap className="w-4 h-4" />;
      case 'TREND_REVERSAL': return <Activity className="w-4 h-4" />;
      case 'RISK_SPIKE': return <AlertTriangle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading alerts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Failed to load alerts</span>
        </div>
        <p className="text-sm text-red-500 mt-2">{error}</p>
      </div>
    );
  }

  // Filter alerts
  let filteredAlerts = alerts?.alerts || [];
  if (filter !== 'all') {
    filteredAlerts = filteredAlerts.filter(a => a.type === filter);
  }
  if (hideSupressed) {
    filteredAlerts = filteredAlerts.filter(a => a.status !== 'suppressed');
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* P2.1: Run Batch Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-blue-900">Alerts Engine (Preview Mode)</h3>
          <p className="text-sm text-blue-700">Run batch to detect EARLY_BREAKOUT, STRONG_ACCELERATION, TREND_REVERSAL events.</p>
        </div>
        <Button 
          onClick={runAlertsBatch} 
          disabled={runningBatch}
          data-testid="run-alerts-batch-btn"
          className="bg-blue-500 hover:bg-blue-600"
        >
          {runningBatch ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          Run Alerts Batch
        </Button>
      </div>

      {/* Summary */}
      <SectionCard title="Alerts Summary" icon={Bell}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            label="Total" 
            value={alerts?.summary?.total || 0} 
            icon={Bell}
            color="gray" 
          />
          <StatCard 
            label="Preview" 
            value={alerts?.summary?.preview || 0} 
            icon={Eye}
            color="blue" 
          />
          <StatCard 
            label="Sent" 
            value={alerts?.summary?.sent || 0} 
            icon={Send}
            color="green" 
          />
          <StatCard 
            label="Suppressed" 
            value={alerts?.summary?.suppressed || 0} 
            icon={EyeOff}
            color="red" 
          />
        </div>
      </SectionCard>

      {/* Alert Types Config */}
      <SectionCard title="Alert Types" icon={Settings}>
        <div className="space-y-3">
          {alerts?.config?.types && Object.entries(alerts.config.types).map(([type, config]) => (
            <div key={type} className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  {getAlertTypeIcon(type)}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-gray-500">
                    Severity ≥ {(config.severity_min * 100).toFixed(0)}% | Cooldown: 1 per {config.cooldown_minutes}min
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleAlertType(type, !config.enabled)}
                data-testid={`toggle-${type.toLowerCase()}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  config.enabled 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                }`}
              >
                {config.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {config.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Alert Preview List */}
      <SectionCard 
        title="Recent Alerts" 
        icon={Bell}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHideSupressed(!hideSupressed)}
              className={`text-xs px-2 py-1 rounded ${hideSupressed ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
            >
              {hideSupressed ? 'Show All' : 'Hide Suppressed'}
            </button>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
              data-testid="alert-filter"
            >
              <option value="all">All Types</option>
              <option value="EARLY_BREAKOUT">Early Breakout</option>
              <option value="STRONG_ACCELERATION">Strong Acceleration</option>
              <option value="RISK_SPIKE">Risk Spike</option>
              <option value="TREND_REVERSAL">Trend Reversal</option>
            </select>
          </div>
        }
      >
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No alerts detected in last 24h</p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="text-blue-500 text-sm mt-2 underline">
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left py-3 px-2">Time</th>
                  <th className="text-left py-3 px-2">Type</th>
                  <th className="text-left py-3 px-2">Account</th>
                  <th className="text-left py-3 px-2">Severity</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-right py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map(alert => (
                  <tr key={alert.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                        alert.type === 'EARLY_BREAKOUT' ? 'bg-green-100 text-green-700' :
                        alert.type === 'STRONG_ACCELERATION' ? 'bg-yellow-100 text-yellow-700' :
                        alert.type === 'RISK_SPIKE' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {getAlertTypeIcon(alert.type)}
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-medium text-gray-900">
                      @{alert.account?.username || 'unknown'}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {(alert.severity * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        alert.status === 'preview' ? 'bg-blue-100 text-blue-700' :
                        alert.status === 'sent' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {alert.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {alert.status === 'preview' && (
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => handleAction(alert.id, 'send')}
                            data-testid={`send-${alert.id}`}
                            className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Send
                          </button>
                          <button 
                            onClick={() => handleAction(alert.id, 'suppress')}
                            data-testid={`suppress-${alert.id}`}
                            className="px-3 py-1 bg-gray-400 text-white text-xs rounded-lg hover:bg-gray-500 flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> Suppress
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ============================================================
// TAB: TELEGRAM (Phase 2.3)
// ============================================================

const TelegramTab = ({ token }) => {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [testingSend, setTestingSend] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch settings
      const settingsRes = await fetch(`${BACKEND_URL}/api/admin/connections/telegram/settings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const settingsData = await settingsRes.json();
      if (settingsData.ok) {
        setSettings(settingsData.data);
      }

      // Fetch stats
      const statsRes = await fetch(`${BACKEND_URL}/api/admin/connections/telegram/stats?hours=24`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      if (statsData.ok) {
        setStats(statsData.data);
      }

      // Fetch history
      const historyRes = await fetch(`${BACKEND_URL}/api/admin/connections/telegram/history?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const historyData = await historyRes.json();
      if (historyData.ok) {
        setHistory(historyData.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load Telegram settings');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const patchSettings = async (patch) => {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/telegram/settings`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok) {
        setSettings(data.data);
        setToast({ message: 'Settings saved', type: 'success' });
      } else {
        setToast({ message: data.error || 'Failed to save', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Failed to save settings', type: 'error' });
    }
    setSaving(false);
  };

  const sendTestMessage = async () => {
    setTestingSend(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/telegram/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.ok) {
        setToast({ message: 'Test message sent!', type: 'success' });
        await fetchData();
      } else {
        setToast({ message: data.error || 'Test failed', type: 'error' });
      }
    } catch (err) {
      setToast({ message: err.message || 'Test failed', type: 'error' });
    }
    setTestingSend(false);
  };

  const dispatchAlerts = async () => {
    setDispatching(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/telegram/dispatch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ limit: 50 }),
      });
      const data = await res.json();
      if (data.ok) {
        const { sent, skipped, failed } = data.data;
        setToast({ 
          message: `Dispatch complete: ${sent} sent, ${skipped} skipped, ${failed} failed`, 
          type: sent > 0 ? 'success' : 'warning' 
        });
        await fetchData();
      } else {
        setToast({ message: data.error || 'Dispatch failed', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Dispatch failed', type: 'error' });
    }
    setDispatching(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SENT': return 'bg-green-100 text-green-700';
      case 'SKIPPED': return 'bg-yellow-100 text-yellow-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading Telegram settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Failed to load Telegram settings</span>
        </div>
        <p className="text-sm text-red-500 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-blue-900">Telegram Delivery (Phase 2.3)</h3>
              <InfoTooltip text={ADMIN_TOOLTIPS.telegramSubscribers} />
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Платформа управляет ботом — все настройки здесь. Бот только принимает сообщения.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <SectionCard 
        title="Telegram Settings" 
        icon={Settings}
        action={
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchData} 
            disabled={loading}
            data-testid="refresh-telegram-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Global toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings?.enabled ? 'bg-green-100' : 'bg-gray-200'}`}>
                    <Power className={`w-5 h-5 ${settings?.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-900">Telegram Delivery</span>
                      <InfoTooltip text={ADMIN_TOOLTIPS.telegramEnabled} />
                    </div>
                    <div className="text-xs text-gray-500">Глобальное включение/выключение</div>
                  </div>
                </div>
                <button
                  onClick={() => patchSettings({ enabled: !settings?.enabled })}
                  disabled={saving}
                  data-testid="toggle-telegram-enabled"
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings?.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings?.enabled ? 'translate-x-6' : ''
                  }`} />
                </button>
              </label>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings?.preview_only ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                    <Eye className={`w-5 h-5 ${settings?.preview_only ? 'text-yellow-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-900">Preview Only</span>
                      <InfoTooltip text={ADMIN_TOOLTIPS.telegramPreviewOnly} />
                    </div>
                    <div className="text-xs text-gray-500">Не отправлять, только логировать</div>
                  </div>
                </div>
                <button
                  onClick={() => patchSettings({ preview_only: !settings?.preview_only })}
                  disabled={saving}
                  data-testid="toggle-preview-only"
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings?.preview_only ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings?.preview_only ? 'translate-x-6' : ''
                  }`} />
                </button>
              </label>
            </div>
          </div>

          {/* Chat ID */}
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">Chat / Channel ID</span>
                <InfoTooltip text={ADMIN_TOOLTIPS.telegramChatId} />
              </div>
              <input
                type="text"
                value={settings?.chat_id || ''}
                onChange={(e) => setSettings({ ...settings, chat_id: e.target.value })}
                onBlur={() => patchSettings({ chat_id: settings?.chat_id })}
                placeholder="-1001234567890"
                data-testid="telegram-chat-id"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Опционально. Основная доставка — в личные чаты подписчиков. Получите ID через @userinfobot
              </p>
            </label>
          </div>

          {/* Alert Types Toggles */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-400" />
              Типы алертов
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['EARLY_BREAKOUT', 'STRONG_ACCELERATION', 'TREND_REVERSAL'].map((type) => {
                const icons = {
                  EARLY_BREAKOUT: { icon: TrendingUp, color: 'green', label: 'Early Breakout', tooltip: ADMIN_TOOLTIPS.telegramEarlyBreakout },
                  STRONG_ACCELERATION: { icon: Zap, color: 'yellow', label: 'Strong Acceleration', tooltip: ADMIN_TOOLTIPS.telegramStrongAcceleration },
                  TREND_REVERSAL: { icon: Activity, color: 'blue', label: 'Trend Reversal', tooltip: ADMIN_TOOLTIPS.telegramTrendReversal },
                };
                const { icon: Icon, color, label, tooltip } = icons[type];
                const isEnabled = settings?.type_enabled?.[type];
                const cooldown = settings?.cooldown_hours?.[type] || 12;

                return (
                  <div key={type} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-${color}-100`}>
                          <Icon className={`w-4 h-4 text-${color}-600`} />
                        </div>
                        <span className="font-medium text-sm text-gray-900">{label}</span>
                        <InfoTooltip text={tooltip} />
                      </div>
                      <button
                        onClick={() => patchSettings({ 
                          type_enabled: { ...settings?.type_enabled, [type]: !isEnabled } 
                        })}
                        disabled={saving}
                        data-testid={`toggle-type-${type.toLowerCase()}`}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          isEnabled 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">Cooldown:</span>
                      <select
                        value={cooldown}
                        onChange={(e) => patchSettings({
                          cooldown_hours: { ...settings?.cooldown_hours, [type]: parseInt(e.target.value) }
                        })}
                        disabled={saving}
                        className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                      >
                        <option value="6">6h</option>
                        <option value="12">12h</option>
                        <option value="24">24h</option>
                        <option value="48">48h</option>
                      </select>
                      <InfoTooltip text={ADMIN_TOOLTIPS.telegramCooldown} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-1">
              <Button
                onClick={sendTestMessage}
                disabled={testingSend || !settings?.enabled || settings?.preview_only}
                data-testid="send-test-message"
                className="bg-blue-500 hover:bg-blue-600"
              >
                {testingSend ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Test Message
              </Button>
              <InfoTooltip text={ADMIN_TOOLTIPS.telegramTestMessage} />
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={dispatchAlerts}
                disabled={dispatching || !settings?.enabled || settings?.preview_only}
                variant="outline"
                data-testid="dispatch-alerts"
              >
                {dispatching ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Dispatch Pending
              </Button>
              <InfoTooltip text={ADMIN_TOOLTIPS.telegramDispatch} />
            </div>
          </div>

          {/* Warning if not fully configured */}
          {(!settings?.enabled || settings?.preview_only) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-700">
                {!settings?.enabled && <div>• Telegram delivery отключен</div>}
                {settings?.preview_only && <div>• Preview-only режим включен — алерты логируются, но не отправляются</div>}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Stats Section */}
      <SectionCard 
        title="Delivery Stats (24h)" 
        icon={Activity}
        action={<InfoTooltip text={ADMIN_TOOLTIPS.telegramStats} />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            label="Total" 
            value={stats?.total || 0} 
            icon={Bell}
            color="gray" 
          />
          <StatCard 
            label="Sent" 
            value={stats?.sent || 0} 
            icon={Send}
            color="green" 
          />
          <StatCard 
            label="Skipped" 
            value={stats?.skipped || 0} 
            icon={EyeOff}
            color="yellow" 
          />
          <StatCard 
            label="Failed" 
            value={stats?.failed || 0} 
            icon={XCircle}
            color="red" 
          />
        </div>
      </SectionCard>

      {/* History Section */}
      <SectionCard 
        title="Recent Deliveries" 
        icon={Clock}
        action={<InfoTooltip text={ADMIN_TOOLTIPS.telegramHistory} />}
      >
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No delivery history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left py-3 px-2">Time</th>
                  <th className="text-left py-3 px-2">Type</th>
                  <th className="text-left py-3 px-2">Account</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-medium text-gray-900">
                      {item.username ? `@${item.username}` : item.account_id}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(item.delivery_status)}`}>
                        {item.delivery_status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-500">
                      {item.delivery_reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ============================================================
// ERROR BOUNDARY FOR TABS
// ============================================================

class TabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">{this.props.tabName} temporarily unavailable</span>
          </div>
          <p className="text-sm text-red-500">{this.state.error?.message || 'An error occurred'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-sm text-red-600 underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminConnectionsPage() {
  const { token, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial tab from URL query param
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const validTabs = ['overview', 'config', 'stability', 'alerts', 'telegram'];
  const initialTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'overview';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Update URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'overview') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tabId);
    }
    setSearchParams(searchParams);
  };

  const fetchOverview = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setOverviewError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/connections/overview`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setOverview(data.data);
        setLastUpdated(new Date());
      } else {
        setOverviewError(data.message || data.error || 'Failed to load overview');
      }
    } catch (err) {
      console.error('Overview fetch error:', err);
      setOverviewError(err.message || 'Network error');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { 
    if (!authLoading) {
      fetchOverview(); 
    }
  }, [fetchOverview, authLoading]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'config', label: 'Config', icon: Settings },
    { id: 'stability', label: 'Stability', icon: Shield },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'telegram', label: 'Telegram', icon: MessageSquare },
  ];

  // Auth loading state
  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-500">Checking authentication...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-12">
          <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full text-center">
            <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-500 mb-6">Please log in to access the Admin Connections panel.</p>
            <a 
              href="/admin/login" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              data-testid="go-to-login"
            >
              Go to Login
            </a>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Connections Admin</h1>
                  <p className="text-sm text-gray-500">Control Plane for Connections Module</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {lastUpdated && (
                <Timestamp date={lastUpdated} label="Updated" />
              )}
              <Button variant="outline" size="sm" onClick={fetchOverview} disabled={loading} data-testid="refresh-btn">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
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
                onClick={() => handleTabChange(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
          <TabErrorBoundary tabName="Overview">
            {overviewError ? (
              <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Failed to load Overview</span>
                </div>
                <p className="text-sm text-red-500">{overviewError}</p>
                <button 
                  onClick={fetchOverview}
                  className="mt-3 text-sm text-red-600 underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <OverviewTab data={overview} token={token} onRefresh={fetchOverview} />
            )}
          </TabErrorBoundary>
        )}
        {activeTab === 'config' && (
          <TabErrorBoundary tabName="Config">
            <ConfigTab token={token} onRefresh={fetchOverview} />
          </TabErrorBoundary>
        )}
        {activeTab === 'stability' && (
          <TabErrorBoundary tabName="Stability">
            <StabilityTab token={token} />
          </TabErrorBoundary>
        )}
        {activeTab === 'alerts' && (
          <TabErrorBoundary tabName="Alerts">
            <AlertsTab token={token} />
          </TabErrorBoundary>
        )}
        {activeTab === 'telegram' && (
          <TabErrorBoundary tabName="Telegram">
            <TelegramTab token={token} />
          </TabErrorBoundary>
        )}
      </div>
    </div>
    </AdminLayout>
  );
}
