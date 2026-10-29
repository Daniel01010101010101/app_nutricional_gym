import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { addDaysToKey, toDayKey } from '@/domain/shared/dates'
import { onboardedRepos } from '@/test/onboarding'
import { renderScreen } from '@/test/render'

import { CheckinPage } from './CheckinPage'

const today = toDayKey(new Date())

describe('CheckinPage', () => {
  it('evalúa la semana, explica la recomendación y guarda la decisión', async () => {
    const user = userEvent.setup()
    const repos = await onboardedRepos(addDaysToKey(today, -21))
    renderScreen(<CheckinPage />, { path: '/checkin', repos })

    expect(await screen.findByText('Peso promedio')).toBeInTheDocument()
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Sueño' })).getByRole('radio', { name: '5' }),
    )
    await user.click(screen.getByRole('button', { name: /Ver mi recomendación/ }))

    // Sin comidas registradas, la adherencia manda: no se tocan las calorías.
    expect(
      await screen.findByRole('heading', { name: 'Primero, la adherencia' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No cambiamos las calorías/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Entendido/ }))

    await waitFor(async () => {
      const [checkin] = await repos.checkins.list()
      expect(checkin).toMatchObject({ decision: 'applied', sleep: 5 })
    })
    expect(await repos.targets.list()).toHaveLength(1)
  })

  it('antes de tener 4 días de datos anuncia la fecha del primer check-in', async () => {
    const repos = await onboardedRepos(today)
    renderScreen(<CheckinPage />, { path: '/checkin', repos })
    expect(await screen.findByText(/Tu primer check-in:/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ver mi recomendación/ })).not.toBeInTheDocument()
  })
})
