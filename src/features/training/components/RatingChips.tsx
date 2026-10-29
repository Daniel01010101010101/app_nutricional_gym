import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

interface RatingChipsProps {
  value: number | null
  onChange: (value: number) => void
  labels?: [string, string]
  'aria-label': string
  max?: number
  min?: number
}

/** Escala táctil (p. ej. 1–5 o RIR 0–4). */
export function RatingChips({
  value,
  onChange,
  labels,
  min = 1,
  max = 5,
  ...rest
}: RatingChipsProps) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div className="space-y-1">
      <ToggleGroupPrimitive.Root
        type="single"
        value={value === null ? '' : String(value)}
        onValueChange={(v) => {
          if (v) onChange(Number(v))
        }}
        className="flex gap-1.5"
        {...rest}
      >
        {options.map((n) => (
          <ToggleGroupPrimitive.Item
            key={n}
            value={String(n)}
            className={cn(
              'h-11 flex-1 rounded-xl border bg-card text-base font-bold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
            )}
          >
            {n}
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>
      {labels && (
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  )
}
