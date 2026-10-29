import { z } from 'zod'

import { TABLE_NAMES, type ForjaDB, type TableName } from '../db'
import { nowIso } from '../defaults'
import {
  bodyWeightSchema,
  checkinSchema,
  dailyLogSchema,
  dayKeySchema,
  exerciseSchema,
  favoriteMealSchema,
  foodLogEntrySchema,
  foodSchema,
  isoSchema,
  mealPlanSchema,
  measurementSchema,
  nutritionTargetsSchema,
  onboardingDraftSchema,
  photoPoseSchema,
  profileSchema,
  settingsSchema,
  trainingPlanSchema,
  workoutSessionSchema,
  workoutSetSchema,
} from '../schemas'
import type { BackupFile } from './types'

export const BACKUP_SCHEMA_VERSION = 1

/** En el JSON las fotos viajan como data URL. */
const photoJsonSchema = z.object({
  id: z.string(),
  date: dayKeySchema,
  pose: photoPoseSchema,
  blob: z.string().startsWith('data:'),
  thumb: z.string().startsWith('data:'),
  createdAt: isoSchema,
})

const TABLE_SCHEMAS = {
  profile: profileSchema,
  settings: settingsSchema,
  onboardingDraft: onboardingDraftSchema,
  nutritionTargets: nutritionTargetsSchema,
  trainingPlans: trainingPlanSchema,
  foods: foodSchema,
  exercises: exerciseSchema,
  foodLogs: foodLogEntrySchema,
  favoriteMeals: favoriteMealSchema,
  mealPlans: mealPlanSchema,
  dailyLogs: dailyLogSchema,
  workoutSessions: workoutSessionSchema,
  workoutSets: workoutSetSchema,
  bodyWeights: bodyWeightSchema,
  measurements: measurementSchema,
  progressPhotos: photoJsonSchema,
  checkins: checkinSchema,
  meta: z.object({ key: z.string(), value: z.string() }),
} satisfies Record<TableName, z.ZodType>

export const backupFileSchema = z.object({
  app: z.literal('forja'),
  schemaVersion: z.number().int().min(1).max(BACKUP_SCHEMA_VERSION),
  exportedAt: isoSchema,
  preferences: z.object({ theme: z.string().nullable() }),
  tables: z.object(
    Object.fromEntries(
      TABLE_NAMES.map((name) => [name, z.array(TABLE_SCHEMAS[name]).default([])]),
    ) as { [K in TableName]: z.ZodDefault<z.ZodArray<(typeof TABLE_SCHEMAS)[K]>> },
  ),
})

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header = '', base64 = ''] = dataUrl.split(',')
  const type = /data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function createBackup(
  db: ForjaDB,
  options: { includePhotos: boolean; theme: string | null },
): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {}
  for (const name of TABLE_NAMES) {
    if (name === 'progressPhotos') continue
    tables[name] = await db.table(name).toArray()
  }
  const photos = options.includePhotos ? await db.progressPhotos.toArray() : []
  tables.progressPhotos = await Promise.all(
    photos.map(async (p) => ({
      ...p,
      blob: await blobToDataUrl(p.blob),
      thumb: await blobToDataUrl(p.thumb),
    })),
  )
  return {
    app: 'forja',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: nowIso(),
    preferences: { theme: options.theme },
    tables,
  }
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

/** Valida el archivo completo y reemplaza todos los datos en una sola transacción. */
export async function restoreBackup(
  db: ForjaDB,
  file: unknown,
): Promise<{ theme: string | null; counts: Record<string, number> }> {
  const parsed = backupFileSchema.safeParse(file)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new BackupError(
      `El archivo no es un respaldo válido de FORJA${issue ? ` (${issue.path.join('.')}: ${issue.message})` : ''}.`,
    )
  }
  const { tables, preferences } = parsed.data
  const counts: Record<string, number> = {}

  await db.transaction(
    'rw',
    TABLE_NAMES.map((name) => db.table(name)),
    async () => {
      for (const name of TABLE_NAMES) {
        await db.table(name).clear()
        const rows =
          name === 'progressPhotos'
            ? tables.progressPhotos.map((p) => ({
                ...p,
                blob: dataUrlToBlob(p.blob),
                thumb: dataUrlToBlob(p.thumb),
              }))
            : tables[name]
        await db.table(name).bulkPut(rows)
        counts[name] = rows.length
      }
    },
  )
  return { theme: preferences.theme, counts }
}
