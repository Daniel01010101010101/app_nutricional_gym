import { describe, expect, it } from 'vitest'

import { FOODS, food } from '@/test/fixtures'

import {
  fitsBudget,
  isFoodAllowed,
  macroProfile,
  nutrientsFor,
  searchFoods,
  sumNutrients,
  type FoodPreferences,
} from './foods'
import {
  describePortion,
  leanProteinSources,
  nutritionGapMessage,
  pluralizeMeasure,
  pluralizeWord,
  remainingMacros,
} from './gaps'
import { buildShoppingList, purchaseQuantity, singularUnit } from './shopping'
import { findSwaps } from './swaps'

const byId = (id: string) => FOODS.find((f) => f.id === id)!
const prefs: FoodPreferences = {
  restrictions: [],
  allergens: [],
  dislikedFoodIds: [],
  budget: 'high',
}

describe('nutrientes', () => {
  it('escala por gramos y suma', () => {
    expect(nutrientsFor(byId('chicken'), 200)).toEqual({
      kcal: 330,
      protein: 62,
      carbs: 0,
      fat: 7.2,
      fiber: 0,
    })
    expect(
      sumNutrients([nutrientsFor(byId('rice'), 100), nutrientsFor(byId('chicken'), 100)]).kcal,
    ).toBe(295)
  })

  it('calcula el perfil de macros por kcal', () => {
    const [p, c, f] = macroProfile(byId('chicken'))
    expect(p).toBeGreaterThan(0.75)
    expect(c).toBe(0)
    expect(f).toBeGreaterThan(0)
    expect(
      macroProfile(
        food({ ...byId('rice'), per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } }),
      ),
    ).toEqual([0, 0, 0])
  })
})

describe('preferencias', () => {
  it('filtra por dieta, alergias y gustos', () => {
    expect(isFoodAllowed(byId('chicken'), prefs)).toBe(true)
    expect(isFoodAllowed(byId('chicken'), { ...prefs, restrictions: ['vegetarian'] })).toBe(false)
    expect(isFoodAllowed(byId('egg'), { ...prefs, restrictions: ['vegetarian'] })).toBe(true)
    expect(isFoodAllowed(byId('egg'), { ...prefs, restrictions: ['vegan'] })).toBe(false)
    expect(isFoodAllowed(byId('greek-yogurt'), { ...prefs, restrictions: ['lactose-free'] })).toBe(
      false,
    )
    expect(isFoodAllowed(byId('oats'), { ...prefs, restrictions: ['gluten-free'] })).toBe(false)
    expect(
      isFoodAllowed(byId('rice'), {
        ...prefs,
        restrictions: ['vegan', 'lactose-free', 'gluten-free'],
      }),
    ).toBe(true)
    expect(isFoodAllowed(byId('peanuts'), { ...prefs, allergens: ['peanut'] })).toBe(false)
    expect(isFoodAllowed(byId('rice'), { ...prefs, dislikedFoodIds: ['rice'] })).toBe(false)
  })

  it('respeta el presupuesto', () => {
    expect(fitsBudget(byId('whey'), 'medium')).toBe(false)
    expect(fitsBudget(byId('beef'), 'medium')).toBe(true)
  })
})

describe('búsqueda de alimentos', () => {
  it('ignora tildes y orden, y prioriza los que empiezan por la consulta', () => {
    expect(searchFoods(FOODS, 'POLLO')[0]?.id).toBe('chicken')
    expect(searchFoods(FOODS, 'arroz cocido').map((f) => f.id)).toEqual(['rice'])
    expect(searchFoods(FOODS, 'pápa')[0]?.id).toBe('potato')
    expect(searchFoods(FOODS, '', 3)).toHaveLength(3)
    expect(searchFoods(FOODS, 'cocid').length).toBeGreaterThan(1)
  })
})

describe('intercambios', () => {
  it('ofrece equivalentes del mismo rol igualando la proteína', () => {
    const swaps = findSwaps(byId('chicken'), 150, 'protein', FOODS)
    expect(swaps[0]?.food.id).toBe('tilapia')
    expect(swaps[0]?.nutrients.protein).toBeCloseTo(46.5, 0)
    expect(swaps.some((s) => s.food.id === 'chicken')).toBe(false)
  })

  it('iguala carbos, grasa o kcal según el rol', () => {
    expect(findSwaps(byId('rice'), 200, 'carb', FOODS)[0]?.nutrients.carbs).toBeCloseTo(56, -1)
    expect(findSwaps(byId('olive-oil'), 10, 'fat', FOODS).length).toBeGreaterThan(0)
    expect(findSwaps(byId('broccoli'), 120, 'vegetable', FOODS)).toEqual([])
    expect(findSwaps(byId('banana'), 120, 'fruit', FOODS, 1)).toHaveLength(0)
  })
})

describe('lista de mercado', () => {
  it('agrupa por sección y expresa cantidades de compra', () => {
    const groups = buildShoppingList(
      [
        [
          { foodId: 'chicken', grams: 600, role: 'protein' },
          { foodId: 'egg', grams: 150, role: 'protein' },
          { foodId: 'rice', grams: 700, role: 'carb' },
        ],
        [
          { foodId: 'chicken', grams: 600, role: 'protein' },
          { foodId: 'unknown', grams: 10, role: 'carb' },
          { foodId: 'rice', grams: 400, role: 'carb' },
        ],
      ],
      FOODS,
    )
    expect(groups.map((g) => g.section)).toEqual(['carnes', 'huevos-lacteos', 'granos-cereales'])
    expect(groups[0]?.items[0]?.quantity).toBe('1,2 kg')
    expect(groups[1]?.items[0]?.quantity).toBe('3 huevos')
    expect(groups[2]?.items[0]?.quantity).toBe('1,1 kg')
  })

  it('redondea hacia arriba a 50 g por debajo de 1 kg', () => {
    expect(purchaseQuantity(byId('rice'), 420)).toBe('450 g')
  })

  it('usa el singular cuando se compra una sola unidad', () => {
    expect(purchaseQuantity(byId('egg'), 40)).toBe('1 huevo')
    expect(singularUnit('litros')).toBe('litro')
    expect(singularUnit('panes')).toBe('pan')
    expect(singularUnit('paquetes de 250 g')).toBe('paquete de 250 g')
    expect(singularUnit('tomates de árbol')).toBe('tomate de árbol')
    expect(singularUnit('huevos (solo claras)')).toBe('huevo (solo claras)')
    expect(singularUnit('maracuyás')).toBe('maracuyá')
  })

  it('convierte lo cocido a lo que hay que comprar en crudo o en seco', () => {
    const rice = food({ ...byId('rice'), cooked: { yield: 2.4, buyAs: 'en seco' } })
    expect(purchaseQuantity(rice, 1200)).toBe('500 g (en seco)')
    const chicken = food({ ...byId('chicken'), cooked: { yield: 0.75, buyAs: 'crudo' } })
    expect(purchaseQuantity(chicken, 1200)).toBe('1,6 kg (crudo)')
    const eggs = food({ ...byId('egg'), cooked: { yield: 1, buyAs: 'crudo' } })
    expect(purchaseQuantity(eggs, 100)).toBe('2 huevos (crudo)')
  })

  it('ordena alfabéticamente dentro de cada sección', () => {
    const groups = buildShoppingList(
      [
        [
          { foodId: 'potato', grams: 100, role: 'carb' },
          { foodId: 'avocado', grams: 100, role: 'fat' },
        ],
      ],
      FOODS,
    )
    expect(groups[0]?.items.map((i) => i.food.id)).toEqual(['avocado', 'potato'])
  })
})

describe('lo que falta del día', () => {
  const target = { kcal: 2200, protein: 175, carbs: 225, fat: 65 }

  it('calcula lo que queda', () => {
    expect(remainingMacros(target, { kcal: 1000, protein: 100, carbs: 100, fat: 30 })).toEqual({
      kcal: 1200,
      protein: 75,
      carbs: 125,
      fat: 35,
    })
  })

  it('día vacío', () => {
    expect(
      nutritionGapMessage(target, { kcal: 0, protein: 0, carbs: 0, fat: 0 }, FOODS).status,
    ).toBe('empty')
  })

  it('falta proteína: sugiere porciones concretas y combo whey + huevos', () => {
    const msg = nutritionGapMessage(
      target,
      { kcal: 1500, protein: 130, carbs: 150, fat: 40 },
      FOODS,
    )
    expect(msg.status).toBe('protein-gap')
    expect(msg.title).toBe('Te faltan 45 g de proteína')
    expect(msg.ideas).toHaveLength(3)
    expect(msg.ideas[0]).toMatch(/^\d+ g de tilapia$/)
    expect(msg.ideas.at(-1)).toMatch(/^1 scoop de proteína whey \+ \d huevos?$/)
  })

  it('combo con un solo huevo', () => {
    const msg = nutritionGapMessage(
      target,
      { kcal: 1500, protein: 143, carbs: 150, fat: 40 },
      FOODS,
    )
    expect(msg.ideas.at(-1)).toBe('1 scoop de proteína whey + 1 huevo')
  })

  it('sin combo si no hay whey', () => {
    const msg = nutritionGapMessage(
      target,
      { kcal: 1500, protein: 100, carbs: 150, fat: 40 },
      FOODS.filter((f) => f.id !== 'whey'),
    )
    expect(msg.ideas).toHaveLength(2)
    // 75 g de diferencia: se sugiere repartir y cada idea es de una comida (~50 g).
    expect(msg.detail).toContain('Repártela en tus próximas comidas')
    expect(msg.ideas[0]).toMatch(/^\d+ g de tilapia$/)
    const grams = Number(/^(\d+)/.exec(msg.ideas[0] ?? '')?.[1])
    expect(grams).toBeLessThanOrEqual(260)
  })

  it('proteína cumplida pero faltan kcal', () => {
    const msg = nutritionGapMessage(
      target,
      { kcal: 1700, protein: 170, carbs: 120, fat: 40 },
      FOODS,
    )
    expect(msg.status).toBe('kcal-gap')
    expect(msg.ideas).toHaveLength(2)
    const noIdeas = nutritionGapMessage(
      target,
      { kcal: 1700, protein: 170, carbs: 215, fat: 62 },
      FOODS,
    )
    expect(noIdeas.ideas).toEqual([])
  })

  it('se pasó de calorías, con y sin proteína pendiente', () => {
    const over = nutritionGapMessage(
      target,
      { kcal: 2600, protein: 120, carbs: 300, fat: 90 },
      FOODS,
    )
    expect(over.status).toBe('over')
    expect(over.ideas).toHaveLength(1)
    const overOk = nutritionGapMessage(
      target,
      { kcal: 2600, protein: 180, carbs: 300, fat: 90 },
      FOODS,
    )
    expect(overOk.ideas).toEqual([])
  })

  it('día redondo', () => {
    expect(
      nutritionGapMessage(target, { kcal: 2150, protein: 172, carbs: 220, fat: 64 }, FOODS).status,
    ).toBe('done')
  })

  it('describe porciones en medidas caseras o gramos', () => {
    expect(describePortion(byId('egg'), 100)).toBe('2 unidades de huevo entero')
    expect(describePortion(byId('egg'), 50)).toBe('1 unidad de huevo entero')
    expect(describePortion(byId('rice'), 320)).toBe('2 tazas de arroz blanco cocido')
    expect(describePortion(byId('olive-oil'), 13.5)).toBe('1 cucharada de aceite de oliva')
  })

  it('pluraliza medidas caseras con concordancia', () => {
    expect(pluralizeWord('porción')).toBe('porciones')
    expect(pluralizeWord('nuez')).toBe('nueces')
    expect(pluralizeWord('bistec')).toBe('bistecs')
    expect(pluralizeWord('filete')).toBe('filetes')
    expect(pluralizeWord('unidad')).toBe('unidades')
    expect(pluralizeMeasure('unidad mediana')).toBe('unidades medianas')
    expect(pluralizeMeasure('lata pequeña escurrida')).toBe('latas pequeñas escurridas')
    expect(pluralizeMeasure('taza picado')).toBe('tazas picado')
    expect(pluralizeMeasure('taza en rodajas')).toBe('tazas en rodajas')
    expect(pluralizeMeasure('porción (¼ de aguacate)')).toBe('porciones (¼ de aguacate)')
    expect(pluralizeMeasure('filete mediano')).toBe('filetes medianos')
    expect(pluralizeMeasure('botella personal')).toBe('botellas personales')
    expect(pluralizeMeasure('plato hondo')).toBe('platos hondos')
    expect(pluralizeMeasure('vaso grande lleno')).toBe('vasos grandes llenos')
    expect(describePortion(byId('egg'), 75)).toBe('1,5 unidades de huevo entero')
    expect(describePortion(byId('egg'), 1000)).toBe('1000 g de huevo entero')
    expect(describePortion(byId('chicken'), 203)).toBe('200 g de pechuga de pollo cocida')
    expect(leanProteinSources(FOODS)[0]?.id).toBe('tilapia')
  })
})
