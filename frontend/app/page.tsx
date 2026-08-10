'use client';

import React, { useState, useEffect, useMemo } from 'react';
import KPICard from '@/components/KPICard';
import GrowthChart from '@/components/GrowthChart';
import MonthlyChart from '@/components/MonthlyChart';
import WeeklyChart from '@/components/WeeklyChart';
import AdvancedStats from '@/components/AdvancedStats';
import PeriodTable from '@/components/PeriodTable';
import DailyStats from '@/components/DailyStats';
import TradeHistory from '@/components/TradeHistory';
import SymbolBreakdown from '@/components/SymbolBreakdown';
import CandlestickChart from '@/components/CandlestickChart';
import PeriodsComparison from '@/components/PeriodsComparison';
import HourlyChart from '@/components/HourlyChart';
import DailyChart from '@/components/DailyChart';
import RiskOfRuin from '@/components/RiskOfRuin';
import DurationChart from '@/components/DurationChart';
import MAEMFEChart from '@/components/MAEMFEChart';
import ChartPanel from '@/components/ChartPanel';
import AISidePanel from '@/components/AISidePanel';
import ExportButton from '@/components/ExportButton';
import PositionSizeCalc from '@/components/PositionSizeCalc';
import WinRateCalc from '@/components/WinRateCalc';
import GoalTracker from '@/components/GoalTracker';
import OpenPositions from '@/components/OpenPositions';
import RiskModel from '@/components/RiskModel';
import NewsCalendar from '@/components/NewsCalendar';
import TradingReport from '@/components/TradingReport';
import { statsApi, mt5Api } from '@/lib/api';
import { Trade, Stats, Account, PeriodStats } from '@/lib/types';
import { saveCredentials, loadCredentials, DEFAULT_SERVER, saveSettings, loadSettings } from '@/lib/storage';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Sun,
  Moon,
  LayoutDashboard,
  Calendar,
  History,
  BarChart3,
  LineChart,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  User,
  Calculator,
  Activity,
  Shield,
  FileText,
  Bot
} from 'lucide-react';

type TabType = 'overview' | 'daily' | 'chart' | 'history' | 'analysis' | 'risk' | 'calendar' | 'tools' | 'positions' | 'report';

export default function Dashboard() {
  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // State
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showCredentials, setShowCredentials] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [periods, setPeriods] = useState<{ [key: string]: PeriodStats }>({});

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState(DEFAULT_SERVER);
  const [dateRange, setDateRange] = useState('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [timezoneOffset, setTimezoneOffset] = useState(7); // Default GMT+7 Thailand

  // Load saved credentials on mount
  useEffect(() => {
    const creds = loadCredentials();
    if (creds.login) setLogin(creds.login);
    if (creds.server) setServer(creds.server);

    const settings = loadSettings();
    setIsDark(settings.isDark);
    setDateRange(settings.defaultDateRange);
    if (settings.customStartDate) setCustomStartDate(settings.customStartDate);
    if (settings.customEndDate) setCustomEndDate(settings.customEndDate);
    if (settings.defaultDateRange === 'custom') setShowCustomDates(true);
  }, []);

  // Save settings when they change
  useEffect(() => {
    saveSettings({
      isDark,
      defaultDateRange: dateRange,
      customStartDate: customStartDate || undefined,
      customEndDate: customEndDate || undefined
    });
  }, [isDark, dateRange, customStartDate, customEndDate]);

  const loadDemoData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await statsApi.getDemo();
      setTrades(response.data.trades);
      setStats(response.data.stats);
      setAccount(response.data.account);
      setIsConnected(true);
      setShowCredentials(false);

      const periodResponse = await statsApi.getPeriodStats(response.data.trades, 10000);
      setPeriods(periodResponse.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load demo data');
    } finally {
      setLoading(false);
    }
  };

  const connectMT5 = async () => {
    if (!login || !password || !server) {
      setError('Please fill in all MT5 credentials');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Save credentials (except password)
      saveCredentials(login, server);

      const connectRes = await mt5Api.connect(parseInt(login), password, server);
      setAccount(connectRes.data.account);
      setIsConnected(true);
      setShowCredentials(false);

      // Fetch trades based on date range
      let tradesRes;
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        tradesRes = await mt5Api.getTrades(0, customStartDate, customEndDate);
      } else {
        tradesRes = await mt5Api.getTrades(parseInt(dateRange));
      }
      setTrades(tradesRes.data.trades);

      if (tradesRes.data.trades.length > 0) {
        // Calculate starting balance (current balance - total profit from trades)
        const totalProfit = tradesRes.data.trades.reduce((sum: number, t: any) => sum + (t.net_profit || 0), 0);
        const startingBalance = connectRes.data.account.balance - totalProfit;

        const statsRes = await statsApi.calculate(tradesRes.data.trades, startingBalance);
        setStats(statsRes.data);

        const periodRes = await statsApi.getPeriodStats(tradesRes.data.trades, startingBalance);
        setPeriods(periodRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to connect to MT5');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (!isConnected || !account) return;

    setLoading(true);
    setError(null);
    try {
      // Refresh trades based on current date range
      let tradesRes;
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        tradesRes = await mt5Api.getTrades(0, customStartDate, customEndDate);
      } else {
        tradesRes = await mt5Api.getTrades(parseInt(dateRange));
      }
      setTrades(tradesRes.data.trades);

      if (tradesRes.data.trades.length > 0) {
        // Calculate starting balance (current balance - total profit from trades)
        const totalProfit = tradesRes.data.trades.reduce((sum: number, t: any) => sum + (t.net_profit || 0), 0);
        const startingBalance = account.balance - totalProfit;

        const statsRes = await statsApi.calculate(tradesRes.data.trades, startingBalance);
        setStats(statsRes.data);

        const periodRes = await statsApi.getPeriodStats(tradesRes.data.trades, startingBalance);
        setPeriods(periodRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Theme Constants
  const bgClass = isDark ? 'bg-[#0B1121]' : 'bg-gray-50';
  const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
  const inputClass = isDark
    ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-slate-200 placeholder:text-slate-500'
    : 'bg-white border-gray-200 focus:border-indigo-500 text-gray-900 placeholder:text-gray-400';

  // Filter trades for today only (used in Daily tab)
  const todaysTrades = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return trades.filter(t => {
      const tradeDate = new Date(t.time);
      tradeDate.setHours(0, 0, 0, 0);
      return tradeDate.getTime() === today.getTime();
    });
  }, [trades]);

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'daily', label: 'Daily', icon: Calendar },
    { id: 'chart', label: 'Chart', icon: LineChart },
    { id: 'history', label: 'History', icon: History },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'risk', label: 'Risk Model', icon: Shield },
    { id: 'report', label: 'Report', icon: FileText },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'tools', label: 'Tools', icon: Calculator },
    { id: 'positions', label: 'Positions', icon: Activity },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto font-sans selection:bg-indigo-500/30 ${bgClass} ${textClass} transition-colors duration-500`}>
        {/* Navbar */}
        <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b ${isDark ? 'bg-[#0B1121]/80 border-slate-800/60' : 'bg-white/80 border-gray-200/60'}`}>
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-lg">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">TradeTracker</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              {isConnected && account && (
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <Wifi size={14} className="text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className={isDark ? 'text-slate-400' : 'text-gray-500'} />
                    <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {account.login}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-amber-500'}`}
              >
                {isDark ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-8 py-6">
          {/* Collapsible Credentials Section */}
          <section className={`rounded-2xl mb-6 overflow-hidden transition-all duration-300 ${isDark ? 'bg-slate-900/50' : 'bg-white shadow-sm'}`}>
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className={`w-full px-5 py-4 flex items-center justify-between ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <Wifi size={18} className="text-emerald-500" />
                ) : (
                  <WifiOff size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
                )}
                <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                  {isConnected ? 'Connected to MT5' : 'Connect to MT5'}
                </span>
                {isConnected && (
                  <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    ({server})
                  </span>
                )}
              </div>
              {showCredentials ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showCredentials && (
              <div className={`px-5 pb-5 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                <div className="pt-4 flex flex-col lg:flex-row gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1">
                    <input
                      type="text"
                      placeholder="Login ID"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      className={`px-4 py-2.5 rounded-lg border outline-none transition-all text-sm ${inputClass}`}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`px-4 py-2.5 rounded-lg border outline-none transition-all text-sm ${inputClass}`}
                    />
                    <input
                      type="text"
                      placeholder="Server"
                      value={server}
                      onChange={(e) => setServer(e.target.value)}
                      className={`px-4 py-2.5 rounded-lg border outline-none transition-all text-sm ${inputClass}`}
                    />
                    <select
                      value={dateRange}
                      onChange={(e) => {
                        setDateRange(e.target.value);
                        setShowCustomDates(e.target.value === 'custom');
                      }}
                      className={`px-4 py-2.5 rounded-lg border outline-none transition-all text-sm ${inputClass}`}
                    >
                      <option value="7">7 Days</option>
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                      <option value="365">1 Year</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {/* Custom Date Range Inputs */}
                  {showCustomDates && (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex flex-col gap-1">
                        <label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className={`px-4 py-2.5 rounded-lg border outline-none transition-all text-sm ${inputClass}`}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          End Date
                        </label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className={`px-4 py-2.5 rounded-lg border outline-none transition-all text-sm ${inputClass}`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={isConnected ? refreshData : connectMT5}
                      disabled={loading}
                      className="flex-1 lg:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                      {isConnected ? 'Refresh' : 'Connect'}
                    </button>
                    <button
                      onClick={loadDemoData}
                      disabled={loading}
                      className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg font-medium text-sm transition-all border ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-gray-200 hover:bg-gray-100 text-gray-600'} disabled:opacity-50`}
                    >
                      Demo
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 flex items-center gap-2 text-rose-500 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                    <AlertTriangle size={16} />
                    {error}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Tabs */}
          {stats && (
            <div className={`flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto hide-scrollbar ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'}`}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                    }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* ... (rest of the content) ... */}

          {/* Empty State */}
          {!stats && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className={`p-6 rounded-full mb-6 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100'}`}>
                <LayoutDashboard size={48} className={isDark ? 'text-slate-600' : 'text-gray-400'} />
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                Ready to Analyze
              </h2>
              <p className={`max-w-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                Connect your MetaTrader 5 account or load demo data to view your trading performance.
              </p>
            </div>
          )}

          {/* Dashboard Content */}
          {stats && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 lg:pb-0">
              {/* Added pb-20 for mobile bottom spacing */}

              {/* ... content ... */}

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <>
                  {/* KPI Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                      label="Total Balance"
                      value={formatCurrency(account?.balance || 0)}
                      icon={Wallet}
                      isDark={isDark}
                    />
                    <KPICard
                      label="Total Gain"
                      value={`${stats.absolute_gain_pct >= 0 ? '+' : ''}${stats.absolute_gain_pct.toFixed(2)}%`}
                      trend={stats.absolute_gain_pct >= 0 ? 'up' : 'down'}
                      icon={TrendingUp}
                      isDark={isDark}
                    />
                    <KPICard
                      label="Net Profit"
                      value={`${stats.total_profit >= 0 ? '+' : ''}${formatCurrency(Math.abs(stats.total_profit))}`}
                      trend={stats.total_profit >= 0 ? 'up' : 'down'}
                      icon={DollarSign}
                      isDark={isDark}
                    />
                    <KPICard
                      label="Max Drawdown"
                      value={`${stats.max_drawdown_pct.toFixed(2)}%`}
                      trend={stats.max_drawdown_pct < 10 ? 'neutral' : 'down'}
                      icon={AlertTriangle}
                      isDark={isDark}
                    />
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                          <TrendingUp size={18} className="text-indigo-500" />
                          Equity Growth
                        </h3>
                      </div>
                      <GrowthChart trades={trades} initialBalance={stats.initial_balance} isDark={isDark} />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                          <Calendar size={18} className="text-emerald-500" />
                          Monthly Returns
                        </h3>
                      </div>
                      <MonthlyChart data={stats.monthly_returns} isDark={isDark} />
                    </div>
                  </div>

                  {/* Period Table */}
                  <div className="space-y-4">
                    <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                      <BarChart3 size={18} className="text-purple-500" />
                      Performance by Period
                    </h3>
                    <PeriodTable periods={periods} isDark={isDark} />
                  </div>
                </>
              )}

              {/* Daily Tab */}
              {activeTab === 'daily' && (
                <>
                  <DailyStats trades={trades} isDark={isDark} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SymbolBreakdown trades={todaysTrades} isDark={isDark} />
                    <div className="space-y-4">
                      <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                        <Calendar size={18} className="text-emerald-500" />
                        This Week
                      </h3>
                      <WeeklyChart trades={trades} isDark={isDark} />
                    </div>
                  </div>
                </>
              )}

              {/* Chart Tab */}
              {activeTab === 'chart' && (
                <CandlestickChart trades={trades} isDark={isDark} />
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <ExportButton trades={trades} stats={stats} isDark={isDark} />
                  </div>
                  <TradeHistory trades={trades} isDark={isDark} />
                </div>
              )}

              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <>
                  {/* Timezone Selector */}
                  <div className={`rounded-xl p-4 flex items-center justify-between ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                    <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                      🕐 Timezone
                    </span>
                    <select
                      value={timezoneOffset}
                      onChange={(e) => setTimezoneOffset(parseInt(e.target.value))}
                      className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-white text-gray-800 border-gray-200'} border`}
                    >
                      <option value={0}>GMT+0 (Server)</option>
                      <option value={1}>GMT+1</option>
                      <option value={2}>GMT+2</option>
                      <option value={3}>GMT+3</option>
                      <option value={7}>GMT+7 (Thailand)</option>
                      <option value={8}>GMT+8 (Singapore)</option>
                      <option value={9}>GMT+9 (Japan)</option>
                    </select>
                  </div>

                  {/* Chart Panel with Growth/Balance/Profit/Drawdown tabs */}
                  <ChartPanel
                    trades={trades}
                    initialBalance={stats.initial_balance}
                    isDark={isDark}
                    timezoneOffset={timezoneOffset}
                  />

                  {/* Periods Comparison */}
                  <PeriodsComparison trades={trades} isDark={isDark} />

                  {/* Advanced Stats */}
                  <AdvancedStats stats={stats} trades={trades} totalLots={stats.total_lots} isDark={isDark} />

                  {/* Symbol Breakdown Table */}
                  <SymbolBreakdown trades={trades} isDark={isDark} />

                  {/* Risk of Ruin */}
                  <RiskOfRuin trades={trades} isDark={isDark} />

                  {/* Charts Row 1: Hourly & Daily */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <HourlyChart trades={trades} isDark={isDark} timezoneOffset={timezoneOffset} />
                    <DailyChart trades={trades} isDark={isDark} />
                  </div>

                  {/* Charts Row 2: Duration & MAE/MFE */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DurationChart trades={trades} isDark={isDark} />
                    <MAEMFEChart trades={trades} isDark={isDark} />
                  </div>
                </>
              )}

              {/* Risk Model Tab */}
              {activeTab === 'risk' && stats && (
                <RiskModel trades={trades} stats={stats} isDark={isDark} />
              )}

              {/* Report Tab */}
              {activeTab === 'report' && stats && (
                <TradingReport
                  trades={trades}
                  stats={stats}
                  initialBalance={stats.initial_balance}
                  isDark={isDark}
                />
              )}

              {/* Tools Tab */}
              {activeTab === 'tools' && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PositionSizeCalc isDark={isDark} accountBalance={account?.balance || 10000} />
                    <WinRateCalc isDark={isDark} initialAvgWin={stats?.avg_win || 100} initialAvgLoss={stats?.avg_loss || 50} />
                  </div>
                  <GoalTracker trades={trades} isDark={isDark} />
                </>
              )}

              {/* Positions Tab */}
              {activeTab === 'positions' && (
                <OpenPositions isDark={isDark} />
              )}

              {/* Calendar Tab */}
              {activeTab === 'calendar' && (
                <NewsCalendar isDark={isDark} />
              )}
            </div>
          )}

          {/* Floating AI Button (Mobile Only) */}
          {isConnected && aiPanelCollapsed && (
            <button
              onClick={() => setAiPanelCollapsed(false)}
              className="fixed bottom-6 right-6 z-50 p-3 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transition lg:hidden animate-in zoom-in duration-300"
            >
              <Bot size={24} />
            </button>
          )}
        </main>
      </div>

      {/* AI Side Panel - Responsive Container */}
      {isConnected && (
        <div className={`fixed inset-y-0 right-0 z-[60] lg:relative lg:inset-auto lg:z-auto transition-transform duration-300 ${aiPanelCollapsed ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'
          }`}>
          <AISidePanel
            stats={stats}
            trades={trades}
            account={account}
            periods={periods}
            isDark={isDark}
            isCollapsed={aiPanelCollapsed}
            onToggleCollapse={() => setAiPanelCollapsed(!aiPanelCollapsed)}
          />
        </div>
      )}
    </div>
  );
}
