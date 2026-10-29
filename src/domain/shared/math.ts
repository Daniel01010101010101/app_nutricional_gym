/** Elimina el ruido de coma flotante (p. ej. 2.4999999 → 2.5). */
export function roundDecimals(value: number, decimals = 6): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Redondea al múltiplo más cercano de `step`. */
export function roundTo(value: number, step: number): number {
  return roundDecimals(Math.round(value / step) * step)
}

export function floorTo(value: number, step: number): number {
  return roundDecimals(Math.floor(roundDecimals(value / step)) * step)
}

export function ceilTo(value: number, step: number): number {
  return roundDecimals(Math.ceil(roundDecimals(value / step)) * step)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function sum(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}

/** Promedio aritmético; `null` si no hay valores. */
export function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length
}

/** Cambio porcentual de `from` a `to`. */
export function percentChange(from: number, to: number): number {
  return ((to - from) / from) * 100
}

/** Promedio móvil simple de ventana `window` (incluye el valor actual). */
export function movingAverage(values: readonly number[], window: number): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1)
    return sum(slice) / slice.length
  })
}

/** Generador pseudoaleatorio determinista (mulberry32) para planes reproducibles. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash simple y estable de un texto a entero de 32 bits. */
export function hashString(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
