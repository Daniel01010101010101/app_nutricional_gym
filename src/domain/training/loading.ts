import { roundDecimals } from '../shared/math'
import { toKg } from '../shared/units'
import type { LoadType, WeightUnit } from '../types'

export interface WeightAmount {
  value: number
  unit: WeightUnit
}

export interface LoadingSettings {
  bar: WeightAmount
  /** Denominaciones de discos disponibles (se asume que hay pares suficientes de cada uno). */
  plates: { unit: WeightUnit; values: number[] }
  dumbbellIncrement: WeightAmount
  machineIncrement: WeightAmount
}

export const DEFAULT_LOADING: LoadingSettings = {
  bar: { value: 20, unit: 'kg' },
  plates: { unit: 'kg', values: [25, 20, 15, 10, 5, 2.5, 1.25] },
  dumbbellIncrement: { value: 2, unit: 'kg' },
  machineIncrement: { value: 5, unit: 'kg' },
}

/** Discos típicos en gimnasios con libras (muy comunes en Colombia). */
export const LB_PLATES = [45, 35, 25, 10, 5, 2.5]

const MAX_PER_SIDE_KG = 250
const SCALE = 100

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** Totales cargables en una barra (kg), ordenados de menor a mayor. */
export function barbellLoads(settings: LoadingSettings): number[] {
  const barKg = toKg(settings.bar.value, settings.bar.unit)
  const plates = settings.plates.values.filter((v) => v > 0).map((v) => Math.round(v * SCALE))
  if (plates.length === 0) return [roundDecimals(barKg, 2)]

  const unit = plates.reduce(gcd)
  const maxPerSide = Math.round((MAX_PER_SIDE_KG / toKg(1, settings.plates.unit)) * SCALE)
  const slots = Math.floor(maxPerSide / unit)
  const reachable = new Array<boolean>(slots + 1).fill(false)
  reachable[0] = true
  for (let i = 1; i <= slots; i++) {
    reachable[i] = plates.some((p) => {
      const prev = i - p / unit
      return prev >= 0 && reachable[prev] === true
    })
  }
  const loads: number[] = []
  reachable.forEach((ok, i) => {
    if (ok) loads.push(roundDecimals(barKg + 2 * toKg((i * unit) / SCALE, settings.plates.unit), 2))
  })
  return loads
}

export type RoundMode = 'nearest' | 'down' | 'up'

function pickFrom(sorted: readonly number[], target: number, mode: RoundMode): number {
  const below = [...sorted].reverse().find((w) => w <= target + 1e-9)
  const above = sorted.find((w) => w >= target - 1e-9)
  if (mode === 'down') return below ?? (sorted[0] as number)
  if (mode === 'up') return above ?? (sorted.at(-1) as number)
  if (below === undefined) return above as number
  if (above === undefined) return below
  return target - below <= above - target ? below : above
}

function stepFor(loadType: LoadType, settings: LoadingSettings): number {
  switch (loadType) {
    case 'dumbbell':
      return toKg(settings.dumbbellIncrement.value, settings.dumbbellIncrement.unit)
    case 'stack':
      return toKg(settings.machineIncrement.value, settings.machineIncrement.unit)
    case 'bodyweight': {
      const smallest = Math.min(...settings.plates.values)
      return toKg(smallest, settings.plates.unit)
    }
    case 'fixed':
    case 'barbell':
      return 0.5
  }
}

function roundStep(target: number, step: number, mode: RoundMode): number {
  const ratio = target / step
  const n =
    mode === 'down'
      ? Math.floor(ratio + 1e-9)
      : mode === 'up'
        ? Math.ceil(ratio - 1e-9)
        : Math.round(ratio)
  return roundDecimals(Math.max(0, n) * step, 2)
}

/** Redondea un peso objetivo (kg) a lo que realmente puedes cargar. */
export function roundToLoadable(
  targetKg: number,
  loadType: LoadType,
  settings: LoadingSettings,
  mode: RoundMode = 'nearest',
): number {
  if (loadType === 'barbell') return pickFrom(barbellLoads(settings), targetKg, mode)
  return roundStep(targetKg, stepFor(loadType, settings), mode)
}

/** Siguiente peso cargable al sumar `incrementKg`; siempre mayor que el actual. */
export function nextLoadable(
  currentKg: number,
  incrementKg: number,
  loadType: LoadType,
  settings: LoadingSettings,
): number {
  const candidate = roundToLoadable(currentKg + incrementKg, loadType, settings)
  if (candidate > currentKg + 1e-9) return candidate
  if (loadType === 'barbell') {
    const higher = barbellLoads(settings).find((w) => w > currentKg + 1e-9)
    return higher ?? candidate
  }
  return roundDecimals(
    roundStep(currentKg, stepFor(loadType, settings), 'down') + stepFor(loadType, settings),
    2,
  )
}

/** Peso reducido en `fraction` (p. ej. 0.1 = −10 %), redondeado hacia abajo y siempre menor. */
export function reducedLoadable(
  currentKg: number,
  fraction: number,
  loadType: LoadType,
  settings: LoadingSettings,
): number {
  const candidate = roundToLoadable(currentKg * (1 - fraction), loadType, settings, 'down')
  return Math.min(candidate, currentKg)
}

export interface PlateBreakdown {
  /** Discos por lado, en la unidad de los discos. */
  perSide: number[]
  unit: WeightUnit
  /** Diferencia (kg) que no se pudo completar con los discos disponibles. */
  remainderKg: number
}

/** Qué discos poner en cada lado de la barra para llegar a `totalKg`. */
export function plateBreakdown(totalKg: number, settings: LoadingSettings): PlateBreakdown | null {
  const barKg = toKg(settings.bar.value, settings.bar.unit)
  if (totalKg < barKg - 1e-9) return null
  const unitKg = toKg(1, settings.plates.unit)
  let perSide = (totalKg - barKg) / 2 / unitKg
  const plates = [...settings.plates.values].sort((a, b) => b - a)
  const result: number[] = []
  for (const plate of plates) {
    while (perSide + 1e-6 >= plate) {
      result.push(plate)
      perSide -= plate
    }
  }
  return {
    perSide: result,
    unit: settings.plates.unit,
    remainderKg: roundDecimals(perSide * unitKg * 2, 2),
  }
}
