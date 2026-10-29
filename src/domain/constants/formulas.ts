/**
 * Constantes de TODAS las fórmulas y reglas de FORJA, en un solo lugar.
 * Cada bloque indica su fuente. Si cambias un valor aquí, cambia en toda la app
 * (cálculos, explicaciones "¿Por qué?" y tests).
 */

/* ───────────────────────────── Energía ───────────────────────────── */

/**
 * Mifflin-St Jeor (1990). TMB = 10·peso + 6.25·altura − 5·edad + s; s = +5 hombre, −161 mujer.
 * Es la ecuación predictiva más precisa en adultos sin medición de composición corporal.
 */
export const MIFFLIN = {
  weight: 10,
  height: 6.25,
  age: 5,
  maleOffset: 5,
  femaleOffset: -161,
  reference: 'Mifflin MD et al. Am J Clin Nutr. 1990;51(2):241-7.',
} as const

/** Katch-McArdle: TMB = 370 + 21.6 × masa magra (kg). Requiere % de grasa medido de forma fiable. */
export const KATCH_MCARDLE = {
  base: 370,
  perKgLeanMass: 21.6,
  reference: 'McArdle WD, Katch FI, Katch VL. Exercise Physiology.',
} as const

/** Métodos de % de grasa considerados fiables para usar Katch-McArdle. */
export const RELIABLE_BODY_FAT_METHODS = ['dexa', 'bodpod', 'skinfold-pro', 'bia-pro'] as const

export type ActivityLevelId = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'

export interface ActivityLevel {
  id: ActivityLevelId
  factor: number
  label: string
  description: string
}

/** Factores de actividad clásicos (FAO/OMS, Harris-Benedict revisado). */
export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  {
    id: 'sedentary',
    factor: 1.2,
    label: 'Sedentario',
    description: 'Trabajo sentado, menos de 5.000 pasos y poco o ningún entrenamiento.',
  },
  {
    id: 'light',
    factor: 1.375,
    label: 'Ligero',
    description: 'Algo de movimiento diario o 1–3 entrenamientos por semana.',
  },
  {
    id: 'moderate',
    factor: 1.55,
    label: 'Moderado',
    description: 'Entrenas 3–5 días por semana y te mueves con regularidad.',
  },
  {
    id: 'active',
    factor: 1.725,
    label: 'Activo',
    description: 'Entrenas casi a diario y das muchos pasos o tu trabajo es de pie.',
  },
  {
    id: 'very-active',
    factor: 1.9,
    label: 'Muy activo',
    description: 'Trabajo físico pesado más entrenamiento frecuente.',
  },
]

/**
 * Matriz para elegir el nivel de actividad. Es deliberadamente conservadora:
 * sobrestimar el gasto es el error más común y el check-in semanal corrige con datos reales.
 * Puntaje diario = máximo entre trabajo y pasos. Puntaje total = diario + entrenamiento.
 */
export const ACTIVITY_SCORING = {
  job: { sedentary: 0, standing: 1, physical: 2 },
  /** [pasos mínimos, puntos] ordenado de mayor a menor. */
  steps: [
    [12500, 2],
    [10000, 1.5],
    [7500, 1],
    [5000, 0.5],
    [0, 0],
  ],
  /** [días mínimos, puntos] ordenado de mayor a menor. */
  trainingDays: [
    [6, 2],
    [4, 1.5],
    [3, 1],
    [1, 0.5],
    [0, 0],
  ],
  /** [puntaje mínimo, nivel] ordenado de mayor a menor. */
  levels: [
    [3.5, 'very-active'],
    [3, 'active'],
    [2, 'moderate'],
    [1, 'light'],
    [0, 'sedentary'],
  ],
} as const

/* ─────────────────────────── Composición corporal ─────────────────────────── */

/** Fórmulas US Navy (Hodgdon & Beckett, 1984), medidas en cm. */
export const US_NAVY = {
  male: { a: 1.0324, b: 0.19077, c: 0.15456 },
  female: { a: 1.29579, b: 0.35004, c: 0.221 },
  numerator: 495,
  offset: 450,
  plausibleRange: [2, 75],
  reference: 'Hodgdon JA, Beckett MB. Naval Health Research Center, 1984.',
} as const

/** Bandas de % de grasa que determinan la agresividad del déficit. */
export const BODY_FAT_BANDS = {
  male: { leanBelow: 15, highAbove: 25 },
  female: { leanBelow: 23, highAbove: 32 },
} as const

/* ───────────────────────────── Déficit ───────────────────────────── */

/** Rango de déficit (fracción del gasto total) según la banda de % de grasa. */
export const DEFICIT_BANDS = {
  lean: { min: 0.1, max: 0.1, priority: 'preservar fuerza y masa muscular' },
  moderate: { min: 0.15, max: 0.2, priority: 'perder grasa a ritmo sostenible' },
  high: {
    min: 0.2,
    max: 0.25,
    priority: 'aprovechar las reservas de grasa sin comprometer el rendimiento',
  },
} as const

/** Ritmo de pérdida semanal como fracción del peso corporal. */
export const LOSS_RATE = {
  defaultTarget: 0.006,
  targetRange: [0.005, 0.007],
  max: 0.01,
  reference: 'Helms ER et al. J Int Soc Sports Nutr. 2014;11:20.',
} as const

/** Energía aproximada de 1 kg de tejido adiposo. Es una aproximación: el check-in la corrige. */
export const KCAL_PER_KG_FAT = 7700

/* ───────────────────────────── Macronutrientes ───────────────────────────── */

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const

export const PROTEIN = {
  perKgBodyWeight: 2.2,
  perKgBodyWeightRange: [2.0, 2.4],
  /** Con % de grasa alto se calcula sobre masa magra para no inflar la cifra. */
  perKgLeanMass: 2.5,
  perKgLeanMassRange: [2.4, 2.6],
  reference:
    'Morton RW et al. Br J Sports Med. 2018;52:376-384; Helms ER et al. Int J Sport Nutr Exerc Metab. 2014.',
} as const

export const FAT = {
  perKgBodyWeight: 0.8,
  perKgRange: [0.6, 1.0],
  minFractionOfKcal: 0.2,
} as const

/** Ciclado de carbohidratos: en días de descanso se recorta esta fracción de los carbos base. */
export const CARB_CYCLING = {
  restDayCarbReduction: 0.25,
} as const

export const FIBER_G_PER_1000_KCAL = 14

export const WATER = {
  mlPerKg: 35,
  extraMlPerTrainingHour: [500, 750],
  roundingMl: 50,
} as const

export const ROUNDING = {
  kcal: 25,
  macroGrams: 5,
} as const

/* ───────────────────────────── Entrenamiento ───────────────────────────── */

export const TRAINING_DAYS = {
  minimumEffective: 3,
  idealRecomp: 4,
  maxInDeficit: 5,
  maxAdvanced: 6,
} as const

/** Series efectivas semanales por grupo muscular. */
export const WEEKLY_VOLUME = {
  general: [10, 20],
  deficit: [10, 16],
  beginner: [10, 12],
  /** Las series de músculos secundarios cuentan como media serie. */
  secondaryMuscleFactor: 0.5,
  /** Series extra por semana para músculos prioritarios. */
  priorityBonus: 3,
  reference: 'Schoenfeld BJ et al. J Sports Sci. 2017;35(11):1073-1082.',
} as const

export interface Prescription {
  sets: number
  repMin: number
  repMax: number
  rirMin: number
  rirMax: number
  restSec: number
}

/** Intensidad para preservar fuerza en déficit. */
export const PRESCRIPTIONS = {
  /** Básicos: 3–4 × 4–6 a RIR 1–2 (≈80–87 % del 1RM). */
  main: { sets: 3, repMin: 4, repMax: 6, rirMin: 1, rirMax: 2, restSec: 180 },
  /** Compuestos secundarios. */
  secondary: { sets: 3, repMin: 6, repMax: 10, rirMin: 1, rirMax: 2, restSec: 120 },
  /** Accesorios: 2–4 × 8–15 a RIR 0–2. */
  accessory: { sets: 3, repMin: 10, repMax: 15, rirMin: 0, rirMax: 2, restSec: 75 },
} as const satisfies Record<string, Prescription>

/** Tiempo estimado por serie de trabajo (sin contar el descanso). */
export const SECONDS_PER_SET = 40
export const WARMUP_MINUTES = 8

/**
 * Rampa de calentamiento para ejercicios compuestos: series progresivas de pocas reps
 * que preparan sin fatigar (barra vacía → ~50 % → ~70 % → ~85 % del peso de trabajo).
 */
export const WARMUP_RAMP = {
  barReps: 10,
  steps: [
    { pct: 0.5, reps: 8 },
    { pct: 0.7, reps: 5 },
    { pct: 0.85, reps: 2 },
  ],
} as const

/* ───────────────────────────── Progresión ───────────────────────────── */

export const EPLEY = {
  divisor: 30,
  /** Más reps efectivas que esto: estimación de baja confianza. */
  lowConfidenceAbove: 10,
  reference: 'Epley B. Poundage Chart. Boyd Epley Workout, 1985.',
} as const

export const PROGRESSION = {
  incrementKg: { upper: 2.5, lower: 5, core: 2.5 },
  /** Sesiones seguidas sin el mínimo de reps antes de bajar el peso. */
  missesBeforeReset: 3,
  /** Bajada si faltó ≤ 1 rep de media; si faltó más, la bajada grande. */
  resetSmall: 0.05,
  resetLarge: 0.1,
  /** Reps objetivo dentro del rango para calcular el primer peso desde el 1RM. */
  startingRir: 2,
} as const

export const STRENGTH_TREND = {
  movingAverageSessions: 3,
  lookbackDays: 14,
  /** Cambio porcentual mínimo para considerar "Subiendo" o "Bajando". */
  stableBandPct: 2,
  /** Caída que dispara la alerta de pérdida de fuerza. */
  alertDropPct: 5,
  alertMinLifts: 2,
  /** Subida de kcal en días de entreno cuando cae la fuerza (rango 100–200). */
  trainingDayKcalBoost: 150,
} as const

export const DELOAD = {
  defaultEveryWeeks: 6,
  everyWeeksRange: [5, 8],
  /** Fracción del volumen que se conserva (−50 %). */
  volumeFactor: 0.5,
  lowWellbeingScore: 2,
} as const

/* ───────────────────────────── Cardio ───────────────────────────── */

export const CARDIO = {
  stepsGoal: [8000, 10000],
  stepIncrement: 2000,
  lissSessions: [2, 3],
  lissMinutes: [20, 40],
  hiitMaxPerWeek: 2,
} as const

/* ───────────────────────────── Check-in ───────────────────────────── */

export const CHECKIN = {
  adherenceThresholdPct: 80,
  kcalTolerance: 0.1,
  /** La proteína se considera cumplida al llegar a este porcentaje del objetivo. */
  proteinMetFraction: 0.9,
  stallWeeklyLossPct: 0.25,
  stallWeeks: 2,
  fastWeeklyLossPct: 1,
  /** Ajuste = 5 % de las kcal actuales, acotado a 100–150 y redondeado a 25. */
  adjustmentFraction: 0.05,
  adjustmentRange: [100, 150],
  recompStableBandPct: 0.25,
} as const

/* ───────────────────────────── Comidas ───────────────────────────── */

export const MEALS = {
  proteinPerMeal: [25, 50],
  /** Precisión del plan diario frente al objetivo. */
  planTolerance: 0.05,
  /** Ventana para la comida pre-entreno (horas antes). */
  preWorkoutWindowHours: [1, 3],
  postWorkoutWindowHours: 2,
} as const

/**
 * Rotación semanal: cuántos alimentos distintos por rol y momento del día se usan en la semana.
 * Repetir alimentos facilita cocinar por tandas y deja una lista de mercado corta, sin perder
 * variedad entre comidas.
 */
export const ROTATION = {
  perSlot: { protein: 4, carb: 3, fat: 2, vegetable: 4, fruit: 3 },
  /** Grasa máxima (g/100 g) para considerar "magro" un alimento del pre/post-entreno. */
  leanFatPer100g: 10,
  /** Proteína mínima (g/100 g) para una fuente principal de proteína. */
  denseProteinPer100g: 10,
} as const
