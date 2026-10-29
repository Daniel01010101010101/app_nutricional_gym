import { ChevronRight, Plus, Search, ShieldAlert, Star } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Field } from '@/components/form/Field'
import { Segmented } from '@/components/form/ChipGroup'
import { NativeSelect } from '@/components/form/NativeSelect'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { normalizeText } from '@/domain/shared/text'
import { isExerciseAvailable } from '@/domain/training/selection'
import { MUSCLE_LABEL } from '@/domain/training/volume'
import {
  TRACKED_MUSCLES,
  type ExerciseKind,
  type LoadType,
  type MovementPattern,
  type Muscle,
} from '@/domain/types'
import { EQUIPMENT_LABEL, LOAD_TYPE_LABEL, PATTERN_LABEL } from '@/lib/labels'
import { useRepositories } from '@/hooks/useRepositories'
import { cn } from '@/lib/utils'
import { buildCustomExercise } from '@/services/exercises'

import { useTrainingData } from '../hooks/useTrainingData'

const ALL_MUSCLES = Object.keys(MUSCLE_LABEL) as Muscle[]

function CustomExerciseForm({ onSaved }: { onSaved: (name: string) => void }) {
  const repos = useRepositories()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<Muscle>('chest')
  const [pattern, setPattern] = useState<MovementPattern>('horizontal-push')
  const [loadType, setLoadType] = useState<LoadType>('dumbbell')
  const [kind, setKind] = useState<ExerciseKind>('compound')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <>
      <div className="space-y-4 overflow-y-auto px-4">
        <Field label="Nombre" htmlFor="custom-name">
          <Input
            id="custom-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Ej.: Press en máquina convergente"
            className="h-12 rounded-xl"
          />
        </Field>
        <Field label="Músculo principal" htmlFor="custom-muscle">
          <NativeSelect
            id="custom-muscle"
            value={muscle}
            onChange={setMuscle}
            options={ALL_MUSCLES.map((m) => ({ value: m, label: MUSCLE_LABEL[m] }))}
          />
        </Field>
        <Field
          label="Patrón de movimiento"
          htmlFor="custom-pattern"
          description="Sirve para sugerirlo como alternativa."
        >
          <NativeSelect
            id="custom-pattern"
            value={pattern}
            onChange={setPattern}
            options={(Object.keys(PATTERN_LABEL) as MovementPattern[]).map((p) => ({
              value: p,
              label: PATTERN_LABEL[p],
            }))}
          />
        </Field>
        <Field
          label="¿Cómo se carga?"
          htmlFor="custom-load"
          description="Define cómo se redondean los pesos sugeridos."
        >
          <NativeSelect
            id="custom-load"
            value={loadType}
            onChange={setLoadType}
            options={(Object.keys(LOAD_TYPE_LABEL) as LoadType[]).map((l) => ({
              value: l,
              label: LOAD_TYPE_LABEL[l],
            }))}
          />
        </Field>
        <Field label="Tipo">
          <Segmented
            aria-label="Tipo de ejercicio"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'compound', label: 'Multiarticular' },
              { value: 'isolation', label: 'Aislamiento' },
            ]}
          />
        </Field>
        <Field label="Notas de técnica" htmlFor="custom-notes">
          <Textarea
            id="custom-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            className="rounded-xl"
          />
        </Field>
      </div>
      <DrawerFooter>
        <Button
          size="lg"
          disabled={name.trim().length < 3 || saving}
          onClick={async () => {
            setSaving(true)
            try {
              const exercise = buildCustomExercise({
                name,
                primaryMuscle: muscle,
                pattern,
                loadType,
                kind,
                notes,
              })
              await repos.exercises.saveCustom(exercise)
              onSaved(exercise.name)
            } catch {
              toast.error('No se pudo guardar el ejercicio.')
            } finally {
              setSaving(false)
            }
          }}
        >
          Guardar ejercicio
        </Button>
      </DrawerFooter>
    </>
  )
}

export function ExerciseLibraryPage() {
  const data = useTrainingData()
  const { profile } = data
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all')
  const [onlyMine, setOnlyMine] = useState(true)
  const [creating, setCreating] = useState(false)
  const deferred = useDeferredValue(query)

  if (data.loading || !profile) {
    return (
      <>
        <PageHeader title="Ejercicios" back="/entreno" />
        <Skeleton className="h-96 rounded-2xl" />
      </>
    )
  }

  // El filtro de equipo no oculta los que cargan una lesión: se muestran con aviso.
  const ctx = { equipment: profile.equipment, injuries: [], excludedIds: [] }
  const terms = normalizeText(deferred).split(' ').filter(Boolean)
  const list = data.exercises
    .filter((e) => muscle === 'all' || e.primaryMuscle === muscle)
    .filter((e) => !onlyMine || isExerciseAvailable(e, ctx))
    .filter((e) => {
      if (terms.length === 0) return true
      const hay = normalizeText(
        `${e.name} ${e.nameEn} ${e.aliases.join(' ')} ${MUSCLE_LABEL[e.primaryMuscle]}`,
      )
      return terms.every((t) => hay.includes(t))
    })
    .sort(
      (a, b) =>
        Number(Boolean(b.mainLift)) - Number(Boolean(a.mainLift)) ||
        a.name.localeCompare(b.name, 'es'),
    )

  const muscles: (Muscle | 'all')[] = ['all', ...TRACKED_MUSCLES, 'forearms', 'traps']

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ejercicios"
        back="/entreno"
        subtitle={`${data.exercises.length} ejercicios con técnica y errores comunes`}
        actions={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Crear ejercicio"
            onClick={() => setCreating(true)}
          >
            <Plus />
          </Button>
        }
      />

      <label className="flex h-12 items-center gap-2 rounded-xl border border-input bg-card px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <Search aria-hidden className="size-5 text-muted-foreground" />
        <span className="sr-only">Buscar ejercicio</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar: press, sentadilla, remo…"
          className="h-full flex-1 bg-transparent text-base outline-none"
        />
      </label>

      <div
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label="Filtrar por músculo"
      >
        {muscles.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={muscle === m}
            onClick={() => setMuscle(m)}
            className={cn(
              'h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors',
              muscle === m
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card hover:bg-accent',
            )}
          >
            {m === 'all' ? 'Todos' : MUSCLE_LABEL[m]}
          </button>
        ))}
      </div>

      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Solo los que puedo hacer con mi equipo</span>
        <Switch checked={onlyMine} onCheckedChange={setOnlyMine} />
      </label>

      {list.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="Prueba con otro nombre o crea tu propio ejercicio."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Crear ejercicio
            </Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {list.map((e) => {
            const risky = e.stresses.some((j) => profile.injuries.includes(j))
            return (
              <li key={e.id}>
                <Link
                  to={`/entreno/ejercicios/${e.id}`}
                  className="flex items-center gap-3 p-3.5 hover:bg-accent/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{e.name}</span>
                      {e.mainLift && (
                        <Star
                          aria-label="Básico"
                          className="size-3.5 shrink-0 fill-current text-primary"
                        />
                      )}
                      {e.isCustom && <Badge variant="secondary">Tuyo</Badge>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {MUSCLE_LABEL[e.primaryMuscle]} ·{' '}
                      {e.equipment.map((q) => EQUIPMENT_LABEL[q]).join(', ')}
                    </span>
                  </span>
                  {risky && (
                    <span className="flex items-center gap-1 text-xs font-medium text-warning">
                      <ShieldAlert aria-hidden className="size-4" /> Cuidado
                    </span>
                  )}
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <p className="pb-4 text-center text-xs text-muted-foreground">
        <Star aria-hidden className="inline size-3 fill-current text-primary" /> Básicos que sigue
        el motor de progresión. "Cuidado" marca los que cargan una articulación que reportaste
        lesionada.
      </p>

      <Drawer open={creating} onOpenChange={setCreating}>
        <DrawerContent className="mx-auto max-h-[92vh] max-w-lg">
          <DrawerHeader className="text-left">
            <DrawerTitle>Crear ejercicio</DrawerTitle>
            <DrawerDescription>
              Para máquinas o variantes que no estén en la biblioteca.
            </DrawerDescription>
          </DrawerHeader>
          {creating && (
            <CustomExerciseForm
              onSaved={(name) => {
                toast.success(`${name} agregado a tu biblioteca.`)
                setCreating(false)
              }}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}
