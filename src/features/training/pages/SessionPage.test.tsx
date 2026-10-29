import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { toDayKey } from '@/domain/shared/dates'
import type { Repositories } from '@/data/repositories/types'
import type { PlanDay, TrainingPlan } from '@/data/schemas'
import { completeOnboarding } from '@/features/onboarding/complete'
import { defaultOnboardingValues, type OnboardingValues } from '@/features/onboarding/model'
import { newSet, startSession } from '@/services/workout'
import { useCelebration } from '@/stores/celebration'
import { useRestTimer } from '@/stores/restTimer'
import { createTestRepositories, renderScreen } from '@/test/render'

import { SessionPage } from './SessionPage'

const today = toDayKey(new Date())

const values = (): OnboardingValues => ({
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

async function setup(): Promise<{ repos: Repositories; plan: TrainingPlan; day: PlanDay }> {
  const { repos } = createTestRepositories()
  await completeOnboarding(repos, values(), await repos.exercises.list(), today)
  const plan = (await repos.plans.getActive())!
  const day = plan.days.find((d) => d.exercises.some((e) => e.exerciseId === 'bench-press'))!
  return { repos, plan, day }
}

function renderSession(repos: Repositories) {
  return renderScreen(<SessionPage />, {
    path: '/entreno/sesion',
    repos,
    extraRoutes: [{ path: '/entreno/sesion/:id/resumen', element: <p>Pantalla de resumen</p> }],
  })
}

async function benchCard() {
  const heading = await screen.findByRole('heading', { name: 'Press de banca con barra' })
  return heading.closest('article') as HTMLElement
}

describe('SessionPage', () => {
  beforeEach(() => {
    useRestTimer.getState().stop()
    useCelebration.setState({ queue: [] })
  })

  it('registra una serie con un toque y arranca el descanso', async () => {
    const user = userEvent.setup()
    const { repos, plan, day } = await setup()
    const session = await startSession(repos, {
      plan,
      day,
      title: day.name,
      today,
      isDeload: false,
    })
    renderSession(repos)

    const card = await benchCard()
    // Primera vez: no hay peso sugerido, así que el botón espera un peso.
    expect(within(card).getByText(/Busca un peso para 4–6 reps/)).toBeInTheDocument()
    const log = within(card).getByRole('button', { name: /Registrar serie 1/ })
    expect(log).toBeDisabled()

    await user.type(within(card).getByLabelText('Peso'), '80')
    await user.click(log)

    await waitFor(async () => {
      const sets = await repos.workouts.listSetsBySession(session.id)
      expect(sets).toHaveLength(1)
      expect(sets[0]).toMatchObject({
        exerciseId: 'bench-press',
        weightKg: 80,
        reps: 6,
        isWarmup: false,
      })
    })
    expect(useRestTimer.getState().endsAt).not.toBeNull()
    expect(useRestTimer.getState().durationSec).toBe(180)
    // La siguiente serie queda precargada con el mismo peso.
    expect(await within(card).findByRole('button', { name: /Registrar serie 2/ })).toBeEnabled()
    expect(within(card).getByLabelText('Peso')).toHaveValue('80')
  })

  it('celebra un récord frente a sesiones anteriores', async () => {
    const user = userEvent.setup()
    const { repos, plan, day } = await setup()
    const previous = await startSession(repos, {
      plan,
      day,
      title: day.name,
      today: '2026-01-05',
      isDeload: false,
    })
    await repos.workouts.addSets([
      newSet(previous, {
        exerciseId: 'bench-press',
        weightKg: 80,
        reps: 5,
        rir: 2,
        isWarmup: false,
        setIndex: 0,
      }),
    ])
    await repos.workouts.updateSession(previous.id, {
      status: 'completed',
      endedAt: previous.startedAt,
    })
    await startSession(repos, { plan, day, title: day.name, today, isDeload: false })
    renderSession(repos)

    const card = await benchCard()
    expect(within(card).getByText(/Última vez/)).toBeInTheDocument()
    const weight = within(card).getByLabelText('Peso')
    await user.clear(weight)
    await user.type(weight, '85')
    await user.click(within(card).getByRole('button', { name: /Registrar serie 1/ }))

    await waitFor(() => expect(useCelebration.getState().queue).toHaveLength(1))
    expect(useCelebration.getState().queue[0]?.detail).toContain('Peso máximo')
    expect(await within(card).findByText('PR')).toBeInTheDocument()
  })

  it('registra por texto y termina la sesión', async () => {
    const user = userEvent.setup()
    const { repos, plan, day } = await setup()
    const session = await startSession(repos, {
      plan,
      day,
      title: day.name,
      today,
      isDeload: false,
    })
    renderSession(repos)
    await benchCard()

    await user.click(screen.getByRole('button', { name: 'Registrar por texto' }))
    await user.type(await screen.findByLabelText('Series en texto'), 'Press banca 80x6x2 rir2')
    await user.click(await screen.findByRole('button', { name: 'Registrar 2 series' }))

    await waitFor(async () => {
      const sets = await repos.workouts.listSetsBySession(session.id)
      expect(sets.map((s) => [s.weightKg, s.reps, s.rir])).toEqual([
        [80, 6, 2],
        [80, 6, 2],
      ])
    })

    await user.click(await screen.findByRole('button', { name: /Terminar entreno/ }))
    await user.click(await screen.findByRole('button', { name: /Terminar y ver resumen/ }))
    expect(await screen.findByText('Pantalla de resumen')).toBeInTheDocument()
    expect((await repos.workouts.getSession(session.id))?.status).toBe('completed')
  })

  it('sin sesión activa invita a empezar desde Entreno', async () => {
    const { repos } = await setup()
    renderSession(repos)
    expect(await screen.findByText('No hay un entreno en curso')).toBeInTheDocument()
  })
})
