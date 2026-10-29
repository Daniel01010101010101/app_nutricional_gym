import type { DayKey, Exercise, Food, WorkoutSet } from '@/domain/types'

import type {
  BodyWeight,
  Checkin,
  DailyLog,
  FavoriteMeal,
  FoodLogEntry,
  MealPlanRecord,
  Measurement,
  NutritionTargets,
  OnboardingDraft,
  Profile,
  ProgressPhoto,
  Settings,
  TrainingPlan,
  WorkoutSession,
} from '../schemas'

/**
 * Contratos de acceso a datos. Las features solo conocen estas interfaces:
 * hoy se implementan con Dexie (IndexedDB) y mañana pueden tener una versión con sincronización.
 */

export interface Subscription {
  unsubscribe(): void
}

/** Flujo reactivo mínimo (compatible con `liveQuery` de Dexie y con RxJS). */
export interface Observable<T> {
  subscribe(observer: { next: (value: T) => void; error?: (error: unknown) => void }): Subscription
}

export interface ProfileRepository {
  get(): Promise<Profile | undefined>
  save(profile: Profile): Promise<void>
  observe(): Observable<Profile | undefined>
}

export interface SettingsRepository {
  get(): Promise<Settings>
  update(patch: Partial<Omit<Settings, 'id' | 'createdAt'>>): Promise<Settings>
  observe(): Observable<Settings>
}

export interface OnboardingDraftRepository {
  get(): Promise<OnboardingDraft | undefined>
  save(step: number, values: Record<string, unknown>): Promise<void>
  clear(): Promise<void>
}

export interface TargetsRepository {
  add(targets: NutritionTargets): Promise<void>
  /** Objetivos vigentes en una fecha (los más recientes con `effectiveFrom` ≤ fecha). */
  getFor(date: DayKey): Promise<NutritionTargets | undefined>
  observeFor(date: DayKey): Observable<NutritionTargets | undefined>
  list(): Promise<NutritionTargets[]>
  observeList(): Observable<NutritionTargets[]>
}

export interface TrainingPlanRepository {
  getActive(): Promise<TrainingPlan | undefined>
  observeActive(): Observable<TrainingPlan | undefined>
  /** Guarda el plan; si queda activo, archiva los demás. */
  save(plan: TrainingPlan): Promise<void>
}

export interface CatalogRepository<T extends { id: string }> {
  list(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  observeAll(): Observable<T[]>
  saveCustom(item: T): Promise<void>
  deleteCustom(id: string): Promise<void>
}

export interface FoodLogRepository {
  listByDate(date: DayKey): Promise<FoodLogEntry[]>
  listRange(from: DayKey, to: DayKey): Promise<FoodLogEntry[]>
  observeByDate(date: DayKey): Observable<FoodLogEntry[]>
  observeRange(from: DayKey, to: DayKey): Observable<FoodLogEntry[]>
  add(entries: FoodLogEntry[]): Promise<void>
  update(id: string, patch: Partial<Omit<FoodLogEntry, 'id'>>): Promise<void>
  remove(id: string): Promise<void>
}

export interface FavoritesRepository {
  list(): Promise<FavoriteMeal[]>
  observeAll(): Observable<FavoriteMeal[]>
  save(meal: FavoriteMeal): Promise<void>
  remove(id: string): Promise<void>
}

export interface MealPlanRepository {
  get(date: DayKey): Promise<MealPlanRecord | undefined>
  observe(date: DayKey): Observable<MealPlanRecord | undefined>
  listRange(from: DayKey, to: DayKey): Promise<MealPlanRecord[]>
  save(plan: MealPlanRecord): Promise<void>
  saveMany(plans: MealPlanRecord[]): Promise<void>
  remove(date: DayKey): Promise<void>
}

export interface DailyLogRepository {
  get(date: DayKey): Promise<DailyLog | undefined>
  observe(date: DayKey): Observable<DailyLog | undefined>
  listRange(from: DayKey, to: DayKey): Promise<DailyLog[]>
  observeRange(from: DayKey, to: DayKey): Observable<DailyLog[]>
  upsert(date: DayKey, patch: Partial<Pick<DailyLog, 'waterMl' | 'steps'>>): Promise<DailyLog>
}

export interface WorkoutRepository {
  getActive(): Promise<WorkoutSession | undefined>
  observeActive(): Observable<WorkoutSession | undefined>
  getSession(id: string): Promise<WorkoutSession | undefined>
  observeSession(id: string): Observable<WorkoutSession | undefined>
  listSessions(): Promise<WorkoutSession[]>
  observeSessions(): Observable<WorkoutSession[]>
  createSession(session: WorkoutSession): Promise<void>
  updateSession(id: string, patch: Partial<Omit<WorkoutSession, 'id'>>): Promise<void>
  deleteSession(id: string): Promise<void>
  addSet(set: WorkoutSet): Promise<void>
  addSets(sets: WorkoutSet[]): Promise<void>
  updateSet(id: string, patch: Partial<Omit<WorkoutSet, 'id'>>): Promise<void>
  deleteSet(id: string): Promise<void>
  listSetsBySession(sessionId: string): Promise<WorkoutSet[]>
  observeSetsBySession(sessionId: string): Observable<WorkoutSet[]>
  listSetsByExercise(exerciseId: string): Promise<WorkoutSet[]>
  observeSetsByExercise(exerciseId: string): Observable<WorkoutSet[]>
  /** Todas las series de sesiones terminadas (para récords, progreso y progresión). */
  listCompletedSets(): Promise<WorkoutSet[]>
  observeCompletedSets(): Observable<WorkoutSet[]>
}

export interface BodyRepository {
  upsertWeight(date: DayKey, weightKg: number): Promise<void>
  removeWeight(date: DayKey): Promise<void>
  listWeights(): Promise<BodyWeight[]>
  observeWeights(): Observable<BodyWeight[]>
  addMeasurement(measurement: Measurement): Promise<void>
  removeMeasurement(id: string): Promise<void>
  listMeasurements(): Promise<Measurement[]>
  observeMeasurements(): Observable<Measurement[]>
  addPhoto(photo: ProgressPhoto): Promise<void>
  removePhoto(id: string): Promise<void>
  observePhotos(): Observable<ProgressPhoto[]>
}

export interface CheckinRepository {
  list(): Promise<Checkin[]>
  observeList(): Observable<Checkin[]>
  getByWeek(weekStart: DayKey): Promise<Checkin | undefined>
  save(checkin: Checkin): Promise<void>
  update(id: string, patch: Partial<Omit<Checkin, 'id'>>): Promise<void>
}

export interface BackupFile {
  app: 'forja'
  schemaVersion: number
  exportedAt: string
  preferences: { theme: string | null }
  tables: Record<string, unknown[]>
}

export interface DataRepository {
  exportAll(options: { includePhotos: boolean; theme: string | null }): Promise<BackupFile>
  importAll(file: unknown): Promise<{ theme: string | null; counts: Record<string, number> }>
  clearAll(): Promise<void>
}

export interface Repositories {
  profile: ProfileRepository
  settings: SettingsRepository
  onboarding: OnboardingDraftRepository
  targets: TargetsRepository
  plans: TrainingPlanRepository
  foods: CatalogRepository<Food>
  exercises: CatalogRepository<Exercise>
  foodLogs: FoodLogRepository
  favorites: FavoritesRepository
  mealPlans: MealPlanRepository
  dailyLogs: DailyLogRepository
  workouts: WorkoutRepository
  body: BodyRepository
  checkins: CheckinRepository
  data: DataRepository
}
