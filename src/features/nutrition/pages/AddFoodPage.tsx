import { Plus } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function AddFoodPage() {
  return (
    <>
      <PageHeader title="Agregar alimento" />
      <EmptyState
        icon={Plus}
        title="Agregar alimento"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
