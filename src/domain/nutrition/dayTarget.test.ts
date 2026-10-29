import { describe, expect, it } from 'vitest'

import { targetsForDay, type BaseTargets } from './dayTarget'

const base: BaseTargets = {
  kcal: 2200,
  protein: 175,
  carbs: 220,
  fat: 70,
  fiber: 31,
  waterMl: 2800,
  waterTrainingMl: 3500,
  trainingDayBonusCarbs: 0,
  carbCycle: null,
}

describe('objetivo del día', () => {
  it('sin ciclado es igual todos los días, con más agua al entrenar', () => {
    const rest = targetsForDay(base, false)
    const training = targetsForDay(base, true)
    expect(rest.value).toMatchObject({
      kcal: 2200,
      carbs: 220,
      waterMl: 2800,
      isTrainingDay: false,
    })
    expect(training.value).toMatchObject({
      kcal: 2200,
      carbs: 220,
      waterMl: 3500,
      isTrainingDay: true,
    })
    expect(rest.explanation.summary).toContain('Día de descanso')
    expect(rest.explanation.summary).toContain('el mismo todos los días.')
  })

  it('con ciclado usa los carbos del tipo de día', () => {
    const cycled = {
      ...base,
      carbCycle: { trainingDay: { kcal: 2340, carbs: 255 }, restDay: { kcal: 2010, carbs: 175 } },
    }
    expect(targetsForDay(cycled, true).value).toMatchObject({
      kcal: 2340,
      carbs: 255,
      protein: 175,
      fat: 70,
    })
    const rest = targetsForDay(cycled, false)
    expect(rest.value).toMatchObject({ kcal: 2010, carbs: 175 })
    expect(rest.explanation.steps?.map((s) => s.label)).toEqual(['Base', 'Ciclado', 'Hoy'])
    expect(rest.explanation.rationale).toBeUndefined()
  })

  it('suma el bono de carbos solo en días de entreno', () => {
    const withBonus = { ...base, trainingDayBonusCarbs: 40 }
    const training = targetsForDay(withBonus, true)
    expect(training.value).toMatchObject({ kcal: 2360, carbs: 260 })
    expect(training.explanation.summary).toContain('extra de carbos')
    expect(training.explanation.rationale).toContain('fuerza')
    expect(targetsForDay(withBonus, false).value).toMatchObject({ kcal: 2200, carbs: 220 })
  })
})
