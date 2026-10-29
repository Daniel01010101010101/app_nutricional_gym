import { Timer } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function SessionPage() {
  return (
    <>
      <PageHeader title="Entreno en curso" />
      <EmptyState
        icon={Timer}
        title="Entreno en curso"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
