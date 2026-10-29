import { createContext, useContext } from 'react'

import type { Repositories } from '@/data/repositories/types'

export const RepositoriesContext = createContext<Repositories | null>(null)

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoriesContext)
  if (!repositories) throw new Error('useRepositories debe usarse dentro de <RepositoryProvider>.')
  return repositories
}
