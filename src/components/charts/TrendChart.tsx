import { useId } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

import { parseDayKey, toDayKey } from '@/domain/shared/dates'
import type { DayKey } from '@/domain/types'
import { formatShortDay } from '@/lib/format'

export interface TrendSeries {
  key: string
  label: string
  /** Variable CSS del color (p. ej. `var(--chart-1)`). */
  color: string
  /** Muestra cada punto (mediciones reales) además de la línea. */
  dots?: boolean
  /** Lavado del área bajo la línea (~10 %). Solo para la serie principal. */
  area?: boolean
}

export type TrendDatum = { date: DayKey } & Record<string, number | null | string>

interface TrendChartProps {
  data: readonly TrendDatum[]
  series: readonly TrendSeries[]
  formatValue: (value: number) => string
  /** Descripción para lectores de pantalla. */
  ariaLabel: string
  height?: number
  references?: readonly { y: number; label: string }[]
}

const time = (key: DayKey) => parseDayKey(key).getTime()

function TrendTooltip({
  active,
  payload,
  series,
  formatValue,
}: Pick<TooltipContentProps<ValueType, NameType>, 'active' | 'payload'> &
  Pick<TrendChartProps, 'series' | 'formatValue'>) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload as TrendDatum | undefined
  if (!datum) return null
  return (
    <div className="min-w-36 rounded-xl border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-muted-foreground">{formatShortDay(datum.date)}</p>
      {series.map((s) => {
        const value = datum[s.key]
        if (typeof value !== 'number') return null
        return (
          <p key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
            <strong className="tabular text-sm text-foreground">{formatValue(value)}</strong>
            <span className="text-muted-foreground">{s.label}</span>
          </p>
        )
      })}
    </div>
  )
}

/**
 * Gráfica de evolución en el tiempo: líneas de 2 px, rejilla mínima, cruz de lectura con
 * tooltip y una tabla accesible con los mismos datos.
 */
export function TrendChart({
  data,
  series,
  formatValue,
  ariaLabel,
  height = 220,
  references = [],
}: TrendChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const points = data.map((d) => ({ ...d, t: time(d.date) }))
  const last = points.at(-1)

  return (
    <figure className="space-y-2">
      {series.length > 1 && (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
      <div role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {series
                .filter((s) => s.area)
                .map((s) => (
                  <linearGradient
                    key={s.key}
                    id={`${gradientId}-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(t: number) => formatShortDay(toDayKey(new Date(t)))}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              width={44}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => formatValue(v).replace(/\s.*$/, '')}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              tickCount={4}
            />
            {references.map((r) => (
              <ReferenceLine
                key={r.label}
                y={r.y}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.6}
                label={{
                  value: r.label,
                  position: 'insideTopLeft',
                  fontSize: 11,
                  fill: 'var(--muted-foreground)',
                }}
              />
            ))}
            <Tooltip
              cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
              content={(props) => (
                <TrendTooltip
                  active={props.active}
                  payload={props.payload}
                  series={series}
                  formatValue={formatValue}
                />
              )}
            />
            {series.map((s) =>
              s.area ? (
                <Area
                  key={`${s.key}-area`}
                  dataKey={s.key}
                  type="monotone"
                  stroke="none"
                  fill={`url(#${gradientId}-${s.key})`}
                  connectNulls
                  isAnimationActive={false}
                  tooltipType="none"
                />
              ) : null,
            )}
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                type="monotone"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                connectNulls
                isAnimationActive={false}
                dot={
                  s.dots
                    ? { r: 3.5, fill: s.color, stroke: 'var(--card)', strokeWidth: 2 }
                    : (props: { cx?: number; cy?: number; index?: number }) =>
                        props.index === points.length - 1 &&
                        props.cx !== undefined &&
                        props.cy !== undefined ? (
                          <circle
                            key="end"
                            cx={props.cx}
                            cy={props.cy}
                            r={4}
                            fill={s.color}
                            stroke="var(--card)"
                            strokeWidth={2}
                          />
                        ) : (
                          <g key={props.index} />
                        )
                }
                activeDot={{ r: 5, fill: s.color, stroke: 'var(--card)', strokeWidth: 2 }}
              />
            ))}
          </ComposedChart>
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
                <th className="px-3 py-1.5 font-semibold">Fecha</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-1.5 text-right font-semibold">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5">{formatShortDay(d.date)}</td>
                  {series.map((s) => {
                    const v = d[s.key]
                    return (
                      <td key={s.key} className="tabular px-3 py-1.5 text-right">
                        {typeof v === 'number' ? formatValue(v) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {last === undefined && <p className="text-sm text-muted-foreground">Sin datos todavía.</p>}
    </figure>
  )
}
