import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface SectionProps {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

export function Section({ title, action, children, className, id }: SectionProps) {
  return (
    <section className={cn('space-y-3', className)} aria-labelledby={id}>
      {(title ?? action) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <h2
              id={id}
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
