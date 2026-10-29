import { Check, Ruler, Scale, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Field } from '@/components/form/Field'
import { NumberField } from '@/components/form/NumberField'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { fmt } from '@/domain/shared/format'
import { fromKg, toKg } from '@/domain/shared/units'
import type { DayKey, WeightUnit } from '@/domain/types'
import { newId, nowIso } from '@/data/defaults'
import type { Measurement, Profile } from '@/data/schemas'
import { measurementSchema } from '@/data/schemas'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { useToday } from '@/hooks/useToday'
import { formatShortDay, relativeDayLabel } from '@/lib/format'
import { bodyFatOf } from '@/services/checkin'

const FIELDS = [
  { key: 'waistCm', label: 'Cintura', help: 'A la altura del ombligo, relajado.' },
  { key: 'neckCm', label: 'Cuello', help: 'Justo debajo de la nuez.' },
  { key: 'hipCm', label: 'Cadera', help: 'En la parte más ancha de los glúteos.' },
  { key: 'chestCm', label: 'Pecho', help: 'A la altura de los pezones.' },
  { key: 'armCm', label: 'Brazo', help: 'Bíceps contraído, en la parte más ancha.' },
  { key: 'thighCm', label: 'Muslo', help: 'En la parte más ancha.' },
] as const

type FieldKey = (typeof FIELDS)[number]['key']

function WeightForm({
  today,
  unit,
  lastKg,
}: {
  today: DayKey
  unit: WeightUnit
  lastKg: number | undefined
}) {
  const repos = useRepositories()
  const [date, setDate] = useState(today)
  const [value, setValue] = useState<number | undefined>(
    lastKg !== undefined ? Math.round(fromKg(lastKg, unit) * 10) / 10 : undefined,
  )
  const kg = value !== undefined ? toKg(value, unit) : undefined
  const valid = kg !== undefined && kg >= 30 && kg <= 350 && date <= today

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <Field label="Peso" htmlFor="weight-value" description="En ayunas, después del baño.">
          <NumberField
            id="weight-value"
            value={value}
            onChange={setValue}
            unit={unit}
            decimals={2}
            step={0.1}
            steppers
            size="lg"
          />
        </Field>
      </div>
      <Field label="Fecha" htmlFor="weight-date">
        <Input
          id="weight-date"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value || today)}
          className="h-12 rounded-xl"
        />
      </Field>
      <Button
        size="lg"
        className="w-full"
        disabled={!valid}
        onClick={async () => {
          if (!valid) return
          await repos.body.upsertWeight(date, Math.round(kg * 100) / 100)
          toast.success(`Peso guardado (${relativeDayLabel(date, today).toLowerCase()}).`)
        }}
      >
        <Check /> Guardar peso
      </Button>
    </div>
  )
}

function MeasurementForm({
  today,
  profile,
  last,
}: {
  today: DayKey
  profile: Profile
  last: Measurement | undefined
}) {
  const repos = useRepositories()
  const [date, setDate] = useState(today)
  const [values, setValues] = useState<Partial<Record<FieldKey, number>>>({})
  const [bodyFat, setBodyFat] = useState<number | undefined>()
  const fields = FIELDS.filter(
    (f) => f.key !== 'hipCm' || profile.sex === 'female' || last?.hipCm !== undefined,
  )
  const draft: Measurement = {
    id: 'draft',
    date,
    createdAt: nowIso(),
    ...Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)),
    ...(bodyFat !== undefined ? { bodyFatPct: bodyFat } : {}),
  }
  const navy = bodyFat === undefined ? bodyFatOf(draft, profile) : null
  const hasAny = Object.values(values).some((v) => v !== undefined) || bodyFat !== undefined

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`m-${f.key}`}>
            <NumberField
              id={`m-${f.key}`}
              value={values[f.key]}
              onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              unit="cm"
              decimals={1}
              placeholder={last?.[f.key] !== undefined ? fmt(last[f.key] as number, 1) : undefined}
            />
          </Field>
        ))}
      </div>
      <Field
        label="% de grasa medido (opcional)"
        htmlFor="m-bodyfat"
        description="Solo si te lo midieron con DEXA, plicometría o InBody. Si no, lo estimamos con tus medidas."
      >
        <NumberField id="m-bodyfat" value={bodyFat} onChange={setBodyFat} unit="%" decimals={1} />
      </Field>
      {navy !== null && (
        <p className="rounded-xl bg-muted/60 p-3 text-sm">
          % de grasa estimado (US Navy): <strong className="tabular">{fmt(navy, 1)} %</strong>
        </p>
      )}
      <Field label="Fecha" htmlFor="m-date">
        <Input
          id="m-date"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value || today)}
          className="h-12 rounded-xl"
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        {FIELDS.filter((f) => fields.includes(f))
          .map((f) => `${f.label}: ${f.help}`)
          .join(' ')}
      </p>
      <Button
        size="lg"
        className="w-full"
        disabled={!hasAny}
        onClick={async () => {
          const parsed = measurementSchema.safeParse({ ...draft, id: newId(), createdAt: nowIso() })
          if (!parsed.success) {
            toast.error('Revisa las medidas: alguna está fuera de rango.')
            return
          }
          await repos.body.addMeasurement(parsed.data)
          setValues({})
          setBodyFat(undefined)
          toast.success('Medidas guardadas.')
        }}
      >
        <Ruler /> Guardar medidas
      </Button>
    </div>
  )
}

export function BodyLogPage() {
  const repos = useRepositories()
  const today = useToday()
  const profile = useLive(() => repos.profile.observe(), [])
  const settings = useLive(() => repos.settings.observe(), [])
  const weights = useLive(() => repos.body.observeWeights(), [])
  const measurements = useLive(() => repos.body.observeMeasurements(), [])

  if (!profile.data || !settings.data || weights.loading || measurements.loading) {
    return (
      <>
        <PageHeader title="Registro corporal" back="/progreso" />
        <Skeleton className="h-72 rounded-2xl" />
      </>
    )
  }

  const unit = settings.data.unit
  const sortedWeights = [...(weights.data ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const sortedMeasurements = [...(measurements.data ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro corporal"
        back="/progreso"
        subtitle="Peso diario y medidas semanales."
      />

      <Section title="Peso">
        <WeightForm today={today} unit={unit} lastKg={sortedWeights[0]?.weightKg} />
      </Section>

      <Section title="Medidas">
        <MeasurementForm today={today} profile={profile.data} last={sortedMeasurements[0]} />
      </Section>

      {sortedWeights.length > 0 && (
        <Section title="Últimos pesajes">
          <ul className="divide-y rounded-2xl border bg-card">
            {sortedWeights.slice(0, 14).map((w) => (
              <li key={w.date} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Scale aria-hidden className="size-4 text-muted-foreground" />
                <span className="flex-1">{relativeDayLabel(w.date, today)}</span>
                <span className="tabular font-semibold">
                  {fmt(fromKg(w.weightKg, unit), 1)} {unit}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Borrar pesaje del ${formatShortDay(w.date)}`}
                  onClick={() => void repos.body.removeWeight(w.date)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {sortedMeasurements.length > 0 && (
        <Section title="Historial de medidas">
          <ul className="divide-y rounded-2xl border bg-card">
            {sortedMeasurements.map((m) => {
              const pct = bodyFatOf(m, profile.data!)
              const parts = FIELDS.filter((f) => m[f.key] !== undefined).map(
                (f) => `${f.label} ${fmt(m[f.key] as number, 1)}`,
              )
              return (
                <li key={m.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <Ruler aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{relativeDayLabel(m.date, today)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {parts.join(' · ')}
                      {pct !== null && ` · grasa ${fmt(pct, 1)} %`}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Borrar medidas del ${formatShortDay(m.date)}`}
                    onClick={() => void repos.body.removeMeasurement(m.id)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </div>
  )
}
