import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  LineChart,
  Loader2,
  Salad,
  Upload,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Disclaimer } from '@/components/common/Disclaimer'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { useToday } from '@/hooks/useToday'
import { restoreFromFile } from '@/features/settings/backupFile'

import type { Profile } from '@/data/schemas'

import { completeOnboarding, saveProfileEdit } from '../complete'
import {
  defaultOnboardingValues,
  onboardingSchema,
  STEP_COUNT,
  validateStep,
  type OnboardingValues,
} from '../model'
import { ActivityStep } from '../steps/ActivityStep'
import { BasicsStep } from '../steps/BasicsStep'
import { BodyStep } from '../steps/BodyStep'
import { HealthStep } from '../steps/HealthStep'
import { NutritionStep } from '../steps/NutritionStep'
import { StrengthStep } from '../steps/StrengthStep'
import { SummaryStep } from '../steps/SummaryStep'
import { TrainingStep } from '../steps/TrainingStep'

const STEPS = [
  { title: 'Datos básicos', subtitle: 'Lo esencial para calcular tu metabolismo.' },
  {
    title: 'Composición corporal',
    subtitle: 'Tu % de grasa define cuánto déficit tolera tu cuerpo.',
  },
  { title: 'Actividad diaria', subtitle: 'Cuánto te mueves fuera del gimnasio.' },
  { title: 'Entrenamiento', subtitle: 'Armamos un plan que quepa en tu semana.' },
  { title: 'Test de fuerza', subtitle: 'Tu línea base para no perder fuerza.' },
  { title: 'Nutrición', subtitle: 'Para que el plan de comidas sea realista.' },
  { title: 'Salud', subtitle: 'Tu seguridad primero.' },
  { title: 'Tu plan', subtitle: 'Revisa cada número: toca "¿Por qué?" para ver el cálculo.' },
] as const

function Welcome({ onStart }: { onStart: () => void }) {
  const repos = useRepositories()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [restoring, setRestoring] = useState(false)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-safe pb-8">
      <div className="flex flex-1 flex-col justify-center gap-8 py-10">
        <Logo className="[&_svg]:size-12 [&>span:last-child]:text-4xl" />
        <div className="space-y-3">
          <h1 className="font-display text-5xl leading-[0.95] font-bold">
            Baja grasa.
            <br />
            <span className="text-primary">Conserva tu fuerza.</span>
          </h1>
          <p className="text-muted-foreground">
            Responde unas preguntas (unos 4 minutos) y FORJA calcula tus calorías, tus macros y tu
            plan de entrenamiento, explicando cada número.
          </p>
        </div>
        <ul className="space-y-3 text-sm">
          {[
            { icon: Salad, text: 'Qué comer y cuánto, con alimentos de aquí.' },
            { icon: Dumbbell, text: 'Qué entrenar cada día y con qué peso.' },
            { icon: LineChart, text: 'Ajustes semanales según tus datos reales.' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
                <Icon aria-hidden className="size-5" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <Button size="xl" className="w-full" onClick={onStart}>
          Empezar <ArrowRight />
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          disabled={restoring}
          onClick={() => fileRef.current?.click()}
        >
          {restoring ? <Loader2 className="animate-spin" /> : <Upload />} Restaurar un respaldo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setRestoring(true)
            try {
              await restoreFromFile(repos, file)
              toast.success('Respaldo restaurado. ¡Bienvenido de vuelta!')
              void navigate('/', { replace: true })
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : 'No se pudo restaurar el respaldo.',
              )
            } finally {
              setRestoring(false)
            }
          }}
        />
        <Disclaimer className="pt-2" />
      </div>
    </div>
  )
}

/** Guardado automático del avance (con un pequeño retardo para no escribir en cada tecla). */
function AutoSave({ step }: { step: number }) {
  const repos = useRepositories()
  const values = useWatch<OnboardingValues>()
  useEffect(() => {
    const timer = window.setTimeout(() => void repos.onboarding.save(step, values), 400)
    return () => window.clearTimeout(timer)
  }, [repos, step, values])
  return null
}

interface WizardProps {
  initialStep: number
  initialValues: OnboardingValues
  /** En modo edición se actualiza el perfil existente y se recalcula el plan. */
  editing?: Profile
}

export function Wizard({ initialStep, initialValues, editing }: WizardProps) {
  const repos = useRepositories()
  const navigate = useNavigate()
  const today = useToday()
  const { data: exercises = [] } = useLive(() => repos.exercises.observeAll(), [])
  const [step, setStep] = useState(initialStep)
  const [direction, setDirection] = useState(1)
  const [saving, setSaving] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const form = useForm<OnboardingValues>({ defaultValues: initialValues, mode: 'onSubmit' })

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
    topRef.current?.scrollIntoView({ block: 'start' })
    window.scrollTo({ top: 0 })
  }

  const onNext = async () => {
    const values = form.getValues()
    const issues = validateStep(step, values)
    if (issues.length > 0) {
      issues.forEach((issue, i) =>
        form.setError(
          issue.path as FieldPath<OnboardingValues>,
          { message: issue.message },
          { shouldFocus: i === 0 },
        ),
      )
      toast.error('Revisa los campos marcados')
      return
    }
    if (step < STEP_COUNT - 1) {
      goTo(step + 1)
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const { trainingRegenerated } = await saveProfileEdit(
          repos,
          editing,
          values,
          exercises,
          today,
        )
        toast.success(
          trainingRegenerated
            ? 'Plan recalculado y entrenamiento actualizado.'
            : 'Plan nutricional recalculado.',
        )
        void navigate('/perfil', { replace: true })
        return
      }
      await completeOnboarding(repos, values, exercises, today)
      toast.success(`¡Listo, ${values.name.trim()}! Tu plan está activo.`)
      void navigate('/', { replace: true })
    } catch (error) {
      console.error(error)
      toast.error('No pudimos guardar tu plan. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  const current = STEPS[step] ?? STEPS[0]
  const last = step === STEP_COUNT - 1

  return (
    <FormProvider {...form}>
      {!editing && <AutoSave step={step} />}
      <div ref={topRef} className="mx-auto flex min-h-dvh max-w-xl flex-col">
        <header className="sticky top-0 z-10 space-y-3 bg-background/90 px-4 pt-safe pb-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between pt-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={step === 0 && editing ? 'Cancelar' : 'Paso anterior'}
              disabled={step === 0 && !editing}
              onClick={() => (step === 0 ? void navigate(-1) : goTo(step - 1))}
              className="-ml-2"
            >
              <ArrowLeft />
            </Button>
            <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
              Paso {step + 1} de {STEP_COUNT}
            </p>
            <span className="w-11" />
          </div>
          <Progress
            value={((step + 1) / STEP_COUNT) * 100}
            aria-label="Progreso del onboarding"
            className="h-1.5"
          />
        </header>

        <form
          className="flex flex-1 flex-col px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void onNext()
          }}
        >
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              <div>
                <h1 className="font-display text-3xl font-bold">{current.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
              </div>
              {step === 0 && <BasicsStep />}
              {step === 1 && <BodyStep />}
              {step === 2 && <ActivityStep />}
              {step === 3 && <TrainingStep />}
              {step === 4 && <StrengthStep />}
              {step === 5 && <NutritionStep />}
              {step === 6 && <HealthStep />}
              {step === 7 && <SummaryStep exercises={exercises} today={today} />}
            </motion.div>
          </AnimatePresence>

          <div className="fixed inset-x-0 bottom-0 border-t bg-background/90 pb-safe backdrop-blur-xl">
            <div className="mx-auto flex max-w-xl gap-3 px-4 py-3 sm:px-6">
              {step > 0 && (
                <Button type="button" variant="secondary" size="lg" onClick={() => goTo(step - 1)}>
                  Atrás
                </Button>
              )}
              <Button type="submit" size="lg" className="flex-1" disabled={saving}>
                {saving ? (
                  <Loader2 className="animate-spin" />
                ) : last ? (
                  <>
                    <Check /> {editing ? 'Guardar y recalcular' : 'Confirmar y empezar'}
                  </>
                ) : (
                  <>
                    Siguiente <ArrowRight />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </FormProvider>
  )
}

export function OnboardingPage() {
  const repos = useRepositories()
  const [state, setState] = useState<{ step: number; values: OnboardingValues } | null | 'welcome'>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    void repos.onboarding.get().then((draft) => {
      if (cancelled) return
      if (!draft) {
        setState('welcome')
        return
      }
      const parsed = onboardingSchema.safeParse({ ...defaultOnboardingValues(), ...draft.values })
      setState(
        parsed.success
          ? { step: Math.min(draft.step, STEP_COUNT - 1), values: parsed.data }
          : { step: 0, values: defaultOnboardingValues() },
      )
    })
    return () => {
      cancelled = true
    }
  }, [repos])

  if (state === null) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 aria-label="Cargando" className="size-8 animate-spin text-primary" />
      </div>
    )
  }
  if (state === 'welcome') {
    return <Welcome onStart={() => setState({ step: 0, values: defaultOnboardingValues() })} />
  }
  return <Wizard initialStep={state.step} initialValues={state.values} />
}
