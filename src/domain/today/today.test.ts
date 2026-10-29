import { describe, expect, it } from 'vitest'

import { checkinPeriod, pickDaily, proteinStreak, reminders, trainingStreak } from './today'

describe('rachas', () => {
  const day = (date: string, proteinMet: boolean, isTrainingDay = false, trained = false) => ({
    date,
    proteinMet,
    isTrainingDay,
    trained,
  })

  it('proteína: cuenta hacia atrás desde hoy o ayer', () => {
    const days = [
      day('2026-01-01', true),
      day('2026-01-02', true),
      day('2026-01-03', true),
      day('2026-01-04', false),
    ]
    expect(proteinStreak(days, '2026-01-04')).toBe(3)
    expect(proteinStreak([...days.slice(0, 3), day('2026-01-04', true)], '2026-01-04')).toBe(4)
    expect(proteinStreak([day('2026-01-01', true)], '2026-01-04')).toBe(0)
  })

  it('entrenos: los descansos no rompen la racha; hoy no la rompe si aún no entrenas', () => {
    const days = [
      day('2025-12-30', false, true, false),
      day('2025-12-31', false, true, true),
      day('2026-01-01', false, false, false),
      day('2026-01-02', false, true, true),
      day('2026-01-03', false, true, false),
    ]
    expect(trainingStreak(days, '2026-01-03')).toBe(2)
    expect(trainingStreak([], '2026-01-03')).toBe(0)
  })
})

describe('consejo del día', () => {
  it('es determinista por fecha', () => {
    const tips = ['a', 'b', 'c']
    expect(pickDaily(tips, '2026-01-01')).toBe(pickDaily(tips, '2026-01-01'))
    expect(pickDaily([], '2026-01-01')).toBeUndefined()
  })
})

describe('recordatorios y check-in', () => {
  it('período evaluado: la semana anterior al último día de check-in', () => {
    expect(checkinPeriod('2026-01-07', 1)).toEqual({
      weekStart: '2025-12-29',
      weekEnd: '2026-01-04',
    })
    expect(checkinPeriod('2026-01-05', 1)).toEqual({
      weekStart: '2025-12-29',
      weekEnd: '2026-01-04',
    })
  })

  it('pide pesarse y hacer el check-in pendiente', () => {
    const base = {
      today: '2026-01-05',
      hasWeightToday: false,
      checkinWeekday: 1 as const,
      completedCheckinWeekStarts: [],
      startedOn: '2025-12-20',
    }
    expect(reminders(base)).toMatchObject({ weighIn: true, checkinDue: true, isCheckinDay: true })
    expect(reminders({ ...base, completedCheckinWeekStarts: ['2025-12-29'] }).checkinDue).toBe(
      false,
    )
    expect(reminders({ ...base, startedOn: '2026-01-03', hasWeightToday: true })).toMatchObject({
      weighIn: false,
      checkinDue: false,
    })
    expect(reminders({ ...base, today: '2026-01-06' }).isCheckinDay).toBe(false)
  })
})
