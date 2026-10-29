import {
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  History,
  PencilLine,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import { Disclaimer } from '@/components/common/Disclaimer'
import { StatTile } from '@/components/common/StatTile'
import { WhyButton } from '@/components/common/WhyButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { trendWeight } from '@/domain/body/weightTrend'
import { fmt } from '@/domain/shared/format'
import { WEEKDAY_SHORT } from '@/domain/training/days'
import type { NutritionTargets } from '@/data/schemas'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { useToday } from '@/hooks/useToday'
import { capitalize, formatDay, formatWeight } from '@/lib/format'
import { EXPERIENCE_LABEL } from '@/lib/labels'
import { profileAge } from '@/services/profile'

const SOURCE_LABEL: Record<NutritionTargets['source'], string> = {
  onboarding: 'Plan inicial',
  recalculation: 'Recalculado',
  checkin: 'Ajuste del check-in',
  manual: 'Ajuste manual',
}

function LinkRow({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string
  icon: LucideIcon
  label: string
  hint?: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-secondary">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
    </Link>
  )
}

export function ProfilePage() {
  const repos = useRepositories()
  const today = useToday()
  const profile = useLive(() => repos.profile.observe(), [])
  const targets = useLive(() => repos.targets.observeFor(today), [today])
  const history = useLive(() => repos.targets.observeList(), [])
  const plan = useLive(() => repos.plans.observeActive(), [])
  const settings = useLive(() => repos.settings.observe(), [])
  const weights = useLive(() => repos.body.observeWeights(), [])

  if (!profile.data || !settings.data || targets.loading) {
    return (
      <>
        <PageHeader title="Perfil" />
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </>
    )
  }

  const p = profile.data
  const unit = settings.data.unit
  const weight = trendWeight(weights.data ?? [], today) ?? p.weightKg
  const t = targets.data
  const why = (key: string) => t?.explanations[key]

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.name}
        subtitle={`${profileAge(p, today)} años · ${fmt(p.heightCm)} cm · ${formatWeight(weight, unit)} · ${EXPERIENCE_LABEL[p.experience]}`}
        actions={
          <Button asChild variant="ghost" size="icon" aria-label="Ajustes">
            <Link to="/perfil/ajustes">
              <Settings />
            </Link>
          </Button>
        }
      />

      {t ? (
        <Section
          title="Tu plan nutricional"
          action={
            <span className="text-xs text-muted-foreground">
              {SOURCE_LABEL[t.source]} · desde {formatDay(t.effectiveFrom, "d 'de' MMM")}
            </span>
          }
        >
          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <div className="flex items-end justify-between">
              <p className="font-display text-5xl leading-none font-bold text-kcal">
                {fmt(t.kcal)}{' '}
                <span className="font-sans text-base font-medium text-muted-foreground">
                  kcal/día
                </span>
              </p>
              {why('kcal') && <WhyButton explanation={why('kcal')!} />}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatTile
                label="Proteína"
                value={t.protein}
                unit="g"
                accent="protein"
                {...(why('protein') ? { why: why('protein')! } : {})}
              />
              <StatTile
                label="Carbos"
                value={t.carbs}
                unit="g"
                accent="carbs"
                {...(why('carbs') ? { why: why('carbs')! } : {})}
              />
              <StatTile
                label="Grasa"
                value={t.fat}
                unit="g"
                accent="fat"
                {...(why('fat') ? { why: why('fat')! } : {})}
              />
            </div>
            {t.carbCycle && (
              <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3 text-sm">
                <p>
                  Entreno <strong>{fmt(t.carbCycle.trainingDay.kcal)} kcal</strong> · Descanso{' '}
                  <strong>{fmt(t.carbCycle.restDay.kcal)} kcal</strong>
                </p>
                {why('carbCycle') && <WhyButton explanation={why('carbCycle')!} compact />}
              </div>
            )}
            {t.trainingDayBonusCarbs > 0 && (
              <p className="rounded-xl bg-primary/10 p-3 text-sm">
                +{t.trainingDayBonusCarbs} g de carbos los días de entreno para proteger tu fuerza.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              <StatTile
                label="TMB"
                value={fmt(t.bmr)}
                {...(why('bmr') ? { why: why('bmr')! } : {})}
              />
              <StatTile
                label="Gasto"
                value={fmt(t.tdee)}
                {...(why('tdee') ? { why: why('tdee')! } : {})}
              />
              <StatTile
                label="Fibra"
                value={t.fiber}
                unit="g"
                {...(why('fiber') ? { why: why('fiber')! } : {})}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                label="Agua"
                value={fmt(t.waterMl / 1000, 1)}
                unit="L"
                accent="water"
                hint={`${fmt(t.waterTrainingMl / 1000, 1)} L los días de entreno`}
                {...(why('water') ? { why: why('water')! } : {})}
              />
              <StatTile
                label="% de grasa"
                value={fmt(p.bodyFat.pct, 1)}
                unit="%"
                hint={p.bodyFat.method === 'navy' ? 'Estimado (US Navy)' : 'Medido'}
              />
            </div>
          </div>
        </Section>
      ) : null}

      {plan.data && (
        <Section title="Tu entrenamiento">
          <Link
            to="/entreno/plan"
            className="block space-y-2 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <p className="flex items-center gap-2 font-semibold">
              <Dumbbell aria-hidden className="size-5 text-primary" /> {plan.data.splitName}
            </p>
            <p className="text-sm text-muted-foreground">
              {plan.data.days
                .map((d) => `${d.weekday ? WEEKDAY_SHORT[d.weekday] : '—'} ${d.name}`)
                .join(' · ')}
            </p>
          </Link>
        </Section>
      )}

      <Section title="Opciones">
        <div className="space-y-2">
          <LinkRow
            to="/perfil/editar"
            icon={PencilLine}
            label="Editar mis datos y recalcular"
            hint="Cambia tu peso, actividad, días o preferencias."
          />
          <LinkRow
            to="/checkin"
            icon={ClipboardCheck}
            label="Check-in semanal"
            hint="Revisa tu semana y ajusta el plan."
          />
          <LinkRow
            to="/perfil/ajustes"
            icon={Settings}
            label="Ajustes"
            hint="Unidades, discos, tema, respaldo y datos."
          />
        </div>
      </Section>

      {history.data && history.data.length > 1 && (
        <Section title="Historial de objetivos">
          <ol className="divide-y rounded-2xl border bg-card">
            {[...history.data].reverse().map((h) => (
              <li key={h.id} className="flex items-center gap-3 p-3 text-sm">
                <History aria-hidden className="size-4 text-muted-foreground" />
                <span className="flex-1">
                  <span className="font-medium">
                    {capitalize(formatDay(h.effectiveFrom, "d 'de' MMM yyyy"))}
                  </span>
                  <span className="text-muted-foreground"> · {SOURCE_LABEL[h.source]}</span>
                </span>
                <span className="tabular font-semibold">{fmt(h.kcal)} kcal</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Disclaimer />
    </div>
  )
}
