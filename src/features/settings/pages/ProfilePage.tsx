import { User } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function ProfilePage() {
  return (
    <>
      <PageHeader title="Perfil" />
      <EmptyState
        icon={User}
        title="Perfil"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
