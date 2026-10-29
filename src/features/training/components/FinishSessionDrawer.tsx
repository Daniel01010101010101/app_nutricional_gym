import { AlertTriangle, Flag, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Field } from '@/components/form/Field'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import type { WorkoutSession } from '@/data/schemas'

import { RatingChips } from './RatingChips'

export interface FinishInput {
  feeling: number | null
  energy: number | null
  sleep: number | null
  notes: string
}

interface FinishSessionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: WorkoutSession
  workingSets: number
  pendingSets: number
  onFinish: (input: FinishInput) => Promise<void>
  onDiscard: () => void
}

function FinishForm({
  session,
  workingSets,
  pendingSets,
  onFinish,
  onDiscard,
}: Omit<FinishSessionDrawerProps, 'open' | 'onOpenChange'>) {
  const [feeling, setFeeling] = useState<number | null>(session.feeling)
  const [energy, setEnergy] = useState<number | null>(session.energy)
  const [sleep, setSleep] = useState<number | null>(session.sleep)
  const [notes, setNotes] = useState(session.notes)
  const [saving, setSaving] = useState(false)

  if (workingSets === 0) {
    return (
      <>
        <div className="space-y-2 px-4">
          <p className="flex items-start gap-2 text-sm">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            No registraste ninguna serie de trabajo. Si no entrenaste, descarta la sesión para no
            afectar tus estadísticas.
          </p>
        </div>
        <DrawerFooter>
          <Button size="lg" variant="destructive" onClick={onDiscard}>
            <Trash2 /> Descartar sesión
          </Button>
        </DrawerFooter>
      </>
    )
  }

  return (
    <>
      <div className="space-y-5 overflow-y-auto px-4">
        {pendingSets > 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            Te faltan {pendingSets} {pendingSets === 1 ? 'serie' : 'series'} del plan. Puedes
            terminar igual: la progresión usa lo que hiciste.
          </p>
        )}
        <Field label="¿Cómo te sentiste?">
          <RatingChips
            aria-label="Sensación general"
            value={feeling}
            onChange={setFeeling}
            labels={['Muy mal', 'Excelente']}
          />
        </Field>
        <Field label="Energía">
          <RatingChips
            aria-label="Energía"
            value={energy}
            onChange={setEnergy}
            labels={['Sin energía', 'A tope']}
          />
        </Field>
        <Field label="¿Cómo dormiste anoche?">
          <RatingChips
            aria-label="Sueño"
            value={sleep}
            onChange={setSleep}
            labels={['Muy mal', 'Muy bien']}
          />
        </Field>
        <Field
          label="Notas"
          htmlFor="session-notes"
          description="Molestias, técnica, cómo estaba el gym… (opcional)"
        >
          <Textarea
            id="session-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            className="rounded-xl"
          />
        </Field>
      </div>
      <DrawerFooter>
        <Button
          size="lg"
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            try {
              await onFinish({ feeling, energy, sleep, notes: notes.trim() })
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? <Loader2 className="animate-spin" /> : <Flag />} Terminar y ver resumen
        </Button>
      </DrawerFooter>
    </>
  )
}

/** Cierre de la sesión: sensaciones, sueño y notas antes de guardar. */
export function FinishSessionDrawer({ open, onOpenChange, ...props }: FinishSessionDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92vh] max-w-lg">
        <DrawerHeader className="text-left">
          <DrawerTitle>Terminar entreno</DrawerTitle>
          <DrawerDescription>
            {props.workingSets} {props.workingSets === 1 ? 'serie' : 'series'} de trabajo
            registradas.
          </DrawerDescription>
        </DrawerHeader>
        {open && <FinishForm {...props} />}
      </DrawerContent>
    </Drawer>
  )
}
