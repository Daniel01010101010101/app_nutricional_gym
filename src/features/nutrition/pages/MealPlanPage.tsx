import {
  Check,
  CircleCheck,
  Dumbbell,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingCart,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { WhyButton } from '@/components/common/WhyButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { nutrientsFor } from '@/domain/nutrition/foods'
import { describePortion } from '@/domain/nutrition/gaps'
import { addDaysToKey, daysInRange } from '@/domain/shared/dates'
import { fmt } from '@/domain/shared/format'
import type { Food } from '@/domain/types'
import { formatDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  ensureMealPlans,
  entriesFromPlanMeal,
  generatePlanRecord,
  isTrainingDayFor,
  planExplanation,
  planFromRecord,
  swapPlanItem,
} from '@/services/nutrition'

import { SwapDrawer, type SwapTarget } from '../components/SwapDrawer'
import { useNutritionData } from '../hooks/useNutritionData'
import { useSelectedDate } from '../hooks/useSelectedDate'

const DAYS_AHEAD = 6

/** "2 unidades · 100 g" o solo "120 g" si no hay una medida casera que encaje. */
function portionLabel(food: Food, grams: number): string {
  const text = describePortion(food, grams).replace(` de ${food.name.toLowerCase()}`, '')
  return text.endsWith(' g') ? `${fmt(grams)} g` : `${text} · ${fmt(grams)} g`
}

export function MealPlanPage() {
  const [date, setDate, today] = useSelectedDate()
  const data = useNutritionData(date)
  const { repos, profile, targets, mealPlan, foods, isTrainingDay, loading } = data
  const [swap, setSwap] = useState<(SwapTarget & { mealIndex: number; itemIndex: number }) | null>(
    null,
  )
  const [regenerating, setRegenerating] = useState(false)

  const needsPlan = !loading && !mealPlan && Boolean(profile && targets) && foods.length > 0
  useEffect(() => {
    if (!needsPlan || !profile) return
    void ensureMealPlans(repos, {
      profile,
      foods,
      dates: [date],
      isTrainingDay: () => isTrainingDay,
    })
  }, [needsPlan, profile, foods, date, isTrainingDay, repos])

  const week = daysInRange(today, addDaysToKey(today, DAYS_AHEAD))

  const header = (
    <>
      <PageHeader
        title="Plan de comidas"
        back="/nutricion"
        actions={
          <Button asChild variant="ghost" size="icon" aria-label="Lista de mercado">
            <Link to="/nutricion/mercado">
              <ShoppingCart />
            </Link>
          </Button>
        }
      />
      <div
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
        role="tablist"
        aria-label="Día"
      >
        {(week.includes(date) ? week : [date, ...week]).map((d) => {
          const training = isTrainingDayFor(data.trainingPlan, data.sessions, d)
          const active = d === date
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDate(d)}
              className={cn(
                'flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-xl border py-2 transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card hover:bg-accent',
              )}
            >
              <span className="text-[11px] font-semibold uppercase">
                {d === today ? 'Hoy' : formatDay(d, 'EEE')}
              </span>
              <span className="font-display text-xl leading-none font-bold">
                {formatDay(d, 'd')}
              </span>
              <Dumbbell
                aria-label={training ? 'Día de entreno' : undefined}
                aria-hidden={!training}
                className={cn(
                  'size-3.5',
                  training ? (active ? 'opacity-100' : 'text-primary') : 'opacity-0',
                )}
              />
            </button>
          )
        })}
      </div>
    </>
  )

  if (loading || !profile || !mealPlan || !targets) {
    return (
      <div className="space-y-4">
        {header}
        {!loading && !targets ? (
          <p className="text-sm text-muted-foreground">
            No hay objetivos nutricionales para esta fecha.
          </p>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" /> Armando tu menú…
            </p>
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </>
        )}
      </div>
    )
  }

  const plan = planFromRecord(mealPlan, foods)
  const explanation = planExplanation(plan)
  const worst = Math.max(...Object.values(plan.deviation).map(Math.abs))
  const canLog = date <= today
  const loggedMeals = new Set(data.entries.map((e) => e.mealIndex))

  const regenerate = async () => {
    setRegenerating(true)
    try {
      await repos.mealPlans.save(
        generatePlanRecord({
          profile,
          targets,
          foods,
          date,
          isTrainingDay,
          seed: mealPlan.seed + 1,
        }),
      )
      toast.success('Nuevo menú listo.')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {header}

      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {isTrainingDay ? 'Día de entreno' : 'Día de descanso'}
            </p>
            <p className="font-display text-3xl leading-tight font-bold">
              <span className="tabular">{fmt(plan.totals.kcal)}</span>
              <span className="font-sans text-sm font-medium text-muted-foreground">
                {' '}
                / {fmt(plan.target.kcal)} kcal
              </span>
            </p>
          </div>
          <WhyButton explanation={explanation} compact />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          {(
            [
              ['Proteína', 'protein', 'bg-protein'],
              ['Carbos', 'carbs', 'bg-carbs'],
              ['Grasa', 'fat', 'bg-fat'],
            ] as const
          ).map(([label, key, color]) => (
            <div key={key} className="rounded-xl bg-muted/60 p-2">
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden className={cn('size-2 rounded-full', color)} /> {label}
              </p>
              <p className="tabular font-semibold">
                {fmt(plan.totals[key])}
                <span className="font-normal text-muted-foreground"> / {plan.target[key]} g</span>
              </p>
            </div>
          ))}
        </div>
        <p
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            plan.withinTolerance ? 'text-success' : 'text-warning',
          )}
        >
          {plan.withinTolerance ? (
            <CircleCheck aria-hidden className="size-4" />
          ) : (
            <TriangleAlert aria-hidden className="size-4" />
          )}
          {plan.withinTolerance
            ? 'Dentro de ±5 % en calorías y macros'
            : `Desvío máximo de ${fmt(worst * 100, 1)} %: prueba otro menú o un intercambio`}
        </p>
      </section>

      {plan.meals.map((meal) => {
        const items = meal.items.flatMap((item, itemIndex) => {
          const food = data.foodsById.get(item.foodId)
          return food ? [{ item, itemIndex, food, n: nutrientsFor(food, item.grams) }] : []
        })
        const kcal = items.reduce((acc, x) => acc + x.n.kcal, 0)
        const protein = items.reduce((acc, x) => acc + x.n.protein, 0)
        const logged = loggedMeals.has(meal.index)
        return (
          <section
            key={meal.index}
            className="overflow-hidden rounded-2xl border bg-card"
            aria-labelledby={`plan-meal-${meal.index}`}
          >
            <header className="flex items-start gap-2 p-4 pb-2">
              <div className="min-w-0 flex-1">
                <h2
                  id={`plan-meal-${meal.index}`}
                  className="flex flex-wrap items-center gap-2 font-semibold"
                >
                  {meal.name}
                  {meal.isPreWorkout && <Badge variant="secondary">Pre-entreno</Badge>}
                  {meal.isPostWorkout && <Badge variant="secondary">Post-entreno</Badge>}
                </h2>
                <p className="tabular text-xs text-muted-foreground">
                  {meal.time} · {fmt(kcal)} kcal · P {fmt(protein)} g
                </p>
              </div>
            </header>
            <ul className="divide-y border-t">
              {items.map(({ item, itemIndex, food, n }) => (
                <li key={`${item.foodId}-${itemIndex}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50"
                    onClick={() =>
                      setSwap({
                        food,
                        grams: item.grams,
                        role: item.role,
                        mealIndex: meal.index,
                        itemIndex,
                      })
                    }
                    aria-label={`${describePortion(food, item.grams)}. Toca para cambiarlo`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{food.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {portionLabel(food, item.grams)}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-right text-xs text-muted-foreground">
                      <span className="block text-sm font-semibold text-foreground">
                        {fmt(n.kcal)}
                      </span>
                      P {fmt(n.protein)} g
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {canLog && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={async () => {
                    const entries = entriesFromPlanMeal(
                      mealPlan.meals.find((m) => m.index === meal.index) ?? meal,
                      data.foodsById,
                      date,
                    )
                    await repos.foodLogs.add(entries)
                    toast.success(`${meal.name} registrado en tu diario.`, {
                      action: {
                        label: 'Deshacer',
                        onClick: () =>
                          void Promise.all(entries.map((e) => repos.foodLogs.remove(e.id))),
                      },
                    })
                  }}
                >
                  {logged ? <Check /> : <Plus />}{' '}
                  {logged ? 'Registrar otra vez' : 'Lo comí: registrar en el diario'}
                </Button>
              </div>
            )}
          </section>
        )
      })}

      <div className="grid grid-cols-2 gap-2 pb-4">
        <Button variant="secondary" disabled={regenerating} onClick={() => void regenerate()}>
          <RefreshCw className={cn(regenerating && 'animate-spin')} /> Otro menú
        </Button>
        <Button asChild variant="secondary">
          <Link to="/nutricion/mercado">
            <ShoppingCart /> Mercado
          </Link>
        </Button>
      </div>

      <SwapDrawer
        target={swap}
        pool={data.allowedFoods}
        onClose={() => setSwap(null)}
        onPick={(food, grams) => {
          if (!swap) return
          void repos.mealPlans.save(
            swapPlanItem(mealPlan, swap.mealIndex, swap.itemIndex, { foodId: food.id, grams }),
          )
          toast.success(`Cambiado por ${food.name.toLowerCase()}.`)
          setSwap(null)
        }}
      />
    </div>
  )
}
