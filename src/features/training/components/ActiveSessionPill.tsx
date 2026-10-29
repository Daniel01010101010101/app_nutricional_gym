import { Dumbbell } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { useLive } from '@/hooks/useLive'
import { useNow } from '@/hooks/useNow'
import { useRepositories } from '@/hooks/useRepositories'
import { elapsedClock } from '@/lib/format'

/** Acceso rápido al entreno en curso desde cualquier pestaña. */
export function ActiveSessionPill() {
  const repos = useRepositories()
  const location = useLocation()
  const { data: active } = useLive(() => repos.workouts.observeActive(), [])
  const hidden = !active || location.pathname.startsWith('/entreno/sesion')
  const now = useNow(1000, !hidden)
  if (hidden) return null
  return (
    <Link
      to="/entreno/sesion"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-primary py-1.5 pt-safe text-sm font-semibold text-primary-foreground shadow-lg"
    >
      <Dumbbell aria-hidden className="size-4" />
      {active.title} en curso ·{' '}
      <span className="tabular">{elapsedClock(active.startedAt, now)}</span> · Volver
    </Link>
  )
}
