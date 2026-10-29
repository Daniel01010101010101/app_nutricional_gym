import { describe, expect, it } from 'vitest'

import { addDaysToKey, daysInRange } from '@/domain/shared/dates'
import type { Repositories } from '@/data/repositories/types'
import { onboardedRepos } from '@/test/onboarding'

import {
  applyCheckin,
  checkinStats,
  createCheckin,
  firstCheckinDay,
  ignoreCheckin,
  plannedSessions,
  targetsAt,
} from './checkin'
import { dayTargetsFor, isTrainingDayFor, quickEntry } from './nutrition'

const START = '2026-03-02'
const TODAY = '2026-03-23' // lunes: evalúa del 16 al 22 de marzo
const wellbeing = { sleep: 4, stress: 2, hunger: 3, energy: 4 }

async function context(repos: Repositories) {
  return {
    profile: (await repos.profile.get())!,
    settings: await repos.settings.get(),
    plan: await repos.plans.getActive(),
    exercises: await repos.exercises.list(),
    today: TODAY,
  }
}

/** Registra comidas que cumplen exactamente el objetivo de cada día. */
async function logAdherentWeek(repos: Repositories, from: string, to: string) {
  const plan = await repos.plans.getActive()
  const targets = (await repos.targets.getFor(from))!
  for (const date of daysInRange(from, to)) {
    const day = dayTargetsFor(targets, isTrainingDayFor(plan, [], date)).value
    await repos.foodLogs.add([quickEntry({ name: 'Día completo', ...day, date, mealIndex: 0 })])
  }
}

describe('check-in semanal', () => {
  it('con dos semanas estancado y buena adherencia propone bajar 100 kcal y lo aplica', async () => {
    const repos = await onboardedRepos(START)
    const weights: [string, number][] = [
      ['2026-03-03', 80.1],
      ['2026-03-05', 79.9],
      ['2026-03-10', 79.9],
      ['2026-03-12', 80],
      ['2026-03-14', 79.95],
      ['2026-03-17', 79.9],
      ['2026-03-19', 79.95],
      ['2026-03-21', 79.85],
    ]
    for (const [date, kg] of weights) await repos.body.upsertWeight(date, kg)
    await logAdherentWeek(repos, '2026-03-16', '2026-03-22')

    const stats = (await checkinStats(repos, await context(repos)))!
    expect(stats.period).toEqual({ weekStart: '2026-03-16', weekEnd: '2026-03-22' })
    expect(stats.nutritionAdherencePct).toBe(100)
    expect(stats.avgWeightKg).toBeCloseTo(79.9, 2)
    expect(stats.weeklyChangePct).toBeGreaterThan(-0.25)
    expect(stats.previousWeeklyChangePct).toBeGreaterThan(-0.25)

    const checkin = await createCheckin(repos, stats, wellbeing, TODAY)
    expect(checkin.recommendation.type).toBe('decrease-kcal')
    expect(checkin.decision).toBe('pending')

    const before = (await repos.targets.getFor(TODAY))!
    const after = await applyCheckin(repos, {
      checkin,
      profile: (await repos.profile.get())!,
      today: TODAY,
      weightKg: 79.9,
    })
    expect(after).toMatchObject({
      source: 'checkin',
      effectiveFrom: TODAY,
      kcal: before.kcal - 100,
      protein: before.protein,
    })
    expect(after!.carbs).toBeLessThan(before.carbs)
    expect((await repos.targets.getFor(TODAY))?.id).toBe(after!.id)
    expect((await repos.checkins.getByWeek('2026-03-16'))?.decision).toBe('applied')
  })

  it('sin pesajes pide más datos y se puede ignorar', async () => {
    const repos = await onboardedRepos(START)
    await logAdherentWeek(repos, '2026-03-16', '2026-03-22')
    const stats = (await checkinStats(repos, await context(repos)))!
    expect(stats.weeklyChangePct).toBeNull()
    const checkin = await createCheckin(repos, stats, wellbeing, TODAY)
    expect(checkin.recommendation).toMatchObject({ type: 'insufficient-data', actionable: false })
    await ignoreCheckin(repos, checkin)
    expect((await repos.checkins.getByWeek('2026-03-16'))?.decision).toBe('ignored')
  })

  it('la baja adherencia no cambia las calorías', async () => {
    const repos = await onboardedRepos(START)
    const stats = (await checkinStats(repos, await context(repos)))!
    expect(stats.nutritionAdherencePct).toBe(0)
    const checkin = await createCheckin(repos, stats, wellbeing, TODAY)
    expect(checkin.recommendation.type).toBe('low-adherence')
    expect(
      await applyCheckin(repos, {
        checkin,
        profile: (await repos.profile.get())!,
        today: TODAY,
        weightKg: 80,
      }),
    ).toBeNull()
  })

  it('cuenta las sesiones planificadas y elige los objetivos vigentes', async () => {
    const repos = await onboardedRepos(START)
    const plan = await repos.plans.getActive()
    expect(plannedSessions(plan, daysInRange('2026-03-16', '2026-03-22'))).toBe(plan!.days.length)
    expect(plannedSessions(undefined, [])).toBe(0)
    const list = await repos.targets.list()
    expect(targetsAt(list, addDaysToKey(START, -1))).toBeUndefined()
    expect(targetsAt(list, TODAY)?.effectiveFrom).toBe(START)
  })

  it('el primer check-in espera a tener al menos 4 días de datos', async () => {
    expect(firstCheckinDay('2026-03-02', 1)).toBe('2026-03-09')
    expect(firstCheckinDay('2026-03-07', 1)).toBe('2026-03-16')
    const repos = await onboardedRepos('2026-03-20')
    const stats = (await checkinStats(repos, await context(repos)))!
    expect(stats.ready).toBe(false)
    expect(stats.trackedDays).toBe(3)
    expect(stats.firstCheckinOn).toBe('2026-03-30')
  })
})
