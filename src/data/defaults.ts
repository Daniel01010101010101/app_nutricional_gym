import { DELOAD } from '@/domain/constants/formulas'
import { DEFAULT_LOADING } from '@/domain/training/loading'

import type { Settings } from './schemas'

export function defaultSettings(now: string): Settings {
  return {
    id: 'settings',
    unit: 'kg',
    checkinWeekday: 1,
    loading: structuredClone(DEFAULT_LOADING),
    restSeconds: { main: 180, secondary: 150, accessory: 90 },
    timerSound: true,
    timerVibration: true,
    autoStartTimer: true,
    deloadEveryWeeks: DELOAD.defaultEveryWeeks,
    createdAt: now,
    updatedAt: now,
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
