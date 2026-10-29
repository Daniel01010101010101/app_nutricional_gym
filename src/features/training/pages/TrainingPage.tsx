import {
  BedDouble,
  BookOpen,
  Check,
  ChevronRight,
  Dumbbell,
  Footprints,
  History,
  ListOrdered,
  Play,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus as TrendingFlat,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { WhyButton } from '@/components/common/WhyButton'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import {
  strengthLossAlert,
  strengthTrend,
  MAIN_LIFT_LABEL,
  TREND_LABEL,
  type TrendState,
} from '@/domain/progression/strength'
import { addDaysToKey, isoWeekday, startOfWeekKey } from '@/domain/shared/dates'
import { fmt } from '@/domain/shared/format'
import { buildCardioPlan } from '@/domain/training/cardio'
import { WEEKDAY_LABEL, WEEKDAY_SHORT } from '@/domain/training/days'
import type { MainLift, Weekday } from '@/domain/types'
import type { PlanDay } from '@/data/schemas'
import { useLive } from '@/hooks/useLive'
import { capitalize, formatDay, formatWeight } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  blockStartForDeloadNow,
  deloadInfo,
  lowFeelingStreak,
  lowWellbeingStreak,
  mainLiftSeries,
  planDayFor,
  startSession,
} from '@/services/workout'

import { useTrainingData } from '../hooks/useTrainingData'

const TREND_ICON: Record<TrendState, typeof TrendingUp> = {
  up: TrendingUp,
  stable: TrendingFlat,
  down: TrendingDown,
  insufficient: TrendingFlat,
}

const TREND_CLASS: Record<TrendState, string> = {
  up: 'text-success',
  stable: 'text-muted-foreground',
  down: 'text-destructive',
  insufficient: 'text-muted-foreground',
}

export function TrainingPage() {
  const data = useTrainingData()
  const navigate = useNavigate()
  const { repos, today, plan, settings, profile } = data
  const checkins = useLive(() => repos.checkins.observeList(), [])
  const [chooser, setChooser] = useState(false)
  const [starting, setStarting] = useState(false)

  const strength = useMemo(
    () =>
      profile ? mainLiftSeries(profile, data.history, data.exercisesById, data.bodyweightKg) : {},
    [profile, data.history, data.exercisesById, data.bodyweightKg],
  )
  const alert = useMemo(() => strengthLossAlert(strength), [strength])

  if (data.loading || !settings || !profile) {
    return (
      <>
        <PageHeader title="Entreno" />
        <div className="space-y-3">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </>
    )
  }

  if (!plan) {
    return (
      <>
        <PageHeader title="Entreno" />
        <EmptyState
          icon={Dumbbell}
          title="Aún no tienes un plan"
          description="Completa tu perfil para generar tu plan de entrenamiento."
          action={
            <Button asChild>
              <Link to="/perfil/editar">Completar perfil</Link>
            </Button>
          }
        />
      </>
    )
  }

  const deload = deloadInfo(plan, settings, today, {
    strengthAlert: alert.value.triggered,
    lowWellbeingCheckins: lowWellbeingStreak(checkins.data ?? []),
    lowFeelingSessions: lowFeelingStreak(data.sessions),
  })

  const weekStart = startOfWeekKey(today)
  const weekEnd = addDaysToKey(weekStart, 6)
  const weekSessions = data.sessions.filter(
    (s) => s.status === 'completed' && s.date >= weekStart && s.date <= weekEnd,
  )
  const doneDayIds = new Set(weekSessions.map((s) => s.planDayId))
  const todayDay = planDayFor(plan, today)
  const todaySession = data.sessions.find(
    (s) =>
      s.date === today && s.status === 'completed' && (!todayDay || s.planDayId === todayDay.id),
  )
  const legDays = plan.days
    .filter((d) => d.isLegDay && d.weekday !== null)
    .map((d) => d.weekday as Weekday)
  const cardio = buildCardioPlan({
    avgSteps: profile.avgSteps,
    legDays,
    experience: profile.experience,
  })

  const begin = async (day: PlanDay | undefined, title: string) => {
    if (data.active) {
      void navigate('/entreno/sesion')
      return
    }
    setStarting(true)
    try {
      await startSession(repos, {
        plan,
        ...(day ? { day } : {}),
        title,
        today,
        isDeload: deload.value.due,
      })
      void navigate('/entreno/sesion')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entreno"
        subtitle={`${plan.splitName} · ${plan.days.length} días por semana`}
        actions={
          <>
            <Button asChild variant="ghost" size="icon" aria-label="Historial">
              <Link to="/entreno/historial">
                <History />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Biblioteca de ejercicios">
              <Link to="/entreno/ejercicios">
                <BookOpen />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Editar plan">
              <Link to="/entreno/plan">
                <ListOrdered />
              </Link>
            </Button>
          </>
        }
      />

      {data.active && (
        <Link
          to="/entreno/sesion"
          className="flex items-center gap-3 rounded-2xl border border-primary bg-primary/10 p-4"
        >
          <Play aria-hidden className="size-6 text-primary" />
          <span className="flex-1">
            <span className="block font-semibold">Tienes un entreno en curso</span>
            <span className="text-sm text-muted-foreground">
              {data.active.title} · toca para continuar
            </span>
          </span>
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      )}

      {deload.value.due && (
        <div className="space-y-1 rounded-2xl border border-warning/50 bg-warning/10 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">Semana de descarga</p>
            <WhyButton explanation={deload.explanation} compact />
          </div>
          <p className="text-sm">
            {deload.explanation.summary} Tus objetivos de hoy ya vienen con la mitad de series.
          </p>
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl border bg-card p-5">
        <span
          aria-hidden
          className="absolute -top-10 -right-10 size-40 rounded-full bg-primary/10 blur-2xl"
        />
        <p className="text-xs font-semibold tracking-wider text-primary-text uppercase">
          {capitalize(formatDay(today))}
        </p>
        {todayDay ? (
          <>
            <h2 className="mt-1 font-display text-4xl leading-tight font-bold">
              Hoy toca: {todayDay.name}
            </h2>
            <p className="text-sm text-muted-foreground">{todayDay.focus}</p>
            <ul className="mt-4 space-y-1.5">
              {todayDay.exercises.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    {data.exercisesById.get(e.exerciseId)?.name ?? e.exerciseId}
                  </span>
                  <span className="tabular shrink-0 text-muted-foreground">
                    {e.sets} × {e.repMin}–{e.repMax}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2">
              {todaySession ? (
                <Button asChild size="lg" variant="secondary" className="flex-1">
                  <Link to={`/entreno/sesion/${todaySession.id}/resumen`}>
                    <Check /> Completado · ver resumen
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={starting}
                  onClick={() => void begin(todayDay, todayDay.name)}
                >
                  <Play /> {data.active ? 'Continuar entreno' : 'Empezar'}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-1 flex items-center gap-2 font-display text-4xl leading-tight font-bold">
              <BedDouble aria-hidden className="size-8 text-primary" /> Día de descanso
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recuperarse también es entrenar. Hoy: {fmt(cardio.value.stepsGoal)} pasos y 10 minutos
              de movilidad.
              {cardio.value.hiit.allowedWeekdays.includes(isoWeekday(today)) &&
              cardio.value.hiit.maxPerWeek > 0
                ? ' Si quieres, es buen día para tu sesión de HIIT.'
                : ' Si te sientes bien, suma 20–40 min de cardio suave.'}
            </p>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setChooser(true)}>
            <ListOrdered /> Elegir otra sesión
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={starting}
            onClick={() => void begin(undefined, 'Entreno libre')}
          >
            <Plus /> Entrené otra cosa
          </Button>
        </div>
      </section>

      <Section title="Esta semana">
        <ol className="divide-y rounded-2xl border bg-card">
          {plan.days.map((day) => {
            const done = doneDayIds.has(day.id)
            const isToday = day.weekday === isoWeekday(today)
            return (
              <li key={day.id} className="flex items-center gap-3 p-3.5">
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-xl text-xs font-bold',
                    done
                      ? 'bg-success/15 text-success'
                      : isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary',
                  )}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : day.weekday ? (
                    WEEKDAY_SHORT[day.weekday]
                  ) : (
                    '—'
                  )}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{day.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {day.weekday ? WEEKDAY_LABEL[day.weekday] : 'Día a elección'} ·{' '}
                    {day.exercises.length} ejercicios
                  </span>
                </span>
                {done && <Badge variant="secondary">Hecho</Badge>}
              </li>
            )
          })}
        </ol>
      </Section>

      <Section
        title="Tu fuerza"
        action={
          <Link to="/progreso" className="text-xs font-semibold text-primary-text">
            Ver progreso
          </Link>
        }
      >
        {alert.value.triggered && (
          <div className="mb-3 space-y-1 rounded-2xl border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-start justify-between">
              <p className="font-semibold">Alerta: tu fuerza está bajando</p>
              <WhyButton explanation={alert.explanation} compact />
            </div>
            <p className="text-sm">{alert.explanation.summary}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(MAIN_LIFT_LABEL) as MainLift[]).map((lift) => {
            const points = strength[lift] ?? []
            const trend = strengthTrend(points)
            const Icon = TREND_ICON[trend.state]
            return (
              <div key={lift} className="rounded-2xl border bg-card p-3">
                <p className="truncate text-[11px] font-semibold text-muted-foreground uppercase">
                  {MAIN_LIFT_LABEL[lift]}
                </p>
                <p className="tabular font-display text-2xl font-bold">
                  {trend.current ? formatWeight(trend.current, settings.unit, 1) : '—'}
                </p>
                <p
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    TREND_CLASS[trend.state],
                  )}
                >
                  <Icon aria-hidden className="size-3.5" />
                  {points.length === 0 ? 'Sin registros' : TREND_LABEL[trend.state]}
                  {trend.changePct !== null &&
                    ` (${trend.changePct > 0 ? '+' : ''}${fmt(trend.changePct, 1)} %)`}
                </p>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          1RM estimado, promedio de tus últimas 3 sesiones de cada básico.
        </p>
      </Section>

      <Section title="Cardio">
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
          <Footprints aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="flex-1 text-sm">{cardio.explanation.summary}</p>
          <WhyButton explanation={cardio.explanation} compact />
        </div>
      </Section>

      {deload.value.due === false && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={async () => {
            await repos.plans.save({
              ...plan,
              blockStartDate: blockStartForDeloadNow(today, settings.deloadEveryWeeks),
            })
            toast.success('Esta semana será de descarga: mismos pesos, la mitad de las series.')
          }}
        >
          Me siento muy fatigado: hacer descarga esta semana
        </Button>
      )}

      <Drawer open={chooser} onOpenChange={setChooser}>
        <DrawerContent className="mx-auto max-w-lg">
          <DrawerHeader className="text-left">
            <DrawerTitle>¿Qué sesión vas a hacer?</DrawerTitle>
            <DrawerDescription>
              Puedes hacer cualquier día de tu plan cuando quieras.
            </DrawerDescription>
          </DrawerHeader>
          <ul className="space-y-2 px-4 pb-6">
            {plan.days.map((day) => (
              <li key={day.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left hover:bg-accent"
                  onClick={() => {
                    setChooser(false)
                    void begin(day, day.name)
                  }}
                >
                  <Dumbbell aria-hidden className="size-5 text-primary" />
                  <span className="flex-1">
                    <span className="block font-semibold">{day.name}</span>
                    <span className="text-xs text-muted-foreground">{day.focus}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
