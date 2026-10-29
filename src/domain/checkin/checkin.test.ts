import { describe, expect, it } from 'vitest'

import { evaluateDay, nutritionAdherence, trainingAdherence } from './adherence'
import {
  adjustmentSize,
  applyRecommendation,
  evaluateCheckin,
  type CheckinInput,
} from './algorithm'

const targets = { kcal: 2200, protein: 175, carbs: 225, fat: 65, trainingDayBonusCarbs: 0 }
const input: CheckinInput = {
  noDeficit: false,
  nutritionAdherencePct: 90,
  trainingAdherencePct: 100,
  weeklyChangePct: -0.6,
  previousWeeklyChangePct: -0.5,
  waistChangeCm: -0.5,
  strengthAlert: false,
  strengthTrend: 'stable',
  targets,
  bmr: 1767.5,
  wellbeing: { sleep: 4, stress: 2, hunger: 3, energy: 4 },
  deloadDue: false,
}
const run = (over: Partial<CheckinInput>) => evaluateCheckin({ ...input, ...over }).value

describe('tamaño del ajuste', () => {
  it('5 % de las kcal, entre 100 y 150, múltiplo de 25', () => {
    expect(adjustmentSize(1600)).toBe(100)
    expect(adjustmentSize(2500)).toBe(125)
    expect(adjustmentSize(3400)).toBe(150)
  })
})

describe('algoritmo del check-in', () => {
  it('seguridad: mantenimiento sin cambios', () => {
    expect(run({ noDeficit: true })).toMatchObject({
      type: 'safety-maintenance',
      actionable: false,
    })
  })

  it('adherencia < 80 %: no cambia calorías y enfoca en adherencia', () => {
    const result = evaluateCheckin({ ...input, nutritionAdherencePct: 70 })
    expect(result.value).toMatchObject({ type: 'low-adherence', kcalDelta: 0, actionable: false })
    expect(result.explanation.summary).toContain('70 %')
    expect(run({ nutritionAdherencePct: 70, strengthAlert: true }).notes[0]).toContain('fuerza')
  })

  it('fuerza bajando: antes que cualquier recorte, +carbos en días de entreno', () => {
    expect(
      run({ strengthAlert: true, weeklyChangePct: 0, previousWeeklyChangePct: 0 }),
    ).toMatchObject({
      type: 'protect-strength',
      kcalDelta: 0,
      trainingDayCarbsDelta: 40,
      actionable: true,
    })
  })

  it('sin promedio semanal comparable: pide más datos', () => {
    expect(run({ weeklyChangePct: null }).type).toBe('insufficient-data')
  })

  it('pierde más de 1 % por semana: sube 100–150 kcal', () => {
    expect(run({ weeklyChangePct: -1.2 })).toMatchObject({ type: 'increase-kcal', kcalDelta: 100 })
  })

  it('cintura baja, peso estable y fuerza sube: recomposición exitosa', () => {
    expect(run({ weeklyChangePct: -0.1, waistChangeCm: -1, strengthTrend: 'up' })).toMatchObject({
      type: 'recomp-success',
      actionable: false,
    })
  })

  it('menos de 0.25 % por 2 semanas con buena adherencia: baja 100–150 kcal', () => {
    expect(run({ weeklyChangePct: -0.1, previousWeeklyChangePct: 0.2 })).toMatchObject({
      type: 'decrease-kcal',
      kcalDelta: -100,
    })
  })

  it('el recorte respeta la TMB', () => {
    const near = run({
      weeklyChangePct: 0,
      previousWeeklyChangePct: 0,
      targets: { ...targets, kcal: 3000 },
      bmr: 2870,
    })
    expect(near.kcalDelta).toBe(-125)
    const floor = run({
      weeklyChangePct: 0,
      previousWeeklyChangePct: 0,
      targets: { ...targets, kcal: 1850 },
    })
    expect(floor.type).toBe('bmr-floor')
    expect(floor.notes.at(-1)).toContain('pasos')
  })

  it('una sola semana estancada: mantener con aviso', () => {
    expect(run({ weeklyChangePct: -0.1, previousWeeklyChangePct: -0.5 }).notes[0]).toContain(
      'Si se repite',
    )
    expect(run({ weeklyChangePct: -0.1, previousWeeklyChangePct: null }).type).toBe('keep')
  })

  it('en rango: mantener', () => {
    const result = evaluateCheckin(input)
    expect(result.value).toMatchObject({ type: 'keep', notes: [] })
    expect(result.explanation.summary).toContain('-0,6')
  })

  it('agrega notas de bienestar y descarga', () => {
    const notes = run({
      wellbeing: { sleep: 2, stress: 4, hunger: 5, energy: 1 },
      deloadDue: true,
      weeklyChangePct: 0.3,
    }).notes
    expect(notes).toHaveLength(6)
    expect(run({ weeklyChangePct: 0.3, previousWeeklyChangePct: -0.5 }).type).toBe('keep')
  })
})

describe('aplicar ajustes', () => {
  const floors = { fatMin: 48 }

  it('no toca nada si no hay acción', () => {
    const rec = run({})
    expect(applyRecommendation(targets, rec, floors)).toBe(targets)
  })

  it('las subidas van a carbos y la proteína nunca cambia', () => {
    const result = applyRecommendation(targets, run({ weeklyChangePct: -1.5 }), floors)
    expect(result).toEqual({ ...targets, kcal: 2300, carbs: 250 })
  })

  it('los recortes salen de carbos y luego de grasa respetando los pisos', () => {
    const rec = run({
      weeklyChangePct: 0,
      previousWeeklyChangePct: 0,
      targets: { ...targets, kcal: 3000 },
    })
    expect(applyRecommendation(targets, rec, floors)).toMatchObject({
      protein: 175,
      carbs: 185,
      fat: 65,
    })
    const lowCarb = applyRecommendation({ ...targets, carbs: 110 }, rec, floors)
    expect(lowCarb).toMatchObject({ protein: 175, carbs: 100, fat: 55 })
    const atFloors = applyRecommendation({ ...targets, carbs: 100, fat: 48 }, rec, floors)
    expect(atFloors).toMatchObject({ carbs: 60, fat: 48 })
    const noCarbs = applyRecommendation({ ...targets, carbs: 0, fat: 48 }, rec, floors)
    expect(noCarbs.carbs).toBe(0)
  })

  it('protección de fuerza suma carbos solo en días de entreno', () => {
    const rec = run({ strengthAlert: true })
    expect(applyRecommendation(targets, rec, floors)).toEqual({
      ...targets,
      trainingDayBonusCarbs: 40,
    })
  })
})

describe('adherencia', () => {
  const target = { kcal: 2200, protein: 175 }

  it('evalúa un día: ±10 % de kcal y ≥ 90 % de proteína', () => {
    expect(evaluateDay(undefined, target, '2026-01-01')).toMatchObject({
      logged: false,
      adherent: false,
    })
    expect(
      evaluateDay({ date: '2026-01-01', kcal: 0, protein: 0 }, target, '2026-01-01').logged,
    ).toBe(false)
    expect(
      evaluateDay({ date: '2026-01-01', kcal: 2350, protein: 160 }, target, '2026-01-01').adherent,
    ).toBe(true)
    expect(
      evaluateDay({ date: '2026-01-01', kcal: 2500, protein: 180 }, target, '2026-01-01'),
    ).toMatchObject({
      kcalOk: false,
      proteinOk: true,
    })
    expect(
      evaluateDay({ date: '2026-01-01', kcal: 2200, protein: 150 }, target, '2026-01-01').proteinOk,
    ).toBe(false)
  })

  it('porcentaje del período; los días sin registro no cumplen', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']
    const intakes = [
      { date: '2026-01-01', kcal: 2200, protein: 175 },
      { date: '2026-01-02', kcal: 2100, protein: 170 },
      { date: '2026-01-03', kcal: 3000, protein: 175 },
    ]
    const summary = nutritionAdherence(dates, intakes, () => target)
    expect(summary.adherentDays).toBe(2)
    expect(summary.pct).toBe(50)
    expect(nutritionAdherence([], [], () => target).pct).toBe(0)
  })

  it('adherencia al entreno', () => {
    expect(trainingAdherence(4, 3)).toBe(75)
    expect(trainingAdherence(0, 0)).toBe(100)
    expect(trainingAdherence(3, 5)).toBe(100)
  })
})
