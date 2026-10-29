// @vitest-environment node
import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ForjaDB } from '../db'
import { defaultSettings, newId, nowIso } from '../defaults'
import type { NutritionTargets, TrainingPlan, WorkoutSession } from '../schemas'
import { BackupError } from './backup'
import { createDexieRepositories } from './dexie'
import type { Observable, Repositories } from './types'

let db: ForjaDB
let repos: Repositories

beforeEach(async () => {
  db = new ForjaDB(`test-${newId()}`)
  await db.open()
  repos = createDexieRepositories(db)
})

afterEach(async () => {
  db.close()
  await db.delete()
})

function first<T>(observable: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const sub = observable.subscribe({
      next: (value) => {
        resolve(value)
        queueMicrotask(() => sub.unsubscribe())
      },
      error: reject,
    })
  })
}

const targets = (over: Partial<NutritionTargets>): NutritionTargets => ({
  id: newId(),
  effectiveFrom: '2026-01-01',
  source: 'onboarding',
  kcal: 2200,
  protein: 175,
  carbs: 225,
  fat: 65,
  fiber: 31,
  waterMl: 2800,
  waterTrainingMl: 3450,
  bmr: 1767.5,
  tdee: 2739.6,
  trainingDayBonusCarbs: 0,
  carbCycle: null,
  explanations: {},
  note: '',
  createdAt: nowIso(),
  ...over,
})

const session = (over: Partial<WorkoutSession>): WorkoutSession => ({
  id: newId(),
  date: '2026-01-05',
  startedAt: '2026-01-05T18:00:00.000Z',
  endedAt: null,
  status: 'in_progress',
  planId: null,
  planDayId: null,
  title: 'Torso A',
  exerciseIds: [],
  isDeload: false,
  feeling: null,
  energy: null,
  sleep: null,
  notes: '',
  createdAt: nowIso(),
  updatedAt: nowIso(),
  ...over,
})

describe('ajustes', () => {
  it('devuelve valores por defecto y guarda cambios parciales', async () => {
    expect((await repos.settings.get()).unit).toBe('kg')
    const updated = await repos.settings.update({ unit: 'lb', checkinWeekday: 7 })
    expect(updated).toMatchObject({ unit: 'lb', checkinWeekday: 7 })
    expect((await first(repos.settings.observe())).unit).toBe('lb')
  })
})

describe('borrador del onboarding', () => {
  it('guarda, lee y borra el avance', async () => {
    await repos.onboarding.save(3, { name: 'Ana' })
    expect((await repos.onboarding.get())?.step).toBe(3)
    await repos.onboarding.clear()
    expect(await repos.onboarding.get()).toBeUndefined()
  })
})

describe('objetivos nutricionales', () => {
  it('devuelve los vigentes para cada fecha', async () => {
    await repos.targets.add(targets({ effectiveFrom: '2026-01-01', kcal: 2200 }))
    await repos.targets.add(targets({ effectiveFrom: '2026-01-15', kcal: 2100, source: 'checkin' }))
    expect((await repos.targets.getFor('2025-12-31'))?.kcal).toBeUndefined()
    expect((await repos.targets.getFor('2026-01-10'))?.kcal).toBe(2200)
    expect((await repos.targets.getFor('2026-02-01'))?.kcal).toBe(2100)
    expect((await first(repos.targets.observeFor('2026-01-20')))?.kcal).toBe(2100)
    expect(await repos.targets.list()).toHaveLength(2)
    expect(await first(repos.targets.observeList())).toHaveLength(2)
  })
})

describe('plan de entrenamiento', () => {
  it('al activar un plan archiva el anterior', async () => {
    const plan = (id: string): TrainingPlan => ({
      id,
      status: 'active',
      splitId: 'upper-lower',
      splitName: 'Torso / Pierna',
      blockStartDate: '2026-01-05',
      days: [],
      warnings: [],
      explanation: { title: 'Plan', summary: '...' },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    await repos.plans.save(plan('a'))
    await repos.plans.save(plan('b'))
    expect((await repos.plans.getActive())?.id).toBe('b')
    expect((await db.trainingPlans.get('a'))?.status).toBe('archived')
    expect((await first(repos.plans.observeActive()))?.id).toBe('b')
  })
})

describe('catálogos', () => {
  it('combina el catálogo base con los personalizados', async () => {
    const base = await repos.foods.list()
    expect(base.length).toBeGreaterThanOrEqual(200)
    const rice = await repos.foods.get('arroz-blanco')
    expect(rice?.name).toBe('Arroz blanco cocido')
    await repos.foods.saveCustom({ ...rice!, id: 'mi-arepa', name: 'Mi arepa' })
    expect((await repos.foods.get('mi-arepa'))?.isCustom).toBe(true)
    expect(await first(repos.foods.observeAll())).toHaveLength(base.length + 1)
    await expect(repos.foods.saveCustom(rice!)).rejects.toThrow('catálogo base')
    await repos.foods.deleteCustom('mi-arepa')
    expect(await repos.foods.get('mi-arepa')).toBeUndefined()
    expect((await repos.exercises.list()).length).toBeGreaterThanOrEqual(100)
  })
})

describe('registro de comidas, favoritas, planes y registros diarios', () => {
  it('agrega, consulta por fecha y rango, actualiza y borra', async () => {
    const entry = {
      id: 'e1',
      date: '2026-01-05',
      mealIndex: 0,
      kind: 'food' as const,
      foodId: 'arroz-blanco',
      name: 'Arroz',
      grams: 100,
      measureLabel: null,
      quantity: null,
      kcal: 161,
      protein: 2.3,
      carbs: 32.5,
      fat: 2.1,
      fiber: 1.6,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    await repos.foodLogs.add([entry, { ...entry, id: 'e2', date: '2026-01-06' }])
    expect(await repos.foodLogs.listByDate('2026-01-05')).toHaveLength(1)
    expect(await repos.foodLogs.listRange('2026-01-01', '2026-01-31')).toHaveLength(2)
    expect(await first(repos.foodLogs.observeByDate('2026-01-06'))).toHaveLength(1)
    expect(await first(repos.foodLogs.observeRange('2026-01-01', '2026-01-05'))).toHaveLength(1)
    await repos.foodLogs.update('e1', { grams: 200 })
    expect((await repos.foodLogs.listByDate('2026-01-05'))[0]?.grams).toBe(200)
    await repos.foodLogs.remove('e1')
    expect(await repos.foodLogs.listByDate('2026-01-05')).toEqual([])

    await repos.favorites.save({
      id: 'f1',
      name: 'Desayuno',
      items: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    expect(await repos.favorites.list()).toHaveLength(1)
    expect(await first(repos.favorites.observeAll())).toHaveLength(1)
    await repos.favorites.remove('f1')
    expect(await repos.favorites.list()).toHaveLength(0)

    const mealPlan = {
      date: '2026-01-05',
      seed: 1,
      target: { kcal: 1, protein: 1, carbs: 1, fat: 1 },
      meals: [],
      generatedAt: nowIso(),
    }
    await repos.mealPlans.save(mealPlan)
    await repos.mealPlans.saveMany([{ ...mealPlan, date: '2026-01-06' }])
    expect(await repos.mealPlans.get('2026-01-05')).toBeDefined()
    expect(await first(repos.mealPlans.observe('2026-01-06'))).toBeDefined()
    expect(await repos.mealPlans.listRange('2026-01-01', '2026-01-31')).toHaveLength(2)
    expect(await first(repos.mealPlans.observeRange('2026-01-06', '2026-01-31'))).toHaveLength(1)
    await repos.mealPlans.remove('2026-01-05')
    expect(await repos.mealPlans.get('2026-01-05')).toBeUndefined()

    await repos.dailyLogs.upsert('2026-01-05', { waterMl: 500 })
    const log = await repos.dailyLogs.upsert('2026-01-05', { steps: 8000 })
    expect(log).toMatchObject({ waterMl: 500, steps: 8000 })
    expect((await repos.dailyLogs.get('2026-01-05'))?.steps).toBe(8000)
    expect(await first(repos.dailyLogs.observe('2026-01-05'))).toBeDefined()
    expect(await repos.dailyLogs.listRange('2026-01-01', '2026-01-31')).toHaveLength(1)
    expect(await first(repos.dailyLogs.observeRange('2026-01-01', '2026-01-31'))).toHaveLength(1)
  })
})

describe('entrenamientos', () => {
  it('sesión en curso, series y series de sesiones terminadas', async () => {
    expect(await repos.workouts.listCompletedSets()).toEqual([])
    const active = session({ id: 's1' })
    await repos.workouts.createSession(active)
    expect((await repos.workouts.getActive())?.id).toBe('s1')
    expect((await first(repos.workouts.observeActive()))?.id).toBe('s1')
    const set = {
      id: 'x1',
      sessionId: 's1',
      exerciseId: 'bench-press',
      exerciseOrder: 0,
      setIndex: 0,
      weightKg: 80,
      reps: 8,
      rir: 2,
      isWarmup: false,
      date: '2026-01-05',
      performedAt: '2026-01-05T18:05:00.000Z',
    }
    await repos.workouts.addSet(set)
    await repos.workouts.addSets([
      { ...set, id: 'x2', setIndex: 1, performedAt: '2026-01-05T18:08:00.000Z' },
    ])
    await repos.workouts.updateSet('x2', { reps: 7 })
    expect((await repos.workouts.listSetsBySession('s1')).map((s) => s.reps)).toEqual([8, 7])
    expect(await first(repos.workouts.observeSetsBySession('s1'))).toHaveLength(2)
    expect(await repos.workouts.listSetsByExercise('bench-press')).toHaveLength(2)
    expect(await first(repos.workouts.observeSetsByExercise('bench-press'))).toHaveLength(2)
    expect(await repos.workouts.listCompletedSets()).toEqual([])

    await repos.workouts.updateSession('s1', {
      status: 'completed',
      endedAt: '2026-01-05T19:00:00.000Z',
    })
    expect(await repos.workouts.listCompletedSets()).toHaveLength(2)
    expect(await first(repos.workouts.observeCompletedSets())).toHaveLength(2)
    expect((await repos.workouts.getSession('s1'))?.status).toBe('completed')
    expect((await first(repos.workouts.observeSession('s1')))?.id).toBe('s1')
    await repos.workouts.createSession(session({ id: 's0', date: '2026-01-01' }))
    expect((await repos.workouts.listSessions()).map((s) => s.id)).toEqual(['s0', 's1'])
    expect(await first(repos.workouts.observeSessions())).toHaveLength(2)

    await repos.workouts.deleteSet('x2')
    await repos.workouts.deleteSession('s1')
    expect(await repos.workouts.listSetsBySession('s1')).toEqual([])
  })
})

describe('cuerpo y check-ins', () => {
  it('peso, medidas, fotos y check-ins', async () => {
    await repos.body.upsertWeight('2026-01-02', 80)
    await repos.body.upsertWeight('2026-01-01', 81)
    expect((await repos.body.listWeights()).map((w) => w.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
    ])
    expect(await first(repos.body.observeWeights())).toHaveLength(2)
    await repos.body.removeWeight('2026-01-01')
    expect(await repos.body.listWeights()).toHaveLength(1)

    await repos.body.addMeasurement({
      id: 'm1',
      date: '2026-01-01',
      waistCm: 85,
      createdAt: nowIso(),
    })
    expect(await repos.body.listMeasurements()).toHaveLength(1)
    expect(await first(repos.body.observeMeasurements())).toHaveLength(1)
    await repos.body.removeMeasurement('m1')
    expect(await repos.body.listMeasurements()).toHaveLength(0)

    const blob = new Blob(['img'], { type: 'image/jpeg' })
    await repos.body.addPhoto({
      id: 'p1',
      date: '2026-01-01',
      pose: 'front',
      blob,
      thumb: blob,
      createdAt: nowIso(),
    })
    expect(await first(repos.body.observePhotos())).toHaveLength(1)
    await repos.body.removePhoto('p1')
    expect(await first(repos.body.observePhotos())).toHaveLength(0)

    const checkin = {
      id: 'c1',
      weekStart: '2025-12-29',
      weekEnd: '2026-01-04',
      date: '2026-01-05',
      avgWeightKg: 80,
      weeklyChangePct: -0.5,
      previousWeeklyChangePct: null,
      waistCm: 85,
      waistChangeCm: null,
      nutritionAdherencePct: 90,
      trainingAdherencePct: 100,
      sleep: 4,
      stress: 2,
      hunger: 3,
      energy: 4,
      recommendation: {
        type: 'keep',
        kcalDelta: 0,
        trainingDayCarbsDelta: 0,
        actionable: false,
        notes: [],
      },
      explanation: { title: 'ok', summary: 'ok' },
      decision: 'pending' as const,
      decidedAt: null,
      createdAt: nowIso(),
    }
    await repos.checkins.save(checkin)
    await repos.checkins.update('c1', { decision: 'ignored' })
    expect((await repos.checkins.getByWeek('2025-12-29'))?.decision).toBe('ignored')
    expect(await repos.checkins.list()).toHaveLength(1)
    expect(await first(repos.checkins.observeList())).toHaveLength(1)
  })
})

describe('respaldo', () => {
  it('exporta e importa todos los datos, con fotos', async () => {
    await db.settings.put(defaultSettings(nowIso()))
    await repos.body.upsertWeight('2026-01-01', 80)
    const blob = new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' })
    await repos.body.addPhoto({
      id: 'p1',
      date: '2026-01-01',
      pose: 'front',
      blob,
      thumb: blob,
      createdAt: nowIso(),
    })

    const file = await repos.data.exportAll({ includePhotos: true, theme: 'light' })
    expect(file.app).toBe('forja')
    const json = JSON.parse(JSON.stringify(file)) as unknown

    await repos.data.clearAll()
    expect(await repos.body.listWeights()).toEqual([])

    const result = await repos.data.importAll(json)
    expect(result.theme).toBe('light')
    expect(result.counts.bodyWeights).toBe(1)
    const [photo] = await db.progressPhotos.toArray()
    expect(new Uint8Array(await photo!.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 250]))
    expect(photo!.blob.type).toBe('image/jpeg')
  })

  it('puede excluir fotos y rechaza archivos inválidos', async () => {
    const blob = new Blob(['x'])
    await repos.body.addPhoto({
      id: 'p1',
      date: '2026-01-01',
      pose: 'front',
      blob,
      thumb: blob,
      createdAt: nowIso(),
    })
    const file = await repos.data.exportAll({ includePhotos: false, theme: null })
    expect(file.tables.progressPhotos).toEqual([])
    await expect(repos.data.importAll({ app: 'otra' })).rejects.toBeInstanceOf(BackupError)
    await expect(repos.data.importAll(null)).rejects.toThrow('respaldo válido')
    await expect(
      repos.data.importAll({
        ...file,
        tables: { bodyWeights: [{ date: 'mal', weightKg: 80, updatedAt: nowIso() }] },
      }),
    ).rejects.toThrow('bodyWeights')
  })

  it('acepta data URLs sin tipo', async () => {
    const file = await repos.data.exportAll({ includePhotos: false, theme: null })
    const photo = {
      id: 'p',
      date: '2026-01-01',
      pose: 'side',
      blob: 'data:;base64,AQI=',
      thumb: 'data:,',
      createdAt: nowIso(),
    }
    await repos.data.importAll({ ...file, tables: { ...file.tables, progressPhotos: [photo] } })
    const [stored] = await db.progressPhotos.toArray()
    expect(stored!.blob.type).toBe('application/octet-stream')
  })
})
