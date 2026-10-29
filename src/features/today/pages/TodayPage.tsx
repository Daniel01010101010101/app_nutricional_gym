import { House } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function TodayPage() {
  return (
    <>
      <PageHeader title="Hoy" />
      <EmptyState
        icon={House}
        title="Hoy"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
