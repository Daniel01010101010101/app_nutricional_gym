import type { Repositories } from '@/data/repositories/types'
import { useThemeStore, type ThemePreference } from '@/stores/theme'

const THEMES: ThemePreference[] = ['dark', 'light', 'system']

/** Lee un archivo JSON de respaldo y restaura todos los datos. */
export async function restoreFromFile(
  repos: Repositories,
  file: File,
): Promise<Record<string, number>> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const { theme, counts } = await repos.data.importAll(json)
  if (theme && (THEMES as string[]).includes(theme))
    useThemeStore.getState().setPreference(theme as ThemePreference)
  return counts
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
