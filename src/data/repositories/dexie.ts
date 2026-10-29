import { liveQuery } from 'dexie'

import type { DayKey, Exercise, Food, WorkoutSet } from '@/domain/types'

import { TABLE_NAMES, type ForjaDB } from '../db'
import { defaultSettings, nowIso } from '../defaults'
import type { NutritionTargets, Settings } from '../schemas'
import { EXERCISES_DATA, FOODS_DATA } from '../seeds'
import { createBackup, restoreBackup } from './backup'
import type { CatalogRepository, Observable, Repositories } from './types'

function live<T>(query: () => Promise<T>): Observable<T> {
  return liveQuery(query)
}

const byDate = <T extends { date: DayKey }>(a: T, b: T) => a.date.localeCompare(b.date)

function catalog<T extends { id: string; name: string }>(
  base: readonly T[],
  table: {
    toArray(): Promise<T[]>
    get(id: string): Promise<T | undefined>
    put(item: T): Promise<unknown>
    delete(id: string): Promise<void>
  },
): CatalogRepository<T> {
  const baseById = new Map(base.map((item) => [item.id, item]))
  const merge = (custom: T[]) =>
    [...base, ...custom].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return {
    list: async () => merge(await table.toArray()),
    get: async (id) => baseById.get(id) ?? (await table.get(id)),
    observeAll: () => live(async () => merge(await table.toArray())),
    saveCustom: async (item) => {
      if (baseById.has(item.id))
        throw new Error('No se puede sobrescribir un elemento del catálogo base.')
      await table.put({ ...item, isCustom: true })
    },
    deleteCustom: (id) => table.delete(id),
  }
}

async function targetsFor(db: ForjaDB, date: DayKey): Promise<NutritionTargets | undefined> {
  const candidates = await db.nutritionTargets.where('effectiveFrom').belowOrEqual(date).toArray()
  return candidates
    .sort(
      (a, b) =>
        a.effectiveFrom.localeCompare(b.effectiveFrom) || a.createdAt.localeCompare(b.createdAt),
    )
    .at(-1)
}

async function completedSets(db: ForjaDB): Promise<WorkoutSet[]> {
  const sessions = await db.workoutSessions.where('status').equals('completed').primaryKeys()
  if (sessions.length === 0) return []
  return db.workoutSets.where('sessionId').anyOf(sessions).toArray()
}

/** Implementación de los repositorios sobre IndexedDB. */
export function createDexieRepositories(db: ForjaDB): Repositories {
  const getSettings = async (): Promise<Settings> =>
    (await db.settings.get('settings')) ?? defaultSettings(nowIso())

  return {
    profile: {
      get: () => db.profile.get('me'),
      save: async (profile) => {
        await db.profile.put(profile)
      },
      observe: () => live(() => db.profile.get('me')),
    },

    settings: {
      get: getSettings,
      update: async (patch) => {
        const next = { ...(await getSettings()), ...patch, updatedAt: nowIso() }
        await db.settings.put(next)
        return next
      },
      observe: () => live(getSettings),
    },

    onboarding: {
      get: () => db.onboardingDraft.get('draft'),
      save: async (step, values) => {
        await db.onboardingDraft.put({ id: 'draft', step, values, updatedAt: nowIso() })
      },
      clear: () => db.onboardingDraft.delete('draft'),
    },

    targets: {
      add: async (targets) => {
        await db.nutritionTargets.put(targets)
      },
      getFor: (date) => targetsFor(db, date),
      observeFor: (date) => live(() => targetsFor(db, date)),
      list: () => db.nutritionTargets.orderBy('effectiveFrom').toArray(),
      observeList: () => live(() => db.nutritionTargets.orderBy('effectiveFrom').toArray()),
    },

    plans: {
      getActive: () => db.trainingPlans.where('status').equals('active').first(),
      observeActive: () => live(() => db.trainingPlans.where('status').equals('active').first()),
      save: (plan) =>
        db.transaction('rw', db.trainingPlans, async () => {
          if (plan.status === 'active') {
            await db.trainingPlans
              .where('status')
              .equals('active')
              .and((p) => p.id !== plan.id)
              .modify({ status: 'archived', updatedAt: nowIso() })
          }
          await db.trainingPlans.put(plan)
        }),
    },

    foods: catalog<Food>(FOODS_DATA, db.foods),
    exercises: catalog<Exercise>(EXERCISES_DATA, db.exercises),

    foodLogs: {
      listByDate: (date) => db.foodLogs.where('date').equals(date).sortBy('createdAt'),
      listRange: (from, to) => db.foodLogs.where('date').between(from, to, true, true).toArray(),
      observeByDate: (date) =>
        live(() => db.foodLogs.where('date').equals(date).sortBy('createdAt')),
      observeRange: (from, to) =>
        live(() => db.foodLogs.where('date').between(from, to, true, true).toArray()),
      add: async (entries) => {
        await db.foodLogs.bulkPut(entries)
      },
      update: async (id, patch) => {
        await db.foodLogs.update(id, { ...patch, updatedAt: nowIso() })
      },
      remove: (id) => db.foodLogs.delete(id),
    },

    favorites: {
      list: () => db.favoriteMeals.toArray(),
      observeAll: () => live(() => db.favoriteMeals.toArray()),
      save: async (meal) => {
        await db.favoriteMeals.put(meal)
      },
      remove: (id) => db.favoriteMeals.delete(id),
    },

    mealPlans: {
      get: (date) => db.mealPlans.get(date),
      observe: (date) => live(() => db.mealPlans.get(date)),
      listRange: (from, to) => db.mealPlans.where('date').between(from, to, true, true).toArray(),
      observeRange: (from, to) =>
        live(() => db.mealPlans.where('date').between(from, to, true, true).toArray()),
      save: async (plan) => {
        await db.mealPlans.put(plan)
      },
      saveMany: async (plans) => {
        await db.mealPlans.bulkPut(plans)
      },
      remove: (date) => db.mealPlans.delete(date),
    },

    dailyLogs: {
      get: (date) => db.dailyLogs.get(date),
      observe: (date) => live(() => db.dailyLogs.get(date)),
      listRange: (from, to) => db.dailyLogs.where('date').between(from, to, true, true).toArray(),
      observeRange: (from, to) =>
        live(() => db.dailyLogs.where('date').between(from, to, true, true).toArray()),
      upsert: async (date, patch) => {
        const current = (await db.dailyLogs.get(date)) ?? {
          date,
          waterMl: 0,
          steps: 0,
          updatedAt: nowIso(),
        }
        const next = { ...current, ...patch, updatedAt: nowIso() }
        await db.dailyLogs.put(next)
        return next
      },
    },

    workouts: {
      getActive: () => db.workoutSessions.where('status').equals('in_progress').first(),
      observeActive: () =>
        live(() => db.workoutSessions.where('status').equals('in_progress').first()),
      getSession: (id) => db.workoutSessions.get(id),
      observeSession: (id) => live(() => db.workoutSessions.get(id)),
      listSessions: async () => (await db.workoutSessions.toArray()).sort(byDate),
      observeSessions: () => live(async () => (await db.workoutSessions.toArray()).sort(byDate)),
      createSession: async (session) => {
        await db.workoutSessions.put(session)
      },
      updateSession: async (id, patch) => {
        await db.workoutSessions.update(id, { ...patch, updatedAt: nowIso() })
      },
      deleteSession: (id) =>
        db.transaction('rw', db.workoutSessions, db.workoutSets, async () => {
          await db.workoutSets.where('sessionId').equals(id).delete()
          await db.workoutSessions.delete(id)
        }),
      addSet: async (set) => {
        await db.workoutSets.put(set)
      },
      addSets: async (sets) => {
        await db.workoutSets.bulkPut(sets)
      },
      updateSet: async (id, patch) => {
        await db.workoutSets.update(id, patch)
      },
      deleteSet: (id) => db.workoutSets.delete(id),
      listSetsBySession: (sessionId) =>
        db.workoutSets.where('sessionId').equals(sessionId).sortBy('performedAt'),
      observeSetsBySession: (sessionId) =>
        live(() => db.workoutSets.where('sessionId').equals(sessionId).sortBy('performedAt')),
      listSetsByExercise: (exerciseId) =>
        db.workoutSets.where('exerciseId').equals(exerciseId).sortBy('performedAt'),
      observeSetsByExercise: (exerciseId) =>
        live(() => db.workoutSets.where('exerciseId').equals(exerciseId).sortBy('performedAt')),
      listCompletedSets: () => completedSets(db),
      observeCompletedSets: () => live(() => completedSets(db)),
    },

    body: {
      upsertWeight: async (date, weightKg) => {
        await db.bodyWeights.put({ date, weightKg, updatedAt: nowIso() })
      },
      removeWeight: (date) => db.bodyWeights.delete(date),
      listWeights: () => db.bodyWeights.orderBy('date').toArray(),
      observeWeights: () => live(() => db.bodyWeights.orderBy('date').toArray()),
      addMeasurement: async (measurement) => {
        await db.measurements.put(measurement)
      },
      removeMeasurement: (id) => db.measurements.delete(id),
      listMeasurements: () => db.measurements.orderBy('date').toArray(),
      observeMeasurements: () => live(() => db.measurements.orderBy('date').toArray()),
      addPhoto: async (photo) => {
        await db.progressPhotos.put(photo)
      },
      removePhoto: (id) => db.progressPhotos.delete(id),
      observePhotos: () => live(() => db.progressPhotos.orderBy('date').toArray()),
    },

    checkins: {
      list: () => db.checkins.orderBy('weekStart').toArray(),
      observeList: () => live(() => db.checkins.orderBy('weekStart').toArray()),
      getByWeek: (weekStart) => db.checkins.where('weekStart').equals(weekStart).first(),
      save: async (checkin) => {
        await db.checkins.put(checkin)
      },
      update: async (id, patch) => {
        await db.checkins.update(id, patch)
      },
    },

    data: {
      exportAll: (options) => createBackup(db, options),
      importAll: (file) => restoreBackup(db, file),
      clearAll: () =>
        db.transaction(
          'rw',
          TABLE_NAMES.map((name) => db.table(name)),
          async () => {
            await Promise.all(TABLE_NAMES.map((name) => db.table(name).clear()))
          },
        ),
    },
  }
}
