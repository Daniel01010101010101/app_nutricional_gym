import type { ReactNode } from 'react'

import type { Repositories } from '@/data/repositories/types'
import { RepositoriesContext } from '@/hooks/useRepositories'

export function RepositoryProvider({
  repositories,
  children,
}: {
  repositories: Repositories
  children: ReactNode
}) {
  return (
    <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>
  )
}
