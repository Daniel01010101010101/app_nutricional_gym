import { Sparkles } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function OnboardingPage() {
  return (
    <>
      <PageHeader title="Bienvenido" />
      <EmptyState
        icon={Sparkles}
        title="Bienvenido"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
