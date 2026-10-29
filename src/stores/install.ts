import { create } from 'zustand'

/** Evento no estándar (Chrome/Edge/Android) que permite mostrar el diálogo de instalación. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallState {
  deferred: BeforeInstallPromptEvent | null
  installed: boolean
  setDeferred: (event: BeforeInstallPromptEvent | null) => void
  markInstalled: () => void
}

export const useInstall = create<InstallState>()((set) => ({
  deferred: null,
  installed: false,
  setDeferred: (deferred) => set({ deferred }),
  markInstalled: () => set({ installed: true, deferred: null }),
}))

/** Escucha los eventos de instalación desde el arranque (antes de que se monte cualquier pantalla). */
export function listenForInstall() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    useInstall.getState().setDeferred(event as BeforeInstallPromptEvent)
  })
  window.addEventListener('appinstalled', () => useInstall.getState().markInstalled())
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
