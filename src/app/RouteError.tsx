import { TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'

import { Button } from '@/components/ui/button'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Error desconocido'

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert aria-hidden className="size-7" />
      </div>
      <h1 className="font-display text-3xl font-bold">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">
        Tus datos están a salvo en este dispositivo. Recarga la app para continuar.
      </p>
      <pre className="max-w-full overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
        {message}
      </pre>
      <Button onClick={() => window.location.reload()}>Recargar</Button>
    </div>
  )
}
