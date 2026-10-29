import { describe, expect, it } from 'vitest'

import { buildNutritionPlan } from './plan'
import {
  computeCalorieTarget,
  computeCarbCycle,
  computeFiber,
  computeMacros,
  computeWater,
} from './targets'

const base = { sex: 'male' as const, weightKg: 80, tdee: 2739.6, bmr: 1767.5, noDeficit: false }

describe('calorías objetivo', () => {
  it('banda moderada: el ritmo de 0.6 %/semana elige el déficit dentro de 15–20 %', () => {
    const { value } = computeCalorieTarget({ ...base, bodyFatPct: 18 })
    expect(value.kcal).toBe(2200)
    expect(value.category).toBe('moderate')
    expect(value.deficitPct).toBe(19.7)
    expect(value.expectedWeeklyLossKg).toBe(0.49)
    expect(value.bmrFloorApplied).toBe(false)
  })

  it('banda baja: déficit fijo de 10 % para preservar fuerza', () => {
    const { value, explanation } = computeCalorieTarget({ ...base, bodyFatPct: 12 })
    expect(value.kcal).toBe(2475)
    expect(explanation.steps?.[1]?.value).toContain('10 %')
  })

  it('banda alta: mínimo 20 % de déficit', () => {
    expect(computeCalorieTarget({ ...base, bodyFatPct: 30 }).value.kcal).toBe(2200)
  })

  it('nunca supera 1 % del peso por semana', () => {
    const { value } = computeCalorieTarget({
      ...base,
      weightKg: 50,
      tdee: 3000,
      bmr: 1300,
      bodyFatPct: 35,
      sex: 'female',
    })
    expect(value.deficitKcal).toBe(550)
  })

  it('nunca baja de la TMB', () => {
    const { value, explanation } = computeCalorieTarget({
      ...base,
      tdee: 1900,
      bmr: 1800,
      bodyFatPct: 12,
    })
    expect(value.kcal).toBe(1800)
    expect(value.bmrFloorApplied).toBe(true)
    expect(explanation.steps?.at(-1)?.label).toBe('Piso de seguridad')
  })

  it('respeta un ritmo objetivo personalizado', () => {
    const { value } = computeCalorieTarget({ ...base, bodyFatPct: 18, targetWeeklyRate: 0.005 })
    expect(value.kcal).toBe(2300)
  })

  it('en embarazo, lactancia o TCA queda en mantenimiento', () => {
    const { value } = computeCalorieTarget({ ...base, bodyFatPct: 25, noDeficit: true })
    expect(value).toMatchObject({ kcal: 2750, deficitKcal: 0, maintenance: true })
  })
})

describe('macros', () => {
  it('proteína 2.2 g/kg, grasa 0.8 g/kg y carbos el resto, redondeados a 5 g', () => {
    const macros = computeMacros({ kcal: 2200, weightKg: 80, bodyFatPct: 18, sex: 'male' })
    expect(macros.protein.value).toBe(175)
    expect(macros.fat.value).toBe(65)
    expect(macros.carbs.value).toBe(225)
    expect(macros.kcalFromMacros).toBe(2185)
  })

  it('con % de grasa alto calcula la proteína sobre masa magra', () => {
    const macros = computeMacros({ kcal: 2400, weightKg: 100, bodyFatPct: 30, sex: 'male' })
    expect(macros.protein.value).toBe(175)
    expect(macros.protein.explanation.summary).toContain('masa magra')
  })

  it('la grasa nunca baja del 20 % de las calorías', () => {
    expect(
      computeMacros({ kcal: 2500, weightKg: 50, bodyFatPct: 20, sex: 'female' }).fat.value,
    ).toBe(60)
  })

  it('los carbos nunca son negativos', () => {
    expect(
      computeMacros({ kcal: 1000, weightKg: 100, bodyFatPct: 18, sex: 'male' }).carbs.value,
    ).toBe(0)
  })
})

describe('ciclado de carbos', () => {
  it('mueve carbos de los días de descanso a los de entreno manteniendo el promedio', () => {
    const cycle = computeCarbCycle({ kcal: 2200, carbs: 225, trainingDaysPerWeek: 4, bmr: 1767.5 })
    expect(cycle?.value).toEqual({
      trainingDay: { carbs: 265, kcal: 2360 },
      restDay: { carbs: 170, kcal: 1980 },
    })
    expect(cycle?.explanation.summary).toContain('2197')
  })

  it('no aplica sin días de descanso, sin entrenos o sin margen sobre la TMB', () => {
    expect(
      computeCarbCycle({ kcal: 2200, carbs: 225, trainingDaysPerWeek: 7, bmr: 1700 }),
    ).toBeNull()
    expect(
      computeCarbCycle({ kcal: 2200, carbs: 225, trainingDaysPerWeek: 0, bmr: 1700 }),
    ).toBeNull()
    expect(
      computeCarbCycle({ kcal: 1800, carbs: 150, trainingDaysPerWeek: 4, bmr: 1800 }),
    ).toBeNull()
  })
})

describe('fibra y agua', () => {
  it('fibra = 14 g por cada 1000 kcal', () => {
    expect(computeFiber(2200).value).toBe(31)
  })

  it('agua = 35 ml/kg + 500–750 ml por hora de entreno', () => {
    expect(computeWater(80, 60).value).toEqual({
      baseMl: 2800,
      trainingDayMl: 3450,
      extraRangeMl: [500, 750],
    })
  })
})

describe('plan nutricional completo', () => {
  const input = {
    sex: 'male' as const,
    age: 30,
    heightCm: 178,
    weightKg: 80,
    bodyFatPct: 18,
    bodyFatReliable: false,
    jobType: 'sedentary' as const,
    avgSteps: 6000,
    trainingDaysPerWeek: 4,
    sessionMinutes: 60,
    noDeficit: false,
    carbCycling: false,
  }

  it('encadena TMB, actividad, gasto, déficit y macros', () => {
    const plan = buildNutritionPlan(input)
    expect(plan.bmr.value).toBe(1767.5)
    expect(plan.activity.value.id).toBe('moderate')
    expect(plan.tdee.value).toBe(2739.6)
    expect(plan.calories.value.kcal).toBe(2200)
    expect(plan.protein.value).toBe(175)
    expect(plan.carbCycle).toBeNull()
  })

  it('usa Katch-McArdle con % fiable, ciclado y ritmo personalizado', () => {
    const plan = buildNutritionPlan({
      ...input,
      bodyFatReliable: true,
      carbCycling: true,
      targetWeeklyRate: 0.005,
    })
    expect(plan.bmr.explanation.formula).toContain('masa magra')
    expect(plan.carbCycle).not.toBeNull()
  })
})
