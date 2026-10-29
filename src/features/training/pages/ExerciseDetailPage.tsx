import { CircleAlert, CircleCheck, MoreVertical, ShieldAlert, Target, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { TrendChart } from '@/components/charts/TrendChart'
import { StatTile } from '@/components/common/StatTile'
import { WhyButton } from '@/components/common/WhyButton'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { isWorkingSet } from '@/domain/progression/e1rm'
import { computeBests } from '@/domain/progression/records'
import { trendSeries } from '@/domain/progression/strength'
import { fmt } from '@/domain/shared/format'
import { MUSCLE_LABEL } from '@/domain/training/volume'
import { formatShortDay, formatWeight } from '@/lib/format'
import { EQUIPMENT_LABEL, JOINT_LABEL, LOAD_TYPE_LABEL, PATTERN_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { e1rmPoints, loadOffsetFor, prescriptionOf, targetFor, toDisplay } from '@/services/workout'

import { MuscleMap } from '../components/MuscleMap'
import { useTrainingData } from '../hooks/useTrainingData'

const HISTORY_PAGE = 8

export function ExerciseDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = useTrainingData()
  const { profile, settings, plan, repos } = data
  const [showAll, setShowAll] = useState(false)

  if (data.loading || !profile || !settings) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const exercise = data.exercisesById.get(id)
  if (!exercise) {
    return (
      <>
        <PageHeader title="Ejercicio" back="/entreno/ejercicios" />
        <EmptyState
          icon={CircleAlert}
          title="Ejercicio no encontrado"
          action={
            <Button asChild>
              <Link to="/entreno/ejercicios">Ver biblioteca</Link>
            </Button>
          }
        />
      </>
    )
  }

  const unit = settings.unit
  const history = data.history.get(exercise.id) ?? []
  const offset = loadOffsetFor(exercise, data.bodyweightKg)
  const series = trendSeries(e1rmPoints(history, offset))
  const bests = computeBests(data.completedSets.filter((s) => s.exerciseId === exercise.id))[0]
  const planExercise = plan?.days
    .flatMap((d) => d.exercises)
    .find((e) => e.exerciseId === exercise.id)
  const prescription = prescriptionOf(exercise, planExercise, profile.experience)
  const target = targetFor({
    exercise,
    prescription,
    history,
    loading: settings.loading,
    profile,
    deload: false,
  })
  const injured = exercise.stresses.filter((j) => profile.injuries.includes(j))
  const sessions = [...history].reverse()
  const visible = showAll ? sessions : sessions.slice(0, HISTORY_PAGE)
  const w = (kg: number) => formatWeight(kg, unit, 1)

  return (
    <div className="space-y-6">
      <PageHeader
        back={true}
        eyebrow={MUSCLE_LABEL[exercise.primaryMuscle]}
        title={exercise.name}
        subtitle={exercise.nameEn !== exercise.name ? exercise.nameEn : undefined}
        actions={
          exercise.isCustom ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más opciones">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  disabled={history.length > 0 || Boolean(planExercise)}
                  onSelect={async () => {
                    await repos.exercises.deleteCustom(exercise.id)
                    toast('Ejercicio eliminado.')
                    void navigate('/entreno/ejercicios', { replace: true })
                  }}
                >
                  <Trash2 /> Eliminar (sin historial ni plan)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />

      <section className="flex gap-4 rounded-2xl border bg-card p-4">
        <MuscleMap
          primary={exercise.primaryMuscle}
          secondary={exercise.secondaryMuscles}
          className="w-28 shrink-0"
        />
        <dl className="min-w-0 flex-1 space-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Músculos</dt>
            <dd>
              <strong>{MUSCLE_LABEL[exercise.primaryMuscle]}</strong>
              {exercise.secondaryMuscles.length > 0 &&
                `, ${exercise.secondaryMuscles.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Equipo</dt>
            <dd>{exercise.equipment.map((e) => EQUIPMENT_LABEL[e]).join(', ')}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Movimiento</dt>
            <dd>
              {PATTERN_LABEL[exercise.pattern]} ·{' '}
              {exercise.kind === 'compound' ? 'multiarticular' : 'aislamiento'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Carga</dt>
            <dd>{LOAD_TYPE_LABEL[exercise.loadType]}</dd>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {exercise.mainLift && <Badge>Básico</Badge>}
            {exercise.isCustom && <Badge variant="secondary">Creado por ti</Badge>}
          </div>
        </dl>
      </section>

      {injured.length > 0 && (
        <p className="flex items-start gap-2 rounded-2xl border border-warning/50 bg-warning/10 p-3 text-sm">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
          Carga {injured.map((j) => JOINT_LABEL[j].toLowerCase()).join(' y ')}, que reportaste con
          molestias. Si te duele, cámbialo por una alternativa.
        </p>
      )}

      <section className="flex items-start gap-3 rounded-2xl bg-primary/10 p-4">
        <Target aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Próxima vez</p>
          <p>{target.explanation.summary}</p>
        </div>
        <WhyButton explanation={target.explanation} compact />
      </section>

      {bests && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Peso máx."
            value={bests.maxWeight ? fmt(toDisplay(bests.maxWeight.weightKg, unit), 1) : '—'}
            unit={unit}
            hint={
              bests.maxWeight
                ? `× ${bests.maxWeight.reps} · ${formatShortDay(bests.maxWeight.date)}`
                : undefined
            }
          />
          <StatTile
            label="Mejor 1RM"
            value={bests.bestE1rm ? fmt(toDisplay(bests.bestE1rm.value, unit), 1) : '—'}
            unit={unit}
            hint={bests.bestE1rm ? formatShortDay(bests.bestE1rm.date) : 'Estimado'}
          />
          <StatTile label="Sesiones" value={bests.sessions} />
        </div>
      )}

      {series.length >= 2 && (
        <Section title="1RM estimado">
          <div className="rounded-2xl border bg-card p-4">
            <TrendChart
              ariaLabel={`Evolución del 1RM estimado de ${exercise.name}: de ${w(series[0]!.e1rm)} a ${w(series.at(-1)!.e1rm)}.`}
              data={series.map((p) => ({
                date: p.date,
                e1rm: toDisplay(p.e1rm, unit),
                average: toDisplay(p.average, unit),
              }))}
              series={[
                { key: 'e1rm', label: 'Por sesión', color: 'var(--chart-1)', dots: true },
                { key: 'average', label: 'Media de 3 sesiones', color: 'var(--chart-2)' },
              ]}
              formatValue={(v) => `${fmt(v, 1)} ${unit}`}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Epley con reps + RIR: 1RM = peso × (1 + reps efectivas / 30).
              {offset > 0 && ' Incluye tu peso corporal.'}
            </p>
          </div>
        </Section>
      )}

      <Section title="Técnica">
        <ol className="space-y-3 rounded-2xl border bg-card p-4 text-sm">
          {exercise.instructions.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary-text">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Errores comunes">
        <ul className="space-y-2.5 rounded-2xl border bg-card p-4 text-sm">
          {exercise.commonMistakes.map((m) => (
            <li key={m} className="flex gap-2.5">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
              {m}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Historial">
        {sessions.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck aria-hidden className="size-4" /> Aún no lo has registrado.
          </p>
        ) : (
          <>
            <ul className="divide-y rounded-2xl border bg-card">
              {visible.map((s, i) => (
                <li key={`${s.date}-${i}`} className="flex items-start gap-3 p-3 text-sm">
                  <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
                    {formatShortDay(s.date)}
                  </span>
                  <span className="tabular flex flex-1 flex-wrap gap-x-3 gap-y-1">
                    {s.sets.map((x, j) => (
                      <span key={j} className={cn(!isWorkingSet(x) && 'text-muted-foreground')}>
                        {!isWorkingSet(x) && 'C '}
                        {fmt(toDisplay(x.weightKg, unit), 2)}×{x.reps}
                        {x.rir !== null && <span className="text-muted-foreground"> @{x.rir}</span>}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            {sessions.length > HISTORY_PAGE && !showAll && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(true)}>
                Ver las {sessions.length} sesiones
              </Button>
            )}
          </>
        )}
      </Section>
    </div>
  )
}
