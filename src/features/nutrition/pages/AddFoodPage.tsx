import { Check, ChevronRight, Clock, Search, Sparkles, Star, Trash2, Zap } from 'lucide-react'
import { useDeferredValue, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { Field } from '@/components/form/Field'
import { NativeSelect } from '@/components/form/NativeSelect'
import { NumberField } from '@/components/form/NumberField'
import { Segmented } from '@/components/form/ChipGroup'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { describePortion } from '@/domain/nutrition/gaps'
import { searchFoods } from '@/domain/nutrition/foods'
import type { MealSlot } from '@/domain/nutrition/meals'
import { addDaysToKey, timeToMinutes } from '@/domain/shared/dates'
import { fmt } from '@/domain/shared/format'
import type { Food } from '@/domain/types'
import type { FoodLogEntry } from '@/data/schemas'
import { useLive } from '@/hooks/useLive'
import { relativeDayLabel } from '@/lib/format'
import { FOOD_CATEGORY_LABEL } from '@/lib/labels'
import {
  entriesFromFavorite,
  entryFromFood,
  kcalFromMacros,
  quickEntry,
  totalsOf,
} from '@/services/nutrition'

import { FoodAmountDrawer, type AmountChoice } from '../components/FoodAmountDrawer'
import { useNutritionData } from '../hooks/useNutritionData'
import { useSelectedDate } from '../hooks/useSelectedDate'

type Tab = 'buscar' | 'favoritas' | 'rapido'

/** Comida más cercana a la hora actual (la última que ya empezó). */
function currentMealIndex(slots: readonly MealSlot[]): number {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const started = slots.filter((s) => timeToMinutes(s.time) - 45 <= minutes)
  return (started.at(-1) ?? slots[0])?.index ?? 0
}

function FoodRow({ food, hint, onSelect }: { food: Food; hint?: ReactNode; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{food.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {hint ??
              `${FOOD_CATEGORY_LABEL[food.category]} · ${fmt(food.per100g.kcal)} kcal · P ${fmt(food.per100g.protein, 1)} g por 100 g`}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </li>
  )
}

function QuickForm({
  onAdd,
}: {
  onAdd: (input: {
    name: string
    kcal: number
    protein: number
    carbs: number
    fat: number
  }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [protein, setProtein] = useState<number | undefined>()
  const [carbs, setCarbs] = useState<number | undefined>()
  const [fat, setFat] = useState<number | undefined>()
  const [kcal, setKcal] = useState<number | undefined>()
  const fromMacros = kcalFromMacros(protein ?? 0, carbs ?? 0, fat ?? 0)
  const total = kcal ?? fromMacros
  const valid = total > 0 && total <= 5000

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        Para comidas fuera de casa o productos con etiqueta. Si dejas las calorías vacías se
        calculan con los macros.
      </p>
      <Field label="Nombre" htmlFor="quick-name">
        <Input
          id="quick-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Ej.: Almuerzo ejecutivo"
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
            placeholder="0"
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
            placeholder="0"
          />
        </Field>
        <Field label="Grasa" htmlFor="quick-f">
          <NumberField
            id="quick-f"
            value={fat}
            onChange={setFat}
            unit="g"
            decimals={1}
            min={0}
            placeholder="0"
          />
        </Field>
      </div>
      <Field label="Calorías" htmlFor="quick-kcal">
        <NumberField
          id="quick-kcal"
          value={kcal}
          onChange={setKcal}
          unit="kcal"
          decimals={0}
          min={0}
          placeholder={String(fromMacros)}
        />
      </Field>
      <Button
        size="lg"
        className="w-full"
        disabled={!valid}
        onClick={async () => {
          await onAdd({
            name,
            kcal: total,
            protein: protein ?? 0,
            carbs: carbs ?? 0,
            fat: fat ?? 0,
          })
          setName('')
          setProtein(undefined)
          setCarbs(undefined)
          setFat(undefined)
          setKcal(undefined)
        }}
      >
        <Zap /> Agregar {fmt(total)} kcal
      </Button>
    </div>
  )
}

export function AddFoodPage() {
  const [date, , today] = useSelectedDate()
  const [params] = useSearchParams()
  const data = useNutritionData(date)
  const { repos, slots } = data
  const recentLogs = useLive(
    () => repos.foodLogs.observeRange(addDaysToKey(today, -30), today),
    [today],
  )
  const favorites = useLive(() => repos.favorites.observeAll(), [])
  const [mealChoice, setMealChoice] = useState<string | null>(params.get('comida'))
  const [tab, setTab] = useState<Tab>('buscar')
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [selected, setSelected] = useState<{ food: Food; grams?: number } | null>(null)
  const [added, setAdded] = useState(0)

  if (data.loading || !data.profile) {
    return (
      <>
        <PageHeader title="Agregar" back="/nutricion" />
        <Skeleton className="h-96 rounded-2xl" />
      </>
    )
  }

  const mealIndex =
    mealChoice !== null && slots.some((s) => String(s.index) === mealChoice)
      ? Number(mealChoice)
      : currentMealIndex(slots)
  const meal = slots.find((s) => s.index === mealIndex)
  const mealName = meal?.name ?? 'la comida'
  const backTo = `/nutricion${date !== today ? `?fecha=${date}` : ''}`

  const save = async (entries: FoodLogEntry[], message: string) => {
    await repos.foodLogs.add(entries)
    setAdded((n) => n + entries.length)
    toast.success(message, {
      action: {
        label: 'Deshacer',
        onClick: () => void Promise.all(entries.map((e) => repos.foodLogs.remove(e.id))),
      },
    })
  }

  const addFood = async (food: Food, choice: AmountChoice) => {
    await save(
      [
        entryFromFood({
          food,
          grams: choice.grams,
          date,
          mealIndex,
          ...(choice.measure ? { measure: choice.measure } : {}),
        }),
      ],
      `${food.name} agregado a ${mealName}.`,
    )
    setSelected(null)
  }

  // Recientes: los más registrados en 30 días.
  const counts = new Map<string, number>()
  for (const e of recentLogs.data ?? [])
    if (e.foodId) counts.set(e.foodId, (counts.get(e.foodId) ?? 0) + 1)
  const recent = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .flatMap(([id]) => {
      const food = data.foodsById.get(id)
      return food ? [food] : []
    })
  const planItems = (data.mealPlan?.meals.find((m) => m.index === mealIndex)?.items ?? []).flatMap(
    (i) => {
      const food = data.foodsById.get(i.foodId)
      return food ? [{ food, grams: i.grams }] : []
    },
  )
  const results = deferred.trim() ? searchFoods(data.foods, deferred, 50) : []

  return (
    <div className="space-y-4 pb-20">
      <PageHeader
        title="Agregar"
        back={backTo}
        subtitle={`${relativeDayLabel(date, today)} · ${mealName}`}
      />

      <NativeSelect
        aria-label="Comida"
        value={String(mealIndex)}
        onChange={setMealChoice}
        options={slots.map((s) => ({ value: String(s.index), label: `${s.name} · ${s.time}` }))}
      />

      <Segmented<Tab>
        aria-label="Cómo agregar"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'buscar', label: 'Alimentos' },
          { value: 'favoritas', label: 'Favoritas' },
          { value: 'rapido', label: 'Rápido' },
        ]}
      />

      {tab === 'buscar' && (
        <>
          <label className="flex h-12 items-center gap-2 rounded-xl border border-input bg-card px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
            <Search aria-hidden className="size-5 text-muted-foreground" />
            <span className="sr-only">Buscar alimento</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar: arroz, huevo, arepa, pollo…"
              className="h-full flex-1 bg-transparent text-base outline-none"
            />
          </label>

          {deferred.trim() ? (
            results.length > 0 ? (
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                {results.map((food) => (
                  <FoodRow key={food.id} food={food} onSelect={() => setSelected({ food })} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Search}
                title="Sin resultados"
                description="Prueba con otra palabra o usa el registro rápido de macros."
                action={
                  <Button variant="secondary" onClick={() => setTab('rapido')}>
                    <Zap /> Registro rápido
                  </Button>
                }
              />
            )
          ) : (
            <>
              {planItems.length > 0 && (
                <section className="space-y-2">
                  <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <Sparkles aria-hidden className="size-3.5" /> De tu plan para {mealName}
                  </h2>
                  <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                    {planItems.map(({ food, grams }) => (
                      <FoodRow
                        key={food.id}
                        food={food}
                        hint={describePortion(food, grams)}
                        onSelect={() => setSelected({ food, grams })}
                      />
                    ))}
                  </ul>
                </section>
              )}
              {recent.length > 0 && (
                <section className="space-y-2">
                  <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <Clock aria-hidden className="size-3.5" /> Los que más registras
                  </h2>
                  <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                    {recent.map((food) => (
                      <FoodRow key={food.id} food={food} onSelect={() => setSelected({ food })} />
                    ))}
                  </ul>
                </section>
              )}
              {planItems.length === 0 && recent.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {data.foods.length} alimentos con valores del ICBF (Colombia) y del USDA. Busca
                  por nombre.
                </p>
              )}
            </>
          )}
        </>
      )}

      {tab === 'favoritas' &&
        ((favorites.data ?? []).length === 0 ? (
          <EmptyState
            icon={Star}
            title="Aún no tienes favoritas"
            description='En el diario, abre el menú de una comida y elige "Guardar como favorita".'
          />
        ) : (
          <ul className="space-y-2">
            {(favorites.data ?? []).map((fav) => {
              const totals = totalsOf(fav.items)
              return (
                <li
                  key={fav.id}
                  className="flex items-center gap-2 rounded-2xl border bg-card p-2 pl-4"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 py-1 text-left"
                    onClick={() =>
                      void save(
                        entriesFromFavorite(fav, date, mealIndex),
                        `${fav.name} agregada a ${mealName}.`,
                      )
                    }
                  >
                    <span className="block truncate font-medium">{fav.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {fmt(totals.kcal)} kcal · P {fmt(totals.protein)} g ·{' '}
                      {fav.items.map((i) => i.name).join(', ')}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Borrar ${fav.name}`}
                    onClick={() => void repos.favorites.remove(fav.id)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              )
            })}
          </ul>
        ))}

      {tab === 'rapido' && (
        <QuickForm
          onAdd={(input) =>
            save(
              [quickEntry({ ...input, date, mealIndex })],
              `${input.name.trim() || 'Registro rápido'} agregado.`,
            )
          }
        />
      )}

      <div className="fixed inset-x-0 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-30 px-4 lg:bottom-6 lg:left-60">
        <div className="mx-auto max-w-3xl">
          <Button
            asChild
            size="lg"
            variant={added > 0 ? 'default' : 'secondary'}
            className="w-full shadow-xl"
          >
            <Link to={backTo}>
              <Check />{' '}
              {added > 0
                ? `Listo · ${added} ${added === 1 ? 'agregado' : 'agregados'}`
                : 'Volver al diario'}
            </Link>
          </Button>
        </div>
      </div>

      <FoodAmountDrawer
        food={selected?.food ?? null}
        {...(selected?.grams !== undefined ? { suggestedGrams: selected.grams } : {})}
        mealName={mealName}
        onClose={() => setSelected(null)}
        onAdd={(choice) => (selected ? addFood(selected.food, choice) : Promise.resolve())}
      />
    </div>
  )
}
