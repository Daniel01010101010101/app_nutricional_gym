import { Trophy } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function SessionSummaryPage() {
  return (
    <>
      <PageHeader title="Resumen" />
      <EmptyState
        icon={Trophy}
        title="Resumen"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
