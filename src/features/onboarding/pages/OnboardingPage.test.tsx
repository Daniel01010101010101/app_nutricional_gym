import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderScreen } from '@/test/render'

import { OnboardingPage } from './OnboardingPage'

describe('OnboardingPage', () => {
  it('muestra la bienvenida, valida el paso 1 y guarda el avance', async () => {
    const user = userEvent.setup()
    const { repos } = renderScreen(<OnboardingPage />, { path: '/onboarding' })

    const start = await screen.findByRole('button', { name: /Empezar/ })
    expect(
      screen.getByText(/Esta app ofrece orientación general basada en evidencia/),
    ).toBeInTheDocument()
    await user.click(start)
    expect(await screen.findByRole('heading', { name: 'Datos básicos' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Siguiente/ }))
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(screen.getByText('Escribe tu nombre')).toBeInTheDocument()

    await user.type(screen.getByLabelText('¿Cómo te llamas?'), 'Ana')
    await user.click(screen.getByRole('radio', { name: 'Mujer' }))
    fireEvent.change(screen.getByLabelText('Edad'), { target: { value: '28' } })
    fireEvent.change(screen.getByLabelText('Altura'), { target: { value: '165' } })
    fireEvent.change(screen.getByLabelText('Peso actual'), { target: { value: '64,5' } })
    await user.click(screen.getByRole('button', { name: /Siguiente/ }))

    expect(await screen.findByRole('heading', { name: 'Composición corporal' })).toBeInTheDocument()
    // En mujeres se pide la cadera.
    expect(screen.getByLabelText('Cadera')).toBeInTheDocument()

    await waitFor(async () => {
      const draft = await repos.onboarding.get()
      expect(draft?.step).toBe(1)
      expect(draft?.values.name).toBe('Ana')
      expect(draft?.values.weight).toBe(64.5)
    })
  })

  it('retoma un borrador guardado', async () => {
    const { repos } = renderScreen(<div />, { path: '/' })
    await repos.onboarding.save(2, { name: 'Luis', sex: 'male' })
    renderScreen(<OnboardingPage />, { path: '/onboarding', repos })
    expect(await screen.findByRole('heading', { name: 'Actividad diaria' })).toBeInTheDocument()
  })
})
