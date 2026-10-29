import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { RepositoryProvider } from '@/app/RepositoryProvider'
import { ForjaDB } from '@/data/db'
import { newId } from '@/data/defaults'
import { createDexieRepositories } from '@/data/repositories/dexie'
import type { Repositories } from '@/data/repositories/types'

export function createTestRepositories(): { repos: Repositories; db: ForjaDB } {
  const db = new ForjaDB(`test-${newId()}`)
  return { repos: createDexieRepositories(db), db }
}

interface RenderOptions {
  path?: string
  route?: string
  repos?: Repositories
  extraRoutes?: { path: string; element: ReactElement }[]
}

/** Renderiza una pantalla con router en memoria y repositorios sobre IndexedDB simulada. */
export function renderScreen(ui: ReactElement, options: RenderOptions = {}) {
  const repos = options.repos ?? createTestRepositories().repos
  const path = options.path ?? '/'
  const router = createMemoryRouter(
    [
      { path, element: ui },
      ...(options.extraRoutes ?? []).map((r) => ({ path: r.path, element: r.element })),
    ],
    { initialEntries: [options.route ?? path] },
  )
  const result = render(
    <RepositoryProvider repositories={repos}>
      <RouterProvider router={router} />
    </RepositoryProvider>,
  )
  return { ...result, repos, router }
}
