import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router'

import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'

/** Decide si mostrar el onboarding o la app según exista un perfil guardado. */
export function RootLayout() {
  const repos = useRepositories()
  const location = useLocation()
  const { data: profile, loading } = useLive(() => repos.profile.observe(), [])
  const onOnboarding = location.pathname.startsWith('/onboarding')

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status">
        <Loader2 aria-label="Cargando FORJA" className="size-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!profile && !onOnboarding) return <Navigate to="/onboarding" replace />
  if (profile && onOnboarding) return <Navigate to="/" replace />

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
