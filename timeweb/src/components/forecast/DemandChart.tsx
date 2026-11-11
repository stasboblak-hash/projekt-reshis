import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ForecastResult } from "@contracts/forecast";
const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
type TooltipProps = { active?: boolean; payload?: Array<{ payload: ForecastResult["scenarios"][number] }> };
function ChartTooltip({ active, payload }: TooltipProps) {
  const scenario = payload?.[0]?.payload;
  if (!active || !scenario) return null;
  return <div className="chart-tooltip"><div className="font-mono text-xs text-cyan">{scenario.label} · {scenario.quantile.toFixed(1)}</div><div className="mt-2 flex justify-between gap-6 text-sm"><span className="text-muted">Желают купить</span><strong>{number.format(scenario.desiredDemand)}</strong></div><div className="mt-1 flex justify-between gap-6 text-sm"><span className="text-muted">Продажи с учётом мест</span><strong>{number.format(scenario.sales)}</strong></div>{scenario.isCapacityLimited && <div className="mt-2 text-xs text-amber">Спрос ограничен числом кресел</div>}</div>;
}
export function DemandChart({ result }: { result: ForecastResult }) {
  return <div className="h-[310px] w-full" aria-label="График спроса по девяти сценариям"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={result.scenarios} margin={{ top: 22, right: 12, left: -12, bottom: 2 }}>
    <defs><linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.28} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0.015} /></linearGradient></defs>
    <CartesianGrid stroke="#1a2540" strokeDasharray="2 5" vertical={false} />
    <XAxis dataKey="quantile" tickFormatter={(value) => Number(value).toFixed(1)} tick={{ fill: "#8b98ad", fontSize: 12, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: "#1a2540" }} tickLine={false} dy={10} />
    <YAxis tick={{ fill: "#8b98ad", fontSize: 12, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={56} />
    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#42506a", strokeDasharray: "3 3" }} />
    <ReferenceLine y={result.seats} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="6 5" label={{ value: `Мест: ${number.format(result.seats)}`, fill: "#fbbf24", fontSize: 12, position: "insideTopRight" }} />
    <ReferenceLine x={0.5} stroke="#e6edf7" strokeOpacity={0.45} strokeDasharray="3 5" label={{ value: "медиана", fill: "#aeb9c9", fontSize: 11, position: "insideTopLeft" }} />
    <Area type="monotone" dataKey="desiredDemand" stroke="#22d3ee" strokeWidth={2.5} fill="url(#demandFill)" activeDot={{ r: 5, fill: "#07111f", stroke: "#22d3ee", strokeWidth: 3 }} animationDuration={260} isAnimationActive={false} />
    <Line type="monotone" dataKey="sales" stroke="#34d399" strokeWidth={1.5} dot={false} strokeDasharray="4 4" isAnimationActive={false} />
  </ComposedChart></ResponsiveContainer></div>;
}
