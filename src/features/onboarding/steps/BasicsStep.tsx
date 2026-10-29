import { Field } from '@/components/form/Field'
import { ChoiceCards } from '@/components/form/ChoiceCards'
import { Segmented } from '@/components/form/ChipGroup'
import { NumberField } from '@/components/form/NumberField'
import { Input } from '@/components/ui/input'

import { useStepField } from '../useStepField'

export function BasicsStep() {
  const name = useStepField('name')
  const sex = useStepField('sex')
  const age = useStepField('age')
  const height = useStepField('heightCm')
  const weight = useStepField('weight')
  const unit = useStepField('unit')

  return (
    <div className="space-y-6">
      <Field label="¿Cómo te llamas?" htmlFor={name.id} error={name.error}>
        <Input
          id={name.id}
          value={name.value}
          onChange={(e) => name.onChange(e.target.value)}
          onBlur={name.onBlur}
          autoComplete="given-name"
          placeholder="Tu nombre"
          className="h-12 rounded-xl text-base"
          aria-invalid={name.error ? true : undefined}
        />
      </Field>

      <Field
        label="Sexo"
        error={sex.error}
        description="Se usa en las fórmulas de metabolismo y de % de grasa."
      >
        <ChoiceCards
          aria-label="Sexo"
          columns={2}
          value={sex.value}
          onChange={sex.onChange}
          invalid={Boolean(sex.error)}
          options={[
            { value: 'male', label: 'Hombre' },
            { value: 'female', label: 'Mujer' },
          ]}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad" htmlFor={age.id} error={age.error}>
          <NumberField
            id={age.id}
            value={age.value}
            onChange={age.onChange}
            unit="años"
            decimals={0}
            invalid={Boolean(age.error)}
            placeholder="30"
          />
        </Field>
        <Field label="Altura" htmlFor={height.id} error={height.error}>
          <NumberField
            id={height.id}
            value={height.value}
            onChange={height.onChange}
            unit="cm"
            decimals={1}
            invalid={Boolean(height.error)}
            placeholder="175"
          />
        </Field>
      </div>

      <Field
        label="Peso actual"
        htmlFor={weight.id}
        error={weight.error}
        description="Idealmente en ayunas. La unidad que elijas se usará en toda la app."
        action={
          <Segmented
            aria-label="Unidad de peso"
            size="sm"
            className="w-28"
            value={unit.value}
            onChange={unit.onChange}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
        }
      >
        <NumberField
          id={weight.id}
          value={weight.value}
          onChange={weight.onChange}
          unit={unit.value}
          decimals={1}
          invalid={Boolean(weight.error)}
          placeholder={unit.value === 'kg' ? '80' : '176'}
        />
      </Field>
    </div>
  )
}
