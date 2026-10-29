import { Check } from 'lucide-react'
import { useState } from 'react'

import { NumberField } from '@/components/form/NumberField'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { nutrientsFor } from '@/domain/nutrition/foods'
import { fmt } from '@/domain/shared/format'
import type { Food } from '@/domain/types'
import { FOOD_CATEGORY_LABEL, foodSourceLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'

import { NutrientLine } from './NutrientLine'

export interface AmountChoice {
  grams: number
  measure?: { label: string; quantity: number }
}

interface FoodAmountDrawerProps {
  food: Food | null
  /** Gramos sugeridos (p. ej. la porción del plan). */
  suggestedGrams?: number
  mealName: string
  onClose: () => void
  onAdd: (choice: AmountChoice) => Promise<void>
}

function AmountForm({
  food,
  suggestedGrams,
  mealName,
  onAdd,
}: Omit<FoodAmountDrawerProps, 'food' | 'onClose'> & { food: Food }) {
  // Por defecto la primera medida casera (más fácil de estimar que los gramos).
  const [unit, setUnit] = useState<string>(suggestedGrams ? 'g' : (food.measures[0]?.label ?? 'g'))
  const measure = food.measures.find((m) => m.label === unit)
  const [quantity, setQuantity] = useState<number | undefined>(
    suggestedGrams ?? (measure ? 1 : 100),
  )
  const [saving, setSaving] = useState(false)
  const grams = quantity === undefined ? 0 : measure ? quantity * measure.grams : quantity
  const valid = quantity !== undefined && quantity > 0 && grams <= 3000

  return (
    <>
      <div className="space-y-4 px-4">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Unidad">
          {[{ label: 'g', grams: 1 }, ...food.measures].map((m) => {
            const active = m.label === unit
            return (
              <button
                key={m.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setUnit(m.label)
                  setQuantity(m.label === 'g' ? Math.round(grams || 100) : 1)
                }}
                className={cn(
                  'h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-accent',
                )}
              >
                {m.label === 'g' ? 'Gramos' : `${m.label.replace(/^1 /, '')} (${fmt(m.grams)} g)`}
              </button>
            )
          })}
        </div>
        <NumberField
          aria-label={measure ? `Cantidad de ${measure.label.replace(/^1 /, '')}` : 'Gramos'}
          value={quantity}
          onChange={setQuantity}
          unit={measure ? '×' : 'g'}
          decimals={measure ? 2 : 0}
          step={measure ? 0.5 : 10}
          min={0}
          steppers
          size="lg"
        />
        <NutrientLine nutrients={nutrientsFor(food, grams)} grams={grams} />
      </div>
      <DrawerFooter>
        <Button
          size="lg"
          disabled={!valid || saving}
          onClick={async () => {
            if (!valid) return
            setSaving(true)
            try {
              await onAdd({
                grams,
                ...(measure ? { measure: { label: measure.label, quantity } } : {}),
              })
            } finally {
              setSaving(false)
            }
          }}
        >
          <Check /> Agregar a {mealName}
        </Button>
      </DrawerFooter>
    </>
  )
}

/** Elegir cuánto comiste: en gramos o en medidas caseras (unidad, taza, porción…). */
export function FoodAmountDrawer({ food, onClose, ...props }: FoodAmountDrawerProps) {
  return (
    <Drawer open={food !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-h-[92vh] max-w-lg">
        <DrawerHeader>
          <DrawerTitle>{food?.name ?? 'Alimento'}</DrawerTitle>
          {food && (
            <DrawerDescription>
              {FOOD_CATEGORY_LABEL[food.category]} · por 100 g: {fmt(food.per100g.kcal)} kcal, P{' '}
              {fmt(food.per100g.protein, 1)} g · fuente {foodSourceLabel(food.source)}
            </DrawerDescription>
          )}
        </DrawerHeader>
        {food && <AmountForm key={food.id} food={food} {...props} />}
      </DrawerContent>
    </Drawer>
  )
}
