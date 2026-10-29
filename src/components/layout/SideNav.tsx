import { NavLink } from 'react-router'

import { cn } from '@/lib/utils'

import { Logo } from './Logo'
import { NAV_ITEMS } from './nav-items'

export function SideNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-2 border-r bg-card/50 p-4 lg:flex"
    >
      <div className="px-2 py-3">
        <Logo />
      </div>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary/12 text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon aria-hidden className={cn('size-5', isActive && 'text-primary')} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
