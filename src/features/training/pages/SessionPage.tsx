import { Dumbbell, Flag, Keyboard, MoreVertical, Plus, Timer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { isWorkingSet } from '@/domain/progression/e1rm'
import { deloadSets } from '@/domain/training/deload'
import type { Exercise, WorkoutSet } from '@/domain/types'
import { nowIso } from '@/data/defaults'
import type { Profile, Settings, WorkoutSession } from '@/data/schemas'
import { useLive } from '@/hooks/useLive'
import { useNow } from '@/hooks/useNow'
import { useWakeLock } from '@/hooks/useWakeLock'
import { vibrate } from '@/lib/feedback'
import { capitalize, elapsedClock, formatDay } from '@/lib/format'
import {
  alternativesFor,
  loadOffsetFor,
  newSet,
  prescriptionOf,
  RECORD_LABEL,
  recordDetail,
  recordForSet,
} from '@/services/workout'
import { useCelebration } from '@/stores/celebration'
import { useRestTimer } from '@/stores/restTimer'

import { ExerciseLogger } from '../components/ExerciseLogger'
import { ExercisePicker } from '../components/ExercisePicker'
import { FinishSessionDrawer, type FinishInput } from '../components/FinishSessionDrawer'
import { SetEditor } from '../components/SetEditor'
import { TextLogDrawer, type ParsedEntry } from '../components/TextLogDrawer'
import { useTrainingData } from '../hooks/useTrainingData'

type TrainingData = ReturnType<typeof useTrainingData>

type Confirm = { kind: 'discard' } | { kind: 'remove'; exerciseId: string }

function groupByExercise(sets: readonly WorkoutSet[]): Map<string, WorkoutSet[]> {
  const map = new Map<string, WorkoutSet[]>()
  for (const s of sets) map.set(s.exerciseId, [...(map.get(s.exerciseId) ?? []), s])
  for (const list of map.values())
    list.sort((a, b) => a.setIndex - b.setIndex || a.performedAt.localeCompare(b.performedAt))
  return map
}

const nextIndex = (sets: readonly WorkoutSet[]) =>
  sets.reduce((max, s) => Math.max(max, s.setIndex + 1), 0)

interface ActiveSessionProps {
  data: TrainingData
  session: WorkoutSession
  profile: Profile
  settings: Settings
}

function ActiveSession({ data, session, profile, settings }: ActiveSessionProps) {
  const { repos, plan, exercisesById } = data
  const navigate = useNavigate()
  const now = useNow(1000)
  useWakeLock(true)
  const stopTimer = useRestTimer((s) => s.stop)
  const celebrate = useCelebration((s) => s.celebrate)
  const live = useLive(() => repos.workouts.observeSetsBySession(session.id), [session.id])
  const [picker, setPicker] = useState<
    { mode: 'add' } | { mode: 'swap'; exerciseId: string } | null
  >(null)
  const [editing, setEditing] = useState<WorkoutSet | null>(null)
  const [textOpen, setTextOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const sets = live.data ?? []
  const setsByExercise = groupByExercise(sets)
  const historySetsByExercise = groupByExercise(data.completedSets)
  const exerciseIds = [
    ...session.exerciseIds,
    ...[...setsByExercise.keys()].filter((id) => !session.exerciseIds.includes(id)),
  ].filter((id) => exercisesById.has(id))
  const planDay = plan?.days.find((d) => d.id === session.planDayId)
  const planExerciseFor = (exerciseId: string) =>
    planDay?.exercises.find((e) => e.exerciseId === exerciseId)

  const workingTotal = sets.filter(isWorkingSet).length
  const plannedTotal = exerciseIds.reduce((acc, id) => {
    const exercise = exercisesById.get(id) as Exercise
    const sets = prescriptionOf(exercise, planExerciseFor(id), profile.experience).sets
    return acc + (session.isDeload ? deloadSets(sets) : sets)
  }, 0)
  const pendingSets = exerciseIds.reduce((acc, id) => {
    const exercise = exercisesById.get(id) as Exercise
    const planned = prescriptionOf(exercise, planExerciseFor(id), profile.experience).sets
    const target = session.isDeload ? deloadSets(planned) : planned
    const done = (setsByExercise.get(id) ?? []).filter(isWorkingSet).length
    return acc + Math.max(0, target - done)
  }, 0)

  const updateIds = (ids: string[]) =>
    repos.workouts.updateSession(session.id, { exerciseIds: ids, updatedAt: nowIso() })

  const move = (index: number, direction: -1 | 1) => {
    const next = [...exerciseIds]
    const other = index + direction
    if (other < 0 || other >= next.length) return
    ;[next[index], next[other]] = [next[other] as string, next[index] as string]
    void updateIds(next)
  }

  const removeExercise = async (exerciseId: string) => {
    for (const s of setsByExercise.get(exerciseId) ?? []) await repos.workouts.deleteSet(s.id)
    await updateIds(exerciseIds.filter((id) => id !== exerciseId))
  }

  const pick = async (exercise: Exercise) => {
    const current = picker
    setPicker(null)
    if (!current) return
    if (exerciseIds.includes(exercise.id)) {
      toast.info(`${exercise.name} ya está en la sesión.`)
      return
    }
    if (current.mode === 'add') {
      await updateIds([...exerciseIds, exercise.id])
      return
    }
    const index = exerciseIds.indexOf(current.exerciseId)
    const next = [...exerciseIds]
    if ((setsByExercise.get(current.exerciseId) ?? []).length > 0) {
      next.splice(index + 1, 0, exercise.id)
      toast.info('Ya tenías series de ese ejercicio: se conservan y el nuevo queda justo después.')
    } else {
      next.splice(index, 1, exercise.id)
    }
    await updateIds(next)
  }

  const submitText = async (entries: ParsedEntry[]) => {
    const ids = [...exerciseIds]
    const created: WorkoutSet[] = []
    const celebrations: { title: string; detail: string }[] = []
    for (const entry of entries) {
      const id = entry.exercise.id
      if (!ids.includes(id)) ids.push(id)
      const before = [
        ...(setsByExercise.get(id) ?? []),
        ...created.filter((s) => s.exerciseId === id),
      ]
      let index = nextIndex(before)
      for (const parsed of entry.sets) {
        const set = newSet(
          { ...session, exerciseIds: ids },
          {
            exerciseId: id,
            weightKg: parsed.weightKg,
            reps: parsed.reps,
            rir: parsed.rir,
            isWarmup: parsed.isWarmup,
            setIndex: index++,
          },
        )
        const record = recordForSet({
          set,
          history: historySetsByExercise.get(id) ?? [],
          todayBefore: [...before, ...created.filter((s) => s.exerciseId === id)],
          loadOffsetKg: loadOffsetFor(entry.exercise, data.bodyweightKg),
        })
        if (record)
          celebrations.push({
            title: '¡Nuevo récord!',
            detail: `${RECORD_LABEL[record.type]} · ${recordDetail(record, entry.exercise.name, settings.unit)}`,
          })
        created.push(set)
      }
    }
    if (ids.length !== exerciseIds.length) await updateIds(ids)
    await repos.workouts.addSets(created)
    toast.success(
      `${created.length} ${created.length === 1 ? 'serie registrada' : 'series registradas'}.`,
    )
    if (celebrations.length > 0) {
      vibrate([80, 60, 80, 60, 160])
      celebrate(celebrations)
    }
  }

  const finish = async (input: FinishInput) => {
    const end = nowIso()
    await repos.workouts.updateSession(session.id, {
      status: 'completed',
      endedAt: end,
      updatedAt: end,
      notes: input.notes,
      ...(input.feeling !== null ? { feeling: input.feeling } : {}),
      ...(input.energy !== null ? { energy: input.energy } : {}),
      ...(input.sleep !== null ? { sleep: input.sleep } : {}),
    })
    stopTimer()
    void navigate(`/entreno/sesion/${session.id}/resumen`, { replace: true })
  }

  const discard = async () => {
    await repos.workouts.deleteSession(session.id)
    stopTimer()
    toast('Sesión descartada.')
    void navigate('/entreno', { replace: true })
  }

  const swapping = picker?.mode === 'swap' ? exercisesById.get(picker.exerciseId) : undefined
  const confirmExercise =
    confirm?.kind === 'remove' ? exercisesById.get(confirm.exerciseId) : undefined

  return (
    <div className="space-y-4">
      <PageHeader
        back="/entreno"
        eyebrow={capitalize(formatDay(session.date))}
        title={session.title}
        subtitle={
          <span className="flex items-center gap-1.5">
            <Timer aria-hidden className="size-4" />
            <span className="tabular">{elapsedClock(session.startedAt, now)}</span>
            {session.isDeload && <Badge variant="secondary">Descarga</Badge>}
          </span>
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Registrar por texto"
              onClick={() => setTextOpen(true)}
            >
              <Keyboard />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más opciones">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setConfirm({ kind: 'discard' })}
                >
                  <Trash2 /> Descartar entreno
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {plannedTotal > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span>
              {workingTotal} de {plannedTotal} series
            </span>
            <span className="text-muted-foreground">{exerciseIds.length} ejercicios</span>
          </div>
          <Progress
            value={Math.min(100, (workingTotal / plannedTotal) * 100)}
            aria-label="Avance de la sesión"
            className="h-1.5"
          />
        </div>
      )}

      {live.loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : exerciseIds.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sesión libre"
          description="Agrega los ejercicios que vas a hacer o escribe lo que ya hiciste."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setPicker({ mode: 'add' })}>
                <Plus /> Agregar ejercicio
              </Button>
              <Button variant="secondary" onClick={() => setTextOpen(true)}>
                <Keyboard /> Por texto
              </Button>
            </div>
          }
        />
      ) : (
        exerciseIds.map((id, index) => {
          const exercise = exercisesById.get(id) as Exercise
          return (
            <ExerciseLogger
              key={id}
              exercise={exercise}
              planExercise={planExerciseFor(id)}
              session={session}
              sets={setsByExercise.get(id) ?? []}
              history={data.history.get(id) ?? []}
              historySets={historySetsByExercise.get(id) ?? []}
              profile={profile}
              settings={settings}
              bodyweightKg={data.bodyweightKg}
              position={{ index, count: exerciseIds.length }}
              onMove={(direction) => move(index, direction)}
              onSwap={() => setPicker({ mode: 'swap', exerciseId: id })}
              onRemove={() => {
                if ((setsByExercise.get(id) ?? []).length > 0)
                  setConfirm({ kind: 'remove', exerciseId: id })
                else void updateIds(exerciseIds.filter((x) => x !== id))
              }}
              onEditSet={setEditing}
            />
          )
        })
      )}

      {exerciseIds.length > 0 && (
        <div className="space-y-3 pt-2 pb-24">
          <Button variant="outline" className="w-full" onClick={() => setPicker({ mode: 'add' })}>
            <Plus /> Agregar ejercicio
          </Button>
          <Button size="xl" className="w-full" onClick={() => setFinishOpen(true)}>
            <Flag /> Terminar entreno
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Todo se guarda al instante en tu teléfono. Puedes salir y volver cuando quieras.{' '}
            <Link to="/entreno/ejercicios" className="font-medium text-primary-text">
              Ver técnica de ejercicios
            </Link>
          </p>
        </div>
      )}

      <ExercisePicker
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        exercises={data.exercises}
        onPick={(exercise) => void pick(exercise)}
        title={swapping ? `Cambiar ${swapping.name}` : 'Agregar ejercicio'}
        {...(swapping
          ? {
              description:
                'Primero las alternativas del mismo movimiento que puedes hacer con tu equipo.',
              suggested: alternativesFor(swapping, data.exercises, profile, exerciseIds),
            }
          : {})}
      />

      <SetEditor
        set={editing}
        unit={settings.unit}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (editing) void repos.workouts.updateSet(editing.id, patch)
          setEditing(null)
        }}
        onDelete={() => {
          if (editing) void repos.workouts.deleteSet(editing.id)
          setEditing(null)
        }}
      />

      <TextLogDrawer
        open={textOpen}
        onOpenChange={setTextOpen}
        exercises={data.exercises}
        unit={settings.unit}
        onSubmit={submitText}
      />

      <FinishSessionDrawer
        open={finishOpen}
        onOpenChange={setFinishOpen}
        session={session}
        workingSets={workingTotal}
        pendingSets={pendingSets}
        onFinish={finish}
        onDiscard={() => void discard()}
      />

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'discard'
                ? '¿Descartar este entreno?'
                : `¿Quitar ${confirmExercise?.name ?? 'el ejercicio'}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'discard'
                ? 'Se borrarán la sesión y todas sus series. No se puede deshacer.'
                : 'También se borrarán las series que registraste de este ejercicio hoy.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (confirm?.kind === 'discard') void discard()
                else if (confirm?.kind === 'remove') void removeExercise(confirm.exerciseId)
                setConfirm(null)
              }}
            >
              {confirm?.kind === 'discard' ? 'Descartar' : 'Quitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function SessionPage() {
  const data = useTrainingData()

  if (data.loading || !data.settings || !data.profile) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  if (!data.active) {
    return (
      <>
        <PageHeader title="Entreno" back="/entreno" />
        <EmptyState
          icon={Dumbbell}
          title="No hay un entreno en curso"
          description="Empieza la sesión de hoy desde la pestaña Entreno."
          action={
            <Button asChild>
              <Link to="/entreno">Ir a Entreno</Link>
            </Button>
          }
        />
      </>
    )
  }

  return (
    <ActiveSession
      key={data.active.id}
      data={data}
      session={data.active}
      profile={data.profile}
      settings={data.settings}
    />
  )
}
