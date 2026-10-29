import { Trophy } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function RecordsPage() {
  return (
    <>
      <PageHeader title="Récords" />
      <EmptyState
        icon={Trophy}
        title="Récords"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
