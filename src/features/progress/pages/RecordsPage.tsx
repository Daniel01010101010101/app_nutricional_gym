import { ChevronRight, Star, Trophy } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { computeBests, detectRecords, type PersonalRecord } from '@/domain/progression/records'
import { fmt } from '@/domain/shared/format'
import { fromKg } from '@/domain/shared/units'
import { MAIN_LIFTS, type DayKey, type WorkoutSet } from '@/domain/types'
import { useTrainingData } from '@/features/training/hooks/useTrainingData'
import { formatShortDay } from '@/lib/format'
import { loadOffsetFor, RECORD_LABEL, recordDetail } from '@/services/workout'

const RECENT_LIMIT = 15

export function RecordsPage() {
  const data = useTrainingData()
  const { settings, exercisesById } = data

  if (data.loading || !settings) {
    return (
      <>
        <PageHeader title="Récords" back="/progreso" />
        <Skeleton className="h-72 rounded-2xl" />
      </>
    )
  }

  const unit = settings.unit
  const name = (id: string) => exercisesById.get(id)?.name ?? 'Ejercicio'

  // Récords sesión por sesión frente a todo lo anterior.
  const bySession = new Map<string, WorkoutSet[]>()
  for (const s of data.completedSets)
    bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s])
  const sessions = data.sessions
    .filter((s) => s.status === 'completed' && bySession.has(s.id))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const recent: (PersonalRecord & { date: DayKey })[] = []
  const previous: WorkoutSet[] = []
  for (const session of sessions) {
    const sets = bySession.get(session.id) ?? []
    for (const exerciseId of new Set(sets.map((s) => s.exerciseId))) {
      const offset = loadOffsetFor(exercisesById.get(exerciseId), data.bodyweightKg)
      const found = detectRecords(
        previous.filter((s) => s.exerciseId === exerciseId),
        sets.filter((s) => s.exerciseId === exerciseId),
        offset,
      )
      recent.push(...found.map((r) => ({ ...r, date: session.date })))
    }
    previous.push(...sets)
  }

  const bests = computeBests(data.completedSets).sort((a, b) => {
    const la = exercisesById.get(a.exerciseId)?.mainLift
    const lb = exercisesById.get(b.exerciseId)?.mainLift
    const ia = la ? MAIN_LIFTS.indexOf(la) : 99
    const ib = lb ? MAIN_LIFTS.indexOf(lb) : 99
    return ia - ib || (b.bestE1rm?.value ?? 0) - (a.bestE1rm?.value ?? 0)
  })

  if (bests.length === 0) {
    return (
      <>
        <PageHeader title="Récords" back="/progreso" />
        <EmptyState
          icon={Trophy}
          title="Todavía no hay récords"
          description="Tus mejores marcas aparecen aquí desde la segunda vez que haces cada ejercicio."
          action={
            <Button asChild>
              <Link to="/entreno">Ir a entrenar</Link>
            </Button>
          }
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Récords"
        back="/progreso"
        subtitle={`${recent.length} récords en ${sessions.length} sesiones`}
      />

      {recent.length > 0 && (
        <Section title="Recientes">
          <ul className="space-y-2">
            {[...recent]
              .reverse()
              .slice(0, RECENT_LIMIT)
              .map((r, i) => (
                <li
                  key={`${r.exerciseId}-${r.type}-${r.date}-${i}`}
                  className="flex items-start gap-3 rounded-2xl border bg-card p-3"
                >
                  <Trophy aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-semibold">{RECORD_LABEL[r.type]}</span>
                    <span className="text-muted-foreground">
                      {recordDetail(r, name(r.exerciseId), unit)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatShortDay(r.date)}
                  </span>
                </li>
              ))}
          </ul>
        </Section>
      )}

      <Section title="Mejores marcas">
        <ul className="divide-y rounded-2xl border bg-card">
          {bests.map((b) => {
            const main = Boolean(exercisesById.get(b.exerciseId)?.mainLift)
            return (
              <li key={b.exerciseId}>
                <Link
                  to={`/entreno/ejercicios/${b.exerciseId}`}
                  className="flex items-center gap-3 p-3.5 hover:bg-accent/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{name(b.exerciseId)}</span>
                      {main && (
                        <Star
                          aria-label="Básico"
                          className="size-3.5 shrink-0 fill-current text-primary"
                        />
                      )}
                    </span>
                    <span className="tabular block text-xs text-muted-foreground">
                      {b.maxWeight &&
                        `Máx. ${fmt(fromKg(b.maxWeight.weightKg, unit), 1)} ${unit} × ${b.maxWeight.reps}`}
                      {` · ${b.sessions} ${b.sessions === 1 ? 'sesión' : 'sesiones'}`}
                    </span>
                  </span>
                  {b.bestE1rm && (
                    <span className="tabular shrink-0 text-right">
                      <span className="block font-semibold">
                        {fmt(fromKg(b.bestE1rm.value, unit), 1)} {unit}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">1RM est.</span>
                    </span>
                  )}
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      </Section>
    </div>
  )
}
