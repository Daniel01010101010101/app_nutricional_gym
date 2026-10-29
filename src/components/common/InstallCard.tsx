import { Download, Share, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { isIOS, isStandalone, useInstall } from '@/stores/install'

const DISMISS_KEY = 'forja-install-dismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Invita a instalar la app en el teléfono (Android/escritorio con un toque; iPhone con instrucciones). */
export function InstallCard({ dismissible = true }: { dismissible?: boolean }) {
  const deferred = useInstall((s) => s.deferred)
  const installed = useInstall((s) => s.installed)
  const markInstalled = useInstall((s) => s.markInstalled)
  const [dismissed, setDismissed] = useState(() => dismissible && readDismissed())
  const ios = isIOS()

  if (dismissed || installed || isStandalone() || (!deferred && !ios)) return null

  return (
    <section
      className="relative flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4"
      aria-label="Instalar FORJA"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Download aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2 pr-6">
        <p className="font-semibold">Instala FORJA en tu teléfono</p>
        {deferred ? (
          <>
            <p className="text-sm text-muted-foreground">
              Ábrela desde tu pantalla de inicio y úsala sin internet en el gimnasio.
            </p>
            <Button
              size="sm"
              onClick={async () => {
                await deferred.prompt()
                const choice = await deferred.userChoice
                if (choice.outcome === 'accepted') markInstalled()
              }}
            >
              <Download /> Instalar
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            En Safari toca{' '}
            <Share aria-label="Compartir" className="inline size-4 align-text-bottom" /> y luego{' '}
            <strong>“Agregar a inicio”</strong>. Funciona sin internet.
          </p>
        )}
      </div>
      {dismissible && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-2"
          aria-label="Ocultar"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, '1')
            } catch {
              // Sin almacenamiento: se oculta solo por esta visita.
            }
            setDismissed(true)
          }}
        >
          <X />
        </Button>
      )}
    </section>
  )
}
