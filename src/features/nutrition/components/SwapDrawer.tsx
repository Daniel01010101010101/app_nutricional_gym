import { ArrowLeftRight } from 'lucide-react'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { nutrientsFor } from '@/domain/nutrition/foods'
import { describePortion } from '@/domain/nutrition/gaps'
import { findSwaps } from '@/domain/nutrition/swaps'
import { fmt } from '@/domain/shared/format'
import type { Food, MealRole } from '@/domain/types'
import { cn } from '@/lib/utils'

export interface SwapTarget {
  food: Food
  grams: number
  role: MealRole
}

interface SwapDrawerProps {
  target: SwapTarget | null
  pool: readonly Food[]
  onClose: () => void
  onPick: (food: Food, grams: number) => void
}

const ROLE_KEY: Record<MealRole, 'protein' | 'carbs' | 'fat' | 'kcal'> = {
  protein: 'protein',
  carb: 'carbs',
  fat: 'fat',
  vegetable: 'kcal',
  fruit: 'kcal',
}

function delta(value: number, unit: string): string {
  const rounded = Math.round(value)
  if (rounded === 0) return `= ${unit}`
  return `${rounded > 0 ? '+' : '−'}${fmt(Math.abs(rounded))} ${unit}`
}

/** Intercambios equivalentes: misma función en la comida y cantidad ajustada al macro principal. */
export function SwapDrawer({ target, pool, onClose, onPick }: SwapDrawerProps) {
  const options = target ? findSwaps(target.food, target.grams, target.role, pool, 10) : []
  const original = target ? nutrientsFor(target.food, target.grams) : null
  const key = target ? ROLE_KEY[target.role] : 'kcal'
  const keyLabel =
    key === 'kcal'
      ? 'kcal'
      : key === 'protein'
        ? 'g de proteína'
        : key === 'carbs'
          ? 'g de carbos'
          : 'g de grasa'

  return (
    <Drawer open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-h-[88vh] max-w-lg">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ArrowLeftRight aria-hidden className="size-5 text-primary" /> Cambiar{' '}
            {target?.food.name.toLowerCase()}
          </DrawerTitle>
          {target && original && (
            <DrawerDescription>
              Opciones con ~{fmt(original[key])} {keyLabel}, como{' '}
              {describePortion(target.food, target.grams)}.
            </DrawerDescription>
          )}
        </DrawerHeader>
        <ul className="divide-y overflow-y-auto border-t pb-6">
          {options.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground">
              No hay equivalentes con tus preferencias.
            </li>
          )}
          {options.map((o) => {
            const kcalDelta = o.nutrients.kcal - (original?.kcal ?? 0)
            return (
              <li key={o.food.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
                  onClick={() => onPick(o.food, o.grams)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{o.food.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {describePortion(o.food, o.grams)}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-right text-xs">
                    <span className="block font-semibold">{fmt(o.nutrients.kcal)} kcal</span>
                    <span
                      className={cn(
                        'block',
                        Math.abs(kcalDelta) > 60 ? 'text-warning' : 'text-muted-foreground',
                      )}
                    >
                      {delta(kcalDelta, 'kcal')}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </DrawerContent>
    </Drawer>
  )
}
