import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Database,
  Server,
  Layers,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Terminal,
  Play,
  Filter,
  Check,
  AlertCircle,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const CATEGORIES = ['All', 'Docker', 'Database', 'Backend', 'Frontend', 'CI/CD', 'Infrastructure', 'DevOps'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function App() {
  // State for Health & Diagnostics
  const [apiHealth, setApiHealth] = useState(null);
  const [dbHealth, setDbHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // State for Tasks
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, completionRate: 0 });
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form State for New Task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('DevOps');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'diagnostics'

  // Diagnostic Console State
  const [selectedEndpoint, setSelectedEndpoint] = useState('/api/health');
  const [endpointResponse, setEndpointResponse] = useState(null);
  const [endpointLoading, setEndpointLoading] = useState(false);
  const [endpointLatency, setEndpointLatency] = useState(null);

  // Fetch Health & Database Status
  const fetchSystemHealth = useCallback(async () => {
    setLoadingHealth(true);
    const startTime = Date.now();
    try {
      const [healthRes, dbRes] = await Promise.allSettled([
        fetch('/api/health'),
        fetch('/api/health/db'),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const data = await healthRes.value.json();
        setApiHealth({ ...data, roundTripMs: Date.now() - startTime });
      } else {
        setApiHealth({ status: 'DOWN', error: 'Failed to connect to API server' });
      }

      if (dbRes.status === 'fulfilled' && dbRes.value.ok) {
        const data = await dbRes.value.json();
        setDbHealth(data);
      } else {
        setDbHealth({ status: 'UNHEALTHY', error: 'Database unreachable' });
      }
    } catch (err) {
      setApiHealth({ status: 'DOWN', error: err.message });
      setDbHealth({ status: 'UNHEALTHY', error: err.message });
    } finally {
      setLoadingHealth(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  // Fetch Tasks & Stats
  const fetchTasksAndStats = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const [tasksRes, statsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/tasks/stats/summary'),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to fetch tasks/stats', err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Initial Load & Auto Refresh Interval
  useEffect(() => {
    fetchSystemHealth();
    fetchTasksAndStats();
  }, [fetchSystemHealth, fetchTasksAndStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSystemHealth();
      fetchTasksAndStats();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSystemHealth, fetchTasksAndStats]);

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim(),
          category: newTaskCategory,
          priority: newTaskPriority,
          status: 'Pending',
        }),
      });

      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setShowAddForm(false);
        await fetchTasksAndStats();
      }
    } catch (err) {
      console.error('Error creating task', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Task Status
  const handleToggleTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await fetchTasksAndStats();
      }
    } catch (err) {
      console.error('Error toggling task', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchTasksAndStats();
      }
    } catch (err) {
      console.error('Error deleting task', err);
    }
  };

  // Run Test Endpoint in Diagnostics
  const handleTestEndpoint = async (endpoint) => {
    setSelectedEndpoint(endpoint);
    setEndpointLoading(true);
    const start = Date.now();
    try {
      const res = await fetch(endpoint);
      const latency = Date.now() - start;
      const data = await res.json();
      setEndpointLatency(latency);
      setEndpointResponse({
        status: res.status,
        statusText: res.statusText,
        headers: {
          contentType: res.headers.get('content-type'),
        },
        body: data,
      });
    } catch (err) {
      setEndpointLatency(Date.now() - start);
      setEndpointResponse({
        status: 500,
        statusText: 'Network Error',
        body: { error: err.message },
      });
    } finally {
      setEndpointLoading(false);
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'medium':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category?.toLowerCase()) {
      case 'docker':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'database':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'backend':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'frontend':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'ci/cd':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'infrastructure':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Glow Effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070b14]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-[1px] flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  OCTABYTE DEVOPS
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  Containerized
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">Full-Stack Application & Postgres DB</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                autoRefresh
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              title="Toggle 8s auto polling"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin text-cyan-400' : ''}`} style={{ animationDuration: '6s' }} />
              <span className="hidden sm:inline">{autoRefresh ? 'Live Sync ON' : 'Paused'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => {
                fetchSystemHealth();
                fetchTasksAndStats();
              }}
              disabled={loadingHealth || loadingTasks}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Manual Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* System Health Metric Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Backend API Status */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyan-400" />
                Backend API
              </span>
              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    apiHealth?.status === 'UP' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={`text-xs font-bold ${apiHealth?.status === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {apiHealth?.status === 'UP' ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <div className="text-2xl font-black text-white font-mono">
                  {apiHealth?.roundTripMs ? `${apiHealth.roundTripMs} ms` : '—'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">HTTP Round-Trip Latency</div>
              </div>
              <div className="text-right font-mono text-xs text-slate-500">
                Uptime: {apiHealth?.uptimeSeconds ? `${apiHealth.uptimeSeconds}s` : '0s'}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Port: <span className="font-mono text-cyan-300">5000</span></span>
              <span>Env: <span className="font-mono text-indigo-300">{apiHealth?.environment || 'production'}</span></span>
            </div>
          </div>

          {/* Card 2: PostgreSQL Database Status */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-400" />
                PostgreSQL DB
              </span>
              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    dbHealth?.status === 'HEALTHY' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={`text-xs font-bold ${dbHealth?.status === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {dbHealth?.status === 'HEALTHY' ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <div className="text-2xl font-black text-white font-mono">
                  {dbHealth?.queryLatencyMs ? `${dbHealth.queryLatencyMs} ms` : '—'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">DB Query Latency</div>
              </div>
              <div className="text-right font-mono text-xs text-indigo-300">
                {dbHealth?.database || 'devops_db'}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Pool Conn: <span className="font-mono text-emerald-300">{dbHealth?.connectionPool?.idleCount ?? 0} idle</span></span>
              <span>Port: <span className="font-mono text-indigo-300">5432</span></span>
            </div>
          </div>

          {/* Card 3: DevOps Tasks Progress */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Task Completion
              </span>
              <span className="text-xs font-bold text-cyan-400 font-mono">
                {stats.completionRate}% Done
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <div className="text-2xl font-black text-white font-mono">
                  {stats.completed} <span className="text-sm font-normal text-slate-400">/ {stats.total}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{stats.pending} Tasks Pending</div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-4 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(stats.completionRate, 5)}%` }}
              />
            </div>
          </div>

          {/* Card 4: Container Environment Info */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-400" />
                Container Stack
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Docker Compose
              </span>
            </div>
            <div className="space-y-1 mt-1 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Frontend:</span>
                <span className="font-mono text-cyan-300">Vite + React (Nginx)</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Backend:</span>
                <span className="font-mono text-emerald-300">Node.js 20 Express</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Database:</span>
                <span className="font-mono text-indigo-300">PostgreSQL 16 Alpine</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Sync Time: {lastChecked || '—'}</span>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>DevOps Pipeline & Tasks Tracker</span>
              <span className="ml-1.5 px-2 py-0.2 rounded-full text-xs bg-slate-800 text-slate-300">
                {tasks.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('diagnostics');
                if (!endpointResponse) {
                  handleTestEndpoint('/api/health');
                }
              }}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'diagnostics'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>API Diagnostics & Database Inspector</span>
            </button>
          </div>

          {activeTab === 'tasks' && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          )}
        </div>

        {/* Tab 1: Tasks Content */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Collapsible Add Task Form */}
            {showAddForm && (
              <div className="glass-panel-glow p-6 rounded-2xl border border-cyan-500/30 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Create New DevOps Task / Item
                  </h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Cancel
                  </button>
                </div>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Task Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Configure AWS ECS Task Definition"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
                      <select
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                      >
                        {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Description</label>
                      <input
                        type="text"
                        placeholder="Brief summary of requirements or steps..."
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Priority</label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !newTaskTitle.trim()}
                      className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all"
                    >
                      {isSubmitting ? 'Saving to Database...' : 'Save Task to PostgreSQL'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filter Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-3.5 rounded-2xl">
              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Category:
                </span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      categoryFilter === cat
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed Only</option>
                  <option value="Pending">Pending Only</option>
                </select>
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              {loadingTasks && tasks.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Querying PostgreSQL database...</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center">
                  <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                  <p className="text-sm text-slate-300 font-medium">No tasks found matching your filter</p>
                  <p className="text-xs text-slate-500 mt-1">Try selecting a different category or add a new task.</p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isCompleted = task.status === 'Completed';
                  return (
                    <div
                      key={task.id}
                      className={`glass-panel p-4 sm:p-5 rounded-2xl flex items-start sm:items-center justify-between gap-4 transition-all hover:border-slate-700 group ${
                        isCompleted ? 'opacity-70 bg-slate-950/40' : ''
                      }`}
                    >
                      <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
                        {/* Toggle Checkbox */}
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className={`mt-0.5 sm:mt-0 flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-600 hover:border-cyan-400 bg-slate-900/50'
                          }`}
                          title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                        >
                          {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-semibold truncate ${
                                isCompleted ? 'line-through text-slate-400' : 'text-slate-100'
                              }`}
                            >
                              {task.title}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(
                                task.category
                              )}`}
                            >
                              {task.category}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getPriorityBadgeClass(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-slate-500 hidden md:inline">
                          ID: #{task.id}
                        </span>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: API Diagnostics & DB Inspector */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                    Interactive REST API & PostgreSQL Health Probe Tester
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Execute live HTTP queries against backend endpoints directly to inspect system responses, DB connectivity, and latency.
                  </p>
                </div>
              </div>

              {/* Endpoint Selector Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  { path: '/api/health', name: 'Liveness Probe', method: 'GET' },
                  { path: '/api/health/db', name: 'Database Status', method: 'GET' },
                  { path: '/api/tasks', name: 'All Tasks (Postgres)', method: 'GET' },
                  { path: '/api/tasks/stats/summary', name: 'Summary Metrics', method: 'GET' },
                ].map((ep) => (
                  <button
                    key={ep.path}
                    onClick={() => handleTestEndpoint(ep.path)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedEndpoint === ep.path
                        ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                        {ep.method}
                      </span>
                      {selectedEndpoint === ep.path && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      )}
                    </div>
                    <div className="text-xs font-mono font-medium text-slate-200 truncate">{ep.path}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{ep.name}</div>
                  </button>
                ))}
              </div>

              {/* Console Output Area */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3 text-slate-400 text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="text-slate-300 font-semibold ml-2">Request: {selectedEndpoint}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {endpointLatency !== null && (
                      <span className="text-cyan-400">Latency: {endpointLatency}ms</span>
                    )}
                    {endpointResponse?.status && (
                      <span
                        className={`font-bold ${
                          endpointResponse.status === 200 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        HTTP {endpointResponse.status} {endpointResponse.statusText}
                      </span>
                    )}
                  </div>
                </div>

                {endpointLoading ? (
                  <div className="py-8 text-center text-slate-500 flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Executing HTTP request...</span>
                  </div>
                ) : (
                  <pre className="text-cyan-300 overflow-x-auto max-h-96 leading-relaxed">
                    {endpointResponse
                      ? JSON.stringify(endpointResponse.body, null, 2)
                      : 'Click an endpoint above to execute a live query...'}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b14]/90 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>DevOps Assignment Architecture: React SPA + Express.js REST + PostgreSQL 16</span>
          </div>
          <div>
            Built with Docker Compose &bull; Zero Local Tools Required
          </div>
        </div>
      </footer>
    </div>
  );
}
