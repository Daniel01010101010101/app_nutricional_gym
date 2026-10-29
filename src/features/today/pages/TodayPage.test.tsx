import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { toDayKey } from '@/domain/shared/dates'
import { onboardedRepos } from '@/test/onboarding'
import { renderScreen } from '@/test/render'

import { TodayPage } from './TodayPage'

const today = toDayKey(new Date())

describe('TodayPage', () => {
  it('resume el día: entreno o descanso, nutrición con la siguiente comida, agua, pasos y consejo', async () => {
    const user = userEvent.setup()
    const repos = await onboardedRepos(today)
    renderScreen(<TodayPage />, { path: '/', repos })

    expect(
      await screen.findByRole('heading', { name: /Buen[oa]s (días|tardes|noches), Daniel/ }),
    ).toBeInTheDocument()
    const workout = screen.getByRole('region', { name: 'Entreno de hoy' })
    expect(
      within(workout).getByRole('heading', { name: /Hoy toca|Día de descanso/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Agua' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pasos' })).toBeInTheDocument()
    expect(screen.getByText('Consejo del día')).toBeInTheDocument()

    const nutrition = await screen.findByRole('region', { name: 'Nutrición de hoy' })
    await user.click(await within(nutrition).findByRole('button', { name: /Lo comí/ }))
    await waitFor(async () =>
      expect((await repos.foodLogs.listByDate(today)).length).toBeGreaterThan(0),
    )

    await user.click(
      within(screen.getByRole('region', { name: 'Agua' })).getByRole('button', {
        name: /Sumar un vaso/,
      }),
    )
    await waitFor(async () => expect((await repos.dailyLogs.get(today))?.waterMl).toBe(250))
  })
})
