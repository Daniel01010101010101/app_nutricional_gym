import { Search } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { normalizeText } from '@/domain/shared/text'
import { MUSCLE_LABEL } from '@/domain/training/volume'
import type { Exercise } from '@/domain/types'

interface ExercisePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercises: readonly Exercise[]
  onPick: (exercise: Exercise) => void
  title?: string
  description?: string
  /** Ejercicios a mostrar primero (p. ej. del mismo patrón al cambiar uno). */
  suggested?: readonly Exercise[]
}

export function ExercisePicker({
  open,
  onOpenChange,
  exercises,
  onPick,
  title = 'Agregar ejercicio',
  description,
  suggested = [],
}: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const list = useMemo(() => {
    const terms = normalizeText(deferred).split(' ').filter(Boolean)
    const pool = terms.length === 0 && suggested.length > 0 ? suggested : exercises
    if (terms.length === 0) return pool.slice(0, 60)
    return exercises
      .filter((e) => {
        const hay = normalizeText(
          `${e.name} ${e.nameEn} ${e.aliases.join(' ')} ${MUSCLE_LABEL[e.primaryMuscle]}`,
        )
        return terms.every((t) => hay.includes(t))
      })
      .slice(0, 60)
  }, [deferred, exercises, suggested])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto h-[85vh] max-w-lg">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="px-4 pb-2">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-input bg-card px-3">
            <Search aria-hidden className="size-4 text-muted-foreground" />
            <span className="sr-only">Buscar ejercicio</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o músculo…"
              className="flex-1 bg-transparent outline-none"
              autoComplete="off"
            />
          </label>
          {query === '' && suggested.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Sugeridos: mismo patrón de movimiento.
            </p>
          )}
        </div>
        <ul className="flex-1 overflow-y-auto px-2 pb-6">
          {list.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-accent"
                onClick={() => {
                  onPick(exercise)
                  onOpenChange(false)
                  setQuery('')
                }}
              >
                <span className="text-sm font-semibold">{exercise.name}</span>
                <span className="text-xs text-muted-foreground">
                  {MUSCLE_LABEL[exercise.primaryMuscle]} · {exercise.nameEn}
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="p-4 text-center text-sm text-muted-foreground">Sin resultados</li>
          )}
        </ul>
      </DrawerContent>
    </Drawer>
  )
}
