import { Outlet, useLocation } from 'react-router'

import { BottomNav } from '@/components/layout/BottomNav'
import { SideNav } from '@/components/layout/SideNav'

export function AppShell() {
  const location = useLocation()
  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          key={location.pathname.split('/')[1]}
          id="contenido"
          className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+1.5rem)] sm:px-6 lg:pt-8 lg:pb-12"
        >
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
