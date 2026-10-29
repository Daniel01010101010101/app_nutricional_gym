import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: ReactNode
  htmlFor?: string
  description?: ReactNode
  error?: string | undefined
  children: ReactNode
  className?: string
  action?: ReactNode
}

/** Etiqueta + control + ayuda + error, con ids enlazados para lectores de pantalla. */
export function Field({
  label,
  htmlFor,
  description,
  error,
  children,
  className,
  action,
}: FieldProps) {
  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-sm font-semibold">
          {label}
        </Label>
        {action}
      </div>
      {children}
      {description && !error && (
        <p id={htmlFor ? `${htmlFor}-help` : undefined} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}
