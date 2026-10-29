import { motion } from 'motion/react'
import { NavLink } from 'react-router'

import { cn } from '@/lib/utils'

import { NAV_ITEMS } from './nav-items'

export function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-safe backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid h-(--nav-height) max-w-xl grid-cols-5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-indicator"
                      className="absolute top-0 h-1 w-8 rounded-b-full bg-primary"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon
                    aria-hidden
                    className={cn('size-6', isActive && 'text-primary')}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
