import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Registra el service worker y avisa cuando hay una versión nueva o la app ya funciona sin conexión. */
export function PwaUpdater() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    toast('Hay una versión nueva de FORJA', {
      id: 'pwa-update',
      duration: Infinity,
      action: { label: 'Actualizar', onClick: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, updateServiceWorker])

  useEffect(() => {
    if (!offlineReady) return
    toast.success('FORJA ya funciona sin conexión.', { id: 'pwa-offline' })
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady])

  return null
}
