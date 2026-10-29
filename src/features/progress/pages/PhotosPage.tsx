import { Camera } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function PhotosPage() {
  return (
    <>
      <PageHeader title="Fotos" />
      <EmptyState
        icon={Camera}
        title="Fotos"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
