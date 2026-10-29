import { describe, expect, it } from 'vitest'

import { EXERCISES } from '@/test/fixtures'

import { buildCardioPlan } from './cardio'
import { assignWeekdays, recommendTrainingDays, scheduleScore } from './days'
import { deloadSets, deloadStatus, weekInBlock } from './deload'
import { fitToDuration, generateTrainingPlan, type PlannedDay } from './planner'
import { prescriptionFor } from './prescription'
import { EQUIPMENT_PRESETS, isExerciseAvailable, selectExercise } from './selection'
import { splitForDays } from './splits'
import { estimateSessionMinutes, volumeTargets, weeklyVolume } from './volume'

const byId = new Map(EXERCISES.map((e) => [e.id, e]))
const gym = { equipment: EQUIPMENT_PRESETS.gym, injuries: [], excludedIds: [] }

describe('días de entrenamiento', () => {
  it('recomienda 4 (ideal), máximo 5 en déficit y 6 solo avanzados', () => {
    expect(recommendTrainingDays(5, 'beginner').value).toEqual({ recommended: 4, maxAllowed: 5 })
    expect(recommendTrainingDays(7, 'advanced').value).toEqual({ recommended: 5, maxAllowed: 6 })
    expect(recommendTrainingDays(3, 'intermediate').value.recommended).toBe(3)
  })

  it('avisa con menos de 3 días', () => {
    const { value } = recommendTrainingDays(2, 'intermediate')
    expect(value.recommended).toBe(2)
    expect(value.warning).toContain('3 días')
    expect(recommendTrainingDays(0, 'beginner').value.recommended).toBe(1)
  })

  it('reparte los días evitando 3 seguidos', () => {
    expect(assignWeekdays([1, 2, 3, 4, 5], 4)).toEqual([1, 2, 4, 5])
    expect(assignWeekdays([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([1, 3, 5])
    expect(assignWeekdays([], 3)).toEqual([])
    expect(assignWeekdays([2, 1, 1], 4)).toEqual([1, 2])
  })

  it('penaliza 3 días seguidos también al cruzar la semana', () => {
    expect(scheduleScore([6, 7, 1])).toBeGreaterThan(scheduleScore([1, 3, 5]))
  })
})

describe('splits', () => {
  it('elige el split según los días', () => {
    expect(splitForDays(1).sessions.map((s) => s.name)).toEqual(['Full Body A'])
    expect(splitForDays(3).split.id).toBe('full-body')
    expect(splitForDays(4).sessions.map((s) => s.name)).toEqual([
      'Torso A',
      'Pierna A',
      'Torso B',
      'Pierna B',
    ])
    expect(splitForDays(5).split.id).toBe('upper-lower-ppl')
    expect(splitForDays(6).split.id).toBe('ppl')
  })
})

describe('prescripción', () => {
  it('básicos 3–4 × 4–6 a RIR 1–2; accesorios 2–4 × 8–15', () => {
    expect(prescriptionFor('main', 'compound', 'advanced')).toMatchObject({
      sets: 4,
      repMin: 4,
      repMax: 6,
      rirMin: 1,
      rirMax: 2,
    })
    expect(prescriptionFor('main', 'compound', 'beginner').sets).toBe(3)
    expect(prescriptionFor('secondary', 'compound', 'beginner')).toMatchObject({
      repMin: 6,
      repMax: 10,
    })
    expect(prescriptionFor('accessory', 'isolation', 'beginner')).toMatchObject({
      sets: 2,
      repMin: 10,
      repMax: 15,
      rirMin: 1,
    })
    expect(prescriptionFor('accessory', 'compound', 'intermediate')).toMatchObject({
      sets: 3,
      repMin: 8,
      repMax: 12,
      rirMin: 0,
    })
  })
})

describe('selección de ejercicios', () => {
  const benchSlot = {
    patterns: ['horizontal-push' as const],
    role: 'main' as const,
    mainLift: 'bench' as const,
  }

  it('respeta equipo, lesiones y exclusiones', () => {
    const bench = byId.get('bench-press')!
    expect(isExerciseAvailable(bench, gym)).toBe(true)
    expect(isExerciseAvailable(bench, { ...gym, equipment: EQUIPMENT_PRESETS.dumbbells })).toBe(
      false,
    )
    expect(isExerciseAvailable(bench, { ...gym, injuries: ['shoulder'] })).toBe(false)
    expect(isExerciseAvailable(bench, { ...gym, excludedIds: ['bench-press'] })).toBe(false)
  })

  it('elige el básico con barra en gym y alternativas con otro equipo', () => {
    const none = new Set<string>()
    expect(selectExercise(benchSlot, EXERCISES, gym, none, none)?.id).toBe('bench-press')
    expect(
      selectExercise(
        benchSlot,
        EXERCISES,
        { ...gym, equipment: EQUIPMENT_PRESETS.dumbbells },
        none,
        none,
      )?.id,
    ).toBe('db-bench')
    expect(
      selectExercise(benchSlot, EXERCISES, { ...gym, injuries: ['shoulder'] }, none, none)?.id,
    ).toBe('push-up')
    expect(selectExercise(benchSlot, EXERCISES, gym, new Set(['bench-press']), none)?.id).toBe(
      'db-bench',
    )
    expect(
      selectExercise({ patterns: ['carry'], role: 'accessory' }, EXERCISES, gym, none, none),
    ).toBeNull()
  })

  it('respeta los ejercicios preferidos', () => {
    const none = new Set<string>()
    const pullSlot = {
      patterns: ['vertical-pull' as const],
      role: 'main' as const,
      mainLift: 'pullup' as const,
    }
    expect(selectExercise(pullSlot, EXERCISES, gym, none, none)?.id).toBe('pull-up')
    expect(
      selectExercise(pullSlot, EXERCISES, { ...gym, preferredIds: ['lat-pulldown'] }, none, none)
        ?.id,
    ).toBe('lat-pulldown')
  })

  it('en accesorios prefiere aislamiento del músculo pedido y variedad semanal', () => {
    const none = new Set<string>()
    const slot = {
      patterns: ['elbow-flexion' as const],
      role: 'accessory' as const,
      muscle: 'biceps' as const,
    }
    expect(selectExercise(slot, EXERCISES, gym, none, none)?.id).toBe('curl')
    expect(selectExercise(slot, EXERCISES, gym, none, new Set(['curl']))?.id).toBe('hammer-curl')
    const forearm = { ...slot, muscle: 'forearms' as const }
    expect(selectExercise(forearm, EXERCISES, gym, none, none)?.id).toBe('curl')
    const secondary = { patterns: ['horizontal-push' as const], role: 'secondary' as const }
    expect(selectExercise(secondary, EXERCISES, gym, none, none)?.id).toBe('db-bench')
    const isolationMain = { patterns: ['chest-fly' as const], role: 'main' as const }
    expect(selectExercise(isolationMain, EXERCISES, gym, none, none)?.id).toBe('db-fly')
    const secondaryIso = { patterns: ['chest-fly' as const], role: 'secondary' as const }
    expect(selectExercise(secondaryIso, EXERCISES, gym, none, none)?.id).toBe('db-fly')
  })
})

describe('volumen', () => {
  it('cuenta 1 serie para el músculo principal y 0.5 para secundarios', () => {
    const volume = weeklyVolume(
      [
        { exerciseId: 'bench-press', sets: 3 },
        { exerciseId: 'unknown', sets: 5 },
      ],
      byId,
    )
    expect(volume.chest).toBe(3)
    expect(volume.triceps).toBe(1.5)
  })

  it('objetivos: 10–12 principiantes, 10–16 en déficit, +3 para prioridades', () => {
    expect(volumeTargets('beginner', ['chest']).chest).toEqual({ min: 12, max: 12 })
    expect(volumeTargets('intermediate', ['glutes']).glutes).toEqual({ min: 13, max: 16 })
    expect(volumeTargets('intermediate', []).back).toEqual({ min: 10, max: 16 })
  })

  it('estima la duración de la sesión', () => {
    expect(estimateSessionMinutes([{ sets: 3, restSec: 180 }])).toBe(19)
  })
})

describe('plan semanal', () => {
  const input = {
    experience: 'intermediate' as const,
    daysPerWeek: 4,
    availableWeekdays: [1, 2, 3, 4, 5] as const,
    sessionMinutes: 75,
    equipment: EQUIPMENT_PRESETS.gym,
    injuries: [],
    excludedExerciseIds: [],
    priorityMuscles: [],
    exercises: EXERCISES,
  }

  it('genera Torso/Pierna en lunes, martes, jueves y viernes con los básicos', () => {
    const { value, explanation } = generateTrainingPlan({
      ...input,
      availableWeekdays: [...input.availableWeekdays],
    })
    expect(value.splitId).toBe('upper-lower')
    expect(value.days.map((d) => d.weekday)).toEqual([1, 2, 4, 5])
    expect(value.days[0]?.exercises[0]?.exerciseId).toBe('bench-press')
    expect(value.days[1]?.exercises[0]?.exerciseId).toBe('back-squat')
    expect(explanation.summary).toContain('Lunes: Torso A')
  })

  it('sin avisos cuando todo cabe y hay ejercicios para cada músculo', () => {
    const { value } = generateTrainingPlan({
      ...input,
      availableWeekdays: [1, 2, 3, 4, 5],
      sessionMinutes: 150,
    })
    expect(value.warnings).toEqual([])
  })

  it('sube el volumen de los músculos prioritarios', () => {
    const base = generateTrainingPlan({
      ...input,
      availableWeekdays: [1, 2, 3, 4, 5],
      sessionMinutes: 120,
    })
    const prio = generateTrainingPlan({
      ...input,
      availableWeekdays: [1, 2, 3, 4, 5],
      sessionMinutes: 120,
      priorityMuscles: ['biceps'],
    })
    expect(prio.value.volume.biceps).toBeGreaterThanOrEqual(13)
    expect(prio.value.volume.biceps).toBeGreaterThan(base.value.volume.biceps)
  })

  it('con días no asignables los deja a elección y avisa de faltantes en casa', () => {
    const { value, explanation } = generateTrainingPlan({
      ...input,
      daysPerWeek: 3,
      availableWeekdays: [1],
      equipment: EQUIPMENT_PRESETS.home,
      sessionMinutes: 45,
    })
    expect(value.days.map((d) => d.weekday)).toEqual([1, null, null])
    expect(value.warnings.length).toBeGreaterThan(0)
    expect(explanation.summary).toContain('día libre a elección')
  })

  it('un solo día por semana', () => {
    const { explanation } = generateTrainingPlan({
      ...input,
      daysPerWeek: 1,
      availableWeekdays: [3],
    })
    expect(explanation.summary).toContain('1 día por semana')
  })

  it('recorta para caber en sesiones cortas y avisa si no alcanza', () => {
    const { value } = generateTrainingPlan({
      ...input,
      availableWeekdays: [1, 2, 3, 4, 5],
      sessionMinutes: 30,
    })
    expect(value.warnings.some((w) => w.includes('dura más de 30 min'))).toBe(true)
  })

  it('recorta series de accesorios cuando un músculo supera el máximo', () => {
    const { value } = generateTrainingPlan({
      ...input,
      experience: 'beginner',
      daysPerWeek: 6,
      availableWeekdays: [1, 2, 3, 4, 5, 6, 7],
      sessionMinutes: 150,
    })
    const shoulderAccessories = value.days
      .flatMap((d) => d.exercises)
      .filter(
        (e) => e.role === 'accessory' && byId.get(e.exerciseId)?.primaryMuscle === 'shoulders',
      )
    expect(shoulderAccessories.every((e) => e.sets === 2)).toBe(true)
  })

  it('reduce volumen cuando sobra', () => {
    const day: PlannedDay = {
      key: 'x',
      name: 'X',
      focus: '',
      weekday: 1,
      isLegDay: false,
      exercises: Array.from({ length: 6 }, () => ({
        exerciseId: 'curl',
        role: 'accessory' as const,
        sets: 4,
        repMin: 10,
        repMax: 15,
        rirMin: 0,
        rirMax: 2,
        restSec: 90,
      })),
    }
    const { value } = generateTrainingPlan({
      ...input,
      availableWeekdays: [1, 2, 3, 4, 5],
      exercises: EXERCISES,
    })
    expect(value.volume.biceps).toBeLessThanOrEqual(16)
    expect(fitToDuration(day, 25)).toBe(true)
    expect(day.exercises.length).toBe(4)
  })

  it('fitToDuration recorta secundarios y básicos de 4 series antes de rendirse', () => {
    const day: PlannedDay = {
      key: 'y',
      name: 'Y',
      focus: '',
      weekday: 1,
      isLegDay: false,
      exercises: [
        {
          exerciseId: 'bench-press',
          role: 'main',
          sets: 4,
          repMin: 4,
          repMax: 6,
          rirMin: 1,
          rirMax: 2,
          restSec: 180,
        },
        {
          exerciseId: 'db-bench',
          role: 'secondary',
          sets: 3,
          repMin: 6,
          repMax: 10,
          rirMin: 1,
          rirMax: 2,
          restSec: 150,
        },
        {
          exerciseId: 'barbell-row',
          role: 'main',
          sets: 3,
          repMin: 4,
          repMax: 6,
          rirMin: 1,
          rirMax: 2,
          restSec: 180,
        },
      ],
    }
    expect(fitToDuration(day, 10)).toBe(false)
    expect(day.exercises.map((e) => e.sets)).toEqual([3, 2, 3])
  })
})

describe('cardio', () => {
  it('pasos progresivos hasta 8.000–10.000', () => {
    expect(
      buildCardioPlan({ avgSteps: 4000, legDays: [], experience: 'beginner' }).value.stepsGoal,
    ).toBe(6000)
    expect(
      buildCardioPlan({ avgSteps: 9000, legDays: [], experience: 'beginner' }).value.stepsGoal,
    ).toBe(10000)
    expect(
      buildCardioPlan({ avgSteps: 12300, legDays: [], experience: 'beginner' }).value.stepsGoal,
    ).toBe(12500)
  })

  it('HIIT máximo 1–2 y lejos de los días de pierna', () => {
    const plan = buildCardioPlan({
      avgSteps: 8000,
      legDays: [2, 5],
      experience: 'intermediate',
    }).value
    expect(plan.hiit).toEqual({ maxPerWeek: 1, allowedWeekdays: [7] })
    expect(plan.liss.sessions).toBe(3)
    const free = buildCardioPlan({ avgSteps: 8000, legDays: [], experience: 'advanced' }).value
    expect(free.hiit.maxPerWeek).toBe(2)
    const blocked = buildCardioPlan({ avgSteps: 8000, legDays: [1, 4, 7], experience: 'advanced' })
    expect(blocked.value.hiit.maxPerWeek).toBe(0)
    expect(blocked.explanation.summary).not.toContain('HIIT')
  })
})

describe('descarga', () => {
  const calm = { strengthAlert: false, lowWellbeingCheckins: 0, lowFeelingSessions: 0 }

  it('cuenta semanas del bloque', () => {
    expect(weekInBlock('2026-01-01', '2026-01-01')).toBe(1)
    expect(weekInBlock('2026-01-01', '2025-12-01')).toBe(1)
    expect(weekInBlock('2026-01-01', '2026-01-15')).toBe(3)
  })

  it('programada cada 6 semanas por defecto', () => {
    expect(
      deloadStatus({ blockStart: '2026-01-01', today: '2026-02-12', signals: calm }).value,
    ).toEqual({
      due: true,
      reason: 'scheduled',
      weekInBlock: 7,
    })
    expect(
      deloadStatus({ blockStart: '2026-01-01', today: '2026-01-20', signals: calm }).value.due,
    ).toBe(false)
    expect(
      deloadStatus({ blockStart: '2026-01-01', today: '2026-02-01', everyWeeks: 4, signals: calm })
        .value.due,
    ).toBe(true)
  })

  it('anticipada por fatiga', () => {
    for (const signals of [
      { ...calm, strengthAlert: true },
      { ...calm, lowWellbeingCheckins: 2 },
      { ...calm, lowFeelingSessions: 2 },
    ]) {
      const result = deloadStatus({ blockStart: '2026-01-01', today: '2026-01-10', signals })
      expect(result.value.reason).toBe('fatigue')
      expect(result.explanation.summary).toContain('fatiga')
    }
  })

  it('reduce las series a la mitad', () => {
    expect(deloadSets(3)).toBe(2)
    expect(deloadSets(4)).toBe(2)
    expect(deloadSets(1)).toBe(1)
  })
})
