import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

interface NativeSelectProps<T extends string> {
  id?: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  className?: string
  'aria-label'?: string
}

/** Selector nativo: en el celular abre la rueda del sistema, más cómoda que un menú flotante. */
export function NativeSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  className,
  ...aria
}: NativeSelectProps<T>) {
  return (
    <div className={cn('relative', className)}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-12 w-full appearance-none rounded-xl border border-input bg-card pr-10 pl-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        {...aria}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}
