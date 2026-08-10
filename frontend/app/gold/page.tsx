"use client";
import { useEffect, useState } from "react";
import KPICard from "@/components/KPICard";
import { TrendingUp, DollarSign, Activity, Gauge, Shield, AlertTriangle } from "lucide-react";

interface GoldData {
  balance: number; equity: number; peak: number; floor: number;
  locked: boolean; signal: string; price: number; kama: number;
  adx: number; atr: number; trend: string; turb: boolean;
  position: { entry: number; sl: number; lot: number; profit: number } | null;
  total_pnl: number; dd_pct: number; buffer: number; updated: string;
  recent_log: Array<{ timestamp: string; action: string; detail: string }>;
}

export default function GoldPage() {
  const [data, setData] = useState<GoldData | null>(null);

  useEffect(() => {
    fetch("/data.json", { cache: "no-store" })
      .then((r) => r.json()).then(setData).catch(() => {});
    const t = setInterval(() => {
      fetch("/data.json", { cache: "no-store" })
        .then((r) => r.json()).then(setData).catch(() => {});
    }, 60000);
    return () => clearInterval(t);
  }, []);

  if (!data) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex gap-2 items-center text-slate-400 text-sm">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        Loading FinRLX Gold...
      </div>
    </div>
  );

  const d = data;
  const isDark = true;
  const pnlColor = d.total_pnl >= 0 ? "text-emerald-400" : "text-rose-400";
  const pnlSign = d.total_pnl >= 0 ? "+" : "";
  const signalColor = d.signal === "ENTER" ? "text-emerald-400" : d.signal === "WAIT" ? "text-blue-400" : "text-rose-400";
  const signalBg = d.signal === "ENTER" ? "bg-emerald-500/10 border-emerald-500/30" : d.signal === "WAIT" ? "bg-blue-500/10 border-blue-500/30" : "bg-rose-500/10 border-rose-500/30";
  const ddColor = d.dd_pct > 10 ? "text-rose-400" : d.dd_pct > 5 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">FinRLX Gold v4</h1>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Live · {d.updated}</p>
        </div>
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-semibold ${signalBg} ${signalColor}`}>
          {d.signal === "ENTER" ? "BUY" : d.signal === "WAIT" ? "WAIT" : "LOCKED"}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          label="Balance"
          value={`${d.balance.toLocaleString()} USC`}
          subValue={`Peak: ${d.peak.toLocaleString()} | PnL: ${pnlSign}${d.total_pnl.toLocaleString()}`}
          icon={DollarSign}
          trend={d.total_pnl >= 0 ? "up" : "down"}
          isDark={isDark}
        />
        <KPICard
          label="Drawdown"
          value={`${d.dd_pct.toFixed(1)}%`}
          subValue={`Buffer: ${d.buffer.toLocaleString()} → Floor ${d.floor.toLocaleString()}`}
          icon={Activity}
          trend={d.dd_pct > 5 ? "down" : "up"}
          isDark={isDark}
        />
        <KPICard
          label="Price / KAMA"
          value={d.price?.toFixed(2) || "—"}
          subValue={`KAMA: ${d.kama?.toFixed(2) || "—"} | ATR: ${d.atr?.toFixed(1) || "—"}`}
          icon={TrendingUp}
          trend={d.trend === "UPTREND" ? "up" : "down"}
          isDark={isDark}
        />
        <KPICard
          label="ADX"
          value={d.adx?.toFixed(1) || "—"}
          subValue={`${d.adx >= 25 ? "✓ Ready" : "○ Below 25"} | Turb: ${d.turb ? "⚠ High" : "✓ Calm"}`}
          icon={Gauge}
          trend={d.adx >= 25 ? "up" : "neutral"}
          isDark={isDark}
        />
      </div>

      {/* Bottom: Activity + Safety */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl sm:rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/50 shadow-xl p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-3 sm:mb-4 tracking-wide uppercase">
            Activity
          </h3>
          {d.position ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-emerald-400">OPEN — BUY</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 truncate">@{d.position.entry} | SL {d.position.sl} | Lot {d.position.lot}</div>
                </div>
                <div className={`text-xs sm:text-sm font-semibold shrink-0 ${d.position.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {d.position.profit >= 0 ? "+" : ""}{d.position.profit.toLocaleString()} USC
                </div>
              </div>
            </div>
          ) : d.recent_log?.length ? (
            <div className="space-y-1">
              {d.recent_log.slice(-6).reverse().map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] sm:text-xs py-1 border-b border-slate-800/50 last:border-0">
                  <span className="text-slate-600 w-24 sm:w-28 shrink-0">{(r.timestamp || "").slice(5, 16)}</span>
                  <span className={`font-medium w-12 sm:w-14 shrink-0 ${r.action === "ENTER" ? "text-emerald-400" : r.action === "EXIT" ? "text-rose-400" : "text-slate-400"}`}>
                    {r.action}
                  </span>
                  <span className="text-slate-500 truncate">{r.detail || ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-[10px] sm:text-xs">รอสัญญาณแรก...</p>
          )}
        </div>

        {/* Safety Gates */}
        <div className="rounded-xl sm:rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/50 shadow-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h3 className="text-xs sm:text-sm font-medium text-slate-400 tracking-wide uppercase">
            Safety
          </h3>

          {/* Risk Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500">Max Risk</span>
              <span className="text-slate-400">{(d.peak - d.balance).toLocaleString()} / 700 USC</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(((d.peak - d.balance) / 700) * 100, 100)}%` }} />
            </div>
          </div>

          {/* Floor Buffer */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500">Floor Buffer</span>
              <span className="text-slate-400">{d.buffer.toLocaleString()} USC</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min((d.buffer / 700) * 100, 100)}%` }} />
            </div>
          </div>

          {/* Status Chips */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
            <span className={`px-3 py-1.5 rounded-lg border ${d.locked ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
              {d.locked ? "🔒 LOCKED" : "🔓 Ready"}
            </span>
            <span className={`px-3 py-1.5 rounded-lg border ${d.turb ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
              {d.turb ? "⚠ Turbulent" : "✓ Calm"}
            </span>
            <span className={`px-3 py-1.5 rounded-lg border ${d.adx >= 25 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
              {d.adx >= 25 ? "✅ ADX OK" : `○ ADX ${d.adx.toFixed(1)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-600">
        Auto-refresh 60s · Data from MT5 via cron · Risk 3%/trade · Floor 4,800 USC
      </p>
    </div>
  );
}
