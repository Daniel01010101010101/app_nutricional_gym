import { KCAL_PER_GRAM } from '../constants/formulas'
import { calculated, type Calculated, type ExplanationStep } from '../shared/explanation'
import { fmt } from '../shared/format'
import type { Macros } from '../types'
import type { CarbCycle } from './targets'

/** Objetivos base guardados (los mismos que se muestran en el perfil). */
export interface BaseTargets extends Macros {
  fiber: number
  waterMl: number
  waterTrainingMl: number
  /** Carbos extra en días de entreno (p. ej. por una alerta de pérdida de fuerza). */
  trainingDayBonusCarbs: number
  carbCycle: CarbCycle | null
}

export interface DayTargets extends Macros {
  fiber: number
  waterMl: number
  isTrainingDay: boolean
}

/**
 * Objetivo de un día concreto: con ciclado de carbos cambian los carbos (y las kcal) entre
 * días de entreno y de descanso; la proteína y la grasa son las mismas todos los días.
 */
export function targetsForDay(base: BaseTargets, isTrainingDay: boolean): Calculated<DayTargets> {
  const cycleDay = base.carbCycle
    ? isTrainingDay
      ? base.carbCycle.trainingDay
      : base.carbCycle.restDay
    : null
  const bonus = isTrainingDay ? base.trainingDayBonusCarbs : 0
  const carbs = (cycleDay?.carbs ?? base.carbs) + bonus
  const kcal = (cycleDay?.kcal ?? base.kcal) + bonus * KCAL_PER_GRAM.carbs
  const label = isTrainingDay ? 'Día de entreno' : 'Día de descanso'

  const steps: ExplanationStep[] = [
    { label: 'Base', value: `${fmt(base.kcal)} kcal · ${base.carbs} g de carbos` },
  ]
  if (cycleDay) {
    steps.push({
      label: 'Ciclado',
      value: `${cycleDay.carbs} g de carbos · ${fmt(cycleDay.kcal)} kcal`,
    })
  }
  if (bonus > 0) {
    steps.push({
      label: 'Protección de fuerza',
      value: `+${bonus} g de carbos (+${fmt(bonus * KCAL_PER_GRAM.carbs)} kcal)`,
    })
  }
  steps.push({
    label: 'Hoy',
    value: `${fmt(kcal)} kcal · P ${base.protein} g · C ${carbs} g · G ${base.fat} g`,
  })

  const summary = cycleDay
    ? `${label}: ${fmt(kcal)} kcal con ${carbs} g de carbos. Más carbos los días que entrenas y menos los de descanso; el promedio de la semana no cambia.`
    : `${label}: ${fmt(kcal)} kcal. Tu objetivo es el mismo todos los días${bonus > 0 ? ', con un extra de carbos cuando entrenas' : ''}.`

  return calculated(
    {
      kcal,
      protein: base.protein,
      carbs,
      fat: base.fat,
      fiber: base.fiber,
      waterMl: isTrainingDay ? base.waterTrainingMl : base.waterMl,
      isTrainingDay,
    },
    {
      title: 'Objetivo de hoy',
      summary,
      steps,
      ...(bonus > 0
        ? {
            rationale:
              'Tu fuerza bajó en las últimas semanas: unos carbos extra en los días de entreno ayudan a sostener el rendimiento sin frenar la pérdida de grasa.',
          }
        : {}),
    },
  )
}
