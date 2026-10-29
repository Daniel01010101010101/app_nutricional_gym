import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  Flame,
  MoreVertical,
  Repeat,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { WhyButton } from '@/components/common/WhyButton'
import { NumberField } from '@/components/form/NumberField'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import type { SessionSets } from '@/domain/progression/doubleProgression'
import { isWorkingSet, type SetLike } from '@/domain/progression/e1rm'
import { fmt } from '@/domain/shared/format'
import { warmupRamp } from '@/domain/training/loading'
import { MUSCLE_LABEL } from '@/domain/training/volume'
import type { Exercise, WeightUnit, WorkoutSet } from '@/domain/types'
import type { PlanExercise, Profile, Settings, WorkoutSession } from '@/data/schemas'
import { useRepositories } from '@/hooks/useRepositories'
import { primeAudio, vibrate } from '@/lib/feedback'
import { formatShortDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  fromDisplay,
  loadOffsetFor,
  newSet,
  nextSetDefaults,
  platesText,
  prescriptionOf,
  RECORD_LABEL,
  recordDetail,
  recordForSet,
  restSecondsFor,
  targetFor,
  toDisplay,
  weightStep,
} from '@/services/workout'
import { useCelebration } from '@/stores/celebration'
import { useRestTimer } from '@/stores/restTimer'

import { RatingChips } from './RatingChips'

export interface ExerciseLoggerProps {
  exercise: Exercise
  planExercise: PlanExercise | undefined
  session: WorkoutSession
  /** Series de este ejercicio en la sesión actual, ordenadas. */
  sets: WorkoutSet[]
  /** Sesiones terminadas de este ejercicio (cronológicas). */
  history: SessionSets[]
  /** Series terminadas de este ejercicio, para detectar récords. */
  historySets: WorkoutSet[]
  profile: Profile
  settings: Settings
  bodyweightKg: number
  position: { index: number; count: number }
  onMove: (direction: -1 | 1) => void
  onSwap: () => void
  onRemove: () => void
  onEditSet: (set: WorkoutSet) => void
}

function setsText(sets: readonly SetLike[], unit: WeightUnit): string {
  return sets
    .filter(isWorkingSet)
    .map(
      (s) =>
        `${fmt(toDisplay(s.weightKg, unit), 2)}×${s.reps}${s.rir !== null ? ` @${s.rir}` : ''}`,
    )
    .join(' · ')
}

interface SetInputProps {
  exercise: Exercise
  unit: WeightUnit
  settings: Settings
  defaults: { weight: number | undefined; reps: number }
  setNumber: number
  extra: boolean
  onLog: (input: {
    weightKg: number
    reps: number
    rir: number | null
    isWarmup: boolean
  }) => Promise<void>
}

/** Fila de captura precargada: un toque en "Registrar" guarda la serie. */
function SetInput({ exercise, unit, settings, defaults, setNumber, extra, onLog }: SetInputProps) {
  const [weight, setWeight] = useState<number | undefined>(defaults.weight)
  const [reps, setReps] = useState<number | undefined>(defaults.reps)
  const [rir, setRir] = useState<number | null>(null)
  const [warmup, setWarmup] = useState(false)
  const [busy, setBusy] = useState(false)
  const bodyweight = exercise.loadType === 'bodyweight'
  const valid =
    weight !== undefined && weight >= 0 && reps !== undefined && reps >= 1 && reps <= 100
  const plates =
    weight !== undefined ? platesText(fromDisplay(weight, unit), exercise, settings.loading) : null
  const id = `${exercise.id}-${setNumber}`

  return (
    <div className="space-y-3 border-t p-4">
      <div className="grid grid-cols-[3.5rem_1fr] items-center gap-x-3 gap-y-2">
        <label htmlFor={`${id}-w`} className="text-sm font-semibold">
          {bodyweight ? 'Lastre' : 'Peso'}
        </label>
        <NumberField
          id={`${id}-w`}
          value={weight}
          onChange={setWeight}
          unit={unit}
          decimals={2}
          min={0}
          step={weightStep(exercise, settings.loading, unit)}
          steppers
          placeholder={bodyweight ? '0' : 'Peso'}
        />
        <label htmlFor={`${id}-r`} className="text-sm font-semibold">
          Reps
        </label>
        <NumberField
          id={`${id}-r`}
          value={reps}
          onChange={setReps}
          decimals={0}
          min={1}
          max={100}
          steppers
        />
        <span className="text-sm font-semibold">RIR</span>
        <RatingChips
          aria-label="RIR: reps que te quedaron en reserva"
          min={0}
          max={4}
          value={rir}
          onChange={setRir}
        />
      </div>
      <p className="min-h-4 text-xs text-muted-foreground">
        {bodyweight
          ? 'Lastre: 0 si haces solo con tu peso. RIR = reps que te quedaron en reserva.'
          : (plates ?? 'RIR = reps que te quedaron en reserva (0 = al fallo).')}
      </p>
      <div className="flex items-center gap-3">
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <Switch
            checked={warmup}
            onCheckedChange={setWarmup}
            aria-label="Serie de calentamiento"
          />
          <Flame aria-hidden className="size-4 text-muted-foreground" />
          <span className="sr-only sm:not-sr-only">Calentamiento</span>
        </label>
        <Button
          size="lg"
          className="flex-1"
          disabled={!valid || busy}
          onClick={async () => {
            if (!valid) return
            primeAudio()
            setBusy(true)
            try {
              await onLog({
                weightKg: fromDisplay(weight, unit),
                reps: Math.round(reps),
                rir,
                isWarmup: warmup,
              })
            } finally {
              setBusy(false)
            }
          }}
        >
          <Check />
          {warmup
            ? 'Registrar calentamiento'
            : extra
              ? 'Registrar serie extra'
              : `Registrar serie ${setNumber}`}
        </Button>
      </div>
    </div>
  )
}

export function ExerciseLogger({
  exercise,
  planExercise,
  session,
  sets,
  history,
  historySets,
  profile,
  settings,
  bodyweightKg,
  position,
  onMove,
  onSwap,
  onRemove,
  onEditSet,
}: ExerciseLoggerProps) {
  const repos = useRepositories()
  const celebrate = useCelebration((s) => s.celebrate)
  const startTimer = useRestTimer((s) => s.start)
  const unit = settings.unit
  const prescription = prescriptionOf(exercise, planExercise, profile.experience)
  const target = targetFor({
    exercise,
    prescription,
    history,
    loading: settings.loading,
    profile,
    deload: session.isDeload,
  })
  const t = target.value
  const working = sets.filter(isWorkingSet)
  const done = working.length >= t.sets
  const defaults = nextSetDefaults(t, sets)
  const lastSession = history.at(-1)
  const offset = loadOffsetFor(exercise, bodyweightKg)
  const warmups =
    exercise.kind === 'compound' && working.length === 0 && t.weightKg
      ? warmupRamp(t.weightKg, exercise.loadType, settings.loading)
      : []
  const loggedWarmups = sets.filter((s) => s.isWarmup).map((s) => s.weightKg)

  const log = async (input: {
    weightKg: number
    reps: number
    rir: number | null
    isWarmup: boolean
  }) => {
    const setIndex = sets.reduce((max, s) => Math.max(max, s.setIndex + 1), 0)
    const set = newSet(session, { exerciseId: exercise.id, setIndex, ...input })
    await repos.workouts.addSet(set)
    if (input.isWarmup) return
    const record = recordForSet({
      set,
      history: historySets,
      todayBefore: sets,
      loadOffsetKg: offset,
    })
    if (record) {
      vibrate([80, 60, 80, 60, 160])
      celebrate([
        {
          title: '¡Nuevo récord!',
          detail: `${RECORD_LABEL[record.type]} · ${recordDetail(record, exercise.name, unit)}`,
        },
      ])
    }
    if (settings.autoStartTimer)
      startTimer(restSecondsFor(exercise, planExercise, settings), exercise.name)
  }

  const targetText = (() => {
    if (t.weightKg === null)
      return `Busca un peso para ${prescription.repMin}–${prescription.repMax} reps`
    const reps = t.reps.every((r) => r === t.reps[0])
      ? `${t.sets} × ${t.reps[0] ?? prescription.repMax}`
      : t.reps.join(', ')
    const weight =
      exercise.loadType === 'bodyweight' && t.weightKg === 0
        ? 'peso corporal'
        : `${fmt(toDisplay(t.weightKg, unit), 2)} ${unit}`
    return `${weight} · ${reps}`
  })()

  let workingNumber = 0

  return (
    <article
      className={cn('overflow-hidden rounded-2xl border bg-card', done && 'border-success/40')}
      aria-labelledby={`ex-${exercise.id}`}
    >
      <header className="flex items-start gap-2 p-4 pb-3">
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold',
            done ? 'bg-success/15 text-success' : 'bg-secondary',
          )}
        >
          {done ? <CheckCircle2 className="size-5" /> : position.index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`ex-${exercise.id}`} className="text-lg leading-tight font-semibold">
            {exercise.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {MUSCLE_LABEL[exercise.primaryMuscle]} · {t.sets} × {prescription.repMin}–
            {prescription.repMax} · RIR {t.rir[0]}–{t.rir[1]}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Opciones de ${exercise.name}`}>
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/entreno/ejercicios/${exercise.id}`}>
                <BookOpen /> Técnica e historial
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSwap}>
              <Repeat /> Cambiar por otro
            </DropdownMenuItem>
            <DropdownMenuItem disabled={position.index === 0} onSelect={() => onMove(-1)}>
              <ArrowUp /> Mover arriba
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={position.index === position.count - 1}
              onSelect={() => onMove(1)}
            >
              <ArrowDown /> Mover abajo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              <Trash2 /> Quitar de la sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="mx-4 flex items-start gap-3 rounded-xl bg-primary/10 p-3">
        <Target aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            <span className="font-normal text-muted-foreground">Objetivo: </span>
            {targetText}
          </p>
          <p className="text-xs text-muted-foreground">
            {lastSession
              ? `Última vez (${formatShortDay(lastSession.date)}): ${setsText(lastSession.sets, unit)}`
              : 'Primera vez con este ejercicio: será tu referencia.'}
          </p>
        </div>
        <WhyButton explanation={target.explanation} compact />
      </div>

      {warmups.length > 0 && (
        <div className="px-4 pt-3">
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Calentamiento sugerido · toca para registrar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {warmups.map((w) => {
              const logged = loggedWarmups.some((kg) => Math.abs(kg - w.weightKg) < 0.01)
              return (
                <button
                  key={w.weightKg}
                  type="button"
                  disabled={logged}
                  onClick={() =>
                    void log({ weightKg: w.weightKg, reps: w.reps, rir: null, isWarmup: true })
                  }
                  className={cn(
                    'tabular flex h-9 items-center gap-1 rounded-lg border px-2.5 text-sm font-medium transition-colors',
                    logged ? 'text-muted-foreground line-through' : 'hover:bg-accent',
                  )}
                >
                  {logged && <Check aria-hidden className="size-3.5" />}
                  {fmt(toDisplay(w.weightKg, unit), 2)}×{w.reps}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {sets.length > 0 && (
        <ol className="mt-3 divide-y border-t" aria-label={`Series de ${exercise.name}`}>
          {sets.map((s, i) => {
            if (!s.isWarmup) workingNumber++
            const record =
              !s.isWarmup &&
              recordForSet({
                set: s,
                history: historySets,
                todayBefore: sets.slice(0, i),
                loadOffsetKg: offset,
              })
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onEditSet(s)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50"
                  aria-label={`Editar serie: ${fmt(toDisplay(s.weightKg, unit), 2)} ${unit} por ${s.reps}`}
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold',
                      s.isWarmup
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/15 text-primary-text',
                    )}
                  >
                    {s.isWarmup ? 'C' : workingNumber}
                  </span>
                  <span className="tabular flex-1 font-semibold">
                    {fmt(toDisplay(s.weightKg, unit), 2)} {unit} × {s.reps}
                    {s.rir !== null && (
                      <span className="font-normal text-muted-foreground"> · RIR {s.rir}</span>
                    )}
                    {s.notes && (
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {s.notes}
                      </span>
                    )}
                  </span>
                  {record && (
                    <span className="flex items-center gap-1 text-xs font-bold text-primary-text">
                      <Trophy aria-hidden className="size-4" /> PR
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      )}

      <SetInput
        key={`${exercise.id}-${sets.length}`}
        exercise={exercise}
        unit={unit}
        settings={settings}
        defaults={{
          weight:
            defaults.weightKg !== null
              ? toDisplay(defaults.weightKg, unit)
              : exercise.loadType === 'bodyweight'
                ? 0
                : undefined,
          reps: defaults.reps,
        }}
        setNumber={working.length + 1}
        extra={done}
        onLog={log}
      />
    </article>
  )
}
