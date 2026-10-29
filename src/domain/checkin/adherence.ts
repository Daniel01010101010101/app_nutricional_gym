import { CHECKIN } from '../constants/formulas'
import { roundDecimals } from '../shared/math'
import type { DayKey, Macros } from '../types'

export interface DayIntake {
  date: DayKey
  kcal: number
  protein: number
}

export interface DayAdherence {
  date: DayKey
  logged: boolean
  kcalOk: boolean
  proteinOk: boolean
  adherent: boolean
}

/** Un día cumple si las kcal están dentro de ±10 % y la proteína llega al 90 % del objetivo. */
export function evaluateDay(
  intake: DayIntake | undefined,
  target: Pick<Macros, 'kcal' | 'protein'>,
  date: DayKey,
): DayAdherence {
  if (!intake || intake.kcal <= 0) {
    return { date, logged: false, kcalOk: false, proteinOk: false, adherent: false }
  }
  const kcalOk = Math.abs(intake.kcal - target.kcal) <= target.kcal * CHECKIN.kcalTolerance
  const proteinOk = intake.protein >= target.protein * CHECKIN.proteinMetFraction
  return { date, logged: true, kcalOk, proteinOk, adherent: kcalOk && proteinOk }
}

export interface AdherenceSummary {
  days: DayAdherence[]
  adherentDays: number
  pct: number
}

/** Adherencia nutricional de un período. Los días sin registro cuentan como no cumplidos. */
export function nutritionAdherence(
  dates: readonly DayKey[],
  intakes: readonly DayIntake[],
  targetFor: (date: DayKey) => Pick<Macros, 'kcal' | 'protein'>,
): AdherenceSummary {
  const byDate = new Map(intakes.map((i) => [i.date, i]))
  const days = dates.map((date) => evaluateDay(byDate.get(date), targetFor(date), date))
  const adherentDays = days.filter((d) => d.adherent).length
  return {
    days,
    adherentDays,
    pct: dates.length === 0 ? 0 : roundDecimals((adherentDays / dates.length) * 100, 0),
  }
}

/** % de sesiones planificadas que se completaron (máximo 100). */
export function trainingAdherence(planned: number, completed: number): number {
  if (planned <= 0) return 100
  return Math.min(100, Math.round((completed / planned) * 100))
}
