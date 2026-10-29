import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { DayKey } from '@/domain/types'
import { formatShortDay } from '@/lib/format'

export interface WeeklyBarDatum {
  weekStart: DayKey
  value: number
  /** Detalle extra para el tooltip y la tabla (p. ej. "5 de 7 días registrados"). */
  detail?: string
}

interface WeeklyBarsProps {
  data: readonly WeeklyBarDatum[]
  label: string
  color: string
  formatValue: (value: number) => string
  ariaLabel: string
  height?: number
  reference?: { y: number; label: string }
  domainMax?: number
}

/** Una barra por semana: barras finas con extremo redondeado, tooltip por barra y tabla de datos. */
export function WeeklyBars({
  data,
  label,
  color,
  formatValue,
  ariaLabel,
  height = 180,
  reference,
  domainMax,
}: WeeklyBarsProps) {
  const rows = data.map((d) => ({ ...d, name: formatShortDay(d.weekStart) }))
  return (
    <figure className="space-y-2">
      <div role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              width={36}
              allowDecimals={false}
              domain={[0, domainMax ?? 'auto']}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              tickCount={4}
            />
            {reference && (
              <ReferenceLine
                y={reference.y}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.6}
                label={{
                  value: reference.label,
                  position: 'insideTopRight',
                  fontSize: 11,
                  fill: 'var(--muted-foreground)',
                }}
              />
            )}
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as (WeeklyBarDatum & { name: string }) | undefined
                if (!active || !d) return null
                return (
                  <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-xl">
                    <p className="mb-1 font-medium text-muted-foreground">Semana del {d.name}</p>
                    <p className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-sm"
                        style={{ background: color }}
                      />
                      <strong className="tabular text-sm text-foreground">
                        {formatValue(d.value)}
                      </strong>
                      <span className="text-muted-foreground">{label}</span>
                    </p>
                    {d.detail && <p className="mt-0.5 text-muted-foreground">{d.detail}</p>}
                  </div>
                )
              }}
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
          Ver datos en tabla
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-muted/60">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Semana</th>
                <th className="px-3 py-1.5 text-right font-semibold">{label}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...rows].reverse().map((d) => (
                <tr key={d.weekStart}>
                  <td className="px-3 py-1.5">{d.name}</td>
                  <td className="tabular px-3 py-1.5 text-right">
                    {formatValue(d.value)}
                    {d.detail && <span className="text-muted-foreground"> · {d.detail}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
