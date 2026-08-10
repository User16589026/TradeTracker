"use client";
import { useEffect, useState } from "react";

interface GoldData {
  balance: number; equity: number; peak: number; floor: number;
  locked: boolean; signal: string; price: number; kama: number;
  adx: number; atr: number; trend: string; turb: boolean;
  position: { entry: number; sl: number; lot: number; profit: number } | null;
  total_pnl: number; dd_pct: number; buffer: number; updated: string;
  recent_log: Array<{ timestamp: string; action: string; detail: string }>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-slate-900/60 border border-slate-800/60 p-3 sm:p-4 ${className}`}>
      {children}
    </div>
  );
}

export default function GoldPage() {
  const [data, setData] = useState<GoldData | null>(null);

  useEffect(() => {
    fetch("/data.json", { cache: "no-store" }).then(r => r.json()).then(setData).catch(() => {});
    const t = setInterval(() => fetch("/data.json", { cache: "no-store" }).then(r => r.json()).then(setData).catch(() => {}), 60000);
    return () => clearInterval(t);
  }, []);

  if (!data) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-slate-500 text-sm">Loading FinRLX Gold...</p>
    </div>
  );

  const d = data;
  const sigBg = d.signal === "ENTER" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
    d.signal === "WAIT" ? "bg-blue-500/20 text-blue-400 border-blue-400/40" :
    "bg-rose-500/20 text-rose-400 border-rose-400/40";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-3 sm:p-5 space-y-3 max-w-5xl mx-auto">
      {/* Top bar: signal + updated */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base sm:text-xl font-bold text-slate-100 shrink-0">🥇 FinRLX Gold v4</h1>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-lg border font-semibold ${sigBg}`}>
            {d.signal}
          </span>
          <span className="text-[10px] text-slate-600 hidden sm:inline">{d.updated}</span>
        </div>
      </div>

      {/* Metric cards — 2 col mobile, 4 col desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <div className="text-[10px] sm:text-xs text-slate-500">Balance</div>
          <div className={`text-base sm:text-xl font-bold mt-0.5 ${d.total_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {d.balance.toLocaleString()}
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5">
            {d.total_pnl >= 0 ? "+" : ""}{d.total_pnl.toLocaleString()} USC
          </div>
        </Card>

        <Card>
          <div className="text-[10px] sm:text-xs text-slate-500">Drawdown</div>
          <div className={`text-base sm:text-xl font-bold mt-0.5 ${d.dd_pct > 5 ? "text-rose-400" : "text-emerald-400"}`}>
            {d.dd_pct.toFixed(1)}%
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5">
            {d.buffer.toLocaleString()} USC free
          </div>
        </Card>

        <Card>
          <div className="text-[10px] sm:text-xs text-slate-500">Price</div>
          <div className="text-base sm:text-xl font-bold mt-0.5 text-blue-400">
            {d.price?.toFixed(2) || "—"}
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5">
            KAMA {d.kama?.toFixed(2) || "—"}
          </div>
        </Card>

        <Card>
          <div className="text-[10px] sm:text-xs text-slate-500">ADX</div>
          <div className={`text-base sm:text-xl font-bold mt-0.5 ${d.adx >= 25 ? "text-emerald-400" : "text-amber-400"}`}>
            {d.adx?.toFixed(1) || "—"}
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5">
            {d.adx >= 25 ? "Ready" : "Below 25"}
          </div>
        </Card>
      </div>

      {/* Activity + Safety */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* Activity */}
        <Card className="sm:col-span-2">
          <div className="text-[10px] sm:text-xs text-slate-500 mb-2">Activity</div>
          {d.position ? (
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
              🔵 BUY @{d.position.entry} | SL {d.position.sl} | Lot {d.position.lot}
              <span className={d.position.profit >= 0 ? "text-emerald-400 ml-2" : "text-rose-400 ml-2"}>
                {d.position.profit >= 0 ? "+" : ""}{d.position.profit.toLocaleString()} USC
              </span>
            </div>
          ) : d.recent_log?.length ? (
            <div className="space-y-0.5">
              {d.recent_log.slice(-8).reverse().map((r, i) => (
                <div key={i} className="flex gap-2 text-[10px] sm:text-xs py-0.5 border-b border-slate-800/40 last:border-0">
                  <span className="text-slate-600 w-20 sm:w-24 shrink-0">{(r.timestamp || "").slice(5, 16)}</span>
                  <span className={r.action === "ENTER" ? "text-emerald-400 font-medium w-10 shrink-0" : r.action?.includes("EXIT") ? "text-rose-400 font-medium w-10 shrink-0" : "text-slate-400 w-10 shrink-0"}>
                    {r.action}
                  </span>
                  <span className="text-slate-500 truncate">{r.detail || ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-[10px]">Waiting for first signal...</p>
          )}
        </Card>

        {/* Safety */}
        <Card>
          <div className="text-[10px] sm:text-xs text-slate-500 mb-3">Safety</div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-500">Risk</span>
                <span className="text-slate-400">{(d.peak - d.balance).toLocaleString()}/700</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(((d.peak - d.balance) / 700) * 100, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-500">Buffer</span>
                <span className="text-slate-400">{d.buffer.toLocaleString()}</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((d.buffer / 700) * 100, 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-md border ${d.locked ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
              {d.locked ? "🔒 Locked" : "🔓 Ready"}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md border ${d.turb ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
              {d.turb ? "⚠ Turb" : "✓ Calm"}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md border ${d.adx >= 25 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
              ADX {d.adx.toFixed(1)}
            </span>
          </div>
        </Card>
      </div>

      <p className="text-center text-[9px] text-slate-700 pt-1">
        Auto-refresh 60s · cron every H1 · Risk 3%/trade
      </p>
    </div>
  );
}
