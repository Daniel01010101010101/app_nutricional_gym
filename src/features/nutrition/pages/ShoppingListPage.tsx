import { ShoppingCart } from 'lucide-react'

import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function ShoppingListPage() {
  return (
    <>
      <PageHeader title="Lista de mercado" />
      <EmptyState
        icon={ShoppingCart}
        title="Lista de mercado"
        description="Esta sección se activa en la siguiente fase."
      />
    </>
  )
}
