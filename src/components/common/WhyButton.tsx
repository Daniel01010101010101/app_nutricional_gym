import { CircleHelp } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { Explanation } from '@/domain/shared/explanation'
import { cn } from '@/lib/utils'

export function ExplanationBody({ explanation }: { explanation: Explanation }) {
  return (
    <div className="space-y-4 text-sm">
      {explanation.formula && (
        <div className="rounded-xl bg-muted p-3">
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Fórmula
          </p>
          <p className="font-mono text-[13px] leading-relaxed">{explanation.formula}</p>
        </div>
      )}
      {explanation.steps && explanation.steps.length > 0 && (
        <dl className="divide-y rounded-xl border">
          {explanation.steps.map((step, i) => (
            <div key={`${step.label}-${i}`} className="flex gap-3 p-3">
              <dt className="w-28 shrink-0 text-xs font-semibold text-muted-foreground">
                {step.label}
              </dt>
              <dd className="tabular flex-1">{step.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {explanation.rationale && (
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Por qué
          </p>
          <p className="leading-relaxed">{explanation.rationale}</p>
        </div>
      )}
      {explanation.reference && (
        <p className="text-xs text-muted-foreground">Fuente: {explanation.reference}</p>
      )}
    </div>
  )
}

interface WhyButtonProps {
  explanation: Explanation
  className?: string
  label?: ReactNode
  /** Muestra solo el ícono (para usar junto a un número). */
  compact?: boolean
}

interface ExplanationDrawerProps {
  explanation: Explanation
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Hoja inferior con la explicación completa de un cálculo. */
export function ExplanationDrawer({ explanation, open, onOpenChange }: ExplanationDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-2xl">{explanation.title}</DrawerTitle>
          <DrawerDescription className="text-sm leading-relaxed text-foreground/90">
            {explanation.summary}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-2">
          <ExplanationBody explanation={explanation} />
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="secondary">Entendido</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

/** Botón "¿Por qué?" que abre una hoja con la explicación del cálculo. */
export function WhyButton({
  explanation,
  className,
  label = '¿Por qué?',
  compact = false,
}: WhyButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={compact ? 'icon-sm' : 'xs'}
        className={cn(
          'text-primary-text hover:text-primary-text',
          !compact && 'h-7 px-2',
          className,
        )}
        aria-label={compact ? `¿Por qué? ${explanation.title}` : undefined}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <CircleHelp aria-hidden className={compact ? 'size-4' : 'size-3.5'} />
        {!compact && label}
      </Button>
      <ExplanationDrawer explanation={explanation} open={open} onOpenChange={setOpen} />
    </>
  )
}
