import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Field } from '@/components/form/Field'
import { NumberField } from '@/components/form/NumberField'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { WeightUnit, WorkoutSet } from '@/domain/types'
import { fromDisplay, toDisplay } from '@/services/workout'

import { RatingChips } from './RatingChips'

interface SetEditorProps {
  set: WorkoutSet | null
  unit: WeightUnit
  onClose: () => void
  onSave: (patch: Partial<WorkoutSet>) => void
  onDelete: () => void
}

function SetEditorForm({
  set,
  unit,
  onSave,
  onDelete,
}: Omit<SetEditorProps, 'onClose'> & { set: WorkoutSet }) {
  const [weight, setWeight] = useState<number | undefined>(toDisplay(set.weightKg, unit))
  const [reps, setReps] = useState<number | undefined>(set.reps)
  const [rir, setRir] = useState<number | null>(set.rir)
  const [warmup, setWarmup] = useState(set.isWarmup)
  const [notes, setNotes] = useState(set.notes ?? '')
  const valid = weight !== undefined && weight >= 0 && reps !== undefined && reps > 0

  return (
    <>
      <div className="space-y-4 px-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso" htmlFor="edit-weight">
            <NumberField
              id="edit-weight"
              value={weight}
              onChange={setWeight}
              unit={unit}
              decimals={2}
            />
          </Field>
          <Field label="Reps" htmlFor="edit-reps">
            <NumberField id="edit-reps" value={reps} onChange={setReps} decimals={0} />
          </Field>
        </div>
        <Field label="RIR (reps en reserva)">
          <RatingChips
            aria-label="RIR"
            min={0}
            max={4}
            value={rir}
            onChange={setRir}
            labels={['Al fallo', 'Muy fácil']}
          />
        </Field>
        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          Serie de calentamiento
          <Switch checked={warmup} onCheckedChange={setWarmup} />
        </label>
        <Field label="Notas" htmlFor="edit-notes">
          <Textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
            className="rounded-xl"
          />
        </Field>
      </div>
      <DrawerFooter className="flex-row">
        <Button variant="ghost" className="text-destructive" onClick={onDelete}>
          <Trash2 /> Borrar
        </Button>
        <Button
          className="flex-1"
          disabled={!valid}
          onClick={() =>
            onSave({
              weightKg: fromDisplay(weight ?? 0, unit),
              reps: Math.round(reps ?? 1),
              rir,
              isWarmup: warmup,
              notes: notes.trim(),
            })
          }
        >
          Guardar cambios
        </Button>
      </DrawerFooter>
    </>
  )
}

/** Hoja para corregir o borrar una serie ya registrada. */
export function SetEditor({ set, unit, onClose, onSave, onDelete }: SetEditorProps) {
  return (
    <Drawer open={set !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader className="text-left">
          <DrawerTitle>Editar serie</DrawerTitle>
        </DrawerHeader>
        {set && (
          <SetEditorForm key={set.id} set={set} unit={unit} onSave={onSave} onDelete={onDelete} />
        )}
      </DrawerContent>
    </Drawer>
  )
}
