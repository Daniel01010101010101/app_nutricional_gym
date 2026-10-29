import type { DayKey, Exercise } from '@/domain/types'
import { newId, nowIso } from '@/data/defaults'
import type { Repositories } from '@/data/repositories/types'
import { targetsRecordFrom } from '@/services/targets'
import { trainingPlanRecordFrom } from '@/services/training'

import type { Profile } from '@/data/schemas'

import { loadingForUnit, trainingInputsChanged, type OnboardingValues } from './model'
import { buildPreview } from './preview'

/** Guarda perfil, objetivos, plan de entrenamiento y mediciones iniciales. */
export async function completeOnboarding(
  repos: Repositories,
  values: OnboardingValues,
  exercises: readonly Exercise[],
  today: DayKey,
): Promise<void> {
  const { profile, nutrition, training } = buildPreview(values, exercises, today)
  const settings = await repos.settings.get()
  await repos.settings.update({
    unit: values.unit,
    loading: loadingForUnit(values.unit, settings.loading),
  })
  await repos.targets.add(
    targetsRecordFrom(nutrition, {
      effectiveFrom: today,
      source: 'onboarding',
      note: 'Plan inicial',
    }),
  )
  await repos.plans.save(trainingPlanRecordFrom(training, today))
  await repos.body.upsertWeight(today, profile.weightKg)
  await repos.body.addMeasurement({
    id: newId(),
    date: today,
    ...profile.measurements,
    bodyFatPct: profile.bodyFat.pct,
    createdAt: nowIso(),
  })
  // El perfil se guarda al final: es lo que marca el onboarding como terminado.
  await repos.profile.save(profile)
  await repos.onboarding.clear()
}

/**
 * Guarda los datos editados: nueva versión de objetivos desde hoy y, si cambió algo del entreno,
 * un plan nuevo (el historial de sesiones se conserva).
 */
export async function saveProfileEdit(
  repos: Repositories,
  previous: Profile,
  values: OnboardingValues,
  exercises: readonly Exercise[],
  today: DayKey,
): Promise<{ trainingRegenerated: boolean }> {
  const { profile, nutrition, training } = buildPreview(values, exercises, today)
  const updated: Profile = { ...profile, createdAt: previous.createdAt, updatedAt: nowIso() }
  await repos.settings.update({ unit: values.unit })
  await repos.targets.add(
    targetsRecordFrom(nutrition, {
      effectiveFrom: today,
      source: 'recalculation',
      note: 'Datos del perfil actualizados',
    }),
  )
  const trainingRegenerated = trainingInputsChanged(previous, updated)
  if (trainingRegenerated) await repos.plans.save(trainingPlanRecordFrom(training, today))
  await repos.body.upsertWeight(today, updated.weightKg)
  await repos.profile.save(updated)
  return { trainingRegenerated }
}
