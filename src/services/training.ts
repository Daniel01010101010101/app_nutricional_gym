import { generateTrainingPlan, type TrainingPlanDraft } from '@/domain/training/planner'
import type { Calculated } from '@/domain/shared/explanation'
import type { DayKey, Exercise } from '@/domain/types'
import { newId, nowIso } from '@/data/defaults'
import type { Profile, TrainingPlan } from '@/data/schemas'

import { DEFAULT_BASELINE_EXERCISE } from './profile'

export function trainingDraftFor(
  profile: Profile,
  exercises: readonly Exercise[],
): Calculated<TrainingPlanDraft> {
  const preferred = Object.values(profile.strengthBaseline)
    .map((mark) => mark.exerciseId)
    .filter((id) => !Object.values(DEFAULT_BASELINE_EXERCISE).includes(id))
  return generateTrainingPlan({
    experience: profile.experience,
    daysPerWeek: profile.trainingDays,
    availableWeekdays: profile.availableWeekdays,
    sessionMinutes: profile.sessionMinutes,
    equipment: profile.equipment,
    injuries: profile.injuries,
    excludedExerciseIds: profile.excludedExerciseIds,
    priorityMuscles: profile.priorityMuscles,
    exercises,
    preferredExerciseIds: preferred,
  })
}

export function trainingPlanRecordFrom(
  draft: Calculated<TrainingPlanDraft>,
  blockStartDate: DayKey,
): TrainingPlan {
  const now = nowIso()
  return {
    id: newId(),
    status: 'active',
    splitId: draft.value.splitId,
    splitName: draft.value.splitName,
    blockStartDate,
    days: draft.value.days.map((day) => ({
      id: newId(),
      key: day.key,
      name: day.name,
      focus: day.focus,
      weekday: day.weekday,
      isLegDay: day.isLegDay,
      exercises: day.exercises.map((e) => ({ id: newId(), ...e })),
    })),
    warnings: draft.value.warnings,
    explanation: draft.explanation,
    createdAt: now,
    updatedAt: now,
  }
}
