import { BODY_FAT_CATEGORY_LABEL, bodyFatCategory, leanMassKg } from '../body/composition'
import {
  CARB_CYCLING,
  DEFICIT_BANDS,
  FAT,
  FIBER_G_PER_1000_KCAL,
  KCAL_PER_GRAM,
  KCAL_PER_KG_FAT,
  LOSS_RATE,
  PROTEIN,
  ROUNDING,
  WATER,
} from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import { fmt, fmtKg, fmtPct } from '../shared/format'
import { ceilTo, clamp, floorTo, roundDecimals, roundTo } from '../shared/math'
import type { BodyFatCategory, Sex } from '../types'

/* ───────────────────────────── Calorías ───────────────────────────── */

export interface CalorieTargetInput {
  sex: Sex
  weightKg: number
  bodyFatPct: number
  tdee: number
  bmr: number
  /** Embarazo, lactancia o historial de TCA: se come en mantenimiento. */
  noDeficit: boolean
  /** Ritmo de pérdida semanal como fracción del peso (por defecto 0.6 %). */
  targetWeeklyRate?: number
}

export interface CalorieTarget {
  kcal: number
  deficitKcal: number
  deficitPct: number
  category: BodyFatCategory
  expectedWeeklyLossKg: number
  expectedWeeklyLossPct: number
  bmrFloorApplied: boolean
  maintenance: boolean
}

function kcalForWeeklyRate(weightKg: number, rate: number): number {
  return (weightKg * rate * KCAL_PER_KG_FAT) / 7
}

export function computeCalorieTarget(input: CalorieTargetInput): Calculated<CalorieTarget> {
  const { sex, weightKg, bodyFatPct, tdee, bmr, noDeficit } = input
  const category = bodyFatCategory(sex, bodyFatPct)

  if (noDeficit) {
    const kcal = roundTo(tdee, ROUNDING.kcal)
    return calculated(
      {
        kcal,
        deficitKcal: 0,
        deficitPct: 0,
        category,
        expectedWeeklyLossKg: 0,
        expectedWeeklyLossPct: 0,
        bmrFloorApplied: false,
        maintenance: true,
      },
      {
        title: 'Tus calorías diarias',
        summary: `${fmt(kcal)} kcal: calorías de mantenimiento. Por tus respuestas de salud no aplicamos déficit; el objetivo es entrenar fuerza y comer bien.`,
        steps: [
          { label: 'Gasto total', value: `${fmt(tdee)} kcal → redondeado a ${fmt(kcal)} kcal` },
        ],
        rationale:
          'En embarazo, lactancia o con historial de trastornos alimenticios, un déficit no es seguro sin acompañamiento profesional.',
      },
    )
  }

  const band = DEFICIT_BANDS[category]
  const rate = input.targetWeeklyRate ?? LOSS_RATE.defaultTarget
  const rateDeficit = kcalForWeeklyRate(weightKg, rate)
  const fraction = clamp(rateDeficit / tdee, band.min, band.max)
  const maxDeficit = kcalForWeeklyRate(weightKg, LOSS_RATE.max)
  const deficit = Math.min(tdee * fraction, maxDeficit)

  let kcal = roundTo(tdee - deficit, ROUNDING.kcal)
  let bmrFloorApplied = false
  if (kcal < bmr) {
    kcal = ceilTo(bmr, ROUNDING.kcal)
    bmrFloorApplied = true
  }

  const deficitKcal = roundDecimals(tdee - kcal, 1)
  const deficitPct = roundDecimals((deficitKcal / tdee) * 100, 1)
  const expectedWeeklyLossKg = roundDecimals((deficitKcal * 7) / KCAL_PER_KG_FAT, 2)
  const expectedWeeklyLossPct = roundDecimals((expectedWeeklyLossKg / weightKg) * 100, 2)

  const bandText =
    band.min === band.max
      ? fmtPct(band.min * 100, 0)
      : `${fmt(band.min * 100)}–${fmtPct(band.max * 100, 0)}`

  const steps = [
    {
      label: '% de grasa',
      value: `${fmtPct(bodyFatPct)} → nivel ${BODY_FAT_CATEGORY_LABEL[category]}`,
    },
    { label: 'Déficit permitido', value: `${bandText} del gasto (prioridad: ${band.priority})` },
    {
      label: 'Ritmo objetivo',
      value: `${fmtPct(rate * 100)} del peso por semana ≈ ${fmt(rateDeficit)} kcal/día de déficit`,
    },
    { label: 'Déficit aplicado', value: `${fmt(deficitKcal)} kcal/día (${fmtPct(deficitPct)})` },
    { label: 'Resultado', value: `${fmt(tdee)} − ${fmt(deficitKcal)} ≈ ${fmt(kcal)} kcal` },
  ]
  if (bmrFloorApplied) {
    steps.push({
      label: 'Piso de seguridad',
      value: `Subimos a tu TMB (${fmt(bmr)} kcal): nunca comemos por debajo.`,
    })
  }

  return calculated(
    {
      kcal,
      deficitKcal,
      deficitPct,
      category,
      expectedWeeklyLossKg,
      expectedWeeklyLossPct,
      bmrFloorApplied,
      maintenance: false,
    },
    {
      title: 'Tus calorías diarias',
      summary: `${fmt(kcal)} kcal al día: un déficit de ${fmtPct(deficitPct)} para perder unos ${fmtKg(expectedWeeklyLossKg, 2)} por semana (${fmtPct(expectedWeeklyLossPct, 2)} de tu peso) sin sacrificar fuerza.`,
      steps,
      rationale:
        'Tu % de grasa define cuánto déficit tolera tu cuerpo sin perder músculo; el ritmo objetivo elige el punto exacto dentro de ese rango. Nunca más de 1 % del peso por semana y nunca por debajo de tu TMB.',
      reference: LOSS_RATE.reference,
    },
  )
}

/* ───────────────────────────── Macros ───────────────────────────── */

export interface MacroInput {
  kcal: number
  weightKg: number
  bodyFatPct: number
  sex: Sex
}

export interface MacroTargets {
  protein: Calculated<number>
  fat: Calculated<number>
  carbs: Calculated<number>
  /** Kcal que suman los macros redondeados. */
  kcalFromMacros: number
}

export function computeMacros({ kcal, weightKg, bodyFatPct, sex }: MacroInput): MacroTargets {
  const category = bodyFatCategory(sex, bodyFatPct)

  // Proteína
  let protein: Calculated<number>
  if (category === 'high') {
    const lean = leanMassKg(weightKg, bodyFatPct)
    const grams = roundTo(PROTEIN.perKgLeanMass * lean, ROUNDING.macroGrams)
    protein = calculated(grams, {
      title: 'Tu proteína diaria',
      summary: `${grams} g al día. Como tu % de grasa es alto, la calculamos sobre tu masa magra (${fmtKg(lean)}) para no inflar la cifra.`,
      formula: 'proteína = 2.5 g × kg de masa magra (rango 2.4–2.6)',
      steps: [
        { label: 'Cálculo', value: `2.5 × ${fmt(lean, 1)} = ${fmt(2.5 * lean)} g → ${grams} g` },
      ],
      rationale:
        'La proteína alta es lo que más protege el músculo en déficit y además quita hambre. Nunca se reduce en un ajuste.',
      reference: PROTEIN.reference,
    })
  } else {
    const grams = roundTo(PROTEIN.perKgBodyWeight * weightKg, ROUNDING.macroGrams)
    protein = calculated(grams, {
      title: 'Tu proteína diaria',
      summary: `${grams} g al día (${fmt(PROTEIN.perKgBodyWeight, 1)} g por kg de peso).`,
      formula: 'proteína = 2.2 g × kg de peso (rango 2.0–2.4)',
      steps: [
        {
          label: 'Cálculo',
          value: `2.2 × ${fmt(weightKg, 1)} = ${fmt(2.2 * weightKg)} g → ${grams} g`,
        },
      ],
      rationale:
        'En déficit, 2.0–2.4 g/kg es el rango con mejor evidencia para conservar masa muscular. Nunca se reduce en un ajuste.',
      reference: PROTEIN.reference,
    })
  }

  // Grasa
  const fatByWeight = roundTo(FAT.perKgBodyWeight * weightKg, ROUNDING.macroGrams)
  const fatFloor = (FAT.minFractionOfKcal * kcal) / KCAL_PER_GRAM.fat
  const fatGrams = fatByWeight < fatFloor ? ceilTo(fatFloor, ROUNDING.macroGrams) : fatByWeight
  const fat = calculated(fatGrams, {
    title: 'Tu grasa diaria',
    summary: `${fatGrams} g al día. La grasa es esencial para tus hormonas: nunca menos del 20 % de las calorías.`,
    formula: 'grasa = 0.8 g × kg de peso (rango 0.6–1.0), mínimo 20 % de las kcal',
    steps: [
      { label: 'Por peso', value: `0.8 × ${fmt(weightKg, 1)} = ${fmt(0.8 * weightKg)} g` },
      { label: 'Mínimo 20 %', value: `${fmt(kcal)} × 0.20 / 9 = ${fmt(fatFloor)} g` },
      { label: 'Resultado', value: `${fatGrams} g` },
    ],
    rationale:
      'Muy poca grasa afecta la testosterona y los estrógenos, que influyen en la fuerza y la recuperación.',
  })

  // Carbohidratos: el resto
  const remaining = kcal - protein.value * KCAL_PER_GRAM.protein - fatGrams * KCAL_PER_GRAM.fat
  const carbGrams = Math.max(0, floorTo(remaining / KCAL_PER_GRAM.carbs, ROUNDING.macroGrams))
  const carbs = calculated(carbGrams, {
    title: 'Tus carbohidratos diarios',
    summary: `${carbGrams} g al día: las calorías que quedan después de la proteína y la grasa. Son tu combustible para entrenar pesado.`,
    formula: 'carbos = (kcal − proteína × 4 − grasa × 9) / 4',
    steps: [
      {
        label: 'Cálculo',
        value: `(${fmt(kcal)} − ${protein.value} × 4 − ${fatGrams} × 9) / 4 = ${fmt(Math.max(0, remaining / 4))} g → ${carbGrams} g`,
      },
    ],
    rationale:
      'Los carbohidratos llenan el glucógeno muscular: con ellos rindes más en las series pesadas, que es lo que mantiene tu fuerza.',
  })

  const kcalFromMacros =
    protein.value * KCAL_PER_GRAM.protein +
    fatGrams * KCAL_PER_GRAM.fat +
    carbGrams * KCAL_PER_GRAM.carbs

  return { protein, fat, carbs, kcalFromMacros }
}

/* ───────────────────────────── Ciclado de carbos ───────────────────────────── */

export interface DayTarget {
  kcal: number
  carbs: number
}

export interface CarbCycle {
  trainingDay: DayTarget
  restDay: DayTarget
}

export interface CarbCycleInput {
  kcal: number
  carbs: number
  trainingDaysPerWeek: number
  bmr: number
}

/**
 * Más carbos en días de entreno y menos en descanso, manteniendo el promedio semanal.
 * Devuelve `null` si no tiene sentido (sin días de descanso o sin margen sobre la TMB).
 */
export function computeCarbCycle(input: CarbCycleInput): Calculated<CarbCycle> | null {
  const { kcal, carbs, trainingDaysPerWeek: trainingDays, bmr } = input
  const restDays = 7 - trainingDays
  if (trainingDays <= 0 || restDays <= 0) return null

  let reduction = roundTo(carbs * CARB_CYCLING.restDayCarbReduction, ROUNDING.macroGrams)
  const maxReduction = floorTo((kcal - bmr) / KCAL_PER_GRAM.carbs, ROUNDING.macroGrams)
  reduction = Math.min(reduction, maxReduction)
  if (reduction <= 0) return null

  const increase = roundTo((reduction * restDays) / trainingDays, ROUNDING.macroGrams)
  const restDay = { carbs: carbs - reduction, kcal: kcal - reduction * KCAL_PER_GRAM.carbs }
  const trainingDay = { carbs: carbs + increase, kcal: kcal + increase * KCAL_PER_GRAM.carbs }
  const weeklyAvg = roundDecimals(
    (trainingDay.kcal * trainingDays + restDay.kcal * restDays) / 7,
    0,
  )

  return calculated(
    { trainingDay, restDay },
    {
      title: 'Ciclado de carbohidratos',
      summary: `Días de entreno: ${trainingDay.carbs} g de carbos (${fmt(trainingDay.kcal)} kcal). Días de descanso: ${restDay.carbs} g (${fmt(restDay.kcal)} kcal). El promedio semanal se mantiene en ~${fmt(weeklyAvg)} kcal.`,
      steps: [
        { label: 'Descanso', value: `−${reduction} g de carbos × ${restDays} días` },
        { label: 'Entreno', value: `+${increase} g de carbos × ${trainingDays} días` },
      ],
      rationale:
        'Pones la energía donde rinde más (las sesiones pesadas) sin cambiar el déficit semanal. La proteína y la grasa no cambian.',
    },
  )
}

/* ───────────────────────────── Fibra y agua ───────────────────────────── */

export function computeFiber(kcal: number): Calculated<number> {
  const grams = Math.round((FIBER_G_PER_1000_KCAL * kcal) / 1000)
  return calculated(grams, {
    title: 'Tu fibra diaria',
    summary: `${grams} g al día: 14 g por cada 1000 kcal.`,
    formula: 'fibra = 14 g × kcal / 1000',
    steps: [{ label: 'Cálculo', value: `14 × ${fmt(kcal)} / 1000 = ${grams} g` }],
    rationale: 'La fibra mejora la saciedad y la digestión, dos aliados clave en déficit.',
    reference: 'Institute of Medicine. Dietary Reference Intakes, 2005.',
  })
}

export interface WaterTarget {
  baseMl: number
  trainingDayMl: number
  extraRangeMl: [number, number]
}

export function computeWater(weightKg: number, sessionMinutes: number): Calculated<WaterTarget> {
  const hours = sessionMinutes / 60
  const [low, high] = WATER.extraMlPerTrainingHour
  const baseMl = roundTo(WATER.mlPerKg * weightKg, WATER.roundingMl)
  const extra = roundTo(((low + high) / 2) * hours, WATER.roundingMl)
  const extraRangeMl: [number, number] = [
    roundTo(low * hours, WATER.roundingMl),
    roundTo(high * hours, WATER.roundingMl),
  ]
  return calculated(
    { baseMl, trainingDayMl: baseMl + extra, extraRangeMl },
    {
      title: 'Tu agua diaria',
      summary: `${fmt(baseMl / 1000, 2)} L al día, y unos ${fmt((baseMl + extra) / 1000, 2)} L los días de entreno.`,
      formula: 'agua = 35 ml × kg + 500–750 ml por hora de entreno',
      steps: [
        { label: 'Base', value: `35 × ${fmt(weightKg, 1)} = ${fmt(baseMl)} ml` },
        {
          label: 'Entreno',
          value: `${fmt(extraRangeMl[0])}–${fmt(extraRangeMl[1])} ml por ${fmt(sessionMinutes)} min`,
        },
      ],
      rationale: 'Una deshidratación de solo 2 % ya reduce la fuerza y el rendimiento.',
    },
  )
}
