import { US_NAVY } from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import { fmt, fmtPct } from '../shared/format'
import { roundDecimals } from '../shared/math'
import type { Sex } from '../types'

export interface NavyInput {
  sex: Sex
  heightCm: number
  neckCm: number
  waistCm: number
  /** Obligatoria para mujeres. */
  hipCm?: number
}

export class MeasurementError extends RangeError {
  constructor(message: string) {
    super(message)
    this.name = 'MeasurementError'
  }
}

/**
 * Estima el % de grasa con las fórmulas de la Marina de EE. UU. (medidas en cm).
 * Lanza `MeasurementError` si las medidas no son coherentes.
 */
export function estimateBodyFatNavy(input: NavyInput): Calculated<number> {
  const { sex, heightCm, neckCm, waistCm, hipCm } = input
  let raw: number
  let formula: string
  let circumference: number

  if (sex === 'male') {
    circumference = waistCm - neckCm
    if (circumference <= 0) {
      throw new MeasurementError('La cintura debe ser mayor que el cuello.')
    }
    const k = US_NAVY.male
    raw =
      US_NAVY.numerator / (k.a - k.b * Math.log10(circumference) + k.c * Math.log10(heightCm)) -
      US_NAVY.offset
    formula = '495 / (1.0324 − 0.19077 × log10(cintura − cuello) + 0.15456 × log10(altura)) − 450'
  } else {
    if (hipCm === undefined) {
      throw new MeasurementError('Para mujeres la fórmula necesita la medida de cadera.')
    }
    circumference = waistCm + hipCm - neckCm
    if (circumference <= 0) {
      throw new MeasurementError('Cintura + cadera debe ser mayor que el cuello.')
    }
    const k = US_NAVY.female
    raw =
      US_NAVY.numerator / (k.a - k.b * Math.log10(circumference) + k.c * Math.log10(heightCm)) -
      US_NAVY.offset
    formula =
      '495 / (1.29579 − 0.35004 × log10(cintura + cadera − cuello) + 0.22100 × log10(altura)) − 450'
  }

  const [min, max] = US_NAVY.plausibleRange
  if (!Number.isFinite(raw) || raw < min || raw > max) {
    throw new MeasurementError(
      'Las medidas no dan un valor realista. Revisa que estén en centímetros y tomadas como indica la guía.',
    )
  }

  const value = roundDecimals(raw, 1)
  return calculated(value, {
    title: 'Tu % de grasa estimado',
    summary: `Con tus medidas, la fórmula de la Marina de EE. UU. estima ${fmtPct(value)} de grasa corporal. Es una estimación (±3–4 %); lo importante es su tendencia en el tiempo.`,
    formula,
    steps: [
      { label: 'Altura', value: `${fmt(heightCm, 1)} cm` },
      { label: 'Cuello', value: `${fmt(neckCm, 1)} cm` },
      { label: 'Cintura', value: `${fmt(waistCm, 1)} cm` },
      ...(sex === 'female' && hipCm !== undefined
        ? [{ label: 'Cadera', value: `${fmt(hipCm, 1)} cm` }]
        : []),
      { label: 'Resultado', value: fmtPct(value) },
    ],
    rationale:
      'Se usa para elegir el tamaño del déficit y la proteína. No se usa para la TMB porque su margen de error es mayor que el de una medición profesional.',
    reference: US_NAVY.reference,
  })
}
