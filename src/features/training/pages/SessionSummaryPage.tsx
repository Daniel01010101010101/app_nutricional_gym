import {
  ArrowRight,
  Flag,
  History,
  MoreVertical,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { StatTile } from '@/components/common/StatTile'
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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { summarizeSession } from '@/domain/progression/summary'
import { fmt } from '@/domain/shared/format'
import { fromKg } from '@/domain/shared/units'
import { MUSCLE_LABEL } from '@/domain/training/volume'
import type { Muscle, WorkoutSet } from '@/domain/types'
import { nowIso } from '@/data/defaults'
import { useLive } from '@/hooks/useLive'
import { capitalize, formatDay, formatDuration, formatWeight } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RECORD_LABEL, recordDetail, toDisplay } from '@/services/workout'

import { SetEditor } from '../components/SetEditor'
import { useTrainingData } from '../hooks/useTrainingData'

const RATING_LABEL = ['', 'Muy mal', 'Mal', 'Normal', 'Bien', 'Excelente'] as const

export function SessionSummaryPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = useTrainingData()
  const { repos, settings, exercisesById } = data
  const session = useLive(() => repos.workouts.observeSession(id), [id])
  const live = useLive(() => repos.workouts.observeSetsBySession(id), [id])
  const [editing, setEditing] = useState<WorkoutSet | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (data.loading || session.loading || live.loading || !settings) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const s = session.data
  if (!s) {
    return (
      <>
        <PageHeader title="Resumen" back="/entreno" />
        <EmptyState
          icon={History}
          title="Sesión no encontrada"
          description="Puede que la hayas borrado."
          action={
            <Button asChild>
              <Link to="/entreno/historial">Ver historial</Link>
            </Button>
          }
        />
      </>
    )
  }

  const unit = settings.unit
  const sets = [...(live.data ?? [])].sort(
    (a, b) => a.exerciseOrder - b.exerciseOrder || a.setIndex - b.setIndex,
  )
  const previousSets = data.completedSets.filter(
    (x) => x.sessionId !== s.id && x.performedAt < s.startedAt,
  )
  const summary = summarizeSession({
    sets,
    previousSets,
    exercisesById,
    startedAt: s.startedAt,
    endedAt: s.endedAt ?? nowIso(),
    bodyweightKg: data.bodyweightKg,
  })
  const exerciseOrder = [...new Set([...s.exerciseIds, ...sets.map((x) => x.exerciseId)])].filter(
    (eid) => sets.some((x) => x.exerciseId === eid),
  )
  const name = (exerciseId: string) => exercisesById.get(exerciseId)?.name ?? 'Ejercicio'
  const muscles = Object.entries(summary.setsByMuscle).sort((a, b) => b[1] - a[1]) as [
    Muscle,
    number,
  ][]
  const ratings = [
    { label: 'Sensación', value: s.feeling },
    { label: 'Energía', value: s.energy },
    { label: 'Sueño', value: s.sleep },
  ].filter((r) => r.value !== null)

  return (
    <div className="space-y-6">
      <PageHeader
        back="/entreno"
        eyebrow={capitalize(formatDay(s.date))}
        title={s.title}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Más opciones">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 /> Borrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border bg-card p-5"
      >
        <span
          aria-hidden
          className="absolute -top-12 -right-12 size-44 rounded-full bg-primary/15 blur-2xl"
        />
        <Flag aria-hidden className="size-8 text-primary" />
        <h2 className="mt-2 font-display text-4xl leading-none font-bold">
          {s.status === 'completed' ? '¡Entreno completado!' : 'Entreno en curso'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary.records.length > 0
            ? `Lograste ${summary.records.length} ${summary.records.length === 1 ? 'récord' : 'récords'}. ¡Así se conserva (y se gana) fuerza!`
            : s.isDeload
              ? 'Semana de descarga cumplida: la fatiga baja y la fuerza se mantiene.'
              : 'Cada sesión registrada hace más precisa tu progresión.'}
        </p>
      </motion.section>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Duración" value={formatDuration(summary.durationMin)} />
        <StatTile label="Series" value={summary.workingSets} />
        <StatTile label="Volumen" value={fmt(fromKg(summary.totalVolumeKg, unit), 0)} unit={unit} />
      </div>

      {summary.records.length > 0 && (
        <Section title="Récords">
          <ul className="space-y-2">
            {summary.records.map((r, i) => (
              <li
                key={`${r.exerciseId}-${r.type}-${i}`}
                className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3"
              >
                <Trophy aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                <span className="text-sm">
                  <span className="block font-semibold">{RECORD_LABEL[r.type]}</span>
                  {recordDetail(r, name(r.exerciseId), unit)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {summary.e1rmChanges.length > 0 && (
        <Section title="1RM estimado vs. la vez anterior">
          <ul className="divide-y rounded-2xl border bg-card">
            {summary.e1rmChanges.map((c) => {
              const delta = c.before ? ((c.after - c.before) / c.before) * 100 : null
              const Icon = delta !== null && delta < 0 ? TrendingDown : TrendingUp
              return (
                <li key={c.exerciseId} className="flex items-center gap-3 p-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">{name(c.exerciseId)}</span>
                  <span className="tabular text-muted-foreground">
                    {c.before ? formatWeight(c.before, unit) : '—'}
                  </span>
                  <ArrowRight aria-hidden className="size-3.5 text-muted-foreground" />
                  <span className="tabular font-semibold">{formatWeight(c.after, unit)}</span>
                  {delta !== null && (
                    <span
                      className={cn(
                        'tabular flex w-16 items-center justify-end gap-0.5 text-xs font-semibold',
                        delta > 0.5
                          ? 'text-success'
                          : delta < -0.5
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                      )}
                    >
                      <Icon aria-hidden className="size-3.5" />
                      {delta > 0 ? '+' : ''}
                      {fmt(delta, 1)} %
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {muscles.length > 0 && (
        <Section title="Series por músculo">
          <div className="flex flex-wrap gap-2">
            {muscles.map(([muscle, count]) => (
              <span key={muscle} className="rounded-xl border bg-card px-3 py-1.5 text-sm">
                {MUSCLE_LABEL[muscle]} <strong className="tabular">{count}</strong>
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Lo que hiciste"
        action={
          <span className="text-xs text-muted-foreground">Toca una serie para corregirla</span>
        }
      >
        <div className="space-y-2">
          {exerciseOrder.map((exerciseId) => (
            <div key={exerciseId} className="rounded-2xl border bg-card">
              <Link
                to={`/entreno/ejercicios/${exerciseId}`}
                className="block px-4 pt-3 font-semibold"
              >
                {name(exerciseId)}
              </Link>
              <div className="flex flex-wrap gap-1.5 p-3">
                {sets
                  .filter((x) => x.exerciseId === exerciseId)
                  .map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setEditing(x)}
                      className={cn(
                        'tabular rounded-lg border px-2.5 py-1.5 text-sm hover:bg-accent',
                        x.isWarmup && 'text-muted-foreground',
                      )}
                    >
                      {x.isWarmup && 'C '}
                      {fmt(toDisplay(x.weightKg, unit), 2)}×{x.reps}
                      {x.rir !== null && <span className="text-muted-foreground"> @{x.rir}</span>}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {(ratings.length > 0 || s.notes) && (
        <Section title="Cómo te sentiste">
          <div className="space-y-2 rounded-2xl border bg-card p-4 text-sm">
            {ratings.length > 0 && (
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                {ratings.map((r) => (
                  <span key={r.label}>
                    <span className="text-muted-foreground">{r.label}:</span>{' '}
                    <strong>{RATING_LABEL[r.value as 1 | 2 | 3 | 4 | 5]}</strong>
                  </span>
                ))}
              </p>
            )}
            {s.notes && <p className="whitespace-pre-line">{s.notes}</p>}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-2 gap-2 pb-4">
        <Button asChild variant="secondary" size="lg">
          <Link to="/entreno/historial">
            <History /> Historial
          </Link>
        </Button>
        <Button asChild size="lg">
          <Link to="/">Listo</Link>
        </Button>
      </div>

      <SetEditor
        set={editing}
        unit={unit}
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán sus series del historial, los récords y la progresión. No se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                await repos.workouts.deleteSession(s.id)
                toast('Sesión borrada.')
                void navigate('/entreno/historial', { replace: true })
              }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
