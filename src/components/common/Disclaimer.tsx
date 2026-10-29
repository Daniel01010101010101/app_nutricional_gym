import { ShieldAlert } from 'lucide-react'

import { LEGAL_DISCLAIMER } from '@/domain/safety/health'
import { cn } from '@/lib/utils'

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 text-xs leading-relaxed text-muted-foreground',
        className,
      )}
    >
      <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{LEGAL_DISCLAIMER}</span>
    </p>
  )
}
