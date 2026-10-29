import { Database, Download, Loader2, Moon, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Disclaimer } from '@/components/common/Disclaimer'
import { Field } from '@/components/form/Field'
import { NativeSelect } from '@/components/form/NativeSelect'
import { NumberField } from '@/components/form/NumberField'
import { Segmented } from '@/components/form/ChipGroup'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { fmt } from '@/domain/shared/format'
import { WEEKDAY_LABEL } from '@/domain/training/days'
import { barbellLoads, DEFAULT_LOADING, LB_PLATES } from '@/domain/training/loading'
import { WEEKDAYS, type Weekday, type WeightUnit } from '@/domain/types'
import type { Settings } from '@/data/schemas'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { useToday } from '@/hooks/useToday'
import { cn } from '@/lib/utils'
import { useRestTimer } from '@/stores/restTimer'
import { useShopping } from '@/stores/shopping'
import { useThemeStore, type ThemePreference } from '@/stores/theme'

import { downloadJson, restoreFromFile } from '../backupFile'

const PLATE_SETS: Record<WeightUnit, number[]> = {
  kg: [...DEFAULT_LOADING.plates.values, 0.5],
  lb: [...LB_PLATES, 1.25],
}

const REST_LABEL = {
  main: 'Básicos',
  secondary: 'Compuestos',
  accessory: 'Accesorios',
} as const

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

function LoadingSettingsCard({
  settings,
  save,
}: {
  settings: Settings
  save: (patch: Partial<Settings>) => void
}) {
  const loading = settings.loading
  const setLoading = (patch: Partial<Settings['loading']>) =>
    save({ loading: { ...loading, ...patch } })
  const loads = barbellLoads(loading).slice(0, 8)

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <Field label="Discos de tu gimnasio">
        <Segmented<WeightUnit>
          aria-label="Unidad de los discos"
          value={loading.plates.unit}
          onChange={(unit) =>
            setLoading({
              plates: {
                unit,
                values: unit === 'kg' ? [...DEFAULT_LOADING.plates.values] : [...LB_PLATES],
              },
            })
          }
          options={[
            { value: 'kg', label: 'Discos en kg' },
            { value: 'lb', label: 'Discos en libras' },
          ]}
          size="sm"
        />
        <div className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label="Discos disponibles">
          {PLATE_SETS[loading.plates.unit].map((plate) => {
            const active = loading.plates.values.includes(plate)
            return (
              <button
                key={plate}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const values = active
                    ? loading.plates.values.filter((v) => v !== plate)
                    : [...loading.plates.values, plate].sort((a, b) => b - a)
                  if (values.length === 0) return
                  setLoading({ plates: { ...loading.plates, values } })
                }}
                className={cn(
                  'tabular h-9 min-w-12 rounded-lg border px-2.5 text-sm font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-accent',
                )}
              >
                {fmt(plate, 2)}
              </button>
            )
          })}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Barra (${loading.bar.unit})`} htmlFor="bar-weight">
          <NumberField
            id="bar-weight"
            value={loading.bar.value}
            onChange={(v) =>
              v !== undefined && v > 0 && setLoading({ bar: { ...loading.bar, value: v } })
            }
            decimals={2}
            step={loading.bar.unit === 'kg' ? 5 : 10}
          />
        </Field>
        <Field label="Unidad de la barra">
          <Segmented<WeightUnit>
            aria-label="Unidad de la barra"
            value={loading.bar.unit}
            onChange={(unit) => setLoading({ bar: { unit, value: unit === 'kg' ? 20 : 45 } })}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
            className="h-12"
          />
        </Field>
        <Field label={`Mancuernas, salto (${loading.dumbbellIncrement.unit})`} htmlFor="db-inc">
          <NumberField
            id="db-inc"
            value={loading.dumbbellIncrement.value}
            onChange={(v) =>
              v !== undefined &&
              v > 0 &&
              setLoading({ dumbbellIncrement: { ...loading.dumbbellIncrement, value: v } })
            }
            decimals={2}
          />
        </Field>
        <Field label={`Máquinas, salto (${loading.machineIncrement.unit})`} htmlFor="m-inc">
          <NumberField
            id="m-inc"
            value={loading.machineIncrement.value}
            onChange={(v) =>
              v !== undefined &&
              v > 0 &&
              setLoading({ machineIncrement: { ...loading.machineIncrement, value: v } })
            }
            decimals={2}
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Cargas posibles en barra: {loads.map((l) => fmt(l, 2)).join(', ')}… kg. Los pesos sugeridos
        se redondean a lo que de verdad puedes cargar.
      </p>
    </div>
  )
}

export function SettingsPage() {
  const repos = useRepositories()
  const navigate = useNavigate()
  const today = useToday()
  const { data: settings } = useLive(() => repos.settings.observe(), [])
  const theme = useThemeStore((s) => s.preference)
  const setTheme = useThemeStore((s) => s.setPreference)
  const stopTimer = useRestTimer((s) => s.stop)
  const fileRef = useRef<HTMLInputElement>(null)
  const [includePhotos, setIncludePhotos] = useState(false)
  const [busy, setBusy] = useState<'export' | 'import' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  if (!settings) {
    return (
      <>
        <PageHeader title="Ajustes" back="/perfil" />
        <Skeleton className="h-96 rounded-2xl" />
      </>
    )
  }

  const save = (patch: Partial<Settings>) => void repos.settings.update(patch)

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" back="/perfil" />

      <Section title="Unidades">
        <div className="rounded-2xl border bg-card p-4">
          <Segmented<WeightUnit>
            aria-label="Unidad de peso"
            value={settings.unit}
            onChange={(unit) => save({ unit })}
            options={[
              { value: 'kg', label: 'Kilogramos' },
              { value: 'lb', label: 'Libras' },
            ]}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Todo se guarda en kg: puedes cambiar de unidad cuando quieras.
          </p>
        </div>
      </Section>

      <Section title="Barra, discos y mancuernas">
        <LoadingSettingsCard settings={settings} save={save} />
      </Section>

      <Section title="Temporizador de descanso">
        <div className="divide-y rounded-2xl border bg-card">
          <Row label="Iniciar solo al registrar una serie">
            <Switch
              checked={settings.autoStartTimer}
              onCheckedChange={(v) => save({ autoStartTimer: v })}
              aria-label="Iniciar temporizador automáticamente"
            />
          </Row>
          <Row label="Sonido al terminar">
            <Switch
              checked={settings.timerSound}
              onCheckedChange={(v) => save({ timerSound: v })}
              aria-label="Sonido al terminar"
            />
          </Row>
          <Row label="Vibración al terminar" hint="En iPhone el navegador no permite vibrar.">
            <Switch
              checked={settings.timerVibration}
              onCheckedChange={(v) => save({ timerVibration: v })}
              aria-label="Vibración al terminar"
            />
          </Row>
          <div className="space-y-3 px-4 py-3">
            <p className="text-sm font-medium">Descanso para ejercicios agregados fuera del plan</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(REST_LABEL) as (keyof typeof REST_LABEL)[]).map((role) => (
                <Field key={role} label={REST_LABEL[role]} htmlFor={`rest-${role}`}>
                  <NumberField
                    id={`rest-${role}`}
                    value={settings.restSeconds[role]}
                    onChange={(v) =>
                      v !== undefined &&
                      v >= 15 &&
                      v <= 600 &&
                      save({ restSeconds: { ...settings.restSeconds, [role]: Math.round(v) } })
                    }
                    unit="s"
                    decimals={0}
                  />
                </Field>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Los ejercicios del plan usan su propio descanso (edítalo en Entreno → Tu plan).
            </p>
          </div>
        </div>
      </Section>

      <Section title="Seguimiento">
        <div className="divide-y rounded-2xl border bg-card">
          <Row label="Día del check-in" hint="Revisa la semana anterior y ajusta el plan.">
            <NativeSelect<string>
              aria-label="Día del check-in"
              value={String(settings.checkinWeekday)}
              onChange={(v) => save({ checkinWeekday: Number(v) as Weekday })}
              options={WEEKDAYS.map((w) => ({ value: String(w), label: WEEKDAY_LABEL[w] }))}
              className="w-36"
            />
          </Row>
          <Row label="Semana de descarga" hint="Una cada cuántas semanas de entreno.">
            <NativeSelect<string>
              aria-label="Semanas entre descargas"
              value={String(settings.deloadEveryWeeks)}
              onChange={(v) => save({ deloadEveryWeeks: Number(v) })}
              options={[5, 6, 7, 8].map((n) => ({ value: String(n), label: `${n} semanas` }))}
              className="w-36"
            />
          </Row>
        </div>
      </Section>

      <Section title="Apariencia">
        <div className="rounded-2xl border bg-card p-4">
          <Segmented<ThemePreference>
            aria-label="Tema"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: 'Oscuro' },
              { value: 'light', label: 'Claro' },
              { value: 'system', label: 'Sistema' },
            ]}
          />
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Moon aria-hidden className="size-3.5" /> El modo oscuro gasta menos batería en
            pantallas OLED.
          </p>
        </div>
      </Section>

      <Section title="Tus datos">
        <div className="divide-y rounded-2xl border bg-card">
          <div className="space-y-3 px-4 py-3">
            <p className="flex items-start gap-2 text-sm">
              <Database aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              Todo se guarda solo en este teléfono, sin cuentas ni servidores. Haz un respaldo de
              vez en cuando.
            </p>
            <label className="flex items-center justify-between gap-3 text-sm">
              Incluir fotos en el respaldo
              <Switch checked={includePhotos} onCheckedChange={setIncludePhotos} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                disabled={busy !== null}
                onClick={async () => {
                  setBusy('export')
                  try {
                    const backup = await repos.data.exportAll({ includePhotos, theme })
                    downloadJson(backup, `forja-respaldo-${today}.json`)
                    toast.success('Respaldo descargado.')
                  } catch {
                    toast.error('No se pudo crear el respaldo.')
                  } finally {
                    setBusy(null)
                  }
                }}
              >
                {busy === 'export' ? <Loader2 className="animate-spin" /> : <Download />} Exportar
              </Button>
              <Button
                variant="secondary"
                disabled={busy !== null}
                onClick={() => fileRef.current?.click()}
              >
                {busy === 'import' ? <Loader2 className="animate-spin" /> : <Upload />} Restaurar
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                setBusy('import')
                try {
                  await restoreFromFile(repos, file)
                  toast.success('Respaldo restaurado.')
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'No se pudo restaurar el respaldo.',
                  )
                } finally {
                  setBusy(null)
                }
              }}
            />
          </div>
          <div className="px-4 py-3">
            <Button
              variant="ghost"
              className="w-full text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Borrar todos mis datos
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Acerca de">
        <div className="space-y-3 rounded-2xl border bg-card p-4 text-sm">
          <p>
            <strong>FORJA</strong> · versión {__APP_VERSION__}
          </p>
          <p className="text-xs text-muted-foreground">
            Valores nutricionales: Tabla de Composición de Alimentos Colombianos (ICBF, 2018) y USDA
            FoodData Central (SR Legacy). Fórmulas: Mifflin-St Jeor, Katch-McArdle, US Navy, Epley.
            Toca "¿Por qué?" junto a cada número para ver el cálculo y la fuente.
          </p>
          <Disclaimer />
        </div>
      </Section>

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          setConfirmDelete(open)
          if (!open) setConfirmText('')
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar todos tus datos?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminan tu perfil, planes, comidas, entrenos, medidas y fotos de este teléfono. No
              se puede deshacer. Escribe BORRAR para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            aria-label="Escribe BORRAR para confirmar"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoCapitalize="characters"
            className="h-11 rounded-xl"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText.trim().toUpperCase() !== 'BORRAR' || busy !== null}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                setBusy('delete')
                try {
                  await repos.data.clearAll()
                  stopTimer()
                  useShopping.setState({ checked: {} })
                  toast('Datos borrados.')
                  void navigate('/onboarding', { replace: true })
                } finally {
                  setBusy(null)
                }
              }}
            >
              Borrar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
