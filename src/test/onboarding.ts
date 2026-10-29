import { toDayKey } from '@/domain/shared/dates'
import type { DayKey } from '@/domain/types'
import type { Repositories } from '@/data/repositories/types'
import { completeOnboarding } from '@/features/onboarding/complete'
import { defaultOnboardingValues, type OnboardingValues } from '@/features/onboarding/model'

import { createTestRepositories } from './render'

export const onboardingValues = (overrides: Partial<OnboardingValues> = {}): OnboardingValues => ({
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
  ...overrides,
})

/** Repositorios con un usuario que ya completó el onboarding (perfil, objetivos y plan). */
export async function onboardedRepos(
  today: DayKey = toDayKey(new Date()),
  overrides: Partial<OnboardingValues> = {},
): Promise<Repositories> {
  const { repos } = createTestRepositories()
  await completeOnboarding(repos, onboardingValues(overrides), await repos.exercises.list(), today)
  return repos
}
