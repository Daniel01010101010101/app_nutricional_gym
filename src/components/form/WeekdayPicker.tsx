import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'

import { WEEKDAY_LABEL, WEEKDAY_SHORT } from '@/domain/training/days'
import { WEEKDAYS, type Weekday } from '@/domain/types'
import { cn } from '@/lib/utils'

interface WeekdayPickerProps {
  value: readonly Weekday[]
  onChange: (value: Weekday[]) => void
  id?: string
  'aria-label'?: string
}

export function WeekdayPicker({ value, onChange, ...rest }: WeekdayPickerProps) {
  return (
    <ToggleGroupPrimitive.Root
      type="multiple"
      value={value.map(String)}
      onValueChange={(next) => onChange(next.map(Number).sort((a, b) => a - b) as Weekday[])}
      className="grid grid-cols-7 gap-1.5"
      {...rest}
    >
      {WEEKDAYS.map((day) => (
        <ToggleGroupPrimitive.Item
          key={day}
          value={String(day)}
          aria-label={WEEKDAY_LABEL[day]}
          className={cn(
            'h-12 rounded-xl border bg-card text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
          )}
        >
          {WEEKDAY_SHORT[day]}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}
