import { ChefHat } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function MealPlanPage() {
  return (
    <>
      <PageHeader title="Plan de comidas" />
      <EmptyState
        icon={ChefHat}
        title="Plan de comidas"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
