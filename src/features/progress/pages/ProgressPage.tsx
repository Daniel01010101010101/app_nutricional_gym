import { ChartNoAxesCombined } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function ProgressPage() {
  return (
    <>
      <PageHeader title="Progreso" />
      <EmptyState
        icon={ChartNoAxesCombined}
        title="Progreso"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
