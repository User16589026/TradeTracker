"use client";
import { useEffect, useState } from "react";

interface GoldData {
  balance: number; equity: number; peak: number; floor: number;
  locked: boolean; signal: string; price: number; kama: number;
  adx: number; atr: number; trend: string; turb: boolean;
  position: { entry: number; sl: number; lot: number; profit: number } | null;
  total_pnl: number; dd_pct: number; buffer: number; updated: string;
  recent_log: Array<{ timestamp: string; action: string; detail: string; adx?: number }>;
  stats: {
    n: number; wins: number; losses: number; win_rate: number;
    net: number; pf: number | null; avg_r: number; best: number; worst: number;
    equity: number[]; max_dd: number;
    exit_stats: Array<{ reason: string; n: number; win_rate: number; net: number }>;
  } | null;
  closed: Array<{
    date: string; time: string; direction: string; entry: number | null; exit: number | null;
    r_multiple: number | null; exit_reason: string | null; setup_type: string | null; pnl_usc: number;
  }>;
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

  // equity sparkline points
  const eqPts = d.stats && d.stats.equity.length > 1 ? (() => {
    const eq = d.stats.equity;
    const mn = Math.min(...eq, 0), mx = Math.max(...eq, 1);
    const rng = (mx - mn) || 1;
    return eq.map((v, i) => `${((i / (eq.length - 1)) * 100).toFixed(1)},${(80 - ((v - mn) / rng * 72)).toFixed(1)}`).join(" ");
  })() : null;

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
            KAMA {d.kama?.toFixed(2) || "—"} | ATR {d.atr?.toFixed(1) || "—"}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 items-start">
        {/* Activity */}
        <Card className="sm:col-span-2">
          <div className="text-[10px] sm:text-xs text-slate-500 mb-2">Activity</div>
          {d.position && (
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs mb-2">
              🔵 BUY @{d.position.entry} | SL {d.position.sl} | Lot {d.position.lot}
              <span className={d.position.profit >= 0 ? "text-emerald-400 ml-2" : "text-rose-400 ml-2"}>
                {d.position.profit >= 0 ? "+" : ""}{d.position.profit.toLocaleString()} USC
              </span>
            </div>
          )}
          {d.recent_log?.length ? (
            <div className="space-y-0.5">
              {d.recent_log.slice(-8).reverse().map((r, i) => (
                <div key={i} className="grid grid-cols-[76px_64px_60px_minmax(0,1fr)] sm:grid-cols-[88px_64px_60px_minmax(0,1fr)] gap-x-2 text-[10px] sm:text-xs py-0.5 border-b border-slate-800/40 last:border-0">
                  <span className="text-slate-600 truncate">{(r.timestamp || "").slice(5, 16)}</span>
                  <span className={r.action === "ENTER" ? "text-emerald-400 font-medium truncate" : r.action?.includes("EXIT") ? "text-rose-400 font-medium truncate" : "text-slate-400 truncate"}>
                    {r.action}
                  </span>
                  <span className="text-sky-400 whitespace-nowrap">ADX {r.adx ? Number(r.adx).toFixed(1) : "—"}</span>
                  <span className="text-slate-500 truncate min-w-0">{r.detail || ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-[10px]">Waiting for first signal...</p>
          )}
        </Card>

        {/* Safety */}
        <Card className="self-start">
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

      {/* ── Performance stats (จาก journal) ── */}
      {d.stats && d.stats.n > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Card>
              <div className="text-[10px] sm:text-xs text-slate-500">Win Rate</div>
              <div className="text-base sm:text-xl font-bold mt-0.5">{d.stats.win_rate}%</div>
              <div className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5">{d.stats.wins}W / {d.stats.losses}L · {d.stats.n} เทรด</div>
            </Card>
            <Card>
              <div className="text-[10px] sm:text-xs text-slate-500">Net PnL</div>
              <div className={`text-base sm:text-xl font-bold mt-0.5 ${d.stats.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {d.stats.net >= 0 ? "+" : ""}{d.stats.net.toLocaleString()}
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5">PF: {d.stats.pf ?? "—"} | Avg R: {d.stats.avg_r}</div>
            </Card>
            <Card>
              <div className="text-[10px] sm:text-xs text-slate-500">Max DD (ปิดแล้ว)</div>
              <div className="text-base sm:text-xl font-bold mt-0.5 text-amber-400">{d.stats.max_dd.toLocaleString()}</div>
              <div className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5">Best {d.stats.best} / Worst {d.stats.worst}</div>
            </Card>
            <Card>
              <div className="text-[10px] sm:text-xs text-slate-500">Active</div>
              <div className="text-base sm:text-xl font-bold mt-0.5 text-blue-400">{d.signal}</div>
              <div className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5">{d.trend} · ADX {d.adx?.toFixed(1)}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Card className="sm:col-span-2">
              <div className="text-[10px] sm:text-xs text-slate-500 mb-2">Equity Curve (เทรดปิดแล้ว)</div>
              {eqPts ? (
                <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="w-full h-20">
                  <line x1="0" y1="80" x2="100" y2="80" stroke="#334155" strokeWidth="0.5" />
                  <polyline points={eqPts} fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                </svg>
              ) : (
                <p className="text-slate-600 text-[10px]">รอข้อมูล...</p>
              )}
            </Card>
            <Card>
              <div className="text-[10px] sm:text-xs text-slate-500 mb-2">Exit Reason</div>
              <div className="space-y-2">
                {d.stats.exit_stats.map((x, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">{x.reason} ({x.n})</span>
                      <span className="text-slate-500">WR {x.win_rate}%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full">
                      <div className={`h-full rounded-full ${x.net >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${Math.min(Math.abs(x.net) / Math.max(Math.abs(d.stats!.net), 1) * 100, 100)}%` }} />
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{x.net >= 0 ? "+" : ""}{x.net} USC</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <div className="text-[10px] sm:text-xs text-slate-500 mb-2">Closed Trades (ล่าสุด {Math.min(d.closed.length, 15)})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] sm:text-xs">
                <thead>
                  <tr className="text-slate-600 text-left">
                    <th className="py-1 pr-2 font-normal">วัน</th>
                    <th className="py-1 pr-2 font-normal">ทาง</th>
                    <th className="py-1 pr-2 font-normal">Entry</th>
                    <th className="py-1 pr-2 font-normal">Exit</th>
                    <th className="py-1 pr-2 font-normal">R</th>
                    <th className="py-1 pr-2 font-normal">เหตุผล</th>
                    <th className="py-1 font-normal">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {[...d.closed].reverse().map((t, i) => (
                    <tr key={i} className="border-t border-slate-800/40">
                      <td className="py-1 pr-2 text-slate-600">{(t.date || "").slice(5)} {t.time || ""}</td>
                      <td className="py-1 pr-2">{t.direction || "—"}</td>
                      <td className="py-1 pr-2">{t.entry ?? "—"}</td>
                      <td className="py-1 pr-2">{t.exit ?? "—"}</td>
                      <td className="py-1 pr-2">{t.r_multiple ?? "—"}</td>
                      <td className="py-1 pr-2 text-slate-500">{t.exit_reason || t.setup_type || "—"}</td>
                      <td className={`py-1 ${t.pnl_usc >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.pnl_usc >= 0 ? "+" : ""}{t.pnl_usc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <p className="text-center text-[9px] text-slate-700 pt-1">
        Auto-refresh 60s · cron every H1 · Risk 3%/trade
      </p>
    </div>
  );
}
