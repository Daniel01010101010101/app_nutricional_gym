import { Scale } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function BodyLogPage() {
  return (
    <>
      <PageHeader title="Peso y medidas" />
      <EmptyState
        icon={Scale}
        title="Peso y medidas"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
