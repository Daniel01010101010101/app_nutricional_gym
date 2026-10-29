import { BookOpen } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function ExerciseLibraryPage() {
  return (
    <>
      <PageHeader title="Ejercicios" />
      <EmptyState
        icon={BookOpen}
        title="Ejercicios"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
