import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useThemeStore } from '@/stores/theme'

import { createAppRouter } from './router'

export function App() {
  const [router] = useState(createAppRouter)
  const syncWithSystem = useThemeStore((s) => s.syncWithSystem)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    media.addEventListener('change', syncWithSystem)
    return () => media.removeEventListener('change', syncWithSystem)
  }, [syncWithSystem])

  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
      <Toaster />
    </TooltipProvider>
  )
}
