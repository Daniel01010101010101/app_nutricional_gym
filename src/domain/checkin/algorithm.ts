import { CHECKIN, KCAL_PER_GRAM, ROUNDING, STRENGTH_TREND } from '../constants/formulas'
import type { TrendState } from '../progression/strength'
import { calculated, type Calculated } from '../shared/explanation'
import { fmt } from '../shared/format'
import { ceilTo, clamp, floorTo, roundTo } from '../shared/math'

export interface TargetValues {
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** Carbos extra (g) solo en días de entreno, p. ej. por la regla de protección de fuerza. */
  trainingDayBonusCarbs: number
}

export interface Wellbeing {
  sleep: number
  stress: number
  hunger: number
  energy: number
}

export interface CheckinInput {
  noDeficit: boolean
  nutritionAdherencePct: number
  trainingAdherencePct: number
  /** Cambio del peso promedio de esta semana frente a la anterior (%); negativo = pérdida. */
  weeklyChangePct: number | null
  /** El mismo cambio, de la semana anterior. */
  previousWeeklyChangePct: number | null
  /** Cambio de cintura frente al check-in anterior (cm). */
  waistChangeCm: number | null
  strengthAlert: boolean
  strengthTrend: TrendState
  targets: TargetValues
  bmr: number
  wellbeing: Wellbeing
  deloadDue: boolean
}

export type RecommendationType =
  | 'safety-maintenance'
  | 'low-adherence'
  | 'protect-strength'
  | 'insufficient-data'
  | 'increase-kcal'
  | 'recomp-success'
  | 'decrease-kcal'
  | 'bmr-floor'
  | 'keep'

export interface Recommendation {
  type: RecommendationType
  /** Cambio diario de kcal (todos los días). */
  kcalDelta: number
  /** Carbos extra (g) solo en días de entreno. */
  trainingDayCarbsDelta: number
  /** ¿Hay un cambio de objetivos para aplicar? */
  actionable: boolean
  notes: string[]
}

/** Tamaño del ajuste: 5 % de las kcal, acotado a 100–150 y redondeado a 25. */
export function adjustmentSize(kcal: number): number {
  const [min, max] = CHECKIN.adjustmentRange
  return clamp(roundTo(kcal * CHECKIN.adjustmentFraction, ROUNDING.kcal), min, max)
}

function wellbeingNotes(w: Wellbeing): string[] {
  const notes: string[] = []
  if (w.sleep <= 2)
    notes.push(
      'Dormiste mal esta semana: el sueño es tu mejor quemador de grasa y protector de fuerza. Apunta a 7–9 h.',
    )
  if (w.stress >= 4)
    notes.push(
      'Estrés alto: puede retener líquidos y ocultar la pérdida de grasa en la báscula. Caminar y dormir ayudan.',
    )
  if (w.hunger >= 4)
    notes.push(
      'Hambre alta: reparte la proteína en todas las comidas, suma verduras y fruta entera, y bebe agua antes de comer.',
    )
  if (w.energy <= 2)
    notes.push('Energía baja: concentra tus carbohidratos antes y después de entrenar.')
  return notes
}

const fmtChange = (pct: number) => `${pct > 0 ? '+' : ''}${fmt(pct, 2)} %`

/**
 * Algoritmo del check-in semanal. Orden de prioridad:
 * seguridad → adherencia < 80 % → fuerza bajando → datos insuficientes → pérdida > 1 %/sem →
 * recomposición exitosa → estancamiento 2 semanas → mantener.
 */
export function evaluateCheckin(input: CheckinInput): Calculated<Recommendation> {
  const notes = wellbeingNotes(input.wellbeing)
  if (input.deloadDue) notes.push('Toca semana de descarga: mismos pesos, la mitad de las series.')
  const adj = adjustmentSize(input.targets.kcal)
  const base = { kcalDelta: 0, trainingDayCarbsDelta: 0, actionable: false }

  if (input.noDeficit) {
    return calculated(
      { type: 'safety-maintenance', ...base, notes },
      {
        title: 'Mantenimiento por salud',
        summary:
          'Por tus respuestas de salud seguimos en calorías de mantenimiento. Enfócate en entrenar fuerza, dormir bien y comer variado.',
        rationale: 'No aplicamos déficit sin acompañamiento profesional en tu situación.',
      },
    )
  }

  if (input.nutritionAdherencePct < CHECKIN.adherenceThresholdPct) {
    if (input.strengthAlert)
      notes.push(
        'Además tu fuerza está bajando: no recortes calorías y prioriza llegar a tu proteína.',
      )
    return calculated(
      { type: 'low-adherence', ...base, notes },
      {
        title: 'Primero, la adherencia',
        summary: `Cumpliste el plan ${fmt(input.nutritionAdherencePct)} % de los días (meta: 80 %). No cambiamos las calorías: con más días dentro del plan veremos qué funciona de verdad.`,
        steps: [
          { label: 'Adherencia nutricional', value: `${fmt(input.nutritionAdherencePct)} %` },
          { label: 'Adherencia al entreno', value: `${fmt(input.trainingAdherencePct)} %` },
        ],
        rationale:
          'Si el plan no se cumple, cambiar los números no arregla nada. Ideas: prepara las comidas con anticipación, usa "Copiar ayer" y ten snacks altos en proteína a mano.',
      },
    )
  }

  if (input.strengthAlert) {
    const carbs = roundTo(
      STRENGTH_TREND.trainingDayKcalBoost / KCAL_PER_GRAM.carbs,
      ROUNDING.macroGrams,
    )
    return calculated(
      {
        type: 'protect-strength',
        kcalDelta: 0,
        trainingDayCarbsDelta: carbs,
        actionable: true,
        notes,
      },
      {
        title: 'Protege tu fuerza',
        summary: `Tu 1RM estimado cae más de 5 % en varios básicos. No bajamos calorías: sumamos ${carbs} g de carbos (~${STRENGTH_TREND.trainingDayKcalBoost} kcal) los días de entreno.`,
        steps: [
          { label: '1', value: 'No bajar más las calorías.' },
          { label: '2', value: `+${carbs} g de carbos en días de entreno.` },
          { label: '3', value: 'Revisar sueño y proteína.' },
          { label: '4', value: 'Considerar una semana de descarga.' },
        ],
        rationale:
          'Si la fuerza cae, la recuperación no alcanza: recortar más aceleraría la pérdida de músculo.',
      },
    )
  }

  if (input.weeklyChangePct === null) {
    return calculated(
      { type: 'insufficient-data', ...base, notes },
      {
        title: 'Necesitamos más datos',
        summary:
          'Para ajustar necesitamos el promedio de peso de dos semanas seguidas. Pésate al menos 4 días por semana, en ayunas.',
        rationale:
          'El peso diario varía 1–2 kg por agua y comida; solo los promedios semanales muestran la tendencia real.',
      },
    )
  }

  const change = input.weeklyChangePct
  const changeStep = { label: 'Cambio semanal', value: fmtChange(change) }

  if (change < -CHECKIN.fastWeeklyLossPct) {
    return calculated(
      { type: 'increase-kcal', kcalDelta: adj, trainingDayCarbsDelta: 0, actionable: true, notes },
      {
        title: 'Vas demasiado rápido',
        summary: `Perdiste ${fmt(-change, 2)} % de tu peso esta semana (más de 1 %). Subimos ${adj} kcal (de carbohidratos) para proteger tu músculo y tu fuerza.`,
        steps: [changeStep, { label: 'Ajuste', value: `+${adj} kcal/día` }],
        rationale: 'Perder más de 1 % por semana aumenta el riesgo de perder músculo y fuerza.',
      },
    )
  }

  const stable = Math.abs(change) <= CHECKIN.recompStableBandPct
  if (
    input.waistChangeCm !== null &&
    input.waistChangeCm < 0 &&
    stable &&
    input.strengthTrend === 'up'
  ) {
    return calculated(
      { type: 'recomp-success', ...base, notes },
      {
        title: '¡Recomposición en marcha!',
        summary: `Tu cintura bajó ${fmt(-input.waistChangeCm, 1)} cm, tu peso se mantiene y tu fuerza sube: estás perdiendo grasa y ganando músculo. No cambiamos nada.`,
        steps: [
          changeStep,
          { label: 'Cintura', value: `${fmt(input.waistChangeCm, 1)} cm` },
          { label: 'Fuerza', value: 'Subiendo' },
        ],
        rationale:
          'Cuando el músculo compensa la grasa perdida, la báscula engaña: la cintura y la fuerza cuentan la historia real.',
      },
    )
  }

  const stalled = change > -CHECKIN.stallWeeklyLossPct
  const previousStalled =
    input.previousWeeklyChangePct !== null &&
    input.previousWeeklyChangePct > -CHECKIN.stallWeeklyLossPct

  if (stalled && previousStalled) {
    const floor = ceilTo(input.bmr, ROUNDING.kcal)
    const room = input.targets.kcal - floor
    if (room < CHECKIN.adjustmentRange[0]) {
      notes.push('Suma 2.000 pasos diarios o una sesión más de cardio suave.')
      return calculated(
        { type: 'bmr-floor', ...base, notes },
        {
          title: 'Sin recorte: estás en tu piso',
          summary: `Dos semanas sin bajar, pero tus calorías ya están cerca de tu TMB (${fmt(floor)} kcal). En lugar de comer menos, muévete más.`,
          steps: [changeStep],
          rationale:
            'Comer por debajo de tu metabolismo basal compromete la fuerza, las hormonas y la adherencia.',
        },
      )
    }
    const cut = Math.min(adj, floorTo(room, ROUNDING.kcal))
    return calculated(
      { type: 'decrease-kcal', kcalDelta: -cut, trainingDayCarbsDelta: 0, actionable: true, notes },
      {
        title: 'Pequeño ajuste',
        summary: `Dos semanas perdiendo menos de 0,25 % por semana con buena adherencia. Bajamos ${cut} kcal (de carbohidratos o grasas, nunca de proteína).`,
        steps: [
          changeStep,
          { label: 'Semana anterior', value: fmtChange(input.previousWeeklyChangePct as number) },
          { label: 'Ajuste', value: `−${cut} kcal/día` },
        ],
        rationale:
          'Un recorte pequeño reactiva la pérdida sin afectar el rendimiento. Los recortes grandes suelen costar fuerza y adherencia.',
      },
    )
  }

  if (stalled)
    notes.push(
      'Esta semana el peso casi no bajó. Si se repite la próxima, haremos un pequeño ajuste.',
    )
  return calculated(
    { type: 'keep', ...base, notes },
    {
      title: 'Vas por buen camino',
      summary: `Cambio semanal de ${fmtChange(change)}. Mantén el plan: la constancia es lo que da resultados.`,
      steps: [changeStep],
      rationale: 'El ritmo objetivo es perder 0,5–1 % por semana sin perder fuerza.',
    },
  )
}

export interface MacroFloors {
  /** Grasa mínima en gramos (0,6 g/kg o 20 % de las kcal, lo mayor). */
  fatMin: number
}

/** Aplica una recomendación: la proteína nunca cambia; los recortes salen de carbos y luego de grasa. */
export function applyRecommendation(
  targets: TargetValues,
  rec: Recommendation,
  floors: MacroFloors,
): TargetValues {
  if (!rec.actionable) return targets
  let carbs = targets.carbs
  let fat = targets.fat

  if (rec.kcalDelta > 0) {
    carbs += roundTo(rec.kcalDelta / KCAL_PER_GRAM.carbs, ROUNDING.macroGrams)
  } else if (rec.kcalDelta < 0) {
    let toRemove = -rec.kcalDelta
    const minCarbs = 100
    const fromCarbs = Math.min(toRemove, Math.max(0, carbs - minCarbs) * KCAL_PER_GRAM.carbs)
    carbs -= roundTo(fromCarbs / KCAL_PER_GRAM.carbs, ROUNDING.macroGrams)
    toRemove -= fromCarbs
    if (toRemove > 0) {
      const fromFat = Math.min(toRemove, Math.max(0, fat - floors.fatMin) * KCAL_PER_GRAM.fat)
      fat -= roundTo(fromFat / KCAL_PER_GRAM.fat, ROUNDING.macroGrams)
      toRemove -= fromFat
    }
    if (toRemove > 0)
      carbs = Math.max(0, carbs - roundTo(toRemove / KCAL_PER_GRAM.carbs, ROUNDING.macroGrams))
  }

  return {
    kcal: roundTo(targets.kcal + rec.kcalDelta, ROUNDING.kcal),
    protein: targets.protein,
    carbs,
    fat,
    trainingDayBonusCarbs: targets.trainingDayBonusCarbs + rec.trainingDayCarbsDelta,
  }
}
