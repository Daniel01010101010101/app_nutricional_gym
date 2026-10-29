import { describe, expect, it } from 'vitest'

import { EXERCISES } from '@/test/fixtures'

import { PRESCRIPTIONS } from '../constants/formulas'
import { DEFAULT_LOADING } from '../training/loading'
import type { WorkoutSet } from '../types'
import { suggestNextTarget, type SessionSets } from './doubleProgression'
import { bestE1rm, epley, estimateOneRepMax, explainE1rm, weightForReps } from './e1rm'
import { computeBests, detectRecords } from './records'
import { strengthLossAlert, strengthTrend, trendSeries } from './strength'
import { summarizeSession } from './summary'

const w = (weightKg: number, reps: number, rir: number | null = 2, isWarmup = false) => ({
  weightKg,
  reps,
  rir,
  isWarmup,
})

describe('Epley', () => {
  it('100 kg × 5 reps = 116.7 kg', () => {
    expect(epley(100, 5)).toBeCloseTo(116.7, 1)
  })

  it('con 1 rep el 1RM es el peso', () => {
    expect(epley(140, 1)).toBe(140)
  })

  it('usa reps + RIR como reps efectivas y marca baja confianza sobre 10', () => {
    expect(estimateOneRepMax({ weightKg: 100, reps: 3, rir: 2 })).toEqual({
      e1rm: 116.67,
      effectiveReps: 5,
      lowConfidence: false,
    })
    expect(estimateOneRepMax({ weightKg: 60, reps: 10, rir: 1 }).lowConfidence).toBe(true)
    expect(estimateOneRepMax({ weightKg: 60, reps: 8, rir: null }).effectiveReps).toBe(8)
    expect(estimateOneRepMax({ weightKg: 0, reps: 8, rir: 0 }, 80).e1rm).toBeCloseTo(101.33, 2)
  })

  it('invierte Epley para sugerir pesos', () => {
    expect(weightForReps(116.67, 3, 2)).toBeCloseTo(100, 1)
    expect(weightForReps(120, 1, 0)).toBe(120)
  })

  it('mejor 1RM: prioriza series de alta confianza e ignora calentamientos', () => {
    expect(bestE1rm([w(60, 10, 0, true), w(100, 5, 1), w(90, 15, 0)])?.e1rm).toBe(120)
    expect(bestE1rm([w(50, 15, 0), w(55, 12, 0)])?.e1rm).toBe(77)
    expect(bestE1rm([w(60, 10, 0, true)])).toBeNull()
    expect(bestE1rm([w(0, 10, 0)])).toBeNull()
  })

  it('explica el cálculo', () => {
    expect(explainE1rm(100, 5, null).explanation.summary).toContain('RIR no registrado')
    expect(explainE1rm(60, 12, 1).explanation.summary).toContain('baja confianza')
    expect(explainE1rm(100, 5, 2).value).toBeCloseTo(123.33, 2)
  })
})

describe('progresión doble', () => {
  const p = { ...PRESCRIPTIONS.main }
  const base = {
    prescription: p,
    loadType: 'barbell' as const,
    bodyRegion: 'upper' as const,
    loading: DEFAULT_LOADING,
  }
  const session = (date: string, sets: ReturnType<typeof w>[]): SessionSets => ({ date, sets })

  it('sin historial ni test: pide encontrar el peso', () => {
    const { value } = suggestNextTarget({ ...base, history: [] })
    expect(value).toMatchObject({ action: 'find', weightKg: null, reps: [6, 6, 6] })
  })

  it('primera sesión desde el 1RM del test inicial', () => {
    const { value } = suggestNextTarget({ ...base, history: [], baselineE1rm: 100 })
    expect(value).toMatchObject({ action: 'start', weightKg: 80, reps: [5, 5, 5] })
  })

  it('tope de reps en todas las series al RIR objetivo: sube 2.5 kg arriba', () => {
    const { value } = suggestNextTarget({
      ...base,
      history: [session('2026-01-01', [w(80, 6), w(80, 6), w(80, 6)])],
    })
    expect(value).toMatchObject({ action: 'increase', weightKg: 82.5, reps: [4, 4, 4] })
  })

  it('tren inferior sube 5 kg', () => {
    const { value } = suggestNextTarget({
      ...base,
      bodyRegion: 'lower',
      history: [session('2026-01-01', [w(100, 6, null), w(100, 6, 1), w(100, 6, 2)])],
    })
    expect(value.weightKg).toBe(105)
  })

  it('tope de reps pero a RIR menor al objetivo: no sube todavía', () => {
    const { value } = suggestNextTarget({
      ...base,
      history: [session('2026-01-01', [w(80, 6, 0), w(80, 6, 0), w(80, 6, 0)])],
    })
    expect(value.action).toBe('progress-reps')
  })

  it('dentro del rango: mismo peso, una rep más por serie', () => {
    const { value } = suggestNextTarget({
      ...base,
      history: [session('2026-01-01', [w(60, 10, 0, true), w(80, 5), w(80, 6), w(80, 4)])],
    })
    expect(value).toMatchObject({ action: 'progress-reps', weightKg: 80, reps: [6, 6, 5] })
  })

  it('con menos series de las prescritas repite la última referencia', () => {
    const { value } = suggestNextTarget({ ...base, history: [session('2026-01-01', [w(80, 5)])] })
    expect(value.reps).toEqual([6, 6, 6])
  })

  it('no llega al mínimo 1–2 veces: mantener', () => {
    const one = suggestNextTarget({
      ...base,
      history: [session('2026-01-01', [w(80, 5), w(80, 4), w(80, 3)])],
    })
    expect(one.value).toMatchObject({ action: 'hold', weightKg: 80, misses: 1 })
    const two = suggestNextTarget({
      ...base,
      history: [
        session('2026-01-01', [w(80, 3), w(80, 4), w(80, 4)]),
        session('2026-01-04', [w(80, 5), w(80, 3), w(80, 4)]),
      ],
    })
    expect(two.value.misses).toBe(2)
  })

  it('3 veces seguidas: baja 5 % si faltó poco y 10 % si faltó más', () => {
    const miss = (date: string, reps: number) =>
      session(date, [w(100, reps), w(100, reps), w(100, reps)])
    const small = suggestNextTarget({
      ...base,
      history: [miss('2026-01-01', 3), miss('2026-01-04', 3), miss('2026-01-07', 3)],
    })
    expect(small.value).toMatchObject({ action: 'reduce', weightKg: 95, misses: 3 })
    const large = suggestNextTarget({
      ...base,
      history: [miss('2026-01-01', 2), miss('2026-01-04', 2), miss('2026-01-07', 2)],
    })
    expect(large.value.weightKg).toBe(90)
  })

  it('las fallas con otro peso no cuentan para la racha', () => {
    const { value } = suggestNextTarget({
      ...base,
      history: [
        session('2026-01-01', [w(95, 3), w(95, 3), w(95, 3)]),
        session('2026-01-04', [w(100, 3), w(100, 3), w(100, 3)]),
        session('2026-01-07', [w(100, 3), w(100, 3), w(100, 3)]),
      ],
    })
    expect(value).toMatchObject({ action: 'hold', misses: 2 })
  })

  it('una sesión exitosa corta la racha de fallas', () => {
    const { value } = suggestNextTarget({
      ...base,
      history: [
        session('2026-01-01', [w(100, 3), w(100, 3), w(100, 3)]),
        session('2026-01-04', [w(100, 5), w(100, 5), w(100, 4)]),
        session('2026-01-07', [w(100, 3), w(100, 3), w(100, 3)]),
      ],
    })
    expect(value.misses).toBe(1)
  })

  it('en descarga mantiene el peso y reduce series', () => {
    const { value } = suggestNextTarget({
      ...base,
      deload: true,
      history: [session('2026-01-01', [w(80, 6), w(80, 6), w(80, 6)])],
    })
    expect(value).toMatchObject({ action: 'deload', weightKg: 80, sets: 2, rir: [3, 4] })
  })

  it('ignora sesiones sin series efectivas', () => {
    const { value } = suggestNextTarget({
      ...base,
      history: [session('2026-01-01', [w(40, 10, 3, true)])],
    })
    expect(value.action).toBe('find')
  })
})

describe('tendencia de fuerza', () => {
  const points = (values: [string, number][]) => values.map(([date, e1rm]) => ({ date, e1rm }))

  it('promedio móvil de 3 sesiones', () => {
    expect(
      trendSeries(
        points([
          ['2026-01-03', 102],
          ['2026-01-01', 100],
          ['2026-01-05', 104],
        ]),
      ).map((p) => p.average),
    ).toEqual([100, 101, 102])
  })

  it('subiendo, estable o bajando frente a hace 2 semanas', () => {
    const up = strengthTrend(
      points([
        ['2026-01-01', 100],
        ['2026-01-08', 101],
        ['2026-01-15', 106],
        ['2026-01-22', 108],
      ]),
    )
    expect(up.state).toBe('up')
    const stable = strengthTrend(
      points([
        ['2026-01-01', 100],
        ['2026-01-15', 101],
      ]),
    )
    expect(stable.state).toBe('stable')
    const down = strengthTrend(
      points([
        ['2026-01-01', 100],
        ['2026-01-15', 90],
      ]),
    )
    expect(down).toEqual({ state: 'down', changePct: -5, current: 95 })
  })

  it('sin datos suficientes', () => {
    expect(strengthTrend([])).toEqual({ state: 'insufficient', changePct: null, current: null })
    expect(
      strengthTrend(
        points([
          ['2026-01-01', 100],
          ['2026-01-05', 101],
        ]),
      ).state,
    ).toBe('insufficient')
  })

  it('alerta cuando caen más de 5 % al menos 2 básicos', () => {
    const drop = points([
      ['2026-01-01', 100],
      ['2026-01-08', 100],
      ['2026-01-15', 100],
      ['2026-01-29', 70],
    ])
    const ok = points([
      ['2026-01-01', 100],
      ['2026-01-15', 100],
    ])
    const alert = strengthLossAlert({ squat: drop, bench: drop, row: ok })
    expect(alert.value.triggered).toBe(true)
    expect(alert.value.dropping.map((d) => d.lift)).toEqual(['squat', 'bench'])
    expect(alert.explanation.steps).toHaveLength(4)
    const single = strengthLossAlert({ squat: drop, bench: ok })
    expect(single.value.triggered).toBe(false)
    expect(single.explanation.steps).toEqual([])
  })
})

const set = (over: Partial<WorkoutSet>): WorkoutSet => ({
  id: Math.random().toString(36),
  sessionId: 's1',
  exerciseId: 'bench-press',
  exerciseOrder: 0,
  setIndex: 0,
  weightKg: 80,
  reps: 6,
  rir: 2,
  isWarmup: false,
  date: '2026-01-01',
  performedAt: '2026-01-01T18:00:00.000Z',
  ...over,
})

describe('récords personales', () => {
  const previous = [
    set({ sessionId: 'a', weightKg: 80, reps: 6 }),
    set({ sessionId: 'a', weightKg: 80, reps: 5 }),
    set({ sessionId: 'b', weightKg: 82.5, reps: 4, date: '2026-01-04' }),
  ]

  it('detecta peso máximo, reps a un peso, 1RM y volumen', () => {
    const records = detectRecords(previous, [
      set({ sessionId: 'c', weightKg: 85, reps: 3 }),
      set({ sessionId: 'c', weightKg: 80, reps: 8 }),
      set({ sessionId: 'c', weightKg: 80, reps: 8 }),
      set({ sessionId: 'c', weightKg: 80, reps: 8 }),
      set({ sessionId: 'c', weightKg: 40, reps: 12, isWarmup: true }),
    ])
    expect(records.map((r) => r.type)).toEqual(['max-weight', 'reps-at-weight', 'e1rm', 'volume'])
    expect(records[1]).toMatchObject({ value: 8, previous: 6, weightKg: 80 })
  })

  it('elige la mayor mejora de reps y no cuenta la primera vez', () => {
    const records = detectRecords(previous, [
      set({ sessionId: 'c', weightKg: 80, reps: 7 }),
      set({ sessionId: 'c', weightKg: 82.5, reps: 6 }),
    ])
    expect(records.find((r) => r.type === 'reps-at-weight')).toMatchObject({
      weightKg: 82.5,
      value: 6,
    })
    expect(detectRecords([], [set({})])).toEqual([])
    expect(detectRecords(previous, [set({ sessionId: 'c', weightKg: 70, reps: 6 })])).toEqual([])
  })

  it('mejores marcas históricas por ejercicio', () => {
    const bests = computeBests([
      ...previous,
      set({ exerciseId: 'pull-up', weightKg: 0, reps: 10, sessionId: 'z' }),
      set({ weightKg: 50, reps: 20, sessionId: 'd' }),
    ])
    const bench = bests.find((b) => b.exerciseId === 'bench-press')
    expect(bench?.maxWeight).toEqual({ weightKg: 82.5, reps: 4, date: '2026-01-04' })
    expect(bench?.bestE1rm?.value).toBeCloseTo(101.33, 2)
    expect(bench?.bestVolume?.value).toBe(1000)
    expect(bench?.sessions).toBe(3)
    const pull = bests.find((b) => b.exerciseId === 'pull-up')
    expect(pull?.maxWeight).toBeNull()
    expect(pull?.bestVolume).toBeNull()
  })

  it('ignora mejoras de 1RM con baja confianza al listar', () => {
    const bests = computeBests([set({ weightKg: 50, reps: 20 })])
    expect(bests[0]?.bestE1rm).toBeNull()
  })
})

describe('resumen de sesión', () => {
  const exercisesById = new Map(EXERCISES.map((e) => [e.id, e]))

  it('duración, volumen, series por músculo, récords y cambios de 1RM', () => {
    const summary = summarizeSession({
      sets: [
        set({ sessionId: 'n', weightKg: 85, reps: 5 }),
        set({ sessionId: 'n', weightKg: 85, reps: 5 }),
        set({ sessionId: 'n', exerciseId: 'pull-up', weightKg: 10, reps: 8 }),
        set({ sessionId: 'n', exerciseId: 'shrug', weightKg: 30, reps: 12 }),
        set({ sessionId: 'n', weightKg: 40, reps: 10, isWarmup: true }),
      ],
      previousSets: [
        set({ sessionId: 'older', weightKg: 75, reps: 5, performedAt: '2025-12-20T18:00:00.000Z' }),
        set({ sessionId: 'old', weightKg: 80, reps: 5, performedAt: '2025-12-28T18:00:00.000Z' }),
      ],
      exercisesById,
      startedAt: '2026-01-01T18:00:00.000Z',
      endedAt: '2026-01-01T19:05:00.000Z',
      bodyweightKg: 80,
    })
    expect(summary.durationMin).toBe(65)
    expect(summary.totalVolumeKg).toBe(85 * 10 + 80 + 360)
    expect(summary.workingSets).toBe(4)
    expect(summary.setsByMuscle).toEqual({ chest: 2, back: 1 })
    expect(summary.e1rmChanges.find((c) => c.exerciseId === 'bench-press')).toMatchObject({
      before: 98.67,
    })
    expect(summary.e1rmChanges.find((c) => c.exerciseId === 'pull-up')).toMatchObject({
      before: null,
    })
    expect(summary.records.map((r) => r.type)).toContain('max-weight')
  })

  it('tolera fechas invertidas y ejercicios sin peso', () => {
    const summary = summarizeSession({
      sets: [set({ exerciseId: 'plank', weightKg: 0, reps: 30 })],
      previousSets: [],
      exercisesById,
      startedAt: '2026-01-01T19:00:00.000Z',
      endedAt: '2026-01-01T18:00:00.000Z',
    })
    expect(summary.durationMin).toBe(0)
    expect(summary.e1rmChanges).toEqual([])
    expect(summary.setsByMuscle).toEqual({ abs: 1 })
  })
})
