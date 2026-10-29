import { describe, expect, it } from 'vitest'

import { FOODS, food } from '@/test/fixtures'

import {
  buildMealSlots,
  distributeMacros,
  distributeWithBounds,
  roundPreservingTotal,
} from './meals'
import {
  candidatesFor,
  generateDayPlan,
  isWithinTolerance,
  maxGramsFor,
  mealTotals,
  portionStep,
  recomputePlan,
  solveGrams,
} from './mealPlanner'

const summarize = (slots: ReturnType<typeof buildMealSlots>) =>
  slots.map(
    (s) => `${s.time} ${s.name}${s.isPreWorkout ? ' PRE' : ''}${s.isPostWorkout ? ' POST' : ''}`,
  )

describe('horario de comidas', () => {
  it('sin entreno no marca pre ni post', () => {
    expect(summarize(buildMealSlots(3, null))).toEqual([
      '07:00 Desayuno',
      '13:00 Almuerzo',
      '19:30 Cena',
    ])
  })

  it('marca la comida que cae 1–3 h antes como pre-entreno', () => {
    expect(summarize(buildMealSlots(4, '18:00'))).toEqual([
      '07:00 Desayuno',
      '12:30 Almuerzo',
      '16:30 Onces PRE',
      '20:00 Cena POST',
    ])
  })

  it('mueve un snack a 90 min antes si ninguna comida cae en la ventana', () => {
    expect(summarize(buildMealSlots(4, '20:30'))).toEqual([
      '07:00 Desayuno',
      '12:30 Almuerzo',
      '19:00 Onces PRE',
      '22:00 Cena POST',
    ])
  })

  it('entre varios snacks mueve el más cercano a la hora objetivo', () => {
    const slots = buildMealSlots(5, '23:10')
    expect(slots.find((s) => s.isPreWorkout)).toMatchObject({ name: 'Onces', time: '21:40' })
  })

  it('no mueve un snack si quedaría muy cerca de la comida anterior', () => {
    const slots = buildMealSlots(4, '15:40')
    expect(slots.some((s) => s.isPreWorkout)).toBe(false)
    expect(slots.find((s) => s.isPostWorkout)?.name).toBe('Cena')
  })

  it('entreno en ayunas temprano: solo post-entreno', () => {
    expect(summarize(buildMealSlots(6, '05:30'))[0]).toBe('06:30 Desayuno POST')
  })

  it('sin pre-entreno posible con 3 comidas', () => {
    expect(summarize(buildMealSlots(3, '18:00'))).toEqual([
      '07:00 Desayuno',
      '13:00 Almuerzo',
      '19:30 Cena POST',
    ])
  })

  it('no mueve la cena pasada la medianoche', () => {
    const slots = buildMealSlots(3, '23:00', 90)
    expect(slots.some((s) => s.isPostWorkout)).toBe(false)
  })
})

describe('reparto con límites', () => {
  it('reparte en partes iguales cuando cabe', () => {
    expect(distributeWithBounds(160, [1, 1, 1, 1], 25, 50)).toEqual([40, 40, 40, 40])
  })

  it('sube los snacks al mínimo y reparte el resto', () => {
    expect(distributeWithBounds(140, [1, 0.6, 1, 0.6, 1], 25, 50).map(Math.round)).toEqual([
      30, 25, 30, 25, 30,
    ])
  })

  it('topa las comidas principales y pasa el sobrante a los snacks', () => {
    expect(distributeWithBounds(230, [1, 0.6, 1, 0.6, 1], 25, 50).map(Math.round)).toEqual([
      50, 40, 50, 40, 50,
    ])
  })

  it('si es imposible, reparte proporcional', () => {
    expect(distributeWithBounds(220, [1, 1, 1], 25, 50).map(Math.round)).toEqual([73, 73, 73])
  })
})

describe('redondeo que conserva la suma', () => {
  it('reparte el redondeo según el mayor residuo', () => {
    expect(roundPreservingTotal([43.75, 43.75, 43.75, 43.75], 5)).toEqual([45, 45, 45, 40])
  })
})

describe('reparto de macros', () => {
  it('pone más carbos y menos grasa alrededor del entreno', () => {
    const meals = distributeMacros(buildMealSlots(4, '18:00'), {
      protein: 175,
      carbs: 225,
      fat: 65,
    })
    const pre = meals.find((m) => m.isPreWorkout)
    const breakfast = meals.find((m) => m.kind === 'breakfast')
    expect(pre?.target.carbs).toBeGreaterThan(40)
    expect(pre?.target.fat).toBeLessThan(breakfast?.target.fat ?? 0)
    meals.forEach((m) => expect(m.target.protein).toBeGreaterThanOrEqual(25))
    expect(meals.reduce((a, m) => a + m.target.protein, 0)).toBe(175)
    expect(meals.reduce((a, m) => a + m.target.carbs, 0)).toBe(225)
    expect(meals.reduce((a, m) => a + m.target.fat, 0)).toBe(65)
  })
})

describe('generador de comidas', () => {
  const dayTarget = { kcal: 2185, protein: 175, carbs: 225, fat: 65 }

  it('genera un día dentro de ±5 % en kcal y macros', () => {
    const meals = distributeMacros(buildMealSlots(4, '18:00'), dayTarget)
    const plan = generateDayPlan({ meals, foods: FOODS, dayTarget, seed: 7 })
    expect(plan.meals).toHaveLength(4)
    expect(plan.withinTolerance).toBe(true)
    expect(Math.abs(plan.deviation.protein)).toBeLessThanOrEqual(0.05)
    plan.meals.forEach((m) => expect(m.items.length).toBeGreaterThan(0))
  })

  it('es determinista con la misma semilla', () => {
    const meals = distributeMacros(buildMealSlots(5, '07:00'), dayTarget)
    const a = generateDayPlan({ meals, foods: FOODS, dayTarget, seed: 3 })
    const b = generateDayPlan({ meals, foods: FOODS, dayTarget, seed: 3 })
    expect(a).toEqual(b)
  })

  it('omite roles sin alimentos disponibles y avisa si no llega a la tolerancia', () => {
    const meals = distributeMacros(buildMealSlots(3, null), dayTarget)
    const onlyChicken = FOODS.filter((f) => f.id === 'chicken')
    const plan = generateDayPlan({ meals, foods: onlyChicken, dayTarget, seed: 1 })
    expect(plan.withinTolerance).toBe(false)
    expect(plan.meals[0]?.items).toEqual([])
  })

  it('prefiere alimentos bajos en grasa antes y después de entrenar', () => {
    const [pre] = distributeMacros(buildMealSlots(4, '18:00'), dayTarget).filter(
      (m) => m.isPreWorkout,
    )
    expect(candidatesFor(FOODS, 'protein', pre!).every((f) => f.per100g.fat <= 10)).toBe(true)
    expect(
      candidatesFor(
        [food({ ...FOODS[0]!, per100g: { ...FOODS[0]!.per100g, fat: 20 } })],
        'protein',
        pre!,
      ),
    ).toHaveLength(1)
  })

  it('usa unidades enteras para huevos y scoops, y 5–10 g para el resto', () => {
    const egg = FOODS.find((f) => f.id === 'egg')!
    const rice = FOODS.find((f) => f.id === 'rice')!
    expect(portionStep(egg, 100)).toBe(50)
    expect(portionStep(rice, 100)).toBe(5)
    expect(portionStep(rice, 200)).toBe(10)
  })

  it('el optimizador deja en el mínimo un alimento sin macros', () => {
    const water = food({
      id: 'water',
      name: 'Agua',
      category: 'beverage',
      per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      roles: ['carb'],
      slots: ['lunch'],
    })
    const variables = [{ food: water, role: 'carb' as const, lo: 20, hi: 400, grams: 50 }]
    solveGrams({ protein: 10, carbs: 10, fat: 10 }, variables)
    expect(variables[0]?.grams).toBe(20)
  })

  it('limita gramos por macro y tolera alimentos sin ese macro', () => {
    const rice = FOODS.find((f) => f.id === 'rice')!
    expect(maxGramsFor(rice, 'carb')).toBeCloseTo(428.6, 1)
    expect(maxGramsFor(rice, 'fat')).toBe(450)
    expect(
      maxGramsFor(
        FOODS.find((f) => f.id === 'chicken')!,
        'carb',
      ),
    ).toBe(450)
    expect(
      maxGramsFor(
        FOODS.find((f) => f.id === 'broccoli')!,
        'protein',
      ),
    ).toBe(450)
  })

  it('desviación cero cuando el objetivo de un macro es cero', () => {
    const plan = recomputePlan(
      { meals: [], target: { kcal: 0, protein: 0, carbs: 0, fat: 0 } },
      FOODS,
    )
    expect(plan.deviation).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })

  it('recalcula totales tras editar e ignora alimentos desconocidos', () => {
    const meals = distributeMacros(buildMealSlots(3, null), dayTarget)
    const plan = generateDayPlan({ meals, foods: FOODS, dayTarget, seed: 2 })
    const edited = recomputePlan(
      {
        ...plan,
        meals: plan.meals.map((m, i) =>
          i === 0 ? { ...m, items: [...m.items, { foodId: 'nope', grams: 100, role: 'carb' }] } : m,
        ),
      },
      FOODS,
    )
    expect(edited.totals).toEqual(plan.totals)
    expect(mealTotals([], new Map()).kcal).toBe(0)
    expect(isWithinTolerance({ kcal: 0.06, protein: 0, carbs: 0, fat: 0 })).toBe(false)
  })
})
