import { ClipboardCheck } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function CheckinPage() {
  return (
    <>
      <PageHeader title="Check-in semanal" />
      <EmptyState
        icon={ClipboardCheck}
        title="Check-in semanal"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
