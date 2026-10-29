import { Compass } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/layout/EmptyState'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <EmptyState
      className="mt-10"
      icon={Compass}
      title="Esta página no existe"
      description="Puede que el enlace esté desactualizado. Vuelve al inicio para seguir con tu plan."
      action={
        <Button asChild>
          <Link to="/">Ir a Hoy</Link>
        </Button>
      }
    />
  )
}
