import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { toDayKey } from '@/domain/shared/dates'
import { onboardedRepos } from '@/test/onboarding'
import { renderScreen } from '@/test/render'

import { AddFoodPage } from './AddFoodPage'
import { NutritionPage } from './NutritionPage'

const today = toDayKey(new Date())

describe('Diario de nutrición', () => {
  it('genera el menú del día y registra una comida del plan con un toque', async () => {
    const user = userEvent.setup()
    const repos = await onboardedRepos(today)
    renderScreen(<NutritionPage />, { path: '/nutricion', repos })

    expect(await screen.findByRole('progressbar', { name: /Calorías: 0 de/ })).toBeInTheDocument()
    const breakfast = (await screen.findByRole('heading', { name: /Desayuno/ })).closest(
      'section',
    ) as HTMLElement
    await user.click(await within(breakfast).findByRole('button', { name: /Lo comí/ }))

    await waitFor(async () => {
      const entries = await repos.foodLogs.listByDate(today)
      expect(entries.length).toBeGreaterThan(0)
      expect(entries.every((e) => e.mealIndex === 0 && e.kind === 'food')).toBe(true)
    })
    const plan = await repos.mealPlans.get(today)
    expect(plan?.meals[0]?.items.length).toBe((await repos.foodLogs.listByDate(today)).length)
    expect(await screen.findByText(/Te faltan \d+ g de proteína/)).toBeInTheDocument()
  })
})

describe('Agregar alimento', () => {
  it('busca, elige la cantidad en gramos y lo agrega a la comida', async () => {
    const user = userEvent.setup()
    const repos = await onboardedRepos(today)
    renderScreen(<AddFoodPage />, {
      path: '/nutricion/agregar',
      route: '/nutricion/agregar?comida=1',
      repos,
    })

    await user.type(await screen.findByPlaceholderText(/Buscar: arroz/), 'arroz blanco')
    await user.click(await screen.findByRole('button', { name: /Arroz blanco cocido/ }))
    await user.click(await screen.findByRole('radio', { name: 'Gramos' }))
    const grams = screen.getByLabelText('Gramos')
    await user.clear(grams)
    await user.type(grams, '200')
    await user.click(screen.getByRole('button', { name: /Agregar a Almuerzo/ }))

    await waitFor(async () => {
      const [entry] = await repos.foodLogs.listByDate(today)
      expect(entry).toMatchObject({ name: 'Arroz blanco cocido', grams: 200, mealIndex: 1 })
      expect(entry?.kcal).toBeGreaterThan(200)
    })
    expect(await screen.findByRole('link', { name: /Listo · 1 agregado/ })).toBeInTheDocument()
  })

  it('registro rápido calcula las calorías con los macros', async () => {
    const user = userEvent.setup()
    const repos = await onboardedRepos(today)
    renderScreen(<AddFoodPage />, {
      path: '/nutricion/agregar',
      route: '/nutricion/agregar?comida=2',
      repos,
    })

    await user.click(await screen.findByRole('radio', { name: 'Rápido' }))
    await user.type(screen.getByLabelText('Nombre'), 'Empanada')
    await user.type(screen.getByLabelText('Proteína'), '10')
    await user.type(screen.getByLabelText('Carbos'), '30')
    await user.type(screen.getByLabelText('Grasa'), '12')
    await user.click(screen.getByRole('button', { name: /Agregar 268 kcal/ }))

    await waitFor(async () => {
      const [entry] = await repos.foodLogs.listByDate(today)
      expect(entry).toMatchObject({
        name: 'Empanada',
        kind: 'quick',
        kcal: 268,
        protein: 10,
        mealIndex: 2,
      })
    })
  })
})
