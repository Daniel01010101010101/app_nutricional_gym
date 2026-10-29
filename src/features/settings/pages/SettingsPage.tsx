import { Settings } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Ajustes" />
      <EmptyState
        icon={Settings}
        title="Ajustes"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
