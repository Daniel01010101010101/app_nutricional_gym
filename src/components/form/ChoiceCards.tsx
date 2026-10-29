import type { LucideIcon } from 'lucide-react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface Choice<T extends string> {
  value: T
  label: ReactNode
  description?: ReactNode
  icon?: LucideIcon
}

interface ChoiceCardsProps<T extends string> {
  value: T | undefined
  onChange: (value: T) => void
  options: readonly Choice<T>[]
  columns?: 1 | 2 | 3
  'aria-label'?: string
  id?: string
  invalid?: boolean
}

/** Grupo de opciones grandes y fáciles de tocar (radio accesible con flechas). */
export function ChoiceCards<T extends string>({
  value,
  onChange,
  options,
  columns = 1,
  invalid,
  ...rest
}: ChoiceCardsProps<T>) {
  return (
    <RadioGroupPrimitive.Root
      value={value ?? ''}
      onValueChange={(v) => onChange(v as T)}
      className={cn('grid gap-2', columns === 2 && 'grid-cols-2', columns === 3 && 'grid-cols-3')}
      aria-invalid={invalid ?? undefined}
      {...rest}
    >
      {options.map(({ value: optionValue, label, description, icon: Icon }) => (
        <RadioGroupPrimitive.Item
          key={optionValue}
          value={optionValue}
          className={cn(
            'flex min-h-14 items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'hover:bg-accent/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary/10',
          )}
        >
          {Icon && (
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground [[data-state=checked]_&]:bg-primary [[data-state=checked]_&]:text-primary-foreground">
              <Icon aria-hidden className="size-5" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{label}</span>
            {description && (
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {description}
              </span>
            )}
          </span>
          <span
            aria-hidden
            className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-input [[data-state=checked]_&]:border-primary"
          >
            <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  )
}
