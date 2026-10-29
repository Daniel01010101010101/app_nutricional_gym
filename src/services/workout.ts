import type { Calculated } from '@/domain/shared/explanation'
import { addDaysToKey, isoWeekday, startOfWeekKey } from '@/domain/shared/dates'
import { roundDecimals } from '@/domain/shared/math'
import { fmt } from '@/domain/shared/format'
import { fromKg, toKg } from '@/domain/shared/units'
import type { Prescription } from '@/domain/constants/formulas'
import {
  suggestNextTarget,
  type ProgressionTarget,
  type SessionSets,
} from '@/domain/progression/doubleProgression'
import { bestE1rm, epley, isWorkingSet } from '@/domain/progression/e1rm'
import { detectRecords, RECORD_LABEL, type PersonalRecord } from '@/domain/progression/records'
import type { E1rmPoint } from '@/domain/progression/strength'
import { deloadStatus, type DeloadStatus, type FatigueSignals } from '@/domain/training/deload'
import {
  barbellLoads,
  plateBreakdown,
  roundToLoadable,
  type LoadingSettings,
} from '@/domain/training/loading'
import { prescriptionFor } from '@/domain/training/prescription'
import { isExerciseAvailable } from '@/domain/training/selection'
import type { SlotRole } from '@/domain/training/splits'
import type {
  DayKey,
  Exercise,
  ExperienceLevel,
  MainLift,
  WeightUnit,
  WorkoutSet,
} from '@/domain/types'
import { newId, nowIso } from '@/data/defaults'
import type {
  Checkin,
  PlanDay,
  PlanExercise,
  Profile,
  Settings,
  TrainingPlan,
  WorkoutSession,
} from '@/data/schemas'
import type { Repositories } from '@/data/repositories/types'

/* ───────────────────────────── Historial ───────────────────────────── */

/** Historial por ejercicio: sesiones terminadas en orden cronológico. */
export function historyByExercise(sets: readonly WorkoutSet[]): Map<string, SessionSets[]> {
  const bySessionExercise = new Map<string, { date: DayKey; at: string; sets: WorkoutSet[] }>()
  for (const set of sets) {
    const key = `${set.exerciseId}|${set.sessionId}`
    const entry = bySessionExercise.get(key) ?? { date: set.date, at: set.performedAt, sets: [] }
    entry.sets.push(set)
    if (set.performedAt < entry.at) entry.at = set.performedAt
    bySessionExercise.set(key, entry)
  }
  const result = new Map<string, SessionSets[]>()
  const sorted = [...bySessionExercise.entries()].sort((a, b) => a[1].at.localeCompare(b[1].at))
  for (const [key, entry] of sorted) {
    const exerciseId = key.split('|')[0] as string
    const list = result.get(exerciseId) ?? []
    list.push({ date: entry.date, sets: [...entry.sets].sort((a, b) => a.setIndex - b.setIndex) })
    result.set(exerciseId, list)
  }
  return result
}

/** Mejor 1RM estimado por sesión para un ejercicio (para tendencias y gráficas). */
export function e1rmPoints(history: readonly SessionSets[], loadOffsetKg = 0): E1rmPoint[] {
  return history
    .map((s) => ({ date: s.date, best: bestE1rm(s.sets, loadOffsetKg) }))
    .filter((p): p is { date: DayKey; best: NonNullable<typeof p.best> } => p.best !== null)
    .map((p) => ({ date: p.date, e1rm: p.best.e1rm }))
}

export function loadOffsetFor(exercise: Exercise | undefined, bodyweightKg: number): number {
  return exercise?.loadType === 'bodyweight' ? bodyweightKg : 0
}

/**
 * Alternativas para cambiar un ejercicio: primero el mismo patrón de movimiento, luego el mismo
 * músculo principal; solo las que puedes hacer con tu equipo y sin cargar tus lesiones.
 */
export function alternativesFor(
  exercise: Exercise,
  all: readonly Exercise[],
  profile: Pick<Profile, 'equipment' | 'injuries'>,
  excludeIds: readonly string[] = [],
): Exercise[] {
  const ctx = {
    equipment: profile.equipment,
    injuries: profile.injuries,
    excludedIds: [...excludeIds, exercise.id],
  }
  const score = (e: Exercise) =>
    (e.pattern === exercise.pattern ? 0 : 2) + (e.primaryMuscle === exercise.primaryMuscle ? 0 : 1)
  return all
    .filter(
      (e) =>
        (e.pattern === exercise.pattern || e.primaryMuscle === exercise.primaryMuscle) &&
        isExerciseAvailable(e, ctx),
    )
    .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'es'))
}

/* ───────────────────────────── Prescripción y objetivo ───────────────────────────── */

export function roleFor(exercise: Exercise): SlotRole {
  if (exercise.mainLift) return 'main'
  return exercise.kind === 'compound' ? 'secondary' : 'accessory'
}

export function prescriptionOf(
  exercise: Exercise,
  planExercise: PlanExercise | undefined,
  experience: ExperienceLevel,
): Prescription {
  if (planExercise) {
    const { sets, repMin, repMax, rirMin, rirMax, restSec } = planExercise
    return { sets, repMin, repMax, rirMin, rirMax, restSec }
  }
  return prescriptionFor(roleFor(exercise), exercise.kind, experience)
}

/** 1RM de partida del test inicial, si se hizo con este mismo ejercicio. */
export function baselineE1rm(profile: Profile, exercise: Exercise): number | undefined {
  for (const lift of Object.keys(profile.strengthBaseline) as MainLift[]) {
    const mark = profile.strengthBaseline[lift]
    if (mark?.exerciseId === exercise.id) {
      return (
        epley(mark.weightKg + loadOffsetFor(exercise, profile.weightKg), mark.reps) -
        loadOffsetFor(exercise, profile.weightKg)
      )
    }
  }
  return undefined
}

export function targetFor(input: {
  exercise: Exercise
  prescription: Prescription
  history: readonly SessionSets[]
  loading: LoadingSettings
  profile: Profile
  deload: boolean
}): Calculated<ProgressionTarget> {
  const baseline = baselineE1rm(input.profile, input.exercise)
  return suggestNextTarget({
    prescription: input.prescription,
    history: input.history,
    loadType: input.exercise.loadType,
    bodyRegion: input.exercise.bodyRegion,
    loading: input.loading,
    deload: input.deload,
    ...(baseline !== undefined && baseline > 0 ? { baselineE1rm: baseline } : {}),
  })
}

/** Valores con los que se precarga la siguiente serie: el último peso usado y las reps objetivo. */
export function nextSetDefaults(
  target: ProgressionTarget,
  logged: readonly WorkoutSet[],
): { weightKg: number | null; reps: number } {
  const working = logged.filter(isWorkingSet)
  const reps = target.reps[working.length] ?? target.reps.at(-1) ?? 8
  const last = working.at(-1)
  return { weightKg: last ? last.weightKg : target.weightKg, reps }
}

/** Descanso tras una serie: el del plan si el ejercicio está en él; si no, el de tus ajustes. */
export function restSecondsFor(
  exercise: Exercise,
  planExercise: PlanExercise | undefined,
  settings: Settings,
): number {
  return planExercise?.restSec ?? settings.restSeconds[roleFor(exercise)]
}

/* ───────────────────────────── Récords en vivo ───────────────────────────── */

const RECORD_PRIORITY: PersonalRecord['type'][] = ['max-weight', 'e1rm', 'reps-at-weight']

/**
 * Récord que logra una serie nueva frente a todo lo anterior (historial + series de hoy).
 * La primera vez que haces un ejercicio no hay récord: es tu línea base.
 */
export function recordForSet(input: {
  set: WorkoutSet
  history: readonly WorkoutSet[]
  todayBefore: readonly WorkoutSet[]
  loadOffsetKg: number
}): PersonalRecord | null {
  if (!isWorkingSet(input.set) || !input.history.some(isWorkingSet)) return null
  const records = detectRecords(
    [...input.history, ...input.todayBefore],
    [input.set],
    input.loadOffsetKg,
  )
  for (const type of RECORD_PRIORITY) {
    const record = records.find((r) => r.type === type)
    if (record) return record
  }
  return null
}

export function recordDetail(
  record: PersonalRecord,
  exerciseName: string,
  unit: WeightUnit,
): string {
  const w = (kg: number) => `${fmt(fromKg(kg, unit), 1)} ${unit}`
  switch (record.type) {
    case 'max-weight':
      return `${exerciseName}: ${w(record.value)} × ${record.reps ?? 1} (antes ${w(record.previous)})`
    case 'reps-at-weight':
      return `${exerciseName}: ${record.value} reps con ${w(record.weightKg ?? 0)} (antes ${record.previous})`
    case 'e1rm':
      return `${exerciseName}: 1RM estimado ${w(record.value)} (antes ${w(record.previous)})`
    case 'volume':
      return `${exerciseName}: ${w(record.value)} de volumen (antes ${w(record.previous)})`
  }
}

export { RECORD_LABEL }

/* ───────────────────────────── Unidades y discos ───────────────────────────── */

export function toDisplay(kg: number, unit: WeightUnit): number {
  return roundDecimals(fromKg(kg, unit), 2)
}

export function fromDisplay(value: number, unit: WeightUnit): number {
  return roundDecimals(toKg(value, unit), 3)
}

/** Paso de los botones − / + para el peso de un ejercicio, en la unidad de la app. */
export function weightStep(exercise: Exercise, loading: LoadingSettings, unit: WeightUnit): number {
  let stepKg: number
  if (exercise.loadType === 'barbell') {
    const loads = barbellLoads(loading)
    stepKg = loads.length > 1 ? (loads[1] as number) - (loads[0] as number) : 2.5
  } else if (exercise.loadType === 'dumbbell') {
    stepKg = toKg(loading.dumbbellIncrement.value, loading.dumbbellIncrement.unit)
  } else if (exercise.loadType === 'stack') {
    stepKg = toKg(loading.machineIncrement.value, loading.machineIncrement.unit)
  } else {
    stepKg = unit === 'kg' ? 1.25 : toKg(2.5, 'lb')
  }
  return roundDecimals(fromKg(stepKg, unit), 2)
}

export function platesText(
  totalKg: number,
  exercise: Exercise,
  loading: LoadingSettings,
): string | null {
  if (exercise.loadType !== 'barbell') return null
  const breakdown = plateBreakdown(totalKg, loading)
  if (!breakdown) return null
  if (breakdown.perSide.length === 0) return 'Solo la barra'
  const list = breakdown.perSide.map((p) => String(p).replace('.', ',')).join(' + ')
  return `Por lado: ${list} ${breakdown.unit}`
}

export { roundToLoadable }

/* ───────────────────────────── Semana y descarga ───────────────────────────── */

export function planDayFor(plan: TrainingPlan | undefined, date: DayKey): PlanDay | undefined {
  return plan?.days.find((d) => d.weekday === isoWeekday(date))
}

/** Ciclos de N semanas de entreno + 1 de descarga, contados desde el inicio del bloque. */
export function currentCycleStart(blockStart: DayKey, everyWeeks: number, today: DayKey): DayKey {
  const cycleDays = (everyWeeks + 1) * 7
  const start = startOfWeekKey(blockStart)
  const elapsed = Math.max(0, Math.floor((Date.parse(today) - Date.parse(start)) / 86400000))
  return addDaysToKey(start, Math.floor(elapsed / cycleDays) * cycleDays)
}

export function deloadInfo(
  plan: TrainingPlan,
  settings: Settings,
  today: DayKey,
  signals: FatigueSignals,
): Calculated<DeloadStatus> {
  return deloadStatus({
    blockStart: currentCycleStart(plan.blockStartDate, settings.deloadEveryWeeks, today),
    today,
    everyWeeks: settings.deloadEveryWeeks,
    signals,
  })
}

/** Fecha de inicio de bloque que convierte la semana actual en semana de descarga. */
export function blockStartForDeloadNow(today: DayKey, everyWeeks: number): DayKey {
  return addDaysToKey(startOfWeekKey(today), -everyWeeks * 7)
}

/* ───────────────────────────── Acciones ───────────────────────────── */

export async function startSession(
  repos: Repositories,
  options: { plan?: TrainingPlan; day?: PlanDay; title: string; today: DayKey; isDeload: boolean },
): Promise<WorkoutSession> {
  const now = nowIso()
  const session: WorkoutSession = {
    id: newId(),
    date: options.today,
    startedAt: now,
    endedAt: null,
    status: 'in_progress',
    planId: options.plan?.id ?? null,
    planDayId: options.day?.id ?? null,
    title: options.title,
    exerciseIds: options.day?.exercises.map((e) => e.exerciseId) ?? [],
    isDeload: options.isDeload,
    feeling: null,
    energy: null,
    sleep: null,
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
  await repos.workouts.createSession(session)
  return session
}

export function newSet(
  session: WorkoutSession,
  input: {
    exerciseId: string
    weightKg: number
    reps: number
    rir: number | null
    isWarmup: boolean
    setIndex: number
    notes?: string
  },
): WorkoutSet {
  return {
    id: newId(),
    sessionId: session.id,
    exerciseId: input.exerciseId,
    exerciseOrder: Math.max(0, session.exerciseIds.indexOf(input.exerciseId)),
    setIndex: input.setIndex,
    weightKg: input.weightKg,
    reps: input.reps,
    rir: input.rir,
    isWarmup: input.isWarmup,
    ...(input.notes ? { notes: input.notes } : {}),
    date: session.date,
    performedAt: nowIso(),
  }
}

/* ───────────────────────────── Fuerza por básico ───────────────────────────── */

const DEFAULT_LIFT_EXERCISE: Record<MainLift, string> = {
  squat: 'back-squat',
  bench: 'bench-press',
  deadlift: 'deadlift',
  ohp: 'overhead-press',
  row: 'barbell-row',
  pullup: 'pull-up',
}

/** Ejercicio con el que se sigue cada básico (el del test inicial o el estándar). */
export function liftExerciseId(profile: Profile, lift: MainLift): string {
  return profile.strengthBaseline[lift]?.exerciseId ?? DEFAULT_LIFT_EXERCISE[lift]
}

export function mainLiftSeries(
  profile: Profile,
  history: ReadonlyMap<string, SessionSets[]>,
  exercisesById: ReadonlyMap<string, Exercise>,
  bodyweightKg: number,
): Partial<Record<MainLift, E1rmPoint[]>> {
  const result: Partial<Record<MainLift, E1rmPoint[]>> = {}
  for (const lift of Object.keys(DEFAULT_LIFT_EXERCISE) as MainLift[]) {
    const id = liftExerciseId(profile, lift)
    const points = e1rmPoints(
      history.get(id) ?? [],
      loadOffsetFor(exercisesById.get(id), bodyweightKg),
    )
    if (points.length > 0) result[lift] = points
  }
  return result
}

/** Sesiones seguidas (desde la última) con sensación ≤ 2. */
export function lowFeelingStreak(sessions: readonly WorkoutSession[]): number {
  let streak = 0
  for (const s of [...sessions].filter((x) => x.status === 'completed').reverse()) {
    if (s.feeling !== null && s.feeling <= 2) streak++
    else break
  }
  return streak
}

/** Check-ins seguidos (desde el último) con sueño o energía ≤ 2. */
export function lowWellbeingStreak(checkins: readonly Checkin[]): number {
  let streak = 0
  for (const c of [...checkins].sort((a, b) => b.weekStart.localeCompare(a.weekStart))) {
    if (c.sleep <= 2 || c.energy <= 2) streak++
    else break
  }
  return streak
}
