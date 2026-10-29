import { useController, useFormContext, type FieldPath, type FieldPathValue } from 'react-hook-form'

import type { OnboardingValues } from './model'

/** Conecta un control al formulario del onboarding y limpia su error al cambiar. */
export function useStepField<K extends FieldPath<OnboardingValues>>(name: K) {
  const { control, clearErrors } = useFormContext<OnboardingValues>()
  const { field, fieldState } = useController({ control, name })
  return {
    id: name.replaceAll('.', '-'),
    value: field.value,
    onChange: (value: FieldPathValue<OnboardingValues, K>) => {
      field.onChange(value)
      if (fieldState.error) clearErrors(name)
    },
    onBlur: field.onBlur,
    error: fieldState.error?.message,
  }
}
