import { ChevronRight, Dumbbell, History, Play } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isWorkingSet } from '@/domain/progression/e1rm'
import { fmt } from '@/domain/shared/format'
import { fromKg } from '@/domain/shared/units'
import type { WorkoutSet } from '@/domain/types'
import { capitalize, formatDay, formatDuration } from '@/lib/format'

import { useTrainingData } from '../hooks/useTrainingData'

export function HistoryPage() {
  const data = useTrainingData()
  const { settings, exercisesById } = data

  if (data.loading || !settings) {
    return (
      <>
        <PageHeader title="Historial" back="/entreno" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </>
    )
  }

  const setsBySession = new Map<string, WorkoutSet[]>()
  for (const s of data.completedSets)
    setsBySession.set(s.sessionId, [...(setsBySession.get(s.sessionId) ?? []), s])
  const completed = data.sessions
    .filter((s) => s.status === 'completed')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  const byMonth = new Map<string, typeof completed>()
  for (const s of completed) {
    const month = s.date.slice(0, 7)
    byMonth.set(month, [...(byMonth.get(month) ?? []), s])
  }

  const unit = settings.unit

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial"
        back="/entreno"
        subtitle={
          completed.length > 0
            ? `${completed.length} ${completed.length === 1 ? 'sesión' : 'sesiones'} registradas`
            : undefined
        }
      />

      {data.active && (
        <Link
          to="/entreno/sesion"
          className="flex items-center gap-3 rounded-2xl border border-primary bg-primary/10 p-4"
        >
          <Play aria-hidden className="size-5 text-primary" />
          <span className="flex-1 font-semibold">{data.active.title} · en curso</span>
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      )}

      {completed.length === 0 ? (
        <EmptyState
          icon={History}
          title="Aún no hay entrenos"
          description="Cuando termines tu primera sesión aparecerá aquí, con su resumen y récords."
          action={
            <Button asChild>
              <Link to="/entreno">Ir a Entreno</Link>
            </Button>
          }
        />
      ) : (
        [...byMonth.entries()].map(([month, sessions]) => (
          <Section key={month} title={capitalize(formatDay(`${month}-01`, 'MMMM yyyy'))}>
            <ul className="space-y-2">
              {sessions.map((s) => {
                const sets = (setsBySession.get(s.id) ?? []).filter(isWorkingSet)
                const volume = sets.reduce((acc, x) => acc + x.weightKg * x.reps, 0)
                const duration = s.endedAt
                  ? Math.max(
                      0,
                      Math.round((Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 60000),
                    )
                  : null
                const names = [...new Set(sets.map((x) => x.exerciseId))]
                  .map((id) => exercisesById.get(id)?.name)
                  .filter(Boolean)
                return (
                  <li key={s.id}>
                    <Link
                      to={`/entreno/sesion/${s.id}/resumen`}
                      className="flex items-start gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/50"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-center leading-none">
                        <span>
                          <span className="block font-display text-lg font-bold">
                            {formatDay(s.date, 'd')}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {formatDay(s.date, 'EEE')}
                          </span>
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className="truncate">{s.title}</span>
                          {s.isDeload && <Badge variant="secondary">Descarga</Badge>}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {duration !== null && `${formatDuration(duration)} · `}
                          {sets.length} series · {fmt(fromKg(volume, unit), 0)} {unit}
                        </span>
                        {names.length > 0 && (
                          <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">
                            {names.join(' · ')}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="mt-3 size-4 shrink-0 text-muted-foreground"
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Section>
        ))
      )}

      {completed.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 pb-4 text-xs text-muted-foreground">
          <Dumbbell aria-hidden className="size-3.5" /> El volumen cuenta solo series de trabajo
          (sin calentamiento).
        </p>
      )}
    </div>
  )
}
