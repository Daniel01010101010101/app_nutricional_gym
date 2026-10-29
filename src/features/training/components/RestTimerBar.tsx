import { BellRing, Minus, Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { useLive } from '@/hooks/useLive'
import { useNow } from '@/hooks/useNow'
import { useRepositories } from '@/hooks/useRepositories'
import { beep, vibrate } from '@/lib/feedback'
import { cn } from '@/lib/utils'
import { useRestTimer } from '@/stores/restTimer'

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Temporizador de descanso flotante: suena y vibra al terminar. */
export function RestTimerBar() {
  const repos = useRepositories()
  const { data: settings } = useLive(() => repos.settings.observe(), [])
  const { endsAt, durationSec, label, add, stop } = useRestTimer()
  const now = useNow(250, endsAt !== null)
  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000))
  const done = endsAt !== null && remaining === 0
  const fired = useRef<number | null>(null)

  useEffect(() => {
    if (!done || endsAt === null || fired.current === endsAt) return
    fired.current = endsAt
    if (settings?.timerSound !== false) beep()
    if (settings?.timerVibration !== false) vibrate([300, 150, 300])
    const id = window.setTimeout(stop, 5000)
    return () => window.clearTimeout(id)
  }, [done, endsAt, settings, stop])

  const progress = durationSec > 0 ? 1 - remaining / durationSec : 1

  return (
    <AnimatePresence>
      {endsAt !== null && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-40 px-3 lg:bottom-4 lg:left-60"
        >
          <div
            role="timer"
            aria-live="polite"
            aria-label={done ? 'Descanso terminado' : `Descanso: ${clock(remaining)}`}
            className={cn(
              'pointer-events-auto relative mx-auto flex max-w-xl items-center gap-2 overflow-hidden rounded-2xl border bg-popover p-2 pl-4 shadow-2xl',
              done && 'border-primary',
            )}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-primary/15"
              style={{ width: `${progress * 100}%` }}
            />
            <div className="relative min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-muted-foreground uppercase">
                {done ? '¡A la siguiente serie!' : `Descanso · ${label}`}
              </p>
              <p className="tabular font-display text-3xl leading-none font-bold">
                {done ? <BellRing className="inline size-7 text-primary" /> : clock(remaining)}
              </p>
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="relative"
              aria-label="Restar 15 segundos"
              onClick={() => add(-15)}
            >
              <Minus />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="relative"
              aria-label="Sumar 15 segundos"
              onClick={() => add(15)}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Cerrar temporizador"
              onClick={stop}
            >
              <X />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
