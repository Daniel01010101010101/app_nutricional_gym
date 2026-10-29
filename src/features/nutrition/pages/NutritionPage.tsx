import {
  ClipboardList,
  Copy,
  Lightbulb,
  MoreVertical,
  Plus,
  ShoppingCart,
  Star,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { describePortion, nutritionGapMessage } from '@/domain/nutrition/gaps'
import type { MealSlot } from '@/domain/nutrition/meals'
import { addDaysToKey } from '@/domain/shared/dates'
import { fmt } from '@/domain/shared/format'
import type { FoodLogEntry, MealPlanRecord } from '@/data/schemas'
import { useLive } from '@/hooks/useLive'
import { formatMeasure, relativeDayLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  copyEntries,
  dayTargetsFor,
  ensureMealPlans,
  entriesFromPlanMeal,
  favoriteFromEntries,
  totalsOf,
} from '@/services/nutrition'

import { DayNav } from '../components/DayNav'
import { EntryEditor } from '../components/EntryEditor'
import { MacroSummary } from '../components/MacroSummary'
import { WaterCard } from '../components/WaterCard'
import { useNutritionData } from '../hooks/useNutritionData'
import { useSelectedDate } from '../hooks/useSelectedDate'

function portionText(entry: FoodLogEntry): string {
  if (entry.kind === 'quick') return 'Registro rápido'
  if (entry.measureLabel && entry.quantity)
    return `${formatMeasure(entry.measureLabel, entry.quantity)} · ${fmt(entry.grams ?? 0)} g`
  return `${fmt(entry.grams ?? 0)} g`
}

interface MealCardProps {
  slot: MealSlot
  date: string
  entries: FoodLogEntry[]
  yesterdayEntries: FoodLogEntry[]
  planMeal: MealPlanRecord['meals'][number] | undefined
  planText: string | null
  onEdit: (entry: FoodLogEntry) => void
  onLogPlan: () => void
  onCopyYesterday: () => void
  onFavorite: () => void
  onClear: () => void
}

function MealCard({
  slot,
  date,
  entries,
  yesterdayEntries,
  planMeal,
  planText,
  onEdit,
  onLogPlan,
  onCopyYesterday,
  onFavorite,
  onClear,
}: MealCardProps) {
  const totals = totalsOf(entries)
  return (
    <section
      className="overflow-hidden rounded-2xl border bg-card"
      aria-labelledby={`meal-${slot.index}`}
    >
      <header className="flex items-center gap-2 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <h2 id={`meal-${slot.index}`} className="flex items-center gap-2 font-semibold">
            {slot.name}
            {slot.isPreWorkout && <Badge variant="secondary">Pre-entreno</Badge>}
            {slot.isPostWorkout && <Badge variant="secondary">Post-entreno</Badge>}
          </h2>
          <p className="tabular text-xs text-muted-foreground">
            {slot.time}
            {entries.length > 0 && ` · ${fmt(totals.kcal)} kcal · P ${fmt(totals.protein)} g`}
            {entries.length === 0 && planMeal && ` · objetivo ${fmt(planMeal.target.kcal)} kcal`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Opciones de ${slot.name}`}>
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={entries.length === 0} onSelect={onFavorite}>
              <Star /> Guardar como favorita
            </DropdownMenuItem>
            <DropdownMenuItem disabled={yesterdayEntries.length === 0} onSelect={onCopyYesterday}>
              <Copy /> Copiar la de ayer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={entries.length === 0}
              onSelect={onClear}
            >
              <Trash2 /> Borrar registros
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button asChild size="icon-sm" aria-label={`Agregar a ${slot.name}`}>
          <Link to={`/nutricion/agregar?fecha=${date}&comida=${slot.index}`}>
            <Plus />
          </Link>
        </Button>
      </header>
      {entries.length > 0 ? (
        <ul className="divide-y border-t">
          {entries.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50"
                onClick={() => onEdit(e)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {portionText(e)}
                  </span>
                </span>
                <span className="tabular shrink-0 text-right text-sm">
                  <span className="block font-semibold">{fmt(e.kcal)}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    P {fmt(e.protein)} g
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : planText ? (
        <div className="mx-4 mb-4 space-y-2 rounded-xl border border-dashed p-3">
          <p className="text-xs font-semibold text-muted-foreground">Sugerencia de tu plan</p>
          <p className="text-sm">{planText}</p>
          <Button size="sm" variant="secondary" onClick={onLogPlan}>
            <Plus /> Lo comí
          </Button>
        </div>
      ) : (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Sin registros.</p>
      )}
    </section>
  )
}

export function NutritionPage() {
  const [date, setDate, today] = useSelectedDate()
  const data = useNutritionData(date)
  const { repos, profile, targets, mealPlan, foods, isTrainingDay, loading } = data
  const yesterday = useLive(() => repos.foodLogs.observeByDate(addDaysToKey(date, -1)), [date])
  const [editing, setEditing] = useState<FoodLogEntry | null>(null)
  const [favorite, setFavorite] = useState<{ mealIndex: number; name: string } | null>(null)

  // Genera el menú sugerido del día si aún no existe (solo hoy y días futuros).
  const needsPlan =
    !loading && !mealPlan && Boolean(profile && targets) && date >= today && foods.length > 0
  useEffect(() => {
    if (!needsPlan || !profile) return
    void ensureMealPlans(repos, {
      profile,
      foods,
      dates: [date],
      isTrainingDay: () => isTrainingDay,
    })
  }, [needsPlan, profile, foods, date, isTrainingDay, repos])

  if (loading || !profile) {
    return (
      <>
        <PageHeader title="Nutrición" />
        <div className="space-y-3">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </>
    )
  }

  if (!targets) {
    return (
      <>
        <PageHeader title="Nutrición" />
        <EmptyState
          icon={UtensilsCrossed}
          title="Sin objetivos para esta fecha"
          description="Tu plan nutricional empieza el día que completaste el perfil."
          action={<Button onClick={() => setDate(today)}>Ir a hoy</Button>}
        />
      </>
    )
  }

  const day = dayTargetsFor(targets, isTrainingDay)
  const consumed = totalsOf(data.entries)
  const gap = date === today ? nutritionGapMessage(day.value, consumed, data.allowedFoods) : null
  const byMeal = (index: number) => data.entries.filter((e) => e.mealIndex === index)
  const yesterdayEntries = yesterday.data ?? []
  const orphanEntries = data.entries.filter((e) => !data.slots.some((s) => s.index === e.mealIndex))

  const addEntries = async (entries: FoodLogEntry[], message: string) => {
    if (entries.length === 0) return
    await repos.foodLogs.add(entries)
    toast.success(message, {
      action: {
        label: 'Deshacer',
        onClick: () => void Promise.all(entries.map((e) => repos.foodLogs.remove(e.id))),
      },
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nutrición"
        actions={
          <>
            <Button asChild variant="ghost" size="icon" aria-label="Plan de comidas">
              <Link to={`/nutricion/plan${date !== today ? `?fecha=${date}` : ''}`}>
                <ClipboardList />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Lista de mercado">
              <Link to="/nutricion/mercado">
                <ShoppingCart />
              </Link>
            </Button>
          </>
        }
      />

      <DayNav date={date} today={today} onChange={setDate} />

      <MacroSummary target={day.value} consumed={consumed} explanation={day.explanation} />

      {gap && gap.status !== 'empty' && (
        <section
          className={cn(
            'space-y-1.5 rounded-2xl border p-4',
            gap.status === 'done'
              ? 'border-success/40 bg-success/10'
              : gap.status === 'over'
                ? 'border-warning/40 bg-warning/10'
                : 'bg-card',
          )}
          aria-live="polite"
        >
          <p className="font-semibold">{gap.title}</p>
          <p className="text-sm text-muted-foreground">{gap.detail}</p>
          {gap.ideas.length > 0 && (
            <ul className="space-y-1 pt-1">
              {gap.ideas.map((idea) => (
                <li key={idea} className="flex items-start gap-2 text-sm">
                  <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{idea.charAt(0).toUpperCase() + idea.slice(1)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <WaterCard date={date} targetMl={day.value.waterMl} />

      {data.entries.length === 0 && yesterdayEntries.length > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            void addEntries(
              copyEntries(yesterdayEntries, date),
              `Copiaste ${yesterdayEntries.length} registros de ayer.`,
            )
          }
        >
          <Copy /> Copiar todo lo de {relativeDayLabel(addDaysToKey(date, -1), today).toLowerCase()}
        </Button>
      )}

      {data.slots.map((slot) => {
        const planMeal = mealPlan?.meals.find((m) => m.index === slot.index)
        const planText = planMeal
          ? planMeal.items
              .map((i) => {
                const food = data.foodsById.get(i.foodId)
                return food ? describePortion(food, i.grams) : null
              })
              .filter(Boolean)
              .join(' · ')
          : null
        const entries = byMeal(slot.index)
        return (
          <MealCard
            key={slot.index}
            slot={slot}
            date={date}
            entries={entries}
            yesterdayEntries={yesterdayEntries.filter((e) => e.mealIndex === slot.index)}
            planMeal={planMeal}
            planText={planText}
            onEdit={setEditing}
            onLogPlan={() => {
              if (planMeal)
                void addEntries(
                  entriesFromPlanMeal(planMeal, data.foodsById, date),
                  `${slot.name} registrado.`,
                )
            }}
            onCopyYesterday={() =>
              void addEntries(
                copyEntries(
                  yesterdayEntries.filter((e) => e.mealIndex === slot.index),
                  date,
                ),
                `${slot.name} copiado de ayer.`,
              )
            }
            onFavorite={() => setFavorite({ mealIndex: slot.index, name: slot.name })}
            onClear={() => void Promise.all(entries.map((e) => repos.foodLogs.remove(e.id)))}
          />
        )
      })}

      {orphanEntries.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 text-sm">
          <p className="font-semibold">Otros registros</p>
          <ul className="mt-2 space-y-1">
            {orphanEntries.map((e) => (
              <li key={e.id}>
                <button type="button" className="hover:underline" onClick={() => setEditing(e)}>
                  {e.name} · {fmt(e.kcal)} kcal
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button asChild variant="ghost" className="w-full">
        <Link to={`/nutricion/plan${date !== today ? `?fecha=${date}` : ''}`}>
          <ClipboardList /> Ver el plan de comidas completo
        </Link>
      </Button>

      <EntryEditor
        entry={editing}
        food={editing?.foodId ? data.foodsById.get(editing.foodId) : undefined}
        slots={data.slots}
        onClose={() => setEditing(null)}
      />

      <Drawer open={favorite !== null} onOpenChange={(open) => !open && setFavorite(null)}>
        <DrawerContent className="mx-auto max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Guardar como favorita</DrawerTitle>
            <DrawerDescription>
              La podrás agregar completa con un toque desde "Agregar".
            </DrawerDescription>
          </DrawerHeader>
          {favorite && (
            <div className="px-4">
              <Input
                aria-label="Nombre de la comida favorita"
                value={favorite.name}
                maxLength={60}
                onChange={(e) => setFavorite({ ...favorite, name: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
          )}
          <DrawerFooter>
            <Button
              size="lg"
              disabled={!favorite || favorite.name.trim().length === 0}
              onClick={async () => {
                if (!favorite) return
                await repos.favorites.save(
                  favoriteFromEntries(favorite.name, byMeal(favorite.mealIndex)),
                )
                toast.success('Comida guardada en favoritas.')
                setFavorite(null)
              }}
            >
              <Star /> Guardar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
