import { BODY_FAT_BANDS, RELIABLE_BODY_FAT_METHODS } from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import { fmt, fmtKg, fmtPct } from '../shared/format'
import { roundDecimals } from '../shared/math'
import type { BodyFatCategory, BodyFatMethod, Sex } from '../types'

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return roundDecimals(weightKg * (1 - bodyFatPct / 100), 1)
}

export function fatMassKg(weightKg: number, bodyFatPct: number): number {
  return roundDecimals(weightKg * (bodyFatPct / 100), 1)
}

export function isReliableBodyFatMethod(method: BodyFatMethod): boolean {
  return (RELIABLE_BODY_FAT_METHODS as readonly string[]).includes(method)
}

export function bodyFatCategory(sex: Sex, bodyFatPct: number): BodyFatCategory {
  const band = BODY_FAT_BANDS[sex]
  if (bodyFatPct < band.leanBelow) return 'lean'
  if (bodyFatPct > band.highAbove) return 'high'
  return 'moderate'
}

export const BODY_FAT_CATEGORY_LABEL: Record<BodyFatCategory, string> = {
  lean: 'bajo',
  moderate: 'moderado',
  high: 'alto',
}

export function explainLeanMass(weightKg: number, bodyFatPct: number): Calculated<number> {
  const lean = leanMassKg(weightKg, bodyFatPct)
  return calculated(lean, {
    title: 'Tu masa magra',
    summary: `Todo lo que no es grasa: músculo, huesos, órganos y agua. Con ${fmtPct(bodyFatPct)} de grasa son ${fmtKg(lean)}.`,
    formula: 'masa magra = peso × (1 − % grasa / 100)',
    steps: [
      { label: 'Peso', value: fmtKg(weightKg) },
      { label: '% de grasa', value: fmtPct(bodyFatPct) },
      {
        label: 'Cálculo',
        value: `${fmt(weightKg, 1)} × (1 − ${fmt(bodyFatPct, 1)} / 100) = ${fmtKg(lean)}`,
      },
    ],
    rationale:
      'La masa magra es la que queremos proteger durante el déficit: por eso la proteína y el entrenamiento de fuerza son la prioridad.',
  })
}
