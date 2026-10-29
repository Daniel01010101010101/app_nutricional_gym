import { Dumbbell } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function TrainingPage() {
  return (
    <>
      <PageHeader title="Entreno" />
      <EmptyState
        icon={Dumbbell}
        title="Entreno"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
