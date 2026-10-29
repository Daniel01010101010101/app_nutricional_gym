import { AlertTriangle, Check, CircleX, Keyboard, Loader2 } from 'lucide-react'
import { useDeferredValue, useState } from 'react'

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
import { parseWorkoutText, type ParsedSet } from '@/domain/logging/parser'
import { fmt } from '@/domain/shared/format'
import type { Exercise, WeightUnit } from '@/domain/types'
import { cn } from '@/lib/utils'

export interface ParsedEntry {
  exercise: Exercise
  sets: ParsedSet[]
}

interface TextLogDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercises: readonly Exercise[]
  unit: WeightUnit
  onSubmit: (entries: ParsedEntry[]) => Promise<void>
}

const EXAMPLE = 'Sentadilla 100x5x3 rir2\nPress banca 80x8, 80x7, 77,5x8 @1\nDominadas 10, 8, 7'

function setLabel(set: ParsedSet): string {
  return `${set.isWarmup ? 'C ' : ''}${fmt(set.weight, 2)} ${set.unit} × ${set.reps}${set.rir !== null ? ` @${set.rir}` : ''}`
}

/** Registro rápido escribiendo las series como en una libreta, con vista previa antes de guardar. */
export function TextLogDrawer({
  open,
  onOpenChange,
  exercises,
  unit,
  onSubmit,
}: TextLogDrawerProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const deferred = useDeferredValue(text)
  const result = parseWorkoutText(deferred, { exercises, defaultUnit: unit })
  const canSave = result.ok && result.totalSets > 0 && deferred === text

  const replaceName = (raw: string, exerciseText: string, name: string) => {
    setText((current) => current.replace(raw, raw.replace(exerciseText, name)))
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92vh] max-w-lg">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Keyboard aria-hidden className="size-5 text-primary" /> Registrar por texto
          </DrawerTitle>
          <DrawerDescription>
            Una línea por ejercicio. Peso×reps, peso×reps×series, solo reps en dominadas o fondos,
            "rir2" o "@2" para el RIR y "c" tras una serie para marcarla como calentamiento.
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 overflow-y-auto px-4">
          <Textarea
            aria-label="Series en texto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            rows={4}
            autoCapitalize="sentences"
            className="min-h-28 rounded-xl text-base"
          />
          {text.trim() === '' ? (
            <button
              type="button"
              className="text-sm font-medium text-primary-text"
              onClick={() => setText(EXAMPLE)}
            >
              Ver un ejemplo
            </button>
          ) : (
            <ul className="space-y-2" aria-live="polite" aria-label="Vista previa">
              {result.lines.map((line, i) => {
                const failed = line.errors.length > 0
                return (
                  <li
                    key={`${line.raw}-${i}`}
                    className={cn(
                      'rounded-xl border p-3',
                      failed ? 'border-destructive/50' : 'bg-card',
                    )}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {failed ? (
                        <CircleX aria-hidden className="size-4 shrink-0 text-destructive" />
                      ) : (
                        <Check aria-hidden className="size-4 shrink-0 text-success" />
                      )}
                      <span className="truncate">
                        {line.match?.exercise.name ?? `"${line.exerciseText || line.raw}"`}
                      </span>
                    </p>
                    {line.sets.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {line.sets.map((s, j) => (
                          <span
                            key={j}
                            className={cn(
                              'tabular rounded-md px-2 py-1 text-xs font-medium',
                              s.isWarmup ? 'bg-muted' : 'bg-primary/12',
                            )}
                          >
                            {setLabel(s)}
                          </span>
                        ))}
                      </div>
                    )}
                    {[...line.errors, ...line.warnings].map((message) => (
                      <p
                        key={message}
                        className={cn(
                          'mt-1.5 flex items-start gap-1.5 text-xs',
                          line.errors.includes(message) ? 'text-destructive' : 'text-warning',
                        )}
                      >
                        <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" /> {message}
                      </p>
                    ))}
                    {!line.match && line.suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">¿Quisiste decir?</span>
                        {line.suggestions.map((s) => (
                          <button
                            key={s.exercise.id}
                            type="button"
                            className="rounded-md border px-2 py-1 font-medium hover:bg-accent"
                            onClick={() =>
                              replaceName(line.raw, line.exerciseText, s.exercise.name)
                            }
                          >
                            {s.exercise.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <DrawerFooter>
          <Button
            size="lg"
            disabled={!canSave || saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSubmit(
                  result.lines.flatMap((l) =>
                    l.match && l.sets.length > 0
                      ? [{ exercise: l.match.exercise, sets: l.sets }]
                      : [],
                  ),
                )
                setText('')
                onOpenChange(false)
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {result.totalSets > 0
              ? `Registrar ${result.totalSets} ${result.totalSets === 1 ? 'serie' : 'series'}`
              : 'Registrar'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
