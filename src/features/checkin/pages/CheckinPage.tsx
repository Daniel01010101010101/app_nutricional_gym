import {
  ArrowRight,
  CalendarClock,
  Check,
  ClipboardCheck,
  Dumbbell,
  Loader2,
  Ruler,
  Scale,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Utensils,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { ExplanationBody } from '@/components/common/WhyButton'
import { Field } from '@/components/form/Field'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Recommendation, RecommendationType } from '@/domain/checkin/algorithm'
import { fmt } from '@/domain/shared/format'
import { fromKg } from '@/domain/shared/units'
import type { Checkin } from '@/data/schemas'
import { RatingChips } from '@/features/training/components/RatingChips'
import { useTrainingData } from '@/features/training/hooks/useTrainingData'
import { useLive } from '@/hooks/useLive'
import { capitalize, formatDay, formatShortDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  applyCheckin,
  checkinStats,
  createCheckin,
  ignoreCheckin,
  previewCheckin,
  targetsAt,
  type CheckinStats,
} from '@/services/checkin'

const TONE: Record<RecommendationType, 'good' | 'change' | 'warn' | 'info'> = {
  'safety-maintenance': 'warn',
  'low-adherence': 'info',
  'protect-strength': 'change',
  'insufficient-data': 'info',
  'increase-kcal': 'change',
  'recomp-success': 'good',
  'decrease-kcal': 'change',
  'bmr-floor': 'info',
  keep: 'good',
}

const DECISION_LABEL: Record<Checkin['decision'], string> = {
  pending: 'Pendiente',
  applied: 'Aplicado',
  ignored: 'Ignorado',
}

function signedPct(value: number | null): string {
  if (value === null) return '—'
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmt(Math.abs(value), 2)} %`
}

function StatRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Scale
  label: string
  value: string
  hint?: string
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Icon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      <span className="flex-1">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span className="tabular font-semibold">{value}</span>
    </li>
  )
}

function ResultCard({
  checkin,
  preview,
  busy,
  onApply,
  onIgnore,
}: {
  checkin: Checkin
  preview: { label: string; from: string; to: string }[]
  busy: boolean
  onApply: () => void
  onIgnore: () => void
}) {
  const rec = checkin.recommendation as Recommendation
  const tone = TONE[rec.type]
  const pending = checkin.decision === 'pending'
  return (
    <section
      className={cn(
        'space-y-4 rounded-2xl border p-4',
        tone === 'good' && 'border-success/40 bg-success/10',
        tone === 'change' && 'border-primary/50 bg-primary/10',
        tone === 'warn' && 'border-warning/50 bg-warning/10',
        tone === 'info' && 'bg-card',
      )}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background/60">
          {tone === 'good' ? (
            <TrendingUp aria-hidden className="size-5 text-success" />
          ) : tone === 'warn' ? (
            <ShieldAlert aria-hidden className="size-5 text-warning" />
          ) : tone === 'change' ? (
            <TrendingDown aria-hidden className="size-5 text-primary" />
          ) : (
            <ClipboardCheck aria-hidden className="size-5 text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl leading-tight font-bold">
            {checkin.explanation.title}
          </h2>
          {!pending && <Badge variant="secondary">{DECISION_LABEL[checkin.decision]}</Badge>}
        </div>
      </div>
      <p className="text-sm">{checkin.explanation.summary}</p>
      <ExplanationBody explanation={checkin.explanation} />
      {rec.actionable && preview.length > 0 && (
        <ul className="divide-y rounded-xl border bg-background/60">
          {preview.map((p) => (
            <li key={p.label} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1">{p.label}</span>
              <span className="tabular text-muted-foreground">{p.from}</span>
              <ArrowRight aria-hidden className="size-3.5" />
              <span className="tabular font-semibold">{p.to}</span>
            </li>
          ))}
        </ul>
      )}
      {rec.notes.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {rec.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden className="text-primary">
                •
              </span>
              {n}
            </li>
          ))}
        </ul>
      )}
      {pending && (
        <div className="flex gap-2">
          {rec.actionable && (
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={onIgnore}>
              <X /> Ignorar
            </Button>
          )}
          <Button className="flex-1" disabled={busy} onClick={onApply}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />}{' '}
            {rec.actionable ? 'Aplicar cambios' : 'Entendido'}
          </Button>
        </div>
      )}
    </section>
  )
}

export function CheckinPage() {
  const data = useTrainingData()
  const { repos, today, profile, settings, plan, exercises } = data
  const checkins = useLive(() => repos.checkins.observeList(), [])
  const targetsList = useLive(() => repos.targets.observeList(), [])
  const [stats, setStats] = useState<CheckinStats | null | undefined>(undefined)
  const [wellbeing, setWellbeing] = useState({ sleep: 3, stress: 3, hunger: 3, energy: 3 })
  const [busy, setBusy] = useState(false)

  const ready = !data.loading && Boolean(profile && settings)
  useEffect(() => {
    if (!ready || !profile || !settings) return
    let cancelled = false
    void checkinStats(repos, { profile, settings, plan, exercises, today }).then((result) => {
      if (!cancelled) setStats(result)
    })
    return () => {
      cancelled = true
    }
  }, [ready, repos, profile, settings, plan, exercises, today])

  if (!ready || !profile || !settings || stats === undefined || checkins.loading) {
    return (
      <>
        <PageHeader title="Check-in semanal" back="/progreso" />
        <div className="space-y-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </>
    )
  }

  if (stats === null) {
    return (
      <>
        <PageHeader title="Check-in semanal" back="/progreso" />
        <p className="text-sm text-muted-foreground">Completa tu perfil para hacer el check-in.</p>
      </>
    )
  }

  const unit = settings.unit
  const history = [...(checkins.data ?? [])].sort((a, b) => b.weekStart.localeCompare(a.weekStart))
  const current = history.find((c) => c.weekStart === stats.period.weekStart)
  const targets = targetsAt(targetsList.data ?? [], today)
  const rec = current ? (current.recommendation as Recommendation) : null
  const preview =
    current && rec?.actionable && targets
      ? (() => {
          const next = previewCheckin(
            stats.input.targets,
            rec,
            stats.avgWeightKg ?? profile.weightKg,
          )
          const rows = [
            { label: 'Calorías', from: `${fmt(targets.kcal)} kcal`, to: `${fmt(next.kcal)} kcal` },
            { label: 'Carbohidratos', from: `${targets.carbs} g`, to: `${next.carbs} g` },
            { label: 'Grasa', from: `${targets.fat} g`, to: `${next.fat} g` },
            { label: 'Proteína', from: `${targets.protein} g`, to: `${next.protein} g` },
          ]
          if (next.trainingDayBonusCarbs !== targets.trainingDayBonusCarbs)
            rows.push({
              label: 'Carbos extra en días de entreno',
              from: `${targets.trainingDayBonusCarbs} g`,
              to: `${next.trainingDayBonusCarbs} g`,
            })
          return rows.filter((r) => r.from !== r.to || r.label === 'Proteína')
        })()
      : []

  const periodLabel = `${capitalize(formatDay(stats.period.weekStart, "d 'de' MMM"))} – ${formatDay(stats.period.weekEnd, "d 'de' MMM")}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-in semanal"
        back="/progreso"
        subtitle={`Semana del ${periodLabel}`}
      />

      {(stats.ready || current) && (
        <Section title="Tu semana">
          <ul className="divide-y rounded-2xl border bg-card">
            <StatRow
              icon={Scale}
              label="Peso promedio"
              hint={
                stats.weighIns < 2
                  ? `Solo ${stats.weighIns} pesaje(s): pésate 4+ días`
                  : `${stats.weighIns} pesajes`
              }
              value={
                stats.avgWeightKg !== null
                  ? `${fmt(fromKg(stats.avgWeightKg, unit), 1)} ${unit}`
                  : '—'
              }
            />
            <StatRow
              icon={TrendingDown}
              label="Cambio vs. semana anterior"
              hint={
                stats.previousWeeklyChangePct !== null
                  ? `Semana anterior: ${signedPct(stats.previousWeeklyChangePct)}`
                  : undefined
              }
              value={signedPct(stats.weeklyChangePct)}
            />
            <StatRow
              icon={Ruler}
              label="Cintura"
              hint={
                stats.waistChangeCm !== null
                  ? `${stats.waistChangeCm > 0 ? '+' : ''}${fmt(stats.waistChangeCm, 1)} cm`
                  : 'Mídela una vez por semana'
              }
              value={stats.waistCm !== null ? `${fmt(stats.waistCm, 1)} cm` : '—'}
            />
            <StatRow
              icon={Utensils}
              label="Adherencia nutricional"
              hint={`${stats.loggedDays} de ${stats.trackedDays} días registrados`}
              value={`${fmt(stats.nutritionAdherencePct)} %`}
            />
            <StatRow
              icon={Dumbbell}
              label="Entrenos"
              hint={`${stats.sessionsDone} de ${stats.sessionsPlanned} planificados`}
              value={`${fmt(stats.trainingAdherencePct)} %`}
            />
          </ul>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/progreso/registro">
              <Ruler /> Registrar peso o cintura antes de continuar
            </Link>
          </Button>
        </Section>
      )}

      {current ? (
        <ResultCard
          checkin={current}
          preview={preview}
          busy={busy}
          onIgnore={async () => {
            setBusy(true)
            try {
              await ignoreCheckin(repos, current)
              toast('Recomendación ignorada. Tus objetivos no cambian.')
            } finally {
              setBusy(false)
            }
          }}
          onApply={async () => {
            setBusy(true)
            try {
              const created = await applyCheckin(repos, {
                checkin: current,
                profile,
                today,
                weightKg: stats.avgWeightKg ?? profile.weightKg,
              })
              toast.success(
                created
                  ? `Nuevos objetivos desde hoy: ${fmt(created.kcal)} kcal.`
                  : 'Listo. Seguimos con el plan.',
              )
            } finally {
              setBusy(false)
            }
          }}
        />
      ) : !stats.ready ? (
        <section className="space-y-2 rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-2 font-semibold">
            <CalendarClock aria-hidden className="size-5 text-primary" /> Tu primer check-in:{' '}
            {formatDay(stats.firstCheckinOn)}
          </p>
          <p className="text-sm text-muted-foreground">
            Necesitamos al menos 4 días de datos. Mientras tanto: pésate en ayunas cada mañana,
            registra tus comidas y mide tu cintura el día anterior al check-in.
          </p>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/progreso/registro">
              <Ruler /> Registrar peso o cintura
            </Link>
          </Button>
        </section>
      ) : (
        <Section title="¿Cómo te fue?">
          <div className="space-y-5 rounded-2xl border bg-card p-4">
            <Field label="Sueño">
              <RatingChips
                aria-label="Sueño"
                value={wellbeing.sleep}
                onChange={(v) => setWellbeing({ ...wellbeing, sleep: v })}
                labels={['Muy mal', 'Muy bien']}
              />
            </Field>
            <Field label="Estrés">
              <RatingChips
                aria-label="Estrés"
                value={wellbeing.stress}
                onChange={(v) => setWellbeing({ ...wellbeing, stress: v })}
                labels={['Muy bajo', 'Muy alto']}
              />
            </Field>
            <Field label="Hambre">
              <RatingChips
                aria-label="Hambre"
                value={wellbeing.hunger}
                onChange={(v) => setWellbeing({ ...wellbeing, hunger: v })}
                labels={['Nada', 'Mucha']}
              />
            </Field>
            <Field label="Energía">
              <RatingChips
                aria-label="Energía"
                value={wellbeing.energy}
                onChange={(v) => setWellbeing({ ...wellbeing, energy: v })}
                labels={['Muy baja', 'Muy alta']}
              />
            </Field>
            <Button
              size="lg"
              className="w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await createCheckin(repos, stats, wellbeing, today)
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? <Loader2 className="animate-spin" /> : <ClipboardCheck />} Ver mi
              recomendación
            </Button>
          </div>
        </Section>
      )}

      {history.filter((c) => c.id !== current?.id).length > 0 && (
        <Section title="Historial">
          <ul className="divide-y rounded-2xl border bg-card">
            {history
              .filter((c) => c.id !== current?.id)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.explanation.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      Semana del {formatShortDay(c.weekStart)} · {signedPct(c.weeklyChangePct)} ·
                      adherencia {fmt(c.nutritionAdherencePct)} %
                    </span>
                  </span>
                  <Badge variant={c.decision === 'applied' ? 'default' : 'secondary'}>
                    {DECISION_LABEL[c.decision]}
                  </Badge>
                </li>
              ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
