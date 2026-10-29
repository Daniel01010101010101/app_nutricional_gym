import { describe, expect, it } from 'vitest'

import { calculated } from './explanation'

describe('calculated', () => {
  it('empaqueta el valor junto con su explicación', () => {
    const result = calculated(42, { title: 'Respuesta', summary: 'La respuesta.' })
    expect(result.value).toBe(42)
    expect(result.explanation.title).toBe('Respuesta')
  })
})
