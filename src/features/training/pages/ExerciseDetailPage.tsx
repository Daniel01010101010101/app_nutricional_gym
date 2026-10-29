import { Dumbbell } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function ExerciseDetailPage() {
  return (
    <>
      <PageHeader title="Ejercicio" />
      <EmptyState
        icon={Dumbbell}
        title="Ejercicio"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
