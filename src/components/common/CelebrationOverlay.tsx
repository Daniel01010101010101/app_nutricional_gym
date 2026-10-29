import { Trophy } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'

import { useCelebration } from '@/stores/celebration'

const SPARKS = Array.from({ length: 14 }, (_, i) => i)

/** Animación de celebración para récords personales. */
export function CelebrationOverlay() {
  const current = useCelebration((s) => s.queue[0])
  const dismiss = useCelebration((s) => s.dismiss)

  useEffect(() => {
    if (!current) return
    const id = window.setTimeout(dismiss, 2800)
    return () => window.clearTimeout(id)
  }, [current, dismiss])

  return (
    <AnimatePresence>
      {current && (
        <motion.button
          key={current.id}
          type="button"
          onClick={dismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
          aria-label={`${current.title}. ${current.detail}. Toca para cerrar.`}
        >
          <motion.div
            initial={{ scale: 0.6, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="relative w-full max-w-xs rounded-3xl border bg-card p-6 text-center shadow-2xl"
          >
            {SPARKS.map((i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute top-1/3 left-1/2 size-2 rounded-full bg-primary"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: Math.cos((i / SPARKS.length) * Math.PI * 2) * 120,
                  y: Math.sin((i / SPARKS.length) * Math.PI * 2) * 120,
                  opacity: 0,
                }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            ))}
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Trophy className="size-9" />
            </div>
            <p className="mt-4 font-display text-3xl font-bold">{current.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{current.detail}</p>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
