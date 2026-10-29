import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Dumbbell,
  MoreVertical,
  PencilLine,
  Plus,
  RefreshCw,
  Repeat,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { WhyButton } from '@/components/common/WhyButton'
import { Field } from '@/components/form/Field'
import { NativeSelect } from '@/components/form/NativeSelect'
import { NumberField } from '@/components/form/NumberField'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { WEEKDAY_LABEL } from '@/domain/training/days'
import { ROLE_LABEL } from '@/domain/training/prescription'
import {
  estimateSessionMinutes,
  MUSCLE_LABEL,
  volumeTargets,
  weeklyVolume,
} from '@/domain/training/volume'
import { TRACKED_MUSCLES, WEEKDAYS, type Exercise, type Weekday } from '@/domain/types'
import { newId, nowIso } from '@/data/defaults'
import type { PlanDay, PlanExercise, TrainingPlan } from '@/data/schemas'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { trainingDraftFor, trainingPlanRecordFrom } from '@/services/training'
import { alternativesFor, prescriptionOf, roleFor } from '@/services/workout'

import { ExercisePicker } from '../components/ExercisePicker'
import { useTrainingData } from '../hooks/useTrainingData'

type PickerState = { mode: 'add'; dayId: string } | { mode: 'swap'; dayId: string; entryId: string }

function restLabel(seconds: number): string {
  return seconds % 60 === 0
    ? `${seconds / 60} min`
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} min`
}

function PrescriptionForm({
  entry,
  onSave,
}: {
  entry: PlanExercise
  onSave: (
    patch: Pick<PlanExercise, 'sets' | 'repMin' | 'repMax' | 'rirMin' | 'rirMax' | 'restSec'>,
  ) => void
}) {
  const [sets, setSets] = useState<number | undefined>(entry.sets)
  const [repMin, setRepMin] = useState<number | undefined>(entry.repMin)
  const [repMax, setRepMax] = useState<number | undefined>(entry.repMax)
  const [rirMin, setRirMin] = useState<number | undefined>(entry.rirMin)
  const [rirMax, setRirMax] = useState<number | undefined>(entry.rirMax)
  const [rest, setRest] = useState<number | undefined>(entry.restSec)
  const valid =
    sets !== undefined &&
    sets >= 1 &&
    sets <= 10 &&
    repMin !== undefined &&
    repMax !== undefined &&
    repMin >= 1 &&
    repMax <= 50 &&
    repMin <= repMax &&
    rirMin !== undefined &&
    rirMax !== undefined &&
    rirMin >= 0 &&
    rirMax <= 5 &&
    rirMin <= rirMax &&
    rest !== undefined &&
    rest >= 15 &&
    rest <= 600

  return (
    <>
      <div className="space-y-4 px-4">
        <Field label="Series" htmlFor="rx-sets">
          <NumberField
            id="rx-sets"
            value={sets}
            onChange={setSets}
            decimals={0}
            min={1}
            max={10}
            steppers
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reps mín." htmlFor="rx-repmin">
            <NumberField
              id="rx-repmin"
              value={repMin}
              onChange={setRepMin}
              decimals={0}
              min={1}
              max={50}
            />
          </Field>
          <Field label="Reps máx." htmlFor="rx-repmax">
            <NumberField
              id="rx-repmax"
              value={repMax}
              onChange={setRepMax}
              decimals={0}
              min={1}
              max={50}
            />
          </Field>
          <Field label="RIR mín." htmlFor="rx-rirmin">
            <NumberField
              id="rx-rirmin"
              value={rirMin}
              onChange={setRirMin}
              decimals={0}
              min={0}
              max={5}
            />
          </Field>
          <Field label="RIR máx." htmlFor="rx-rirmax">
            <NumberField
              id="rx-rirmax"
              value={rirMax}
              onChange={setRirMax}
              decimals={0}
              min={0}
              max={5}
            />
          </Field>
        </div>
        <Field
          label="Descanso"
          htmlFor="rx-rest"
          description="Básicos: 2–3 min. Accesorios: 60–90 s."
        >
          <NumberField
            id="rx-rest"
            value={rest}
            onChange={setRest}
            unit="s"
            decimals={0}
            min={15}
            max={600}
            step={15}
            steppers
          />
        </Field>
        {repMin !== undefined && repMax !== undefined && repMin > repMax && (
          <p className="text-sm text-destructive">
            Las reps mínimas no pueden superar las máximas.
          </p>
        )}
      </div>
      <DrawerFooter>
        <Button
          size="lg"
          disabled={!valid}
          onClick={() => {
            if (!valid) return
            onSave({ sets, repMin, repMax, rirMin, rirMax, restSec: rest })
          }}
        >
          <Check /> Guardar
        </Button>
      </DrawerFooter>
    </>
  )
}

export function PlanEditorPage() {
  const data = useTrainingData()
  const { repos, plan, profile, exercisesById } = data
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [editing, setEditing] = useState<{ dayId: string; entryId: string } | null>(null)
  const [renaming, setRenaming] = useState<{ dayId: string; name: string } | null>(null)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  if (data.loading || !profile) {
    return (
      <>
        <PageHeader title="Tu plan" back="/entreno" />
        <Skeleton className="h-96 rounded-2xl" />
      </>
    )
  }

  if (!plan) {
    return (
      <>
        <PageHeader title="Tu plan" back="/entreno" />
        <EmptyState
          icon={Dumbbell}
          title="No hay plan activo"
          action={
            <Button asChild>
              <Link to="/perfil/editar">Completar perfil</Link>
            </Button>
          }
        />
      </>
    )
  }

  const exerciseOf = (id: string) => exercisesById.get(id)
  const save = async (days: PlanDay[]) => {
    const withLegs = days.map((d) => ({
      ...d,
      isLegDay: d.exercises.some((e) => exerciseOf(e.exerciseId)?.bodyRegion === 'lower'),
    }))
    const next: TrainingPlan = { ...plan, days: withLegs, updatedAt: nowIso() }
    await repos.plans.save(next)
  }
  const updateDay = (dayId: string, change: (day: PlanDay) => PlanDay) =>
    save(plan.days.map((d) => (d.id === dayId ? change(d) : d)))

  const setWeekday = (dayId: string, weekday: Weekday | null) => {
    const current = plan.days.find((d) => d.id === dayId)
    if (!current) return
    const clash =
      weekday !== null ? plan.days.find((d) => d.id !== dayId && d.weekday === weekday) : undefined
    void save(
      plan.days.map((d) => {
        if (d.id === dayId) return { ...d, weekday }
        if (clash && d.id === clash.id) return { ...d, weekday: current.weekday }
        return d
      }),
    )
    if (clash) toast.info(`${clash.name} pasó al día que tenía ${current.name}.`)
  }

  const moveDay = (index: number, direction: -1 | 1) => {
    const next = [...plan.days]
    const other = index + direction
    if (other < 0 || other >= next.length) return
    ;[next[index], next[other]] = [next[other] as PlanDay, next[index] as PlanDay]
    void save(next)
  }

  const moveEntry = (dayId: string, index: number, direction: -1 | 1) =>
    void updateDay(dayId, (d) => {
      const list = [...d.exercises]
      const other = index + direction
      if (other < 0 || other >= list.length) return d
      ;[list[index], list[other]] = [list[other] as PlanExercise, list[index] as PlanExercise]
      return { ...d, exercises: list }
    })

  const pick = (exercise: Exercise) => {
    const state = picker
    setPicker(null)
    if (!state) return
    if (state.mode === 'add') {
      const rx = prescriptionOf(exercise, undefined, profile.experience)
      void updateDay(state.dayId, (d) => ({
        ...d,
        exercises: [
          ...d.exercises,
          { id: newId(), exerciseId: exercise.id, role: roleFor(exercise), ...rx },
        ],
      }))
      toast.success(`${exercise.name} agregado.`)
      return
    }
    void updateDay(state.dayId, (d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        e.id === state.entryId ? { ...e, exerciseId: exercise.id } : e,
      ),
    }))
    toast.success(`Cambiado por ${exercise.name}. Las series y reps se mantienen.`)
  }

  const regenerate = async () => {
    const draft = trainingDraftFor(profile, data.exercises)
    await repos.plans.save(trainingPlanRecordFrom(draft, plan.blockStartDate))
    toast.success('Plan regenerado con tus datos actuales.')
  }

  const volume = weeklyVolume(
    plan.days.flatMap((d) => d.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets }))),
    exercisesById,
  )
  const targets = volumeTargets(profile.experience, profile.priorityMuscles)
  const maxScale =
    Math.max(...TRACKED_MUSCLES.map((m) => Math.max(volume[m], targets[m].max))) * 1.05

  const editingDay = editing ? plan.days.find((d) => d.id === editing.dayId) : undefined
  const editingEntry = editingDay?.exercises.find((e) => e.id === editing?.entryId)
  const swappingDay = picker ? plan.days.find((d) => d.id === picker.dayId) : undefined
  const swappingEntry =
    picker?.mode === 'swap'
      ? swappingDay?.exercises.find((e) => e.id === picker.entryId)
      : undefined
  const swappingExercise = swappingEntry ? exerciseOf(swappingEntry.exerciseId) : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tu plan"
        back="/entreno"
        subtitle={`${plan.splitName} · ${plan.days.length} días`}
        actions={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Regenerar plan"
            onClick={() => setConfirmRegenerate(true)}
          >
            <RefreshCw />
          </Button>
        }
      />

      <div className="space-y-2 rounded-2xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm">{plan.explanation.summary}</p>
          <WhyButton explanation={plan.explanation} compact />
        </div>
        {plan.warnings.map((w) => (
          <p key={w} className="flex items-start gap-2 text-sm text-warning">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> {w}
          </p>
        ))}
      </div>

      {plan.days.map((day, dayIndex) => {
        const minutes = estimateSessionMinutes(day.exercises)
        const overTime = minutes > profile.sessionMinutes + 5
        return (
          <section
            key={day.id}
            className="overflow-hidden rounded-2xl border bg-card"
            aria-labelledby={`day-${day.id}`}
          >
            <header className="flex items-start gap-2 p-4 pb-3">
              <div className="min-w-0 flex-1">
                {renaming?.dayId === day.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const name = renaming.name.trim()
                      if (name.length > 0)
                        void updateDay(day.id, (d) => ({ ...d, name: name.slice(0, 40) }))
                      setRenaming(null)
                    }}
                  >
                    <Input
                      autoFocus
                      aria-label="Nombre del día"
                      value={renaming.name}
                      maxLength={40}
                      onChange={(e) => setRenaming({ dayId: day.id, name: e.target.value })}
                      className="h-10 rounded-lg"
                    />
                    <Button type="submit" size="icon" aria-label="Guardar nombre">
                      <Check />
                    </Button>
                  </form>
                ) : (
                  <h2
                    id={`day-${day.id}`}
                    className="font-display text-2xl leading-tight font-bold"
                  >
                    {day.name}
                  </h2>
                )}
                <p
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    overTime ? 'text-warning' : 'text-muted-foreground',
                  )}
                >
                  <Clock aria-hidden className="size-3.5" /> ~{formatDuration(minutes)}
                  {overTime && ` (tienes ${profile.sessionMinutes} min)`} · {day.focus}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Opciones de ${day.name}`}>
                    <MoreVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setRenaming({ dayId: day.id, name: day.name })}>
                    <PencilLine /> Renombrar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={dayIndex === 0}
                    onSelect={() => moveDay(dayIndex, -1)}
                  >
                    <ArrowUp /> Mover arriba
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={dayIndex === plan.days.length - 1}
                    onSelect={() => moveDay(dayIndex, 1)}
                  >
                    <ArrowDown /> Mover abajo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>
            <div className="px-4 pb-3">
              <NativeSelect
                aria-label={`Día de la semana para ${day.name}`}
                value={day.weekday === null ? 'none' : String(day.weekday)}
                onChange={(v) => setWeekday(day.id, v === 'none' ? null : (Number(v) as Weekday))}
                options={[
                  ...WEEKDAYS.map((w) => ({ value: String(w), label: WEEKDAY_LABEL[w] })),
                  { value: 'none', label: 'Sin día fijo' },
                ]}
              />
            </div>
            <ol className="divide-y border-t">
              {day.exercises.map((entry, index) => {
                const exercise = exerciseOf(entry.exerciseId)
                return (
                  <li key={entry.id} className="flex items-center gap-2 py-1 pr-2 pl-4">
                    <button
                      type="button"
                      className="min-w-0 flex-1 py-2 text-left"
                      onClick={() => setEditing({ dayId: day.id, entryId: entry.id })}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {exercise?.name ?? 'Ejercicio no disponible'}
                        </span>
                        <Badge variant="secondary" className="shrink-0">
                          {ROLE_LABEL[entry.role]}
                        </Badge>
                      </span>
                      <span className="tabular block text-xs text-muted-foreground">
                        {entry.sets} × {entry.repMin}–{entry.repMax} · RIR {entry.rirMin}–
                        {entry.rirMax} · descanso {restLabel(entry.restSec)}
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Opciones de ${exercise?.name ?? 'ejercicio'}`}
                        >
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => setEditing({ dayId: day.id, entryId: entry.id })}
                        >
                          <PencilLine /> Series y reps
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            setPicker({ mode: 'swap', dayId: day.id, entryId: entry.id })
                          }
                        >
                          <Repeat /> Cambiar por otro
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={index === 0}
                          onSelect={() => moveEntry(day.id, index, -1)}
                        >
                          <ArrowUp /> Mover arriba
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={index === day.exercises.length - 1}
                          onSelect={() => moveEntry(day.id, index, 1)}
                        >
                          <ArrowDown /> Mover abajo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            void updateDay(day.id, (d) => ({
                              ...d,
                              exercises: d.exercises.filter((e) => e.id !== entry.id),
                            }))
                          }
                        >
                          <Trash2 /> Quitar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                )
              })}
            </ol>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setPicker({ mode: 'add', dayId: day.id })}
              >
                <Plus /> Agregar ejercicio
              </Button>
            </div>
          </section>
        )
      })}

      <Section title="Volumen semanal por músculo">
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Series por semana (el músculo principal cuenta 1 y los secundarios 0,5). La franja marca
            tu rango objetivo en déficit.
          </p>
          <ul className="space-y-2.5">
            {TRACKED_MUSCLES.map((m) => {
              const value = volume[m]
              const target = targets[m]
              const state = value < target.min ? 'low' : value > target.max ? 'high' : 'ok'
              return (
                <li
                  key={m}
                  className="grid grid-cols-[6.25rem_1fr_auto] items-center gap-2 text-sm"
                >
                  <span className="truncate">{MUSCLE_LABEL[m]}</span>
                  <span className="relative h-2.5 rounded-full bg-muted" aria-hidden>
                    <span
                      className="absolute inset-y-0 rounded-full bg-success/25"
                      style={{
                        left: `${(target.min / maxScale) * 100}%`,
                        width: `${((target.max - target.min) / maxScale) * 100}%`,
                      }}
                    />
                    <span
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full',
                        state === 'ok'
                          ? 'bg-success'
                          : state === 'low'
                            ? 'bg-warning'
                            : 'bg-primary',
                      )}
                      style={{ width: `${Math.max(2, (value / maxScale) * 100)}%` }}
                    />
                  </span>
                  <span className="tabular text-right text-xs whitespace-nowrap">
                    <strong>{String(value).replace('.', ',')}</strong>
                    <span className="text-muted-foreground">
                      {' '}
                      / {target.min}–{target.max}
                    </span>
                    <span className="sr-only">
                      {state === 'ok'
                        ? ' dentro del rango'
                        : state === 'low'
                          ? ' por debajo del rango'
                          : ' por encima del rango'}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-success" /> En rango
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-warning" /> Por debajo
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-primary" /> Por encima
            </span>
          </p>
        </div>
      </Section>

      <ExercisePicker
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        exercises={data.exercises}
        onPick={pick}
        title={
          swappingExercise
            ? `Cambiar ${swappingExercise.name}`
            : `Agregar a ${swappingDay?.name ?? 'el día'}`
        }
        {...(swappingExercise
          ? {
              description:
                'Primero las alternativas del mismo movimiento que puedes hacer con tu equipo.',
              suggested: alternativesFor(
                swappingExercise,
                data.exercises,
                profile,
                swappingDay?.exercises.map((e) => e.exerciseId) ?? [],
              ),
            }
          : {})}
      />

      <Drawer open={editingEntry !== undefined} onOpenChange={(open) => !open && setEditing(null)}>
        <DrawerContent className="mx-auto max-h-[92vh] max-w-lg">
          <DrawerHeader className="text-left">
            <DrawerTitle>
              {editingEntry
                ? (exerciseOf(editingEntry.exerciseId)?.name ?? 'Ejercicio')
                : 'Ejercicio'}
            </DrawerTitle>
            <DrawerDescription>
              Ajusta la prescripción. La progresión usará estos rangos.
            </DrawerDescription>
          </DrawerHeader>
          {editingEntry && editingDay && (
            <PrescriptionForm
              key={editingEntry.id}
              entry={editingEntry}
              onSave={(patch) => {
                void updateDay(editingDay.id, (d) => ({
                  ...d,
                  exercises: d.exercises.map((e) =>
                    e.id === editingEntry.id ? { ...e, ...patch } : e,
                  ),
                }))
                setEditing(null)
              }}
            />
          )}
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Regenerar el plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Se arma un plan nuevo con tus datos actuales (días, equipo, lesiones y prioridades).
              Perderás los cambios manuales; tu historial y récords se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void regenerate()}>Regenerar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
