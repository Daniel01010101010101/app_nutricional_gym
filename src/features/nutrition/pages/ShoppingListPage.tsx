import { Check, Loader2, RotateCcw, Share2, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Segmented } from '@/components/form/ChipGroup'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { buildShoppingList } from '@/domain/nutrition/shopping'
import { addDaysToKey, daysInRange } from '@/domain/shared/dates'
import { useLive } from '@/hooks/useLive'
import { formatShortDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ensureMealPlans, isTrainingDayFor } from '@/services/nutrition'
import { useShopping } from '@/stores/shopping'

import { useNutritionData } from '../hooks/useNutritionData'
import { useSelectedDate } from '../hooks/useSelectedDate'

type Span = '3' | '7'

export function ShoppingListPage() {
  const [, , today] = useSelectedDate()
  const data = useNutritionData(today)
  const { repos, profile, foods, trainingPlan, sessions, loading } = data
  const [span, setSpan] = useState<Span>('7')
  const to = addDaysToKey(today, Number(span) - 1)
  const plans = useLive(() => repos.mealPlans.observeRange(today, to), [today, to])
  const listKey = `${today}_${to}`
  const checkedList = useShopping((s) => s.checked[listKey])
  const checked = checkedList ?? []
  const toggle = useShopping((s) => s.toggle)
  const reset = useShopping((s) => s.reset)

  const dates = daysInRange(today, to)
  const missing = !plans.loading && (plans.data ?? []).length < dates.length
  const ready = !loading && Boolean(profile) && foods.length > 0
  useEffect(() => {
    if (!missing || !ready || !profile) return
    void ensureMealPlans(repos, {
      profile,
      foods,
      dates: daysInRange(today, to),
      isTrainingDay: (d) => isTrainingDayFor(trainingPlan, sessions, d),
    })
  }, [missing, ready, profile, foods, today, to, trainingPlan, sessions, repos])

  const header = (
    <>
      <PageHeader
        title="Lista de mercado"
        back="/nutricion/plan"
        subtitle={`Del ${formatShortDay(today)} al ${formatShortDay(to)}`}
      />
      <Segmented<Span>
        aria-label="Días a comprar"
        value={span}
        onChange={setSpan}
        options={[
          { value: '3', label: '3 días' },
          { value: '7', label: '7 días' },
        ]}
      />
    </>
  )

  if (loading || plans.loading || missing) {
    return (
      <div className="space-y-4">
        {header}
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden className="size-4 animate-spin" /> Preparando los menús de esos días…
        </p>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const groups = buildShoppingList(
    (plans.data ?? []).map((p) => p.meals.flatMap((m) => m.items)),
    foods,
  )
  const total = groups.reduce((acc, g) => acc + g.items.length, 0)
  const done = groups.reduce(
    (acc, g) => acc + g.items.filter((i) => checked.includes(i.food.id)).length,
    0,
  )

  const share = async () => {
    const text = [
      `Mercado FORJA (${formatShortDay(today)} – ${formatShortDay(to)})`,
      ...groups.flatMap((g) => [
        '',
        g.label.toUpperCase(),
        ...g.items.map((i) => `• ${i.food.name}: ${i.quantity}`),
      ]),
    ].join('\n')
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Lista de mercado', text })
        return
      }
      await navigator.clipboard.writeText(text)
      toast.success('Lista copiada: pégala en WhatsApp o en tus notas.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('No se pudo compartir la lista.')
    }
  }

  if (total === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={ShoppingCart}
          title="Sin menús para estos días"
          description="Completa tu perfil para generar el plan de comidas."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">
      {header}

      <div className="space-y-2 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {done} de {total} comprados
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Desmarcar todo"
              disabled={done === 0}
              onClick={() => reset(listKey)}
            >
              <RotateCcw />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Compartir lista"
              onClick={() => void share()}
            >
              <Share2 />
            </Button>
          </div>
        </div>
        <Progress value={(done / total) * 100} aria-label="Avance de la compra" className="h-1.5" />
        <p className="text-xs text-muted-foreground">
          Suma los menús de {dates.length} días. Arroz, granos y carnes van en crudo o en seco, ya
          calculados con su rendimiento al cocinar.
        </p>
      </div>

      {groups.map((group) => (
        <Section key={group.section} title={group.label}>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {group.items.map((item) => {
              const isChecked = checked.includes(item.food.id)
              return (
                <li key={item.food.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggle(listKey, item.food.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors',
                        isChecked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40',
                      )}
                    >
                      {isChecked && <Check className="size-4" />}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-sm font-medium',
                        isChecked && 'text-muted-foreground line-through',
                      )}
                    >
                      {item.food.name}
                    </span>
                    <span
                      className={cn(
                        'tabular shrink-0 text-sm',
                        isChecked ? 'text-muted-foreground' : 'font-semibold',
                      )}
                    >
                      {item.quantity}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>
      ))}
    </div>
  )
}
