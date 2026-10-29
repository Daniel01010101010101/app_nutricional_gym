import { ListOrdered } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function PlanEditorPage() {
  return (
    <>
      <PageHeader title="Editar plan" />
      <EmptyState
        icon={ListOrdered}
        title="Editar plan"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
