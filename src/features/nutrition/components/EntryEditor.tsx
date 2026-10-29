import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Field } from '@/components/form/Field'
import { NativeSelect } from '@/components/form/NativeSelect'
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
import { Input } from '@/components/ui/input'
import { nutrientsFor } from '@/domain/nutrition/foods'
import type { MealSlot } from '@/domain/nutrition/meals'
import { fmt } from '@/domain/shared/format'
import type { Food } from '@/domain/types'
import { nowIso } from '@/data/defaults'
import type { FoodLogEntry } from '@/data/schemas'
import { useRepositories } from '@/hooks/useRepositories'
import { kcalFromMacros } from '@/services/nutrition'

import { NutrientLine } from './NutrientLine'

interface EntryEditorProps {
  entry: FoodLogEntry | null
  food: Food | undefined
  slots: readonly MealSlot[]
  onClose: () => void
}

function FoodEntryForm({
  entry,
  food,
  slots,
  onClose,
}: Omit<EntryEditorProps, 'entry' | 'food'> & { entry: FoodLogEntry; food: Food }) {
  const repos = useRepositories()
  const measure = food.measures.find((m) => m.label === entry.measureLabel)
  const [quantity, setQuantity] = useState<number | undefined>(
    measure ? (entry.quantity ?? 1) : (entry.grams ?? 100),
  )
  const [meal, setMeal] = useState(String(entry.mealIndex))
  const grams = quantity === undefined ? 0 : measure ? quantity * measure.grams : quantity
  const valid = quantity !== undefined && quantity > 0 && grams <= 3000

  return (
    <>
      <div className="space-y-4 px-4">
        <Field
          label={measure ? measure.label.replace(/^1 /, 'Cantidad · ') : 'Gramos'}
          htmlFor="entry-qty"
        >
          <NumberField
            id="entry-qty"
            value={quantity}
            onChange={setQuantity}
            unit={measure ? '×' : 'g'}
            decimals={measure ? 2 : 0}
            step={measure ? 0.5 : 10}
            min={0}
            steppers
          />
        </Field>
        <NutrientLine nutrients={nutrientsFor(food, grams)} grams={grams} />
        <Field label="Comida" htmlFor="entry-meal">
          <NativeSelect
            id="entry-meal"
            value={meal}
            onChange={setMeal}
            options={slots.map((s) => ({ value: String(s.index), label: s.name }))}
          />
        </Field>
      </div>
      <DrawerFooter className="flex-row">
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={async () => {
            await repos.foodLogs.remove(entry.id)
            onClose()
          }}
        >
          <Trash2 /> Borrar
        </Button>
        <Button
          className="flex-1"
          disabled={!valid}
          onClick={async () => {
            await repos.foodLogs.update(entry.id, {
              mealIndex: Number(meal),
              grams: Math.round(grams * 10) / 10,
              measureLabel: measure?.label ?? null,
              quantity: measure ? (quantity ?? null) : null,
              ...nutrientsFor(food, grams),
              updatedAt: nowIso(),
            })
            onClose()
          }}
        >
          Guardar
        </Button>
      </DrawerFooter>
    </>
  )
}

function QuickEntryForm({
  entry,
  slots,
  onClose,
}: Omit<EntryEditorProps, 'entry' | 'food'> & { entry: FoodLogEntry }) {
  const repos = useRepositories()
  const [name, setName] = useState(entry.name)
  const [protein, setProtein] = useState<number | undefined>(entry.protein)
  const [carbs, setCarbs] = useState<number | undefined>(entry.carbs)
  const [fat, setFat] = useState<number | undefined>(entry.fat)
  const [kcal, setKcal] = useState<number | undefined>(entry.kcal)
  const [meal, setMeal] = useState(String(entry.mealIndex))

  return (
    <>
      <div className="space-y-4 px-4">
        <Field label="Nombre" htmlFor="quick-name">
          <Input
            id="quick-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="h-12 rounded-xl"
          />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Proteína" htmlFor="quick-p">
            <NumberField
              id="quick-p"
              value={protein}
              onChange={setProtein}
              unit="g"
              decimals={1}
              min={0}
            />
          </Field>
          <Field label="Carbos" htmlFor="quick-c">
            <NumberField
              id="quick-c"
              value={carbs}
              onChange={setCarbs}
              unit="g"
              decimals={1}
              min={0}
            />
          </Field>
          <Field label="Grasa" htmlFor="quick-f">
            <NumberField id="quick-f" value={fat} onChange={setFat} unit="g" decimals={1} min={0} />
          </Field>
        </div>
        <Field
          label="Calorías"
          htmlFor="quick-kcal"
          description={`Por macros: ${fmt(kcalFromMacros(protein ?? 0, carbs ?? 0, fat ?? 0))} kcal`}
        >
          <NumberField
            id="quick-kcal"
            value={kcal}
            onChange={setKcal}
            unit="kcal"
            decimals={0}
            min={0}
          />
        </Field>
        <Field label="Comida" htmlFor="quick-meal">
          <NativeSelect
            id="quick-meal"
            value={meal}
            onChange={setMeal}
            options={slots.map((s) => ({ value: String(s.index), label: s.name }))}
          />
        </Field>
      </div>
      <DrawerFooter className="flex-row">
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={async () => {
            await repos.foodLogs.remove(entry.id)
            onClose()
          }}
        >
          <Trash2 /> Borrar
        </Button>
        <Button
          className="flex-1"
          onClick={async () => {
            await repos.foodLogs.update(entry.id, {
              name: name.trim() || entry.name,
              mealIndex: Number(meal),
              protein: protein ?? 0,
              carbs: carbs ?? 0,
              fat: fat ?? 0,
              kcal: Math.round(kcal ?? kcalFromMacros(protein ?? 0, carbs ?? 0, fat ?? 0)),
              updatedAt: nowIso(),
            })
            onClose()
          }}
        >
          Guardar
        </Button>
      </DrawerFooter>
    </>
  )
}

/** Corregir cantidad, mover de comida o borrar un registro del diario. */
export function EntryEditor({ entry, food, slots, onClose }: EntryEditorProps) {
  return (
    <Drawer open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-h-[92vh] max-w-lg">
        <DrawerHeader>
          <DrawerTitle>{entry?.name ?? 'Registro'}</DrawerTitle>
          {food && (
            <DrawerDescription>
              Valores por 100 g: {fmt(food.per100g.kcal)} kcal · P {fmt(food.per100g.protein, 1)} g
            </DrawerDescription>
          )}
        </DrawerHeader>
        {entry &&
          (entry.kind === 'food' && food ? (
            <FoodEntryForm
              key={entry.id}
              entry={entry}
              food={food}
              slots={slots}
              onClose={onClose}
            />
          ) : (
            <QuickEntryForm key={entry.id} entry={entry} slots={slots} onClose={onClose} />
          ))}
      </DrawerContent>
    </Drawer>
  )
}
