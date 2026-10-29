import { useEffect, useMemo } from 'react'

const pendingRevokes = new Map<string, number>()

/**
 * URL temporal para mostrar un Blob (foto). Se libera un momento después de desmontar,
 * para que un remontaje inmediato (p. ej. en modo estricto) no la encuentre ya liberada.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => {
    if (!url) return
    window.clearTimeout(pendingRevokes.get(url))
    pendingRevokes.delete(url)
    return () => {
      pendingRevokes.set(
        url,
        window.setTimeout(() => {
          URL.revokeObjectURL(url)
          pendingRevokes.delete(url)
        }, 1000),
      )
    }
  }, [url])
  return url
}
