import { History } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function HistoryPage() {
  return (
    <>
      <PageHeader title="Historial" />
      <EmptyState
        icon={History}
        title="Historial"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
