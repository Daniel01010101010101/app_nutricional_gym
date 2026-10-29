import { STRENGTH_TREND } from '../constants/formulas'
import { addDaysToKey } from '../shared/dates'
import { calculated, type Calculated } from '../shared/explanation'
import { fmt } from '../shared/format'
import { movingAverage, percentChange, roundDecimals } from '../shared/math'
import type { DayKey, MainLift } from '../types'

export interface E1rmPoint {
  date: DayKey
  e1rm: number
}

export interface TrendPoint extends E1rmPoint {
  /** Promedio móvil de las últimas 3 sesiones. */
  average: number
}

export type TrendState = 'up' | 'stable' | 'down' | 'insufficient'

export interface StrengthTrend {
  state: TrendState
  changePct: number | null
  current: number | null
}

export const TREND_LABEL: Record<TrendState, string> = {
  up: 'Subiendo',
  stable: 'Estable',
  down: 'Bajando',
  insufficient: 'Sin datos suficientes',
}

export function trendSeries(points: readonly E1rmPoint[]): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const averages = movingAverage(
    sorted.map((p) => p.e1rm),
    STRENGTH_TREND.movingAverageSessions,
  )
  return sorted.map((p, i) => ({ ...p, average: roundDecimals(averages[i] as number, 2) }))
}

/** Compara el promedio móvil actual con el de hace `lookbackDays` días. */
export function strengthTrend(
  points: readonly E1rmPoint[],
  lookbackDays: number = STRENGTH_TREND.lookbackDays,
): StrengthTrend {
  const series = trendSeries(points)
  const last = series.at(-1)
  if (!last) return { state: 'insufficient', changePct: null, current: null }
  const cutoff = addDaysToKey(last.date, -lookbackDays)
  const reference = [...series].reverse().find((p) => p.date <= cutoff)
  if (!reference) return { state: 'insufficient', changePct: null, current: last.average }
  const changePct = roundDecimals(percentChange(reference.average, last.average), 1)
  const band = STRENGTH_TREND.stableBandPct
  const state = changePct >= band ? 'up' : changePct <= -band ? 'down' : 'stable'
  return { state, changePct, current: last.average }
}

export interface StrengthAlert {
  triggered: boolean
  dropping: { lift: MainLift; changePct: number }[]
}

export const MAIN_LIFT_LABEL: Record<MainLift, string> = {
  squat: 'Sentadilla',
  bench: 'Press banca',
  deadlift: 'Peso muerto',
  ohp: 'Press militar',
  row: 'Remo con barra',
  pullup: 'Dominadas / jalón',
}

/** Alerta si el 1RM estimado cae más de 5 % en 2 semanas en al menos 2 básicos. */
export function strengthLossAlert(
  byLift: Partial<Record<MainLift, readonly E1rmPoint[]>>,
): Calculated<StrengthAlert> {
  const dropping = (Object.entries(byLift) as [MainLift, readonly E1rmPoint[]][])
    .map(([lift, points]) => ({ lift, trend: strengthTrend(points) }))
    .filter(
      ({ trend }) => trend.changePct !== null && trend.changePct < -STRENGTH_TREND.alertDropPct,
    )
    .map(({ lift, trend }) => ({ lift, changePct: trend.changePct as number }))
  const triggered = dropping.length >= STRENGTH_TREND.alertMinLifts

  return calculated(
    { triggered, dropping },
    {
      title: 'Protección de fuerza',
      summary: triggered
        ? `Tu fuerza está bajando en ${dropping.map((d) => `${MAIN_LIFT_LABEL[d.lift].toLowerCase()} (${fmt(d.changePct, 1)} %)`).join(' y ')}. Es momento de proteger tu progreso.`
        : 'Tu fuerza se mantiene: el déficit no está afectando tus básicos.',
      steps: triggered
        ? [
            { label: '1', value: 'No bajes más las calorías.' },
            {
              label: '2',
              value: `Sube ${STRENGTH_TREND.trainingDayKcalBoost} kcal (de carbos) los días de entreno.`,
            },
            { label: '3', value: 'Revisa tu sueño (7–9 h) y que llegues a tu proteína.' },
            { label: '4', value: 'Considera una semana de descarga.' },
          ]
        : [],
      rationale:
        'Una caída de más de 5 % en dos semanas en varios básicos indica que la recuperación no alcanza. Corregirlo a tiempo evita perder músculo.',
    },
  )
}

/**
 * Tendencia global de los básicos: "bajando" si caen dos o más (o más de los que suben),
 * "subiendo" si suben la mayoría; si no, "estable". Sin datos en ningún básico, "insuficiente".
 */
export function overallStrengthTrend(states: readonly TrendState[]): TrendState {
  const known = states.filter((s) => s !== 'insufficient')
  if (known.length === 0) return 'insufficient'
  const up = known.filter((s) => s === 'up').length
  const down = known.filter((s) => s === 'down').length
  if (down >= STRENGTH_TREND.alertMinLifts || down > up) return 'down'
  if (up > known.length / 2) return 'up'
  return 'stable'
}
