import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Ruta a la que vuelve el botón atrás. `true` usa el historial. */
  back?: string | true
  actions?: ReactNode
  className?: string
  eyebrow?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  className,
  eyebrow,
}: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className={cn('flex items-start gap-3 pt-safe pb-4', className)}>
      {back && (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
          aria-label="Volver"
          onClick={() => {
            if (back === true) void navigate(-1)
            else void navigate(back)
          }}
        >
          <ChevronLeft className="size-6" />
        </Button>
      )}
      <div className="min-w-0 flex-1 pt-1">
        {eyebrow && (
          <p className="mb-0.5 text-xs font-semibold tracking-wider text-primary-text uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate font-display text-3xl leading-tight font-bold tracking-wide">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1 pt-1">{actions}</div>}
    </header>
  )
}
