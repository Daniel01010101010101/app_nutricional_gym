import {
  BedDouble,
  Check,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Flame,
  Footprints,
  Lightbulb,
  Play,
  Plus,
  Scale,
  ShieldAlert,
  Utensils,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { InstallCard } from '@/components/common/InstallCard'
import { ProgressRing } from '@/components/common/ProgressRing'
import { NumberField } from '@/components/form/NumberField'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { trendWeight } from '@/domain/body/weightTrend'
import { describePortion, nutritionGapMessage } from '@/domain/nutrition/gaps'
import { strengthLossAlert } from '@/domain/progression/strength'
import { addDaysToKey } from '@/domain/shared/dates'
import { fmt } from '@/domain/shared/format'
import { fromKg, toKg } from '@/domain/shared/units'
import { buildCardioPlan } from '@/domain/training/cardio'
import { pickDaily, proteinStreak, reminders, trainingStreak } from '@/domain/today/today'
import type { Weekday } from '@/domain/types'
import { TIPS_DATA } from '@/data/seeds'
import { useNutritionData } from '@/features/nutrition/hooks/useNutritionData'
import { WaterCard } from '@/features/nutrition/components/WaterCard'
import { useTrainingData } from '@/features/training/hooks/useTrainingData'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { capitalize, formatDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { planStartDate } from '@/services/checkin'
import { dayTargetsFor, ensureMealPlans, entriesFromPlanMeal, totalsOf } from '@/services/nutrition'
import { dayStatuses, greeting, nextPlanMeal } from '@/services/today'
import {
  deloadInfo,
  lowFeelingStreak,
  lowWellbeingStreak,
  mainLiftSeries,
  planDayFor,
  startSession,
} from '@/services/workout'

const STREAK_DAYS = 60

function WeighIn({ unit, onSave }: { unit: 'kg' | 'lb'; onSave: (kg: number) => Promise<void> }) {
  const [value, setValue] = useState<number | undefined>()
  const kg = value !== undefined ? toKg(value, unit) : undefined
  const valid = kg !== undefined && kg >= 30 && kg <= 350
  return (
    <section
      className="flex items-end gap-2 rounded-2xl border bg-card p-4"
      aria-label="Pesaje de hoy"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Scale aria-hidden className="size-4 text-primary" /> Pésate hoy (en ayunas)
        </p>
        <NumberField
          aria-label="Peso de hoy"
          value={value}
          onChange={setValue}
          unit={unit}
          decimals={2}
          step={0.1}
        />
      </div>
      <Button
        size="lg"
        disabled={!valid}
        onClick={async () => {
          if (!valid) return
          await onSave(Math.round(kg * 100) / 100)
          toast.success('Peso de hoy guardado.')
        }}
      >
        <Check /> Guardar
      </Button>
    </section>
  )
}

function Steps({ date, goal }: { date: string; goal: number }) {
  const repos = useRepositories()
  const { data: log } = useLive(() => repos.dailyLogs.observe(date), [date])
  const steps = log?.steps ?? 0
  const pct = goal > 0 ? Math.min(100, (steps / goal) * 100) : 0
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4" aria-label="Pasos">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
          <Footprints aria-hidden className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            Pasos <span className="tabular">{fmt(steps)}</span>
            <span className="font-normal text-muted-foreground"> / {fmt(goal)}</span>
          </p>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Pasos del día"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={steps}
          >
            <div
              className="h-full rounded-full bg-success transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      <NumberField
        aria-label="Pasos de hoy (del contador de tu teléfono)"
        value={log?.steps}
        onChange={(v) =>
          v !== undefined &&
          v >= 0 &&
          v <= 100000 &&
          void repos.dailyLogs.upsert(date, { steps: Math.round(v) })
        }
        decimals={0}
        step={1000}
        min={0}
        steppers
        placeholder="Pasos de hoy"
      />
    </section>
  )
}

export function TodayPage() {
  const training = useTrainingData()
  const { repos, today, profile, settings, plan } = training
  const nutrition = useNutritionData(today)
  const navigate = useNavigate()
  const weights = useLive(() => repos.body.observeWeights(), [])
  const checkins = useLive(() => repos.checkins.observeList(), [])
  const targetsList = useLive(() => repos.targets.observeList(), [])
  const logs = useLive(
    () => repos.foodLogs.observeRange(addDaysToKey(today, -STREAK_DAYS), today),
    [today],
  )
  const [starting, setStarting] = useState(false)

  const { mealPlan, foods, isTrainingDay, loading: nutritionLoading, targets } = nutrition
  const needsPlan =
    !nutritionLoading && !mealPlan && Boolean(profile && targets) && foods.length > 0
  useEffect(() => {
    if (!needsPlan || !profile) return
    void ensureMealPlans(repos, {
      profile,
      foods,
      dates: [today],
      isTrainingDay: () => isTrainingDay,
    })
  }, [needsPlan, profile, foods, today, isTrainingDay, repos])

  if (
    training.loading ||
    nutritionLoading ||
    !profile ||
    !settings ||
    weights.loading ||
    logs.loading ||
    targetsList.loading
  ) {
    return (
      <>
        <PageHeader title="Hoy" />
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </>
    )
  }

  const unit = settings.unit
  const now = new Date()
  const hasWeightToday = (weights.data ?? []).some((w) => w.date === today)
  const trend = trendWeight(weights.data ?? [], today)
  const startedOn = planStartDate(targetsList.data ?? []) ?? today
  const reminder = reminders({
    today,
    hasWeightToday,
    checkinWeekday: settings.checkinWeekday,
    completedCheckinWeekStarts: (checkins.data ?? []).map((c) => c.weekStart),
    startedOn,
  })

  // Entreno de hoy.
  const todayDay = planDayFor(plan, today)
  const doneToday = training.sessions.find((s) => s.date === today && s.status === 'completed')
  const strength = mainLiftSeries(
    profile,
    training.history,
    training.exercisesById,
    training.bodyweightKg,
  )
  const alert = strengthLossAlert(strength)
  const deload = plan
    ? deloadInfo(plan, settings, today, {
        strengthAlert: alert.value.triggered,
        lowWellbeingCheckins: lowWellbeingStreak(checkins.data ?? []),
        lowFeelingSessions: lowFeelingStreak(training.sessions),
      })
    : null
  const legDays = (plan?.days ?? [])
    .filter((d) => d.isLegDay && d.weekday !== null)
    .map((d) => d.weekday as Weekday)
  const cardio = buildCardioPlan({
    avgSteps: profile.avgSteps,
    legDays,
    experience: profile.experience,
  })

  // Nutrición de hoy.
  const day = targets ? dayTargetsFor(targets, isTrainingDay) : null
  const consumed = totalsOf(nutrition.entries)
  const gap = day ? nutritionGapMessage(day.value, consumed, nutrition.allowedFoods) : null
  const next = nextPlanMeal(mealPlan, nutrition.entries, now.getHours() * 60 + now.getMinutes())
  const nextText = next
    ? next.items
        .map((i) => {
          const food = nutrition.foodsById.get(i.foodId)
          return food ? describePortion(food, i.grams) : null
        })
        .filter(Boolean)
        .join(' · ')
    : null

  // Rachas y consejo.
  const statuses = dayStatuses({
    logs: logs.data ?? [],
    targets: targetsList.data ?? [],
    plan,
    sessions: training.sessions,
    from: addDaysToKey(today, -STREAK_DAYS),
    today,
  })
  const protein = proteinStreak(statuses, today)
  const trainedStreak = trainingStreak(statuses, today)
  const tip = pickDaily(TIPS_DATA, today)

  const begin = async () => {
    if (training.active) {
      void navigate('/entreno/sesion')
      return
    }
    if (!plan || !todayDay) return
    setStarting(true)
    try {
      await startSession(repos, {
        plan,
        day: todayDay,
        title: todayDay.name,
        today,
        isDeload: deload?.value.due ?? false,
      })
      void navigate('/entreno/sesion')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={capitalize(formatDay(today))}
        title={`${greeting(now.getHours())}, ${profile.name.split(' ')[0]}`}
      />

      <InstallCard />

      {reminder.checkinDue && (
        <Link
          to="/checkin"
          className="flex items-center gap-3 rounded-2xl border border-primary bg-primary/10 p-4"
        >
          <ClipboardCheck aria-hidden className="size-6 shrink-0 text-primary" />
          <span className="flex-1">
            <span className="block font-semibold">Toca tu check-in semanal</span>
            <span className="block text-xs text-muted-foreground">
              Revisa la semana y ajusta el plan en 1 minuto.
            </span>
          </span>
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      )}

      {alert.value.triggered && (
        <Link
          to="/entreno"
          className="flex items-start gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4"
        >
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          <span className="text-sm">
            <span className="block font-semibold">Tu fuerza está bajando</span>
            {alert.explanation.summary}
          </span>
        </Link>
      )}

      {!hasWeightToday && (
        <WeighIn unit={unit} onSave={(kg) => repos.body.upsertWeight(today, kg)} />
      )}

      <section
        className="relative overflow-hidden rounded-2xl border bg-card p-5"
        aria-label="Entreno de hoy"
      >
        <span
          aria-hidden
          className="absolute -top-10 -right-10 size-36 rounded-full bg-primary/10 blur-2xl"
        />
        {training.active ? (
          <>
            <p className="text-xs font-semibold tracking-wider text-primary-text uppercase">
              Entreno en curso
            </p>
            <h2 className="mt-1 font-display text-3xl leading-tight font-bold">
              {training.active.title}
            </h2>
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={() => void navigate('/entreno/sesion')}
            >
              <Play /> Continuar
            </Button>
          </>
        ) : todayDay ? (
          <>
            <p className="text-xs font-semibold tracking-wider text-primary-text uppercase">
              {deload?.value.due ? 'Semana de descarga' : 'Entreno de hoy'}
            </p>
            <h2 className="mt-1 font-display text-3xl leading-tight font-bold">
              Hoy toca: {todayDay.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {todayDay.focus} · {todayDay.exercises.length} ejercicios
            </p>
            {doneToday ? (
              <Button asChild size="lg" variant="secondary" className="mt-4 w-full">
                <Link to={`/entreno/sesion/${doneToday.id}/resumen`}>
                  <Check /> Completado · ver resumen
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                className="mt-4 w-full"
                disabled={starting}
                onClick={() => void begin()}
              >
                <Dumbbell /> Empezar entreno
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-xs font-semibold tracking-wider text-primary-text uppercase">
              Descanso
            </p>
            <h2 className="mt-1 flex items-center gap-2 font-display text-3xl leading-tight font-bold">
              <BedDouble aria-hidden className="size-7 text-primary" /> Día de descanso
            </h2>
            <p className="text-sm text-muted-foreground">
              Camina {fmt(cardio.value.stepsGoal)} pasos y haz 10 minutos de movilidad.{' '}
              {doneToday ? '¡Y además entrenaste!' : ''}
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-2">
              <Link to="/entreno">
                Ver la semana <ChevronRight />
              </Link>
            </Button>
          </>
        )}
      </section>

      {day && (
        <section className="space-y-4 rounded-2xl border bg-card p-4" aria-label="Nutrición de hoy">
          <div className="flex items-center gap-4">
            <ProgressRing
              value={consumed.kcal}
              max={day.value.kcal}
              size={96}
              stroke={9}
              colorClass="text-kcal"
              label={`Calorías: ${fmt(consumed.kcal)} de ${fmt(day.value.kcal)}`}
            >
              <span>
                <span className="block font-display text-2xl leading-none font-bold">
                  {fmt(Math.max(0, day.value.kcal - consumed.kcal))}
                </span>
                <span className="text-[10px] text-muted-foreground">kcal restantes</span>
              </span>
            </ProgressRing>
            <div className="min-w-0 flex-1 space-y-2">
              {(
                [
                  ['Proteína', 'protein', 'bg-protein'],
                  ['Carbos', 'carbs', 'bg-carbs'],
                  ['Grasa', 'fat', 'bg-fat'],
                ] as const
              ).map(([label, key, color]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs">
                    <span>{label}</span>
                    <span className="tabular text-muted-foreground">
                      {fmt(consumed[key])} / {day.value[key]} g
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className={cn('h-full rounded-full', color)}
                      style={{ width: `${Math.min(100, (consumed[key] / day.value[key]) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {gap && gap.status !== 'empty' && (
            <p className="text-sm">
              <strong>{gap.title}.</strong>{' '}
              <span className="text-muted-foreground">
                {gap.ideas[0] ? `Idea: ${gap.ideas[0]}.` : gap.detail}
              </span>
            </p>
          )}
          {next && nextText && (
            <div className="space-y-2 rounded-xl border border-dashed p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Siguiente: {next.name} · {next.time}
              </p>
              <p className="text-sm">{nextText}</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const entries = entriesFromPlanMeal(next, nutrition.foodsById, today)
                  await repos.foodLogs.add(entries)
                  toast.success(`${next.name} registrado.`, {
                    action: {
                      label: 'Deshacer',
                      onClick: () =>
                        void Promise.all(entries.map((e) => repos.foodLogs.remove(e.id))),
                    },
                  })
                }}
              >
                <Plus /> Lo comí
              </Button>
            </div>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/nutricion">
              <Utensils /> Registrar comida
            </Link>
          </Button>
        </section>
      )}

      {day && <WaterCard date={today} targetMl={day.value.waterMl} />}

      <Steps date={today} goal={cardio.value.stepsGoal} />

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border bg-card p-4">
          <Flame
            aria-hidden
            className={cn('size-5', protein > 0 ? 'text-primary' : 'text-muted-foreground')}
          />
          <p className="mt-1 font-display text-3xl leading-none font-bold">{protein}</p>
          <p className="text-xs text-muted-foreground">
            {protein === 1 ? 'día' : 'días'} seguidos con tu proteína
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <Dumbbell
            aria-hidden
            className={cn('size-5', trainedStreak > 0 ? 'text-primary' : 'text-muted-foreground')}
          />
          <p className="mt-1 font-display text-3xl leading-none font-bold">{trainedStreak}</p>
          <p className="text-xs text-muted-foreground">entrenos sin saltarte ninguno</p>
        </div>
      </div>

      {trend !== null && (
        <Link
          to="/progreso"
          className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:bg-accent/50"
        >
          <Scale aria-hidden className="size-5 text-muted-foreground" />
          <span className="flex-1 text-sm">
            Peso de referencia (promedio 7 días):{' '}
            <strong className="tabular">
              {fmt(fromKg(trend, unit), 1)} {unit}
            </strong>
          </span>
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      )}

      {tip && (
        <Section title="Consejo del día">
          <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
            <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm">
              {tip.text}
              {tip.source && (
                <span className="block pt-1 text-xs text-muted-foreground">{tip.source}</span>
              )}
            </p>
          </div>
        </Section>
      )}
    </div>
  )
}
