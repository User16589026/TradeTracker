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

export default function GoldPage() {
  const [data, setData] = useState<GoldData | null>(null);

  useEffect(() => {
    // Fetch from the data.json that's deployed alongside this app
    fetch("/data.json", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
    const t = setInterval(() => {
      fetch("/data.json", { cache: "no-store" })
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }, 60000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="p-8 text-gray-400 text-center text-sm">Loading...</div>;
  const d = data;
  const sigColor = d.signal === "ENTER" ? "bg-green-900 text-green-400" : d.signal === "WAIT" ? "bg-blue-900 text-blue-400" : "bg-red-900 text-red-400";
  const ddColor = d.dd_pct > 10 ? "text-red-400" : d.dd_pct > 5 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-400">🥇 FinRLX Gold v4 — Live</h1>
        <span className="text-[10px] text-gray-500">{d.updated}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="💰 Balance" value={`${d.balance.toLocaleString()} USC`} color={d.balance > 5000 ? "text-green-400" : "text-yellow-400"} sub={`Peak: ${d.peak.toLocaleString()} | PnL: ${d.total_pnl >= 0 ? "+" : ""}${d.total_pnl.toLocaleString()}`} />
        <Card label="🎯 Signal" value={d.signal} color="" sig={sigColor} sub={`Trend: ${d.trend} | ADX: ${d.adx}`} />
        <Card label="📉 Drawdown" value={`${d.dd_pct.toFixed(1)}%`} color={ddColor} sub={`Buffer: ${d.buffer.toLocaleString()} → ${d.floor.toLocaleString()}`} bar={`${Math.min(d.dd_pct * 3, 100)}%`} />
        <Card label="📊 Price/KAMA" value={d.price?.toFixed(2) || "—"} color="text-blue-400" sub={`KAMA: ${d.kama?.toFixed(2) || "—"} | ATR: ${d.atr?.toFixed(1) || "—"}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-2">📋 Recent Activity</div>
          {d.position ? (
            <div className="text-green-400 font-bold text-sm">
              🔵 OPEN — BUY @ {d.position.entry} | SL {d.position.sl} | Lot {d.position.lot}
              <br /><span className="text-xs">{d.position.profit >= 0 ? "+" : ""}{d.position.profit.toLocaleString()} USC</span>
            </div>
          ) : d.recent_log?.length ? (
            <table className="w-full text-xs"><tbody>
              {d.recent_log.slice(-6).reverse().map((r, i) => (
                <tr key={i} className="border-b border-gray-700">
                  <td className="py-1 text-gray-500">{(r.timestamp || "").slice(5, 16)}</td>
                  <td className="py-1">{r.action}</td>
                  <td className="py-1 text-gray-500">{r.detail || ""}</td>
                </tr>
              ))}
            </tbody></table>
          ) : <div className="text-gray-500 text-xs">รอสัญญาณแรก...</div>}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-xs space-y-3">
          <div className="text-[10px] text-gray-500 uppercase">🛡 Safety</div>
          <Bar label="Risk Used" pct={Math.min(((d.peak - d.balance) / 700) * 100, 100).toFixed(0)} color="bg-blue-500" sub={`${(d.peak - d.balance).toLocaleString()} / 700 USC`} />
          <Bar label="Floor Buffer" pct={Math.min((d.buffer / 700) * 100, 100).toFixed(0)} color="bg-green-500" sub={`${d.buffer.toLocaleString()} USC`} />
          <div className="space-x-2">
            {d.locked ? <span>🔒 <span className="text-red-400">LOCKED</span></span> : <span>🔓 <span className="text-green-400">Ready</span></span>}
            <span>|</span>
            {d.turb ? <span>⚠ <span className="text-yellow-400">Turb</span></span> : <span>✓ <span className="text-green-400">Calm</span></span>}
            <span>|</span>
            {d.adx >= 25 ? <span>✅ <span className="text-green-400">ADX OK</span></span> : <span>⏸ <span className="text-yellow-400">ADX {d.adx.toFixed(1)}</span></span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, color, sig, sub, bar }: { label: string; value: string; color: string; sig?: string; sub: string; bar?: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
      <div className="text-[10px] text-gray-500 uppercase">{label}</div>
      {sig ? (
        <div className={`inline-block px-2 py-0.5 rounded text-sm font-bold mt-1 ${sig}`}>{value}</div>
      ) : (
        <div className={`text-lg font-bold mt-0.5 ${color}`}>{value}</div>
      )}
      {bar && <div className="w-full h-1.5 bg-gray-700 rounded mt-1"><div className="h-full bg-red-500 rounded" style={{ width: bar }} /></div>}
      <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function Bar({ label, pct, color, sub }: { label: string; pct: string; color: string; sub: string }) {
  return (
    <div>
      <span>{label}</span>
      <div className="w-full h-1.5 bg-gray-700 rounded mt-0.5"><div className={`h-full ${color} rounded`} style={{ width: `${Math.min(Number(pct), 100)}%` }} /></div>
      <div className="text-gray-500">{sub}</div>
    </div>
  );
}
