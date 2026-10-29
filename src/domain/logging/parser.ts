import { fmt } from '../shared/format'
import { roundDecimals } from '../shared/math'
import { normalizeText } from '../shared/text'
import { toKg } from '../shared/units'
import type { Exercise, WeightUnit } from '../types'
import { matchExercise, type ExerciseMatch } from './matching'

/**
 * Parser de registro rápido por texto (sin IA, solo reglas).
 *
 * Gramática por línea (o separada por ";"):
 *   <ejercicio> <series>[, <series>…] [modificadores]
 *
 *   80x8            peso × reps
 *   100x5x3         peso × reps × series
 *   82,5x5  82.5x5  decimales con coma o punto
 *   80kg x 8  175lb x 5   unidad explícita (si no, la de tus ajustes)
 *   +10x8           lastre en ejercicios con peso corporal
 *   10, 8, 7        solo reps (ejercicios con peso corporal)
 *   rir2  rir 2  @2 RIR de la serie anterior; "@8" o "rpe 8" se leen como RPE (RIR = 10 − RPE)
 *   c  cal  w       marca la serie anterior como calentamiento
 *
 * Un RIR al final de la línea, si es el único, aplica a todas las series sin RIR.
 */

export interface ParsedSet {
  weight: number
  unit: WeightUnit
  weightKg: number
  reps: number
  rir: number | null
  isWarmup: boolean
}

export interface ParsedLine {
  raw: string
  exerciseText: string
  match: ExerciseMatch | null
  suggestions: ExerciseMatch[]
  sets: ParsedSet[]
  warnings: string[]
  errors: string[]
}

export interface ParseResult {
  lines: ParsedLine[]
  totalSets: number
  ok: boolean
}

export interface ParseOptions {
  exercises: readonly Exercise[]
  defaultUnit: WeightUnit
}

const MAX_REPS = 100
const MAX_SETS = 20
const MAX_WEIGHT = 600
const MAX_RIR = 4

type Token =
  | {
      kind: 'set'
      text: string
      a: number
      b: number
      c: number | null
      unit: WeightUnit | null
      plus: boolean
    }
  | { kind: 'rir'; text: string; value: number; rpe: boolean }
  | { kind: 'warmup'; text: string }
  | { kind: 'unit'; text: string; unit: WeightUnit }
  | { kind: 'num'; text: string; value: number }
  | { kind: 'sep'; text: string }
  | { kind: 'other'; text: string }

const NUMBER = String.raw`\d+(?:[.,]\d+)?`
const UNIT = String.raw`(kg|kgs|kilos?|lbs?|libras?)`
const SET_RE = new RegExp(String.raw`(\+)?(${NUMBER})\s*${UNIT}?\s*x\s*(\d+)(?:\s*x\s*(\d+))?`, 'y')
const RIR_RE = new RegExp(String.raw`(?:(rir|rpe)\s*:?\s*|(@)\s*)(${NUMBER})`, 'y')
const WARMUP_RE = /(calentamiento|cal|warmup|warm|w|c)(?![a-z0-9])/y
const UNIT_RE = new RegExp(String.raw`${UNIT}(?![a-z])`, 'y')
const NUM_RE = new RegExp(String.raw`(\+)?(${NUMBER})(?![a-z0-9])`, 'y')
const SEP_RE = /[,;/|]/y
const OTHER_RE = /[^\s,;/|]+/y

function toNumber(text: string): number {
  return Number(text.replace(',', '.'))
}

function toUnit(text: string): WeightUnit {
  return text.startsWith('l') ? 'lb' : 'kg'
}

function tryMatch(re: RegExp, text: string, index: number): RegExpExecArray | null {
  re.lastIndex = index
  return re.exec(text)
}

export function tokenize(specs: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < specs.length) {
    if (/\s/.test(specs[i] as string)) {
      i++
      continue
    }
    let m: RegExpExecArray | null
    if ((m = tryMatch(SET_RE, specs, i))) {
      tokens.push({
        kind: 'set',
        text: m[0],
        plus: m[1] === '+',
        a: toNumber(m[2] as string),
        unit: m[3] ? toUnit(m[3]) : null,
        b: Number(m[4]),
        c: m[5] ? Number(m[5]) : null,
      })
    } else if ((m = tryMatch(RIR_RE, specs, i))) {
      const value = toNumber(m[3] as string)
      const rpe = m[1] === 'rpe' || (m[2] === '@' && value >= 5)
      tokens.push({ kind: 'rir', text: m[0], value, rpe })
    } else if ((m = tryMatch(WARMUP_RE, specs, i))) {
      tokens.push({ kind: 'warmup', text: m[0] })
    } else if ((m = tryMatch(UNIT_RE, specs, i))) {
      tokens.push({ kind: 'unit', text: m[0], unit: toUnit(m[1] as string) })
    } else if ((m = tryMatch(NUM_RE, specs, i))) {
      tokens.push({ kind: 'num', text: m[0], value: toNumber(m[2] as string) })
    } else if ((m = tryMatch(SEP_RE, specs, i))) {
      tokens.push({ kind: 'sep', text: m[0] })
    } else {
      // OTHER_RE siempre coincide: el carácter actual no es espacio ni separador.
      const other = (tryMatch(OTHER_RE, specs, i) as RegExpExecArray)[0]
      tokens.push({ kind: 'other', text: other })
      i += other.length
      continue
    }
    i += m[0].length
  }
  return tokens
}

/** Separa el nombre del ejercicio de las series: el nombre termina donde empieza el primer número. */
export function splitLine(line: string): { name: string; specs: string } {
  const index = line.search(/\+?\d/)
  if (index === -1) return { name: line.trim(), specs: '' }
  return {
    name: line
      .slice(0, index)
      .replace(/[:\-–—]+\s*$/, '')
      .trim(),
    specs: line.slice(index),
  }
}

function parseLine(raw: string, options: ParseOptions): ParsedLine {
  const normalized = normalizeText(raw.replace(/[×*]/g, 'x'))
  const { name, specs } = splitLine(normalized.replace(/(\d)\s*x\s*(\d)/g, '$1x$2'))
  const warnings: string[] = []
  const errors: string[] = []
  const sets: ParsedSet[] = []

  const { best, suggestions } = name
    ? matchExercise(name, options.exercises)
    : { best: null, suggestions: [] }
  if (!name) errors.push('Falta el nombre del ejercicio al inicio de la línea.')
  else if (!best) {
    errors.push(
      `No reconocí el ejercicio «${name}».${suggestions.length > 0 ? ` ¿Quisiste decir ${suggestions.map((s) => `«${s.exercise.name}»`).join(' o ')}?` : ''}`,
    )
  }
  const isBodyweight = best?.exercise.loadType === 'bodyweight'

  const tokens = tokenize(specs)
  const lineUnit =
    tokens.find((t): t is Extract<Token, { kind: 'unit' }> => t.kind === 'unit')?.unit ??
    options.defaultUnit
  let group: ParsedSet[] = []

  const addSets = (weight: number, unit: WeightUnit, reps: number, count: number, text: string) => {
    if (reps <= 0 || reps > MAX_REPS) {
      errors.push(`«${text}»: ${reps} reps no parece válido.`)
      return
    }
    if (weight > MAX_WEIGHT) {
      errors.push(`«${text}»: ${fmt(weight, 2)} ${unit} parece un error de tipeo.`)
      return
    }
    if (count <= 0 || count > MAX_SETS) {
      errors.push(`«${text}»: ${count} series no parece válido.`)
      return
    }
    group = Array.from({ length: count }, () => ({
      weight,
      unit,
      weightKg: roundDecimals(toKg(weight, unit), 2),
      reps,
      rir: null,
      isWarmup: false,
    }))
    sets.push(...group)
  }

  const rirTokens = tokens.filter((t) => t.kind === 'rir')
  const lastSignificant = [...tokens].reverse().find((t) => t.kind !== 'sep')
  const trailingRir = rirTokens.length === 1 && lastSignificant?.kind === 'rir'

  for (const token of tokens) {
    switch (token.kind) {
      case 'set': {
        const unit = token.unit ?? lineUnit
        let weight = token.a
        let reps = token.b
        let count = token.c ?? 1
        if (token.c !== null && token.c > 10 && token.a <= 10) {
          ;[count, reps, weight] = [token.a, token.b, token.c]
          warnings.push(
            `Interpreté «${token.text}» como ${count} series × ${reps} reps con ${fmt(weight, 2)} ${unit}.`,
          )
        } else if (
          token.c === null &&
          isBodyweight &&
          !token.plus &&
          token.unit === null &&
          token.a <= 10
        ) {
          ;[count, reps, weight] = [token.a, token.b, 0]
          warnings.push(
            `Interpreté «${token.text}» como ${count} series × ${reps} reps con tu peso corporal. Si era lastre, escribe +${token.a}x${token.b}.`,
          )
        }
        addSets(weight, unit, reps, count, token.text)
        break
      }
      case 'num':
        if (isBodyweight) addSets(0, lineUnit, token.value, 1, token.text)
        else
          warnings.push(`Ignoré «${token.text}»: escribe las series como peso×reps (p. ej. 80x8).`)
        break
      case 'rir': {
        let rir = token.rpe ? 10 - token.value : token.value
        if (token.rpe)
          warnings.push(
            `Leí «${token.text}» como RPE ${fmt(token.value, 1)} → RIR ${fmt(Math.max(0, rir), 1)}.`,
          )
        if (rir > MAX_RIR || rir < 0) {
          warnings.push(`El RIR se registra entre 0 y 4; ajusté «${token.text}».`)
        }
        rir = Math.round(Math.min(MAX_RIR, Math.max(0, rir)))
        const targets = trailingRir ? sets.filter((s) => s.rir === null) : group
        if (targets.length === 0)
          warnings.push(`«${token.text}» no tiene una serie antes; lo ignoré.`)
        for (const s of targets) s.rir = rir
        break
      }
      case 'warmup':
        if (group.length === 0)
          warnings.push(`«${token.text}» no tiene una serie antes; lo ignoré.`)
        for (const s of group) s.isWarmup = true
        break
      case 'sep':
        group = []
        break
      case 'unit':
        break
      case 'other':
        warnings.push(`No entendí «${token.text}»; lo ignoré.`)
        break
    }
  }

  if (sets.length === 0 && errors.length === 0) {
    errors.push('No encontré series. Escribe peso×reps, por ejemplo: 80x8, 80x7.')
  }

  return { raw, exerciseText: name, match: best, suggestions, sets, warnings, errors }
}

/** Convierte texto libre en series listas para guardar, con avisos de lo que no se entendió. */
export function parseWorkoutText(text: string, options: ParseOptions): ParseResult {
  const lines = text
    .split(/\n|;(?=\s*[a-záéíóúñ])/i)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => parseLine(l, options))
  return {
    lines,
    totalSets: lines.reduce((acc, l) => acc + l.sets.length, 0),
    ok: lines.length > 0 && lines.every((l) => l.errors.length === 0),
  }
}
