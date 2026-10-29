import { describe, expect, it } from 'vitest'

import {
  bmrKatch,
  bmrMifflin,
  chooseActivityLevel,
  computeBmr,
  computeTdee,
  getActivityLevel,
} from './energy'

describe('TMB', () => {
  it('Mifflin-St Jeor, hombre, 30 años, 80 kg, 178 cm = 1767.5 kcal', () => {
    expect(bmrMifflin({ sex: 'male', age: 30, weightKg: 80, heightCm: 178 })).toBe(1767.5)
  })

  it('Mifflin-St Jeor, mujer, 25 años, 60 kg, 165 cm = 1345.25 kcal', () => {
    expect(bmrMifflin({ sex: 'female', age: 25, weightKg: 60, heightCm: 165 })).toBe(1345.25)
  })

  it('Katch-McArdle con 64 kg de masa magra = 1752.4 kcal', () => {
    expect(bmrKatch(64)).toBe(1752.4)
  })

  it('usa Katch-McArdle solo con % de grasa fiable', () => {
    const katch = computeBmr({
      sex: 'male',
      age: 30,
      weightKg: 80,
      heightCm: 178,
      reliableBodyFatPct: 20,
    })
    expect(katch.value).toBe(1752.4)
    expect(katch.explanation.formula).toContain('21.6')

    const mifflin = computeBmr({ sex: 'male', age: 30, weightKg: 80, heightCm: 178 })
    expect(mifflin.value).toBe(1767.5)
    expect(mifflin.explanation.formula).toContain('+ 5')

    const female = computeBmr({ sex: 'female', age: 25, weightKg: 60, heightCm: 165 })
    expect(female.explanation.formula).toContain('− 161')
  })
})

describe('nivel de actividad', () => {
  it('combina trabajo, pasos y días de entreno de forma conservadora', () => {
    expect(
      chooseActivityLevel({ jobType: 'sedentary', avgSteps: 3000, trainingDaysPerWeek: 0 }).value
        .id,
    ).toBe('sedentary')
    expect(
      chooseActivityLevel({ jobType: 'sedentary', avgSteps: 3000, trainingDaysPerWeek: 3 }).value
        .id,
    ).toBe('light')
    expect(
      chooseActivityLevel({ jobType: 'sedentary', avgSteps: 6000, trainingDaysPerWeek: 4 }).value
        .id,
    ).toBe('moderate')
    expect(
      chooseActivityLevel({ jobType: 'sedentary', avgSteps: 10000, trainingDaysPerWeek: 5 }).value
        .id,
    ).toBe('active')
    expect(
      chooseActivityLevel({ jobType: 'physical', avgSteps: 4000, trainingDaysPerWeek: 5 }).value.id,
    ).toBe('very-active')
    expect(
      chooseActivityLevel({ jobType: 'standing', avgSteps: 13000, trainingDaysPerWeek: 6 }).value
        .id,
    ).toBe('very-active')
  })

  it('puntúa pasos negativos o raros como cero', () => {
    expect(
      chooseActivityLevel({ jobType: 'sedentary', avgSteps: -5, trainingDaysPerWeek: -1 }).value.id,
    ).toBe('sedentary')
  })

  it('expone cada nivel por id', () => {
    expect(getActivityLevel('moderate').factor).toBe(1.55)
  })
})

describe('gasto total', () => {
  it('multiplica TMB por el factor de actividad', () => {
    expect(computeTdee(1767.5, getActivityLevel('moderate')).value).toBe(2739.6)
  })
})
