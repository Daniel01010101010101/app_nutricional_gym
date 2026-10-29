import { useMemo } from 'react'

import { ChipGroup, Segmented } from '@/components/form/ChipGroup'
import { ChoiceCards } from '@/components/form/ChoiceCards'
import { Field } from '@/components/form/Field'
import { MultiSelectSearch } from '@/components/form/MultiSelectSearch'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { Allergen, DietRestriction } from '@/domain/types'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { ALLERGEN_LABEL, RESTRICTION_LABEL } from '@/lib/labels'

import type { OnboardingValues } from '../model'
import { useStepField } from '../useStepField'

export function NutritionStep() {
  const repos = useRepositories()
  const { data: foods = [] } = useLive(() => repos.foods.observeAll(), [])
  const meals = useStepField('mealsPerDay')
  const time = useStepField('trainingTime')
  const restrictions = useStepField('restrictions')
  const allergens = useStepField('allergens')
  const disliked = useStepField('dislikedFoodIds')
  const budget = useStepField('budget')
  const cycling = useStepField('carbCycling')

  const foodItems = useMemo(() => foods.map((f) => ({ id: f.id, label: f.name })), [foods])
  const variable = time.value === ''

  return (
    <div className="space-y-7">
      <Field
        label="¿Cuántas comidas haces al día?"
        description="Incluye snacks. Repartiremos tus macros entre ellas."
      >
        <Segmented
          aria-label="Comidas al día"
          value={String(meals.value)}
          onChange={(v) => meals.onChange(Number(v) as OnboardingValues['mealsPerDay'])}
          options={['3', '4', '5', '6'].map((n) => ({ value: n, label: n }))}
        />
      </Field>

      <Field
        label="¿A qué hora sueles entrenar?"
        htmlFor={time.id}
        error={time.error}
        description="Ubicaremos tu comida pre-entreno 1–3 h antes y la post-entreno después."
        action={
          <label className="flex items-center gap-2 text-xs">
            Varía
            <Switch
              checked={variable}
              onCheckedChange={(on) => time.onChange(on ? '' : '18:00')}
              aria-label="Mi horario varía"
            />
          </label>
        }
      >
        {!variable && (
          <Input
            id={time.id}
            type="time"
            value={time.value}
            onChange={(e) => time.onChange(e.target.value)}
            className="h-12 rounded-xl text-base"
          />
        )}
      </Field>

      <Field label="Restricciones">
        <ChipGroup
          aria-label="Restricciones alimentarias"
          value={restrictions.value}
          onChange={(v: DietRestriction[]) => restrictions.onChange(v)}
          options={(Object.keys(RESTRICTION_LABEL) as DietRestriction[]).map((r) => ({
            value: r,
            label: RESTRICTION_LABEL[r],
          }))}
        />
      </Field>

      <Field label="Alergias">
        <ChipGroup
          aria-label="Alergias"
          value={allergens.value}
          onChange={(v: Allergen[]) => allergens.onChange(v)}
          options={(Object.keys(ALLERGEN_LABEL) as Allergen[]).map((a) => ({
            value: a,
            label: ALLERGEN_LABEL[a],
          }))}
        />
      </Field>

      <Field label="Alimentos que no te gustan">
        <MultiSelectSearch
          title="Alimentos que no te gustan"
          description="No los usaremos en tu plan de comidas."
          addLabel="Elegir alimentos"
          emptyLabel="Ninguno"
          items={foodItems}
          value={disliked.value}
          onChange={disliked.onChange}
        />
      </Field>

      <Field label="Presupuesto para la comida">
        <ChoiceCards
          aria-label="Presupuesto"
          columns={3}
          value={budget.value}
          onChange={budget.onChange}
          options={[
            { value: 'low', label: 'Bajo', description: 'Huevo, pollo, fríjol, arroz.' },
            { value: 'medium', label: 'Medio', description: '+ res, pescado, yogur griego.' },
            { value: 'high', label: 'Alto', description: '+ salmón, whey, frutos secos.' },
          ]}
        />
      </Field>

      <div className="flex items-start justify-between gap-4 rounded-2xl border bg-card p-4">
        <div>
          <label htmlFor={cycling.id} className="text-sm font-semibold">
            Ciclado de carbohidratos
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Más carbos los días de entreno y menos en descanso, con el mismo promedio semanal.
            Opcional.
          </p>
        </div>
        <Switch id={cycling.id} checked={cycling.value} onCheckedChange={cycling.onChange} />
      </div>
    </div>
  )
}
