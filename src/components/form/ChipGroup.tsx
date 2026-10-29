import { Check } from 'lucide-react'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface ChipOption<T extends string> {
  value: T
  label: ReactNode
}

interface ChipGroupProps<T extends string> {
  value: readonly T[]
  onChange: (value: T[]) => void
  options: readonly ChipOption<T>[]
  max?: number
  'aria-label'?: string
  id?: string
}

/** Selección múltiple en forma de chips (accesible con teclado). */
export function ChipGroup<T extends string>({
  value,
  onChange,
  options,
  max,
  ...rest
}: ChipGroupProps<T>) {
  return (
    <ToggleGroupPrimitive.Root
      type="multiple"
      value={[...value]}
      onValueChange={(next) => {
        if (max !== undefined && next.length > max) return
        onChange(next as T[])
      }}
      className="flex flex-wrap gap-2"
      {...rest}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-full border bg-card px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'hover:bg-accent/60 data-[state=on]:border-primary data-[state=on]:bg-primary/12',
          )}
        >
          <Check
            aria-hidden
            className="hidden size-4 text-primary-text [[data-state=on]_&]:block"
          />
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}

interface SegmentedProps<T extends string> {
  value: T | undefined
  onChange: (value: T) => void
  options: readonly ChipOption<T>[]
  'aria-label'?: string
  className?: string
  size?: 'sm' | 'default'
}

/** Control segmentado de selección única. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'default',
  ...rest
}: SegmentedProps<T>) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value ?? ''}
      onValueChange={(next) => {
        if (next) onChange(next as T)
      }}
      className={cn('flex rounded-xl bg-secondary p-1', className)}
      {...rest}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            'flex-1 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm',
            size === 'sm' ? 'h-8' : 'h-10',
          )}
        >
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}
