import type { HealthAnswers } from '../types'

export type HealthSeverity = 'info' | 'warning' | 'critical'

export interface HealthWarning {
  id: keyof HealthAnswers
  severity: HealthSeverity
  title: string
  message: string
}

export interface HealthEvaluation {
  /** No se aplica déficit: se come en mantenimiento. */
  noDeficit: boolean
  /** Hay al menos una respuesta afirmativa: recomendamos valoración profesional. */
  requiresProfessional: boolean
  warnings: HealthWarning[]
}

export const NO_HEALTH_ISSUES: HealthAnswers = {
  diabetes: false,
  kidneyDisease: false,
  heartDisease: false,
  hypertension: false,
  otherCondition: false,
  pregnant: false,
  breastfeeding: false,
  eatingDisorderHistory: false,
  medications: false,
}

const WARNINGS: Record<keyof HealthAnswers, Omit<HealthWarning, 'id'>> = {
  pregnant: {
    severity: 'critical',
    title: 'Embarazo',
    message:
      'No aplicamos déficit calórico. Tu plan queda en calorías de mantenimiento; ajusta la alimentación y el entrenamiento con tu médico o nutricionista.',
  },
  breastfeeding: {
    severity: 'critical',
    title: 'Lactancia',
    message:
      'No aplicamos déficit: la lactancia aumenta tus necesidades de energía. Consulta con tu médico o nutricionista antes de buscar pérdida de grasa.',
  },
  eatingDisorderHistory: {
    severity: 'critical',
    title: 'Historial de trastornos alimenticios',
    message:
      'No aplicamos déficit calórico. Te recomendamos trabajar cualquier cambio de alimentación con un profesional de salud mental y un nutricionista.',
  },
  kidneyDisease: {
    severity: 'critical',
    title: 'Enfermedad renal',
    message:
      'El plan usa proteína alta (≈2 g/kg). Con enfermedad renal esto puede no ser adecuado: no sigas la cifra de proteína sin aprobación de tu nefrólogo o nutricionista.',
  },
  diabetes: {
    severity: 'warning',
    title: 'Diabetes',
    message:
      'Si usas insulina u otros medicamentos para la glucosa, un déficit o el entrenamiento pueden causar hipoglucemias. Ajusta el plan con tu médico.',
  },
  heartDisease: {
    severity: 'warning',
    title: 'Enfermedad cardiovascular',
    message: 'Pide autorización médica antes de entrenar con cargas pesadas o a alta intensidad.',
  },
  hypertension: {
    severity: 'warning',
    title: 'Hipertensión',
    message:
      'Controla tu presión y evita aguantar la respiración en las series pesadas hasta que tu médico lo apruebe.',
  },
  medications: {
    severity: 'warning',
    title: 'Medicamentos',
    message:
      'Algunos medicamentos afectan el apetito, el peso o la respuesta al ejercicio. Coméntale este plan a tu médico.',
  },
  otherCondition: {
    severity: 'info',
    title: 'Otra condición médica',
    message: 'Consulta con un profesional de salud para validar que este plan es adecuado para ti.',
  },
}

const ORDER: (keyof HealthAnswers)[] = [
  'pregnant',
  'breastfeeding',
  'eatingDisorderHistory',
  'kidneyDisease',
  'diabetes',
  'heartDisease',
  'hypertension',
  'medications',
  'otherCondition',
]

export function evaluateHealth(answers: HealthAnswers): HealthEvaluation {
  const warnings = ORDER.filter((key) => answers[key]).map((id) => ({ id, ...WARNINGS[id] }))
  return {
    noDeficit: answers.pregnant || answers.breastfeeding || answers.eatingDisorderHistory,
    requiresProfessional: warnings.length > 0,
    warnings,
  }
}

export const LEGAL_DISCLAIMER =
  'Esta app ofrece orientación general basada en evidencia y no reemplaza la valoración de un médico o nutricionista.'
