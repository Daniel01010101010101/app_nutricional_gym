import { describe, expect, it } from 'vitest'

import { evaluateHealth, LEGAL_DISCLAIMER, NO_HEALTH_ISSUES } from './health'

describe('evaluación de salud', () => {
  it('sin condiciones: déficit permitido y sin avisos', () => {
    expect(evaluateHealth(NO_HEALTH_ISSUES)).toEqual({
      noDeficit: false,
      requiresProfessional: false,
      warnings: [],
    })
  })

  it.each(['pregnant', 'breastfeeding', 'eatingDisorderHistory'] as const)(
    '%s bloquea el déficit',
    (key) => {
      const result = evaluateHealth({ ...NO_HEALTH_ISSUES, [key]: true })
      expect(result.noDeficit).toBe(true)
      expect(result.requiresProfessional).toBe(true)
      expect(result.warnings[0]?.severity).toBe('critical')
    },
  )

  it('enfermedad renal avisa sobre la proteína sin bloquear el déficit', () => {
    const result = evaluateHealth({ ...NO_HEALTH_ISSUES, kidneyDisease: true, diabetes: true })
    expect(result.noDeficit).toBe(false)
    expect(result.warnings.map((w) => w.id)).toEqual(['kidneyDisease', 'diabetes'])
    expect(result.warnings[0]?.message).toContain('proteína')
  })

  it('ordena los avisos por gravedad', () => {
    const all = evaluateHealth({
      diabetes: true,
      kidneyDisease: true,
      heartDisease: true,
      hypertension: true,
      otherCondition: true,
      pregnant: true,
      breastfeeding: true,
      eatingDisorderHistory: true,
      medications: true,
    })
    expect(all.warnings).toHaveLength(9)
    expect(all.warnings.at(-1)?.severity).toBe('info')
  })

  it('incluye el aviso legal exacto', () => {
    expect(LEGAL_DISCLAIMER).toBe(
      'Esta app ofrece orientación general basada en evidencia y no reemplaza la valoración de un médico o nutricionista.',
    )
  })
})
