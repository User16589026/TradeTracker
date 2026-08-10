"use client";
import { useEffect, useState } from "react";

interface GoldData {
  balance: number;
  equity: number;
  peak: number;
  floor: number;
  locked: boolean;
  signal: string;
  price: number;
  kama: number;
  adx: number;
  atr: number;
  trend: string;
  turb: boolean;
  position: { entry: number; sl: number; lot: number; profit: number } | null;
  total_pnl: number;
  dd_pct: number;
  buffer: number;
  updated: string;
  recent_log: Array<{ timestamp: string; action: string; detail: string }>;
}

const DATA_URL = "https://staion.vercel.app/data.json";

export default function GoldPage() {
  const [data, setData] = useState<GoldData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(DATA_URL, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Cannot load data — MT5 offline?"));
    const t = setInterval(() => {
      fetch(DATA_URL, { cache: "no-store" })
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }, 60000);
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="p-8 text-red-400 text-center">{error}</div>;
  if (!data) return <div className="p-8 text-gray-400 text-center">Loading...</div>;

  const d = data;
  const sigColor =
    d.signal === "ENTER" ? "bg-green-900 text-green-400" :
    d.signal === "WAIT" ? "bg-blue-900 text-blue-400" :
    "bg-red-900 text-red-400";
  const ddColor = d.dd_pct > 10 ? "text-red-400" : d.dd_pct > 5 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="p-6 space-y-6 text-white max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-400">🥇 FinRLX Gold v4 — Live</h1>
        <span className="text-xs text-gray-500">{d.updated}</span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">💰 Balance</div>
          <div className={`text-2xl font-bold ${d.balance > 5000 ? "text-green-400" : "text-yellow-400"}`}>
            {d.balance.toLocaleString()} USC
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Peak: {d.peak.toLocaleString()} | PnL:{" "}
            <span className={d.total_pnl >= 0 ? "text-green-400" : "text-red-400"}>
              {d.total_pnl >= 0 ? "+" : ""}{d.total_pnl.toLocaleString()} USC
            </span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">🎯 Signal</div>
          <div className={`inline-block px-3 py-1 rounded-md text-lg font-bold mt-1 ${sigColor}`}>
            {d.signal}
          </div>
          <div className="text-xs text-gray-500 mt-1">Trend: {d.trend} | ADX: {d.adx}</div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">📉 Drawdown</div>
          <div className={`text-2xl font-bold ${ddColor}`}>{d.dd_pct.toFixed(1)}%</div>
          <div className="w-full h-2 bg-gray-700 rounded mt-2">
            <div className="h-full bg-red-500 rounded" style={{ width: `${Math.min(d.dd_pct * 3, 100)}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-1">Buffer: {d.buffer.toLocaleString()} above floor {d.floor.toLocaleString()}</div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">📊 Price / KAMA</div>
          <div className="text-2xl font-bold text-blue-400">{d.price?.toFixed(2) || "—"}</div>
          <div className="text-xs text-gray-500 mt-1">KAMA: {d.kama?.toFixed(2) || "—"} | ATR: {d.atr?.toFixed(1) || "—"}</div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase mb-2">📋 Recent Activity</div>
          {d.position ? (
            <div className="text-green-400 font-bold">
              🔵 OPEN — BUY @ {d.position.entry} | SL {d.position.sl} | Lot {d.position.lot}
              <br />
              <span className="text-xs">PnL: <span className={d.position.profit >= 0 ? "text-green-400" : "text-red-400"}>{d.position.profit >= 0 ? "+" : ""}{d.position.profit.toLocaleString()} USC</span></span>
            </div>
          ) : d.recent_log?.length ? (
            <table className="w-full text-sm">
              <tbody>
                {d.recent_log.slice(-6).reverse().map((r, i) => (
                  <tr key={i} className="border-b border-gray-700">
                    <td className="py-1 text-xs text-gray-500">{(r.timestamp || "").slice(5, 16)}</td>
                    <td className="py-1">{r.action}</td>
                    <td className="py-1 text-xs text-gray-500">{r.detail || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-gray-500">รอสัญญาณแรก...</div>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase mb-2">🛡 Safety</div>
          <div className="space-y-3 text-sm">
            <div>
              <span>Max Risk: 700 USC</span>
              <div className="w-full h-2 bg-gray-700 rounded mt-1">
                <div className="h-full bg-blue-500 rounded" style={{ width: `${Math.min(((d.peak - d.balance) / 700) * 100, 100)}%` }} />
              </div>
              <div className="text-xs text-gray-500">Used: {(d.peak - d.balance).toLocaleString()} / 700 USC</div>
            </div>
            <div>
              <span>Floor Buffer</span>
              <div className="w-full h-2 bg-gray-700 rounded mt-1">
                <div className="h-full bg-green-500 rounded" style={{ width: `${Math.min((d.buffer / 700) * 100, 100)}%` }} />
              </div>
              <div className="text-xs text-gray-500">{d.buffer.toLocaleString()} → floor {d.floor.toLocaleString()}</div>
            </div>
            <div className="text-xs space-x-2">
              {d.locked ? <span>🔒 <span className="text-red-400">LOCKED</span></span> : <span>🔓 <span className="text-green-400">Ready</span></span>}
              <span>|</span>
              {d.turb ? <span>⚠ <span className="text-yellow-400">Turb</span></span> : <span>✓ <span className="text-green-400">Calm</span></span>}
              <span>|</span>
              {d.adx >= 25 ? <span>✅ <span className="text-green-400">ADX OK</span></span> : <span>⏸ <span className="text-yellow-400">ADX {d.adx.toFixed(1)}</span></span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
