import {
  ACTIVITY_LEVELS,
  ACTIVITY_SCORING,
  KATCH_MCARDLE,
  MIFFLIN,
  type ActivityLevel,
  type ActivityLevelId,
} from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import { fmt, fmtKg, fmtPct } from '../shared/format'
import { roundDecimals } from '../shared/math'
import type { JobType, Sex } from '../types'

export interface MifflinInput {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
}

/** TMB de Mifflin-St Jeor en kcal/día. */
export function bmrMifflin({ sex, weightKg, heightCm, age }: MifflinInput): number {
  const offset = sex === 'male' ? MIFFLIN.maleOffset : MIFFLIN.femaleOffset
  return roundDecimals(
    MIFFLIN.weight * weightKg + MIFFLIN.height * heightCm - MIFFLIN.age * age + offset,
    2,
  )
}

/** TMB de Katch-McArdle en kcal/día. */
export function bmrKatch(leanMassKg: number): number {
  return roundDecimals(KATCH_MCARDLE.base + KATCH_MCARDLE.perKgLeanMass * leanMassKg, 2)
}

export interface BmrInput extends MifflinInput {
  /** % de grasa medido de forma fiable (DEXA, BodPod, plicometría o bioimpedancia profesional). */
  reliableBodyFatPct?: number
}

export function computeBmr(input: BmrInput): Calculated<number> {
  if (input.reliableBodyFatPct !== undefined) {
    const lean = roundDecimals(input.weightKg * (1 - input.reliableBodyFatPct / 100), 1)
    const value = bmrKatch(lean)
    return calculated(value, {
      title: 'Tu metabolismo basal (TMB)',
      summary: `Lo que gasta tu cuerpo en reposo total: ${fmt(value)} kcal/día. Como tu % de grasa viene de una medición fiable, usamos Katch-McArdle, que parte de tu masa magra.`,
      formula: 'TMB = 370 + 21.6 × masa magra (kg)',
      steps: [
        {
          label: 'Masa magra',
          value: `${fmt(input.weightKg, 1)} × (1 − ${fmtPct(input.reliableBodyFatPct)}) = ${fmtKg(lean)}`,
        },
        { label: 'Cálculo', value: `370 + 21.6 × ${fmt(lean, 1)} = ${fmt(value, 1)} kcal` },
      ],
      rationale:
        'Con composición corporal conocida, Katch-McArdle es más precisa porque el músculo gasta más energía que la grasa.',
      reference: KATCH_MCARDLE.reference,
    })
  }

  const value = bmrMifflin(input)
  const sign = input.sex === 'male' ? '+ 5' : '− 161'
  return calculated(value, {
    title: 'Tu metabolismo basal (TMB)',
    summary: `Lo que gasta tu cuerpo en reposo total: ${fmt(value, 1)} kcal/día, calculado con Mifflin-St Jeor.`,
    formula: `TMB = 10 × peso + 6.25 × altura − 5 × edad ${sign}`,
    steps: [
      {
        label: 'Cálculo',
        value: `10 × ${fmt(input.weightKg, 1)} + 6.25 × ${fmt(input.heightCm, 1)} − 5 × ${input.age} ${sign} = ${fmt(value, 1)} kcal`,
      },
    ],
    rationale:
      'Es la ecuación predictiva más precisa para adultos cuando no hay una medición fiable de composición corporal.',
    reference: MIFFLIN.reference,
  })
}

export interface ActivityInput {
  jobType: JobType
  avgSteps: number
  trainingDaysPerWeek: number
}

function scoreFromTable(value: number, table: readonly (readonly [number, number])[]): number {
  for (const [threshold, points] of table) {
    if (value >= threshold) return points
  }
  return 0
}

export function getActivityLevel(id: ActivityLevelId): ActivityLevel {
  return ACTIVITY_LEVELS.find((level) => level.id === id) as ActivityLevel
}

const JOB_LABEL: Record<JobType, string> = {
  sedentary: 'trabajo sentado',
  standing: 'trabajo de pie / en movimiento',
  physical: 'trabajo físico',
}

/** Elige el factor de actividad combinando vida diaria y entrenamiento (matriz conservadora). */
export function chooseActivityLevel(input: ActivityInput): Calculated<ActivityLevel> {
  const jobPoints = ACTIVITY_SCORING.job[input.jobType]
  const stepPoints = scoreFromTable(input.avgSteps, ACTIVITY_SCORING.steps)
  const dailyPoints = Math.max(jobPoints, stepPoints)
  const trainingPoints = scoreFromTable(input.trainingDaysPerWeek, ACTIVITY_SCORING.trainingDays)
  const total = dailyPoints + trainingPoints

  const levelId = (
    ACTIVITY_SCORING.levels.find(([min]) => total >= min) as readonly [number, ActivityLevelId]
  )[1]
  const level = getActivityLevel(levelId)

  return calculated(level, {
    title: 'Tu nivel de actividad',
    summary: `${level.label} (× ${fmt(level.factor, 3)}): ${level.description}`,
    steps: [
      {
        label: 'Vida diaria',
        value: `${JOB_LABEL[input.jobType]}, ~${fmt(input.avgSteps)} pasos → ${fmt(dailyPoints, 1)} pts`,
      },
      {
        label: 'Entrenamiento',
        value: `${input.trainingDaysPerWeek} días/semana → ${fmt(trainingPoints, 1)} pts`,
      },
      { label: 'Total', value: `${fmt(total, 1)} pts → ${level.label}` },
    ],
    rationale:
      'La matriz es conservadora a propósito: sobrestimar el gasto es el error más común. Si tu peso no se mueve como esperamos, el check-in semanal lo corrige con tus datos reales.',
  })
}

/** Gasto energético total diario = TMB × factor de actividad. */
export function computeTdee(bmr: number, level: ActivityLevel): Calculated<number> {
  const value = roundDecimals(bmr * level.factor, 1)
  return calculated(value, {
    title: 'Tu gasto total diario',
    summary: `Lo que gastas en un día normal contando trabajo, pasos y entrenos: unas ${fmt(value)} kcal. Comer esto te mantendría en tu peso.`,
    formula: 'Gasto total = TMB × factor de actividad',
    steps: [
      { label: 'Cálculo', value: `${fmt(bmr, 1)} × ${fmt(level.factor, 3)} = ${fmt(value)} kcal` },
    ],
    rationale: 'Es tu punto de mantenimiento. El déficit se calcula a partir de aquí.',
  })
}
