import {
  Camera,
  ChevronRight,
  ClipboardCheck,
  LineChart as LineChartIcon,
  Plus,
  Trophy,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { TrendChart } from '@/components/charts/TrendChart'
import { WeeklyBars } from '@/components/charts/WeeklyBars'
import { StatTile } from '@/components/common/StatTile'
import { Segmented } from '@/components/form/ChipGroup'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MAIN_LIFT_LABEL, strengthTrend, trendSeries } from '@/domain/progression/strength'
import { startOfWeekKey } from '@/domain/shared/dates'
import { fmt } from '@/domain/shared/format'
import { fromKg } from '@/domain/shared/units'
import { reminders } from '@/domain/today/today'
import { MUSCLE_LABEL, volumeTargets } from '@/domain/training/volume'
import { TRACKED_MUSCLES, type MainLift } from '@/domain/types'
import { useTrainingData } from '@/features/training/hooks/useTrainingData'
import { useLive } from '@/hooks/useLive'
import { cn } from '@/lib/utils'
import {
  bodyFatChartData,
  changeOf,
  muscleVolumeOfWeek,
  RANGE_LABEL,
  rangeStart,
  waistChartData,
  weekStarts,
  weeklyNutritionAdherence,
  weeklySetCounts,
  weightChartData,
  type RangeKey,
} from '@/services/progress'
import { planStartDate } from '@/services/checkin'
import { mainLiftSeries } from '@/services/workout'

function signed(value: number, decimals: number, unit: string): string {
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmt(Math.abs(value), decimals)} ${unit}`
}

function NotEnough({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

export function ProgressPage() {
  const data = useTrainingData()
  const { repos, today, profile, settings } = data
  const [range, setRange] = useState<RangeKey>('3m')
  const [lift, setLift] = useState<MainLift | null>(null)
  const from = rangeStart(range, today)
  const weights = useLive(() => repos.body.observeWeights(), [])
  const measurements = useLive(() => repos.body.observeMeasurements(), [])
  const targets = useLive(() => repos.targets.observeList(), [])
  const checkins = useLive(() => repos.checkins.observeList(), [])
  const logs = useLive(
    () => repos.foodLogs.observeRange(from ?? '2000-01-01', today),
    [from, today],
  )

  if (
    data.loading ||
    !profile ||
    !settings ||
    weights.loading ||
    measurements.loading ||
    targets.loading ||
    logs.loading
  ) {
    return (
      <>
        <PageHeader title="Progreso" />
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </>
    )
  }

  const unit = settings.unit
  const w = (kg: number) => fmt(fromKg(kg, unit), 1)
  const weightData = weightChartData(weights.data ?? [], from)
  const waistData = waistChartData(measurements.data ?? [], from)
  const fatData = bodyFatChartData(measurements.data ?? [], profile, from)
  const weightChange = changeOf(weightData, (p) => p.avg7)
  const waistChange = changeOf(waistData, (p) => p.waist)
  const fatChange = changeOf(fatData, (p) => p.bodyFat)

  const strength = mainLiftSeries(profile, data.history, data.exercisesById, data.bodyweightKg)
  const lifts = (Object.keys(MAIN_LIFT_LABEL) as MainLift[]).filter(
    (l) => (strength[l]?.length ?? 0) > 0,
  )
  const selectedLift = lift && lifts.includes(lift) ? lift : lifts[0]
  const liftPoints = selectedLift
    ? trendSeries(strength[selectedLift] ?? []).filter((p) => from === null || p.date >= from)
    : []

  const startedOn = planStartDate(targets.data ?? []) ?? today
  const firstDate = [weights.data?.[0]?.date, startedOn].filter(Boolean).sort()[0] as string
  const weeks = weekStarts(from ?? firstDate, today).slice(-26)
  const setCounts = weeklySetCounts(data.completedSets, weeks)
  const adherence = weeklyNutritionAdherence({
    logs: logs.data ?? [],
    targets: targets.data ?? [],
    plan: data.plan,
    sessions: data.sessions,
    weeks,
    today,
  })
  const thisWeek = muscleVolumeOfWeek(data.completedSets, data.exercisesById, startOfWeekKey(today))
  const muscleTargets = volumeTargets(profile.experience, profile.priorityMuscles)
  const scale = Math.max(...TRACKED_MUSCLES.map((m) => Math.max(thisWeek[m], muscleTargets[m].max)))

  const reminder = reminders({
    today,
    hasWeightToday: (weights.data ?? []).some((x) => x.date === today),
    checkinWeekday: settings.checkinWeekday,
    completedCheckinWeekStarts: (checkins.data ?? []).map((c) => c.weekStart),
    startedOn,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progreso"
        actions={
          <>
            <Button asChild variant="ghost" size="icon" aria-label="Fotos de progreso">
              <Link to="/progreso/fotos">
                <Camera />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Récords">
              <Link to="/progreso/records">
                <Trophy />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Registrar peso y medidas">
              <Link to="/progreso/registro">
                <Plus />
              </Link>
            </Button>
          </>
        }
      />

      <Link
        to="/checkin"
        className={cn(
          'flex items-center gap-3 rounded-2xl border p-4 transition-colors',
          reminder.checkinDue ? 'border-primary bg-primary/10' : 'bg-card hover:bg-accent/50',
        )}
      >
        <ClipboardCheck aria-hidden className="size-6 shrink-0 text-primary" />
        <span className="flex-1">
          <span className="block font-semibold">
            {reminder.checkinDue ? 'Tu check-in semanal está listo' : 'Check-in semanal'}
          </span>
          <span className="block text-xs text-muted-foreground">
            {reminder.checkinDue
              ? 'Revisa la semana y ajusta tu plan en 1 minuto.'
              : 'Historial de ajustes y decisiones.'}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5" />
      </Link>

      <Segmented<RangeKey>
        aria-label="Período"
        value={range}
        onChange={setRange}
        options={(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => ({
          value: r,
          label: RANGE_LABEL[r],
        }))}
      />

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Peso"
          value={weightData.length > 0 ? w(weightData.at(-1)!.avg7) : '—'}
          unit={unit}
          hint={
            weightChange !== null ? signed(fromKg(weightChange, unit), 1, unit) : 'Promedio 7 días'
          }
        />
        <StatTile
          label="Cintura"
          value={waistData.length > 0 ? fmt(waistData.at(-1)!.waist, 1) : '—'}
          unit="cm"
          hint={waistChange !== null ? signed(waistChange, 1, 'cm') : 'Sin cambios aún'}
        />
        <StatTile
          label="% grasa"
          value={fatData.length > 0 ? fmt(fatData.at(-1)!.bodyFat, 1) : fmt(profile.bodyFat.pct, 1)}
          unit="%"
          hint={fatChange !== null ? signed(fatChange, 1, 'puntos') : 'Estimado'}
        />
      </div>

      <Section title="Peso">
        <div className="rounded-2xl border bg-card p-4">
          {weightData.length >= 2 ? (
            <TrendChart
              ariaLabel={`Peso: promedio de 7 días de ${w(weightData[0]!.avg7)} a ${w(weightData.at(-1)!.avg7)} ${unit}.`}
              data={weightData.map((p) => ({
                date: p.date,
                avg7: fromKg(p.avg7, unit),
                weight: fromKg(p.weight, unit),
              }))}
              series={[
                { key: 'avg7', label: 'Promedio 7 días', color: 'var(--chart-1)', area: true },
                { key: 'weight', label: 'Pesaje diario', color: 'var(--chart-2)', dotsOnly: true },
              ]}
              formatValue={(v) => `${fmt(v, 1)} ${unit}`}
            />
          ) : (
            <NotEnough>Pésate al menos 2 días (en ayunas) para ver tu tendencia.</NotEnough>
          )}
          <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
            <Link to="/progreso/registro">
              <Plus /> Registrar peso o medidas
            </Link>
          </Button>
        </div>
      </Section>

      <Section title="Cintura">
        <div className="rounded-2xl border bg-card p-4">
          {waistData.length >= 2 ? (
            <TrendChart
              ariaLabel={`Cintura de ${fmt(waistData[0]!.waist, 1)} a ${fmt(waistData.at(-1)!.waist, 1)} cm.`}
              data={waistData}
              series={[{ key: 'waist', label: 'Cintura', color: 'var(--chart-1)', dots: true }]}
              formatValue={(v) => `${fmt(v, 1)} cm`}
            />
          ) : (
            <NotEnough>
              Mide tu cintura una vez por semana (a la altura del ombligo, sin apretar).
            </NotEnough>
          )}
        </div>
      </Section>

      {fatData.length >= 2 && (
        <Section title="% de grasa estimado">
          <div className="rounded-2xl border bg-card p-4">
            <TrendChart
              ariaLabel={`Porcentaje de grasa de ${fmt(fatData[0]!.bodyFat, 1)} a ${fmt(fatData.at(-1)!.bodyFat, 1)} %.`}
              data={fatData}
              series={[{ key: 'bodyFat', label: '% grasa', color: 'var(--chart-1)', dots: true }]}
              formatValue={(v) => `${fmt(v, 1)} %`}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Con US Navy (cuello y cintura) o el valor medido que registres. Mira la tendencia, no
              un día suelto.
            </p>
          </div>
        </Section>
      )}

      <Section title="Fuerza (1RM estimado)">
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          {lifts.length === 0 || !selectedLift ? (
            <NotEnough>
              Registra tus básicos en Entreno para ver cómo evoluciona tu fuerza.
            </NotEnough>
          ) : (
            <>
              <div
                className="-mx-1 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-1 pb-1"
                role="group"
                aria-label="Básico"
              >
                {lifts.map((l) => {
                  const trend = strengthTrend(strength[l] ?? [])
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={l === selectedLift}
                      onClick={() => setLift(l)}
                      className={cn(
                        'h-9 shrink-0 rounded-full border px-3 text-sm font-medium',
                        l === selectedLift
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-card hover:bg-accent',
                      )}
                    >
                      {MAIN_LIFT_LABEL[l]}
                      {trend.changePct !== null && (
                        <span className="tabular ml-1 opacity-80">
                          {trend.changePct > 0 ? '↑' : trend.changePct < 0 ? '↓' : '→'}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {liftPoints.length >= 2 ? (
                <TrendChart
                  ariaLabel={`1RM estimado de ${MAIN_LIFT_LABEL[selectedLift]}: de ${w(liftPoints[0]!.e1rm)} a ${w(liftPoints.at(-1)!.e1rm)} ${unit}.`}
                  data={liftPoints.map((p) => ({
                    date: p.date,
                    e1rm: fromKg(p.e1rm, unit),
                    average: fromKg(p.average, unit),
                  }))}
                  series={[
                    { key: 'average', label: 'Media de 3 sesiones', color: 'var(--chart-1)' },
                    { key: 'e1rm', label: 'Por sesión', color: 'var(--chart-2)', dotsOnly: true },
                  ]}
                  formatValue={(v) => `${fmt(v, 1)} ${unit}`}
                />
              ) : (
                <NotEnough>
                  Hacen falta 2 sesiones en este período para dibujar la tendencia.
                </NotEnough>
              )}
            </>
          )}
        </div>
      </Section>

      <Section title="Volumen de entrenamiento">
        <div className="space-y-4 rounded-2xl border bg-card p-4">
          {setCounts.some((s) => s.sets > 0) ? (
            <WeeklyBars
              ariaLabel="Series de trabajo por semana"
              label="series"
              color="var(--chart-1)"
              data={setCounts.map((s) => ({ weekStart: s.weekStart, value: s.sets }))}
              formatValue={(v) => fmt(v)}
            />
          ) : (
            <NotEnough>Aún no hay entrenos registrados en este período.</NotEnough>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold">Esta semana por músculo</p>
            <ul className="space-y-2">
              {TRACKED_MUSCLES.map((m) => {
                const value = thisWeek[m]
                const target = muscleTargets[m]
                return (
                  <li
                    key={m}
                    className="grid grid-cols-[6.25rem_1fr_auto] items-center gap-2 text-sm"
                  >
                    <span className="truncate">{MUSCLE_LABEL[m]}</span>
                    <span className="relative h-2 rounded-full bg-muted" aria-hidden>
                      <span
                        className="absolute inset-y-0 rounded-full bg-success/25"
                        style={{
                          left: `${(target.min / scale) * 100}%`,
                          width: `${((target.max - target.min) / scale) * 100}%`,
                        }}
                      />
                      <span
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full',
                          value >= target.min ? 'bg-success' : 'bg-primary',
                        )}
                        style={{ width: `${(value / scale) * 100}%` }}
                      />
                    </span>
                    <span className="tabular text-xs whitespace-nowrap">
                      <strong>{String(value).replace('.', ',')}</strong>
                      <span className="text-muted-foreground">
                        {' '}
                        / {target.min}–{target.max}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Adherencia nutricional">
        <div className="rounded-2xl border bg-card p-4">
          {adherence.some((a) => a.logged > 0) ? (
            <WeeklyBars
              ariaLabel="Porcentaje de días que cumpliste calorías y proteína, por semana"
              label="de los días"
              color="var(--chart-2)"
              domainMax={100}
              reference={{ y: 80, label: 'Meta 80 %' }}
              data={adherence.map((a) => ({
                weekStart: a.weekStart,
                value: a.pct,
                detail: `${a.logged} de ${a.days} días registrados`,
              }))}
              formatValue={(v) => `${fmt(v)} %`}
            />
          ) : (
            <NotEnough>Registra tus comidas para ver qué tan seguido cumples el plan.</NotEnough>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Un día cumple con kcal dentro de ±10 % y al menos 90 % de la proteína.
          </p>
        </div>
      </Section>

      {(weights.data ?? []).length === 0 && (
        <EmptyState
          icon={LineChartIcon}
          title="Empieza a medir"
          description="Pésate por la mañana 3–7 veces por semana y mide tu cintura cada semana."
          action={
            <Button asChild>
              <Link to="/progreso/registro">Registrar ahora</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
