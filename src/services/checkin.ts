import { estimateBodyFatNavy } from '@/domain/body/navy'
import { weekAverage, weeklyChangePct, type WeightEntry } from '@/domain/body/weightTrend'
import { nutritionAdherence, trainingAdherence } from '@/domain/checkin/adherence'
import {
  applyRecommendation,
  evaluateCheckin,
  type CheckinInput,
  type Recommendation,
  type TargetValues,
  type Wellbeing,
} from '@/domain/checkin/algorithm'
import { FAT, KCAL_PER_GRAM } from '@/domain/constants/formulas'
import { targetsForDay } from '@/domain/nutrition/dayTarget'
import { computeCarbCycle, computeFiber } from '@/domain/nutrition/targets'
import {
  overallStrengthTrend,
  strengthLossAlert,
  strengthTrend,
} from '@/domain/progression/strength'
import {
  addDaysToKey,
  daysBetween,
  daysInRange,
  isoWeekday,
  startOfWeekKey,
} from '@/domain/shared/dates'
import type { Calculated } from '@/domain/shared/explanation'
import { roundTo } from '@/domain/shared/math'
import { checkinPeriod } from '@/domain/today/today'
import type { DayKey, Exercise, Weekday } from '@/domain/types'
import { newId, nowIso } from '@/data/defaults'
import type { Repositories } from '@/data/repositories/types'
import type {
  Checkin,
  Measurement,
  NutritionTargets,
  Profile,
  Settings,
  TrainingPlan,
} from '@/data/schemas'

import { isTrainingDayFor, totalsOf } from './nutrition'
import { healthOf } from './profile'
import { deloadInfo, historyByExercise, lowFeelingStreak, mainLiftSeries } from './workout'

/** Objetivos vigentes en una fecha a partir del historial (el más reciente con inicio ≤ fecha). */
export function targetsAt(
  list: readonly NutritionTargets[],
  date: DayKey,
): NutritionTargets | undefined {
  return [...list]
    .filter((t) => t.effectiveFrom <= date)
    .sort(
      (a, b) =>
        a.effectiveFrom.localeCompare(b.effectiveFrom) || a.createdAt.localeCompare(b.createdAt),
    )
    .at(-1)
}

/** % de grasa de una medición: el medido o, si hay cuello y cintura (y cadera en mujeres), US Navy. */
export function bodyFatOf(
  m: Measurement,
  profile: Pick<Profile, 'sex' | 'heightCm'>,
): number | null {
  if (m.bodyFatPct !== undefined) return m.bodyFatPct
  if (m.neckCm === undefined || m.waistCm === undefined) return null
  try {
    return estimateBodyFatNavy({
      sex: profile.sex,
      heightCm: profile.heightCm,
      neckCm: m.neckCm,
      waistCm: m.waistCm,
      ...(m.hipCm !== undefined ? { hipCm: m.hipCm } : {}),
    }).value
  } catch {
    return null
  }
}

/** Sesiones planificadas en un rango: las del plan con día fijo + las sin día (una por semana). */
export function plannedSessions(plan: TrainingPlan | undefined, dates: readonly DayKey[]): number {
  if (!plan) return 0
  const fixed = dates.filter((d) => plan.days.some((day) => day.weekday === isoWeekday(d))).length
  const floating = plan.days.filter((d) => d.weekday === null).length * Math.round(dates.length / 7)
  return fixed + floating
}

/** Mínimo de días con la app en la semana evaluada para que el check-in tenga sentido. */
const MIN_TRACKED_DAYS = 4

/** Inicio del plan: el primer día con objetivos nutricionales. */
export function planStartDate(list: readonly NutritionTargets[]): DayKey | null {
  return list.map((t) => t.effectiveFrom).sort()[0] ?? null
}

/** Primer día de check-in en el que la semana evaluada tiene al menos 4 días con la app. */
export function firstCheckinDay(startedOn: DayKey, checkinWeekday: Weekday): DayKey {
  let day = addDaysToKey(startOfWeekKey(startedOn, checkinWeekday), 7)
  while (daysBetween(startedOn, addDaysToKey(day, -1)) + 1 < MIN_TRACKED_DAYS)
    day = addDaysToKey(day, 7)
  return day
}

export interface CheckinStats {
  period: { weekStart: DayKey; weekEnd: DayKey }
  /** ¿La semana evaluada tiene suficientes días desde que empezaste? */
  ready: boolean
  firstCheckinOn: DayKey
  avgWeightKg: number | null
  weighIns: number
  weeklyChangePct: number | null
  previousWeeklyChangePct: number | null
  waistCm: number | null
  waistChangeCm: number | null
  nutritionAdherencePct: number
  loggedDays: number
  trackedDays: number
  trainingAdherencePct: number
  sessionsDone: number
  sessionsPlanned: number
  input: Omit<CheckinInput, 'wellbeing'>
}

/** Junta todo lo que necesita el check-in de la semana evaluada. */
export async function checkinStats(
  repos: Repositories,
  ctx: {
    profile: Profile
    settings: Settings
    plan: TrainingPlan | undefined
    exercises: readonly Exercise[]
    today: DayKey
  },
): Promise<CheckinStats | null> {
  const { profile, settings, plan, today } = ctx
  const period = checkinPeriod(today, settings.checkinWeekday)
  const { weekStart, weekEnd } = period
  const allTargets = await repos.targets.list()
  const current = targetsAt(allTargets, today)
  if (!current) return null

  const [weights, measurements, sessions, logs, completedSets, checkins] = await Promise.all([
    repos.body.listWeights(),
    repos.body.listMeasurements(),
    repos.workouts.listSessions(),
    repos.foodLogs.listRange(weekStart, weekEnd),
    repos.workouts.listCompletedSets(),
    repos.checkins.list(),
  ])

  // Peso: promedios semanales (se necesitan al menos 2 registros para que el promedio cuente).
  const entries: WeightEntry[] = weights.map((w) => ({ date: w.date, weightKg: w.weightKg }))
  const avg = (start: DayKey) => {
    const w = weekAverage(entries, start)
    return w.count >= 2 ? w.average : null
  }
  const now = avg(weekStart)
  const prev = avg(addDaysToKey(weekStart, -7))
  const prev2 = avg(addDaysToKey(weekStart, -14))
  const change = now !== null && prev !== null ? weeklyChangePct(prev, now) : null
  const prevChange = prev !== null && prev2 !== null ? weeklyChangePct(prev2, prev) : null

  // Cintura: la última medida hasta el fin de la semana, frente al check-in anterior (o una medida previa).
  const waists = measurements
    .filter((m) => m.waistCm !== undefined && m.date <= weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date))
  const waist = waists.at(-1)?.waistCm ?? null
  const lastCheckin = [...checkins]
    .filter((c) => c.weekStart < weekStart)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .at(-1)
  const previousWaist =
    lastCheckin?.waistCm ??
    waists.filter((m) => m.date <= addDaysToKey(waists.at(-1)?.date ?? weekEnd, -7)).at(-1)
      ?.waistCm ??
    null
  const waistChange =
    waist !== null && previousWaist !== null ? Math.round((waist - previousWaist) * 10) / 10 : null

  // Adherencia nutricional: kcal ±10 % y proteína ≥ 90 % del objetivo de cada día
  // (solo los días desde que empezaste el plan).
  const startedOn = planStartDate(allTargets) ?? weekStart
  const dates = daysInRange(weekStart, weekEnd).filter((d) => d >= startedOn)
  const byDate = new Map<DayKey, typeof logs>()
  for (const l of logs) byDate.set(l.date, [...(byDate.get(l.date) ?? []), l])
  const intakes = [...byDate.entries()].map(([date, list]) => {
    const t = totalsOf(list)
    return { date, kcal: t.kcal, protein: t.protein }
  })
  const adherence = nutritionAdherence(dates, intakes, (date) => {
    const t = targetsAt(allTargets, date) ?? current
    return targetsForDay(t, isTrainingDayFor(plan, sessions, date)).value
  })

  // Entreno.
  const done = sessions.filter(
    (s) => s.status === 'completed' && s.date >= weekStart && s.date <= weekEnd,
  ).length
  const planned = plannedSessions(plan, dates)

  // Fuerza.
  const exercisesById = new Map(ctx.exercises.map((e) => [e.id, e]))
  const series = mainLiftSeries(
    profile,
    historyByExercise(completedSets),
    exercisesById,
    now ?? profile.weightKg,
  )
  const alert = strengthLossAlert(series).value.triggered
  const overall = overallStrengthTrend(
    Object.values(series).map((points) => strengthTrend(points).state),
  )

  const lowWellbeing = (() => {
    let n = 0
    for (const c of [...checkins]
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
      .reverse()) {
      if (c.sleep <= 2 || c.energy <= 2) n++
      else break
    }
    return n
  })()
  const deloadDue = plan
    ? deloadInfo(plan, settings, today, {
        strengthAlert: alert,
        lowWellbeingCheckins: lowWellbeing,
        lowFeelingSessions: lowFeelingStreak(sessions),
      }).value.due
    : false

  return {
    period,
    ready: dates.length >= MIN_TRACKED_DAYS,
    firstCheckinOn: firstCheckinDay(startedOn, settings.checkinWeekday),
    avgWeightKg: now,
    weighIns: weekAverage(entries, weekStart).count,
    weeklyChangePct: change,
    previousWeeklyChangePct: prevChange,
    waistCm: waist,
    waistChangeCm: waistChange,
    nutritionAdherencePct: adherence.pct,
    loggedDays: adherence.days.filter((d) => d.logged).length,
    trackedDays: dates.length,
    trainingAdherencePct: trainingAdherence(planned, done),
    sessionsDone: done,
    sessionsPlanned: planned,
    input: {
      noDeficit: healthOf(profile).noDeficit,
      nutritionAdherencePct: adherence.pct,
      trainingAdherencePct: trainingAdherence(planned, done),
      weeklyChangePct: change,
      previousWeeklyChangePct: prevChange,
      waistChangeCm: waistChange,
      strengthAlert: alert,
      strengthTrend: overall,
      targets: {
        kcal: current.kcal,
        protein: current.protein,
        carbs: current.carbs,
        fat: current.fat,
        trainingDayBonusCarbs: current.trainingDayBonusCarbs,
      },
      bmr: current.bmr,
      deloadDue,
    },
  }
}

/** Evalúa la semana y guarda el check-in como pendiente de decisión. */
export async function createCheckin(
  repos: Repositories,
  stats: CheckinStats,
  wellbeing: Wellbeing,
  today: DayKey,
): Promise<Checkin> {
  const result: Calculated<Recommendation> = evaluateCheckin({ ...stats.input, wellbeing })
  const existing = await repos.checkins.getByWeek(stats.period.weekStart)
  const checkin: Checkin = {
    id: existing?.id ?? newId(),
    weekStart: stats.period.weekStart,
    weekEnd: stats.period.weekEnd,
    date: today,
    avgWeightKg: stats.avgWeightKg,
    weeklyChangePct: stats.weeklyChangePct,
    previousWeeklyChangePct: stats.previousWeeklyChangePct,
    waistCm: stats.waistCm,
    waistChangeCm: stats.waistChangeCm,
    nutritionAdherencePct: stats.nutritionAdherencePct,
    trainingAdherencePct: stats.trainingAdherencePct,
    ...wellbeing,
    recommendation: result.value,
    explanation: result.explanation,
    decision: 'pending',
    decidedAt: null,
    createdAt: existing?.createdAt ?? nowIso(),
  }
  await repos.checkins.save(checkin)
  return checkin
}

/** Grasa mínima al recortar: 0,6 g/kg o el 20 % de las kcal, lo mayor. */
export function fatFloor(weightKg: number, kcal: number): number {
  return Math.max(
    roundTo(FAT.perKgRange[0] * weightKg, 5),
    roundTo((FAT.minFractionOfKcal * kcal) / KCAL_PER_GRAM.fat, 5),
  )
}

/** Cómo quedarían los objetivos si se aplica la recomendación. */
export function previewCheckin(
  current: TargetValues,
  rec: Recommendation,
  weightKg: number,
): TargetValues {
  return applyRecommendation(current, rec, {
    fatMin: fatFloor(weightKg, current.kcal + rec.kcalDelta),
  })
}

/**
 * Aplica la recomendación: nuevos objetivos desde hoy (la proteína no cambia; los recortes salen
 * de carbos y luego de grasa, sin bajar del mínimo de grasa).
 */
export async function applyCheckin(
  repos: Repositories,
  ctx: { checkin: Checkin; profile: Profile; today: DayKey; weightKg: number },
): Promise<NutritionTargets | null> {
  const { checkin, profile, today } = ctx
  const rec = checkin.recommendation as Recommendation
  let created: NutritionTargets | null = null
  if (rec.actionable) {
    const current = targetsAt(await repos.targets.list(), today)
    if (!current) return null
    const next = previewCheckin(current, rec, ctx.weightKg)
    const carbCycle = profile.nutrition.carbCycling
      ? computeCarbCycle({
          kcal: next.kcal,
          carbs: next.carbs,
          trainingDaysPerWeek: profile.trainingDays,
          bmr: current.bmr,
        })
      : null
    const fiber = computeFiber(next.kcal)
    created = {
      ...current,
      id: newId(),
      effectiveFrom: today,
      source: 'checkin',
      kcal: next.kcal,
      carbs: next.carbs,
      fat: next.fat,
      fiber: fiber.value,
      trainingDayBonusCarbs: next.trainingDayBonusCarbs,
      carbCycle: carbCycle?.value ?? null,
      explanations: {
        ...current.explanations,
        kcal: checkin.explanation,
        fiber: fiber.explanation,
        ...(carbCycle ? { carbCycle: carbCycle.explanation } : {}),
      },
      note: `Check-in del ${checkin.weekStart}`,
      createdAt: nowIso(),
    }
    await repos.targets.add(created)
    // Los menús de hoy en adelante se rehacen con los nuevos objetivos.
    const future = await repos.mealPlans.listRange(today, addDaysToKey(today, 30))
    for (const p of future) await repos.mealPlans.remove(p.date)
  }
  await repos.checkins.update(checkin.id, { decision: 'applied', decidedAt: nowIso() })
  return created
}

export async function ignoreCheckin(repos: Repositories, checkin: Checkin): Promise<void> {
  await repos.checkins.update(checkin.id, { decision: 'ignored', decidedAt: nowIso() })
}
