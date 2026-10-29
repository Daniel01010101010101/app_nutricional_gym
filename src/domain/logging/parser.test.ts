import { describe, expect, it } from 'vitest'

import { EXERCISES } from '@/test/fixtures'

import { levenshtein, normalizeText, similarity, tokens } from '../shared/text'
import { matchExercise } from './matching'
import { parseWorkoutText, splitLine, tokenize } from './parser'

const options = { exercises: EXERCISES, defaultUnit: 'kg' as const }
const parse = (text: string) => parseWorkoutText(text, options)
const sets = (text: string) =>
  parse(text).lines[0]?.sets.map((s) => [s.weightKg, s.reps, s.rir, s.isWarmup])

describe('texto y similitud', () => {
  it('normaliza tildes, mayúsculas y símbolos', () => {
    expect(normalizeText('  Préss   BANCA!! ')).toBe('press banca')
    expect(tokens('Press de banca con barra')).toEqual(['press', 'banca', 'barra'])
  })

  it('distancia de Levenshtein', () => {
    expect(levenshtein('banca', 'banca')).toBe(0)
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
    expect(levenshtein('sentadila', 'sentadilla')).toBe(1)
  })

  it('similitud tolerante a orden y errores', () => {
    expect(similarity('press banca', 'Press banca')).toBe(1)
    expect(similarity('banca press', 'Press de banca con barra')).toBeGreaterThan(0.8)
    expect(similarity('sentadila', 'Sentadilla con barra')).toBeGreaterThan(0.75)
    expect(similarity('xyz', 'Sentadilla')).toBeLessThan(0.3)
    expect(similarity('', 'a')).toBe(0)
    expect(similarity('de', 'de la')).toBeGreaterThan(0)
  })
})

describe('reconocimiento de ejercicios', () => {
  it('encuentra por nombre, alias o inglés', () => {
    expect(matchExercise('press banca', EXERCISES).best?.exercise.id).toBe('bench-press')
    expect(matchExercise('sentadilla', EXERCISES).best?.exercise.id).toBe('back-squat')
    expect(matchExercise('pull-up', EXERCISES).best?.exercise.id).toBe('pull-up')
    expect(matchExercise('remo mancuerna', EXERCISES).best?.exercise.id).toBe('db-row')
  })

  it('sin coincidencia devuelve sugerencias', () => {
    const result = matchExercise('zumba', EXERCISES)
    expect(result.best).toBeNull()
  })
})

describe('parser: casos válidos', () => {
  it('press banca 80x8, 80x7, 75x8', () => {
    const result = parse('press banca 80x8, 80x7, 75x8')
    expect(result.ok).toBe(true)
    expect(result.totalSets).toBe(3)
    expect(result.lines[0]?.match?.exercise.id).toBe('bench-press')
    expect(sets('press banca 80x8, 80x7, 75x8')).toEqual([
      [80, 8, null, false],
      [80, 7, null, false],
      [75, 8, null, false],
    ])
  })

  it('sentadilla 100x5x3 rir2', () => {
    expect(sets('sentadilla 100x5x3 rir2')).toEqual([
      [100, 5, 2, false],
      [100, 5, 2, false],
      [100, 5, 2, false],
    ])
  })

  it('RIR por serie, @ como RIR o RPE, y calentamiento', () => {
    expect(sets('banca 60x10 c, 80x8 rir2, 80x7 @1')).toEqual([
      [60, 10, null, true],
      [80, 8, 2, false],
      [80, 7, 1, false],
    ])
    const rpe = parse('banca 80x8 @8')
    expect(rpe.lines[0]?.sets[0]?.rir).toBe(2)
    expect(rpe.lines[0]?.warnings[0]).toContain('RPE')
    expect(sets('banca 80x8 rpe 9')).toEqual([[80, 8, 1, false]])
  })

  it('un RIR final único aplica a todas las series sin RIR', () => {
    expect(sets('press banca 80x8, 80x7 rir1, 75x8 rir2')?.map((s) => s[2])).toEqual([null, 1, 2])
    expect(sets('press banca 80x8, 80x7, 75x8 rir2')?.map((s) => s[2])).toEqual([2, 2, 2])
  })

  it('decimales con coma o punto, sin espacios entre series', () => {
    expect(sets('banca 82,5x5,80x6')).toEqual([
      [82.5, 5, null, false],
      [80, 6, null, false],
    ])
    expect(sets('banca 82.5 x 5')).toEqual([[82.5, 5, null, false]])
    expect(sets('banca 82.5×5')).toEqual([[82.5, 5, null, false]])
    expect(sets('banca 82,5*5')).toEqual([[82.5, 5, null, false]])
  })

  it('unidades explícitas y por defecto en libras', () => {
    expect(parse('banca 175lb x 5').lines[0]?.sets[0]?.weightKg).toBeCloseTo(79.38, 2)
    expect(parse('banca 80 kg x 5').lines[0]?.sets[0]?.unit).toBe('kg')
    expect(parse('banca 135x5 lbs').lines[0]?.sets[0]?.unit).toBe('lb')
    expect(
      parseWorkoutText('banca 135x5', { ...options, defaultUnit: 'lb' }).lines[0]?.sets[0]
        ?.weightKg,
    ).toBeCloseTo(61.23, 2)
  })

  it('peso corporal: solo reps, lastre con + y series × reps', () => {
    expect(sets('dominadas 10, 8, 7')).toEqual([
      [0, 10, null, false],
      [0, 8, null, false],
      [0, 7, null, false],
    ])
    expect(sets('dominadas +10x8')).toEqual([[10, 8, null, false]])
    const bw = parse('dominadas 3x10')
    expect(bw.lines[0]?.sets).toHaveLength(3)
    expect(bw.lines[0]?.warnings[0]).toContain('peso corporal')
  })

  it('interpreta series×reps×peso cuando el orden está invertido', () => {
    const result = parse('sentadilla 3x5x100')
    expect(result.lines[0]?.sets.map((s) => s.weightKg)).toEqual([100, 100, 100])
    expect(result.lines[0]?.warnings[0]).toContain('3 series × 5 reps')
  })

  it('varias líneas y punto y coma', () => {
    const result = parse('banca 80x8\nsentadilla 100x5; peso muerto 140x3')
    expect(result.lines.map((l) => l.match?.exercise.id)).toEqual([
      'bench-press',
      'back-squat',
      'deadlift',
    ])
    expect(result.totalSets).toBe(3)
  })

  it('nombre seguido de dos puntos o guion', () => {
    expect(parse('Press banca: 80x8').lines[0]?.exerciseText).toBe('press banca')
    expect(splitLine('remo - 60x10')).toEqual({ name: 'remo', specs: '60x10' })
    expect(splitLine('solo nombre')).toEqual({ name: 'solo nombre', specs: '' })
  })
})

describe('parser: casos inválidos', () => {
  it('ejercicio desconocido con sugerencias', () => {
    const result = parse('pres banka 80x8')
    expect(result.ok).toBe(true)
    expect(parse('prensa 100x10').lines[0]?.errors[0]).toContain(
      '¿Quisiste decir «Press de banca con barra»',
    )
    const unknown = parse('zumbaterapia 80x8')
    expect(unknown.ok).toBe(false)
    expect(unknown.lines[0]?.errors[0]).toContain('No reconocí')
  })

  it('sin nombre o sin series', () => {
    expect(parse('80x8').lines[0]?.errors[0]).toContain('Falta el nombre')
    expect(parse('press banca').lines[0]?.errors[0]).toContain('No encontré series')
    expect(parse('').ok).toBe(false)
  })

  it('valores fuera de rango', () => {
    expect(parse('banca 80x0').lines[0]?.errors[0]).toContain('reps')
    expect(parse('banca 800x5').lines[0]?.errors[0]).toContain('error de tipeo')
    expect(parse('banca 80x5x25').lines[0]?.errors[0]).toContain('series')
  })

  it('RIR fuera de 0–4 se ajusta con aviso', () => {
    const result = parse('banca 80x8 rir 6')
    expect(result.lines[0]?.sets[0]?.rir).toBe(4)
    expect(result.lines[0]?.warnings[0]).toContain('entre 0 y 4')
    expect(parse('banca 80x8 rpe 5').lines[0]?.sets[0]?.rir).toBe(4)
  })
})

describe('parser: casos mixtos', () => {
  it('ignora palabras desconocidas y números sueltos con aviso', () => {
    const result = parse('banca 80x8 bien, 12')
    expect(result.ok).toBe(true)
    expect(result.lines[0]?.sets).toHaveLength(1)
    expect(result.lines[0]?.warnings).toEqual([
      'No entendí «bien»; lo ignoré.',
      'Ignoré «12»: escribe las series como peso×reps (p. ej. 80x8).',
    ])
  })

  it('modificadores sin serie previa', () => {
    const result = parse('banca 80x8 rir1, rir2, c')
    expect(result.lines[0]?.sets[0]?.rir).toBe(1)
    expect(result.lines[0]?.warnings).toEqual([
      '«rir2» no tiene una serie antes; lo ignoré.',
      '«c» no tiene una serie antes; lo ignoré.',
    ])
  })

  it('una línea válida y otra inválida', () => {
    const result = parse('banca 80x8\nzumbaterapia 3x10')
    expect(result.ok).toBe(false)
    expect(result.lines[0]?.errors).toEqual([])
    expect(result.lines[1]?.errors.length).toBeGreaterThan(0)
  })

  it('tokeniza separadores y unidades', () => {
    expect(tokenize('80x8 / kg').map((t) => t.kind)).toEqual(['set', 'sep', 'unit'])
  })
})
