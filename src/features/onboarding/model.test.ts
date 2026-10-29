import { describe, expect, it } from 'vitest'

import { DEFAULT_LOADING } from '@/domain/training/loading'

import {
  defaultOnboardingValues,
  loadingForUnit,
  profileFromOnboarding,
  trainingInputsChanged,
  validateStep,
  valuesFromProfile,
  type OnboardingValues,
} from './model'

const filled = (): OnboardingValues => ({
  ...defaultOnboardingValues(),
  name: 'Daniel',
  sex: 'male',
  age: 30,
  heightCm: 178,
  weight: 80,
  neckCm: 38,
  waistCm: 85,
  jobType: 'sedentary',
  avgSteps: 7000,
  experience: 'intermediate',
  acceptDisclaimer: true,
})

describe('validación por paso', () => {
  it('paso 1 exige datos básicos válidos', () => {
    const issues = validateStep(0, defaultOnboardingValues())
    expect(issues.map((i) => i.path)).toEqual(['name', 'sex', 'age', 'heightCm', 'weight'])
    expect(validateStep(0, { ...filled(), age: 16 })[0]?.message).toContain('18')
    expect(validateStep(0, { ...filled(), age: 30.5 })[0]?.path).toBe('age')
    expect(validateStep(0, { ...filled(), heightCm: 300 })[0]?.message).toContain('entre 120 y 230')
    expect(validateStep(0, { ...filled(), weight: 20 })[0]?.path).toBe('weight')
    expect(validateStep(0, filled())).toEqual([])
  })

  it('paso 2: % conocido con método, o medidas coherentes para US Navy', () => {
    expect(validateStep(1, { ...filled(), knowsBodyFat: true }).map((i) => i.path)).toEqual([
      'bodyFatPct',
      'bodyFatMethod',
    ])
    expect(
      validateStep(1, { ...filled(), knowsBodyFat: true, bodyFatPct: 15, bodyFatMethod: 'dexa' }),
    ).toEqual([])
    expect(validateStep(1, { ...filled(), sex: 'female' }).map((i) => i.path)).toEqual(['hipCm'])
    expect(validateStep(1, { ...filled(), neckCm: 40, waistCm: 40 })[0]?.message).toContain(
      'cintura',
    )
    expect(
      validateStep(1, { ...filled(), chestCm: 10, armCm: 10, thighCm: 10 }).map((i) => i.path),
    ).toEqual(['chestCm', 'armCm', 'thighCm'])
    expect(validateStep(1, filled())).toEqual([])
  })

  it('paso 3 y 4: actividad y entrenamiento', () => {
    expect(validateStep(2, { ...filled(), jobType: undefined })[0]?.path).toBe('jobType')
    expect(
      validateStep(3, { ...filled(), availableWeekdays: [], trainingDays: 3 }).map((i) => i.path),
    ).toEqual(['availableWeekdays', 'trainingDays'])
    expect(
      validateStep(3, { ...filled(), availableWeekdays: [1, 2, 3, 4, 5, 6], trainingDays: 6 })[0]
        ?.message,
    ).toContain('máximo 5')
    expect(
      validateStep(3, {
        ...filled(),
        experience: undefined,
        trainingDays: undefined,
        equipment: [],
      }).map((i) => i.path),
    ).toEqual(['experience', 'trainingDays', 'equipment'])
  })

  it('paso 5: marcas de fuerza completas', () => {
    const values = filled()
    values.baseline.squat = { known: true, exerciseId: 'back-squat' }
    values.baseline.pullup = { known: true, weight: 0, reps: 40, exerciseId: 'pull-up' }
    expect(validateStep(4, values).map((i) => i.path)).toEqual([
      'baseline.squat.weight',
      'baseline.squat.reps',
      'baseline.pullup.reps',
    ])
  })

  it('paso 6 valida la hora y el resumen exige aceptar el aviso', () => {
    expect(validateStep(5, { ...filled(), trainingTime: '25:00' })[0]?.path).toBe('trainingTime')
    expect(validateStep(5, { ...filled(), trainingTime: '' })).toEqual([])
    expect(validateStep(6, filled())).toEqual([])
    expect(validateStep(7, { ...filled(), acceptDisclaimer: false })[0]?.path).toBe(
      'acceptDisclaimer',
    )
    expect(validateStep(99, filled())).toEqual([])
  })
})

describe('perfil desde el cuestionario', () => {
  it('convierte unidades, estima el % de grasa y normaliza restricciones', () => {
    const values = {
      ...filled(),
      unit: 'lb' as const,
      weight: 176.4,
      restrictions: ['vegan' as const],
    }
    values.baseline.bench = { known: true, weight: 225, reps: 5, exerciseId: 'bench-press' }
    const profile = profileFromOnboarding(values, '2026-01-05', '2026-01-05T10:00:00.000Z')
    expect(profile.weightKg).toBe(80)
    expect(profile.bodyFat).toEqual({ pct: 16.4, method: 'navy' })
    expect(profile.strengthBaseline.bench?.weightKg).toBeCloseTo(102.06, 2)
    expect(profile.nutrition.restrictions).toEqual(['vegan', 'vegetarian'])
    expect(profile.equipment).toContain('bodyweight')
    expect(profile.measurements).toEqual({ neckCm: 38, waistCm: 85 })
  })

  it('usa el % medido si se conoce y la hora variable como null', () => {
    const profile = profileFromOnboarding(
      {
        ...filled(),
        knowsBodyFat: true,
        bodyFatPct: 14,
        bodyFatMethod: 'dexa',
        trainingTime: '',
        equipment: ['bodyweight'],
      },
      '2026-01-05',
      'x',
    )
    expect(profile.bodyFat).toEqual({ pct: 14, method: 'dexa' })
    expect(profile.nutrition.trainingTime).toBeNull()
  })

  it('ida y vuelta perfil ↔ cuestionario, y detección de cambios de entreno', () => {
    const values = filled()
    values.baseline.row = { known: true, weight: 70, reps: 8, exerciseId: 'barbell-row' }
    const profile = profileFromOnboarding(
      { ...values, hipCm: 95, chestCm: 100, armCm: 35, thighCm: 55 },
      '2025-01-05',
      'x',
    )
    const back = valuesFromProfile(profile, { unit: 'lb', weightKg: 80, today: '2026-06-01' })
    expect(back.age).toBe(31)
    expect(back.weight).toBeCloseTo(176.4, 1)
    expect(back.baseline.row.known).toBe(true)
    expect(back.knowsBodyFat).toBe(false)
    const measured = valuesFromProfile(
      { ...profile, bodyFat: { pct: 12, method: 'dexa' } },
      { unit: 'kg', weightKg: 80, today: '2026-06-01' },
    )
    expect(measured).toMatchObject({ knowsBodyFat: true, bodyFatPct: 12, trainingTime: '18:00' })
    expect(
      valuesFromProfile(
        { ...profile, nutrition: { ...profile.nutrition, trainingTime: null } },
        { unit: 'kg', weightKg: 80, today: '2026-06-01' },
      ).trainingTime,
    ).toBe('')
    expect(trainingInputsChanged(profile, { ...profile, name: 'Otro' })).toBe(false)
    expect(trainingInputsChanged(profile, { ...profile, trainingDays: 3 })).toBe(true)
  })

  it('discos por defecto según la unidad', () => {
    expect(loadingForUnit('kg', DEFAULT_LOADING)).toBe(DEFAULT_LOADING)
    expect(loadingForUnit('lb', DEFAULT_LOADING).bar).toEqual({ value: 45, unit: 'lb' })
  })
})
