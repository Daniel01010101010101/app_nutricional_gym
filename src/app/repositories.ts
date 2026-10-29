import { ForjaDB } from '@/data/db'
import { createDexieRepositories } from '@/data/repositories/dexie'
import type { Repositories } from '@/data/repositories/types'

let instance: Repositories | null = null

/** Repositorios de la app (una sola base de datos por pestaña). */
export function getRepositories(): Repositories {
  instance ??= createDexieRepositories(new ForjaDB())
  return instance
}
