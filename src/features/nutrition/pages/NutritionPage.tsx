import { UtensilsCrossed } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function NutritionPage() {
  return (
    <>
      <PageHeader title="Nutrición" />
      <EmptyState
        icon={UtensilsCrossed}
        title="Nutrición"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
