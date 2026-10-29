import { CARDIO } from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import { fmt } from '../shared/format'
import { roundTo } from '../shared/math'
import { WEEKDAYS, type ExperienceLevel, type Weekday } from '../types'
import { WEEKDAY_SHORT } from './days'

export interface CardioPlan {
  stepsGoal: number
  liss: { sessions: number; minutes: [number, number] }
  hiit: { maxPerWeek: number; allowedWeekdays: Weekday[] }
}

function neighbors(day: Weekday): Weekday[] {
  return [(((day + 5) % 7) + 1) as Weekday, day, ((day % 7) + 1) as Weekday]
}

export function buildCardioPlan(input: {
  avgSteps: number
  legDays: readonly Weekday[]
  experience: ExperienceLevel
}): Calculated<CardioPlan> {
  const [low, high] = CARDIO.stepsGoal
  const stepsGoal =
    input.avgSteps >= high
      ? roundTo(input.avgSteps, 500)
      : input.avgSteps >= low
        ? high
        : Math.min(low, roundTo(input.avgSteps + CARDIO.stepIncrement, 500))

  const blocked = new Set(input.legDays.flatMap(neighbors))
  const allowedWeekdays = WEEKDAYS.filter((d) => !blocked.has(d))
  const cap = input.experience === 'beginner' ? 1 : CARDIO.hiitMaxPerWeek
  const maxPerWeek = Math.min(cap, allowedWeekdays.length)
  const lissSessions =
    input.experience === 'beginner' ? CARDIO.lissSessions[0] : CARDIO.lissSessions[1]

  const stepsNote =
    stepsGoal < low
      ? `Hoy promedias ~${fmt(input.avgSteps)} pasos: sube de a 2.000 hasta llegar a 8.000.`
      : `Mantén ${fmt(stepsGoal)} pasos diarios.`

  return calculated(
    {
      stepsGoal,
      liss: { sessions: lissSessions, minutes: [...CARDIO.lissMinutes] },
      hiit: { maxPerWeek, allowedWeekdays },
    },
    {
      title: 'Tu cardio',
      summary: `${stepsNote} Suma ${lissSessions} sesiones de cardio suave de 20–40 min por semana${maxPerWeek > 0 ? ` y como máximo ${maxPerWeek} de HIIT` : ''}.`,
      steps: [
        { label: 'Pasos', value: `${fmt(stepsGoal)} al día (meta 8.000–10.000)` },
        {
          label: 'Cardio suave',
          value: `${lissSessions} × 20–40 min (caminar inclinado, bici, elíptica)`,
        },
        {
          label: 'HIIT',
          value:
            maxPerWeek > 0
              ? `Máx. ${maxPerWeek}/semana, lejos de pierna: ${allowedWeekdays.map((d) => WEEKDAY_SHORT[d]).join(', ')}`
              : 'Sin HIIT esta semana: todos los días están cerca de un día de pierna',
        },
      ],
      rationale:
        'Los pasos son la forma más barata de gastar energía sin afectar la recuperación. El HIIT interfiere con la fuerza de piernas si se hace cerca de esos días.',
    },
  )
}
