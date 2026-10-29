import { describe, expect, it } from 'vitest'

import { fitsBudget, isFoodAllowed, type FoodPreferences } from '@/domain/nutrition/foods'
import { buildMealSlots, distributeMacros, type MealsPerDay } from '@/domain/nutrition/meals'
import { generateDayPlan } from '@/domain/nutrition/mealPlanner'
import { weeklyFoodPool } from '@/domain/nutrition/rotation'
import { buildShoppingList } from '@/domain/nutrition/shopping'
import { buildNutritionPlan } from '@/domain/nutrition/plan'
import { generateTrainingPlan } from '@/domain/training/planner'
import { EQUIPMENT_PRESETS, type EquipmentPreset } from '@/domain/training/selection'
import { MAIN_LIFTS } from '@/domain/types'

import { EXERCISES_DATA, FOODS_DATA, TIPS_DATA, validateSeeds } from '.'

describe('seeds', () => {
  it('pasan la validación Zod y de coherencia', () => {
    const report = validateSeeds()
    expect(report.errors).toEqual([])
    expect(report.foods).toBeGreaterThanOrEqual(200)
    expect(report.exercises).toBeGreaterThanOrEqual(100)
    expect(report.tips).toBeGreaterThanOrEqual(50)
  })

  it('cada alimento declara su fuente (ICBF o USDA)', () => {
    for (const food of FOODS_DATA) expect(food.source).toMatch(/ICBF|USDA|Calculado/)
  })

  it('hay un ejercicio etiquetado para cada básico', () => {
    for (const lift of MAIN_LIFTS)
      expect(EXERCISES_DATA.some((e) => e.mainLift === lift)).toBe(true)
    expect(TIPS_DATA.every((t) => t.text.length > 0)).toBe(true)
  })
})

describe('generador de comidas con el catálogo real', () => {
  const base: FoodPreferences = {
    restrictions: [],
    allergens: [],
    dislikedFoodIds: [],
    budget: 'medium',
  }
  const cases: {
    label: string
    prefs: FoodPreferences
    meals: MealsPerDay
    training: string | null
  }[] = [
    { label: 'omnívoro, 4 comidas, entreno 18:00', prefs: base, meals: 4, training: '18:00' },
    {
      label: 'presupuesto bajo, 3 comidas',
      prefs: { ...base, budget: 'low' },
      meals: 3,
      training: '07:00',
    },
    {
      label: 'vegetariano, 5 comidas',
      prefs: { ...base, restrictions: ['vegetarian'] },
      meals: 5,
      training: '19:00',
    },
    {
      label: 'sin lactosa, 6 comidas',
      prefs: { ...base, restrictions: ['lactose-free'], budget: 'high' },
      meals: 6,
      training: null,
    },
  ]

  const plan = buildNutritionPlan({
    sex: 'male',
    age: 30,
    heightCm: 178,
    weightKg: 80,
    bodyFatPct: 18,
    bodyFatReliable: false,
    jobType: 'sedentary',
    avgSteps: 7000,
    trainingDaysPerWeek: 4,
    sessionMinutes: 60,
    noDeficit: false,
    carbCycling: false,
  })
  const macros = { protein: plan.protein.value, carbs: plan.carbs.value, fat: plan.fat.value }
  const dayTarget = { kcal: macros.protein * 4 + macros.carbs * 4 + macros.fat * 9, ...macros }

  it.each(cases)('$label: 14 días dentro de ±5 %', ({ prefs, meals, training }) => {
    const foods = FOODS_DATA.filter((f) => isFoodAllowed(f, prefs) && fitsBudget(f, prefs.budget))
    const targets = distributeMacros(buildMealSlots(meals, training), dayTarget)
    for (let day = 0; day < 14; day++) {
      const result = generateDayPlan({ meals: targets, foods, dayTarget, seed: 20260101 + day })
      expect(result.withinTolerance, JSON.stringify(result.deviation)).toBe(true)
    }
  })

  it.each(cases)(
    '$label: la rotación semanal cuadra y deja una lista corta',
    ({ prefs, meals, training }) => {
      const foods = FOODS_DATA.filter((f) => isFoodAllowed(f, prefs) && fitsBudget(f, prefs.budget))
      const targets = distributeMacros(buildMealSlots(meals, training), dayTarget)
      for (let week = 0; week < 4; week++) {
        const pool = weeklyFoodPool(foods, 1000 + week * 31)
        const days = Array.from({ length: 7 }, (_, d) => {
          const result = generateDayPlan({
            meals: targets,
            foods: pool,
            dayTarget,
            seed: 5000 + week * 7 + d,
          })
          expect(result.withinTolerance, JSON.stringify(result.deviation)).toBe(true)
          return result.meals.flatMap((m) => m.items)
        })
        const items = buildShoppingList(days, foods).reduce((acc, g) => acc + g.items.length, 0)
        expect(items).toBeGreaterThanOrEqual(12)
        expect(items).toBeLessThanOrEqual(30)
      }
    },
  )
})

describe('plan de entrenamiento con la biblioteca real', () => {
  const presets: EquipmentPreset[] = ['gym', 'dumbbells', 'home']

  it.each(presets)('equipo %s: plan completo de 4 días', (preset) => {
    const { value } = generateTrainingPlan({
      experience: 'intermediate',
      daysPerWeek: 4,
      availableWeekdays: [1, 2, 3, 4, 5],
      sessionMinutes: 75,
      equipment: EQUIPMENT_PRESETS[preset],
      injuries: [],
      excludedExerciseIds: [],
      priorityMuscles: [],
      exercises: EXERCISES_DATA,
    })
    expect(value.days).toHaveLength(4)
    value.days.forEach((d) => expect(d.exercises.length).toBeGreaterThanOrEqual(4))
    if (preset === 'gym') {
      expect(value.warnings).toEqual([])
      const mainIds = value.days.flatMap((d) =>
        d.exercises.filter((e) => e.role === 'main').map((e) => e.exerciseId),
      )
      expect(mainIds).toEqual([
        'bench-press',
        'barbell-row',
        'back-squat',
        'overhead-press',
        'pull-up',
        'deadlift',
      ])
    }
  })

  it('con lesión lumbar evita peso muerto y remo con barra', () => {
    const { value } = generateTrainingPlan({
      experience: 'beginner',
      daysPerWeek: 3,
      availableWeekdays: [1, 3, 5],
      sessionMinutes: 60,
      equipment: EQUIPMENT_PRESETS.gym,
      injuries: ['lower-back'],
      excludedExerciseIds: [],
      priorityMuscles: ['glutes'],
      exercises: EXERCISES_DATA,
    })
    const ids = value.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
    expect(ids).not.toContain('deadlift')
    expect(ids).not.toContain('barbell-row')
  })

  it('en gimnasio prefiere cargas progresables a bandas o variantes sin carga', () => {
    // IndexedDB devuelve el catálogo ordenado por id: el orden no debe decidir la calidad del plan.
    const sorted = [...EXERCISES_DATA].sort((a, b) => a.id.localeCompare(b.id))
    const { value } = generateTrainingPlan({
      experience: 'intermediate',
      daysPerWeek: 4,
      availableWeekdays: [1, 2, 4, 5],
      sessionMinutes: 60,
      equipment: EQUIPMENT_PRESETS.gym,
      injuries: [],
      excludedExerciseIds: [],
      priorityMuscles: [],
      exercises: sorted,
    })
    const byId = new Map(sorted.map((e) => [e.id, e]))
    const chosen = value.days.flatMap((d) => d.exercises.map((e) => byId.get(e.exerciseId)!))
    expect(chosen.filter((e) => e.loadType === 'fixed').map((e) => e.id)).toEqual([])
    expect(chosen.map((e) => e.id)).not.toContain('assisted-pull-up')
    expect(chosen.map((e) => e.id)).not.toContain('pike-push-up')
  })
})
