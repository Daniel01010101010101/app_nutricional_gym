import { Minus, Plus } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { parseDecimal } from '@/lib/format'
import { cn } from '@/lib/utils'

function display(value: number | undefined, decimals: number): string {
  if (value === undefined || Number.isNaN(value)) return ''
  const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals
  return String(rounded).replace('.', ',')
}

export interface NumberFieldProps {
  id?: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  onBlur?: () => void
  unit?: string
  decimals?: number
  step?: number
  min?: number
  max?: number
  placeholder?: string
  /** Muestra botones − / + grandes (útil en el gym). */
  steppers?: boolean
  invalid?: boolean
  className?: string
  inputClassName?: string
  'aria-label'?: string
  'aria-describedby'?: string
  autoFocus?: boolean
  size?: 'default' | 'lg'
}

/**
 * Campo numérico con teclado decimal en el celular. Acepta coma o punto como separador
 * decimal y mantiene lo que el usuario escribe mientras edita.
 */
export function NumberField({
  id,
  value,
  onChange,
  onBlur,
  unit,
  decimals = 1,
  step = 1,
  min,
  max,
  placeholder,
  steppers = false,
  invalid,
  className,
  inputClassName,
  autoFocus,
  size = 'default',
  ...aria
}: NumberFieldProps) {
  // Mientras se edita se muestra el texto tal cual; al salir, el valor formateado.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? display(value, decimals)

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
  const bump = (direction: 1 | -1) => {
    const next = clamp(Math.round(((value ?? 0) + direction * step) * 1000) / 1000)
    onChange(next)
    if (draft !== null) setDraft(display(next, decimals))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      bump(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      bump(-1)
    }
  }

  const height = size === 'lg' ? 'h-14 text-2xl' : 'h-12 text-lg'

  return (
    <div className={cn('flex w-full min-w-0 items-stretch gap-2', className)}>
      {steppers && (
        <Button
          type="button"
          variant="secondary"
          size={size === 'lg' ? 'icon-lg' : 'icon'}
          className={cn(size === 'lg' ? 'h-14 w-14' : 'h-12 w-12')}
          aria-label="Disminuir"
          onClick={() => bump(-1)}
        >
          <Minus />
        </Button>
      )}
      <div
        className={cn(
          'relative flex min-w-0 flex-1 items-center rounded-xl border border-input bg-card px-3 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          invalid && 'border-destructive ring-destructive/20',
        )}
      >
        <input
          id={id}
          type="text"
          size={1}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder={placeholder}
          value={text}
          autoFocus={autoFocus}
          aria-invalid={invalid ?? undefined}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d.,-]/g, '')
            setDraft(next)
            onChange(parseDecimal(next))
          }}
          onFocus={(e) => {
            setDraft(display(value, decimals))
            e.currentTarget.select()
          }}
          onBlur={() => {
            setDraft(null)
            onBlur?.()
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'tabular w-full min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60',
            height,
            inputClassName,
          )}
          {...aria}
        />
        {unit && <span className="pl-2 text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
      {steppers && (
        <Button
          type="button"
          variant="secondary"
          size={size === 'lg' ? 'icon-lg' : 'icon'}
          className={cn(size === 'lg' ? 'h-14 w-14' : 'h-12 w-12')}
          aria-label="Aumentar"
          onClick={() => bump(1)}
        >
          <Plus />
        </Button>
      )}
    </div>
  )
}
