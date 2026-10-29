/** Normaliza texto para búsquedas: minúsculas, sin tildes y espacios simples. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.,+@\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOPWORDS = new Set([
  'de',
  'del',
  'con',
  'en',
  'la',
  'el',
  'los',
  'las',
  'a',
  'al',
  'y',
  'the',
  'with',
  'on',
])

export function tokens(text: string): string[] {
  return normalizeText(text)
    .split(/[\s-]+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
}

/** Distancia de edición de Levenshtein. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        (current[j - 1] as number) + 1,
        (previous[j] as number) + 1,
        (previous[j - 1] as number) + cost,
      )
    }
    previous = current
  }
  return previous[b.length] as number
}

function tokenMatches(query: string, candidate: string): boolean {
  if (query === candidate) return true
  if (query.length >= 3 && candidate.startsWith(query)) return true
  const maxTypos = query.length >= 7 ? 2 : query.length >= 4 ? 1 : 0
  return maxTypos > 0 && levenshtein(query, candidate) <= maxTypos
}

/** Similitud 0–1 entre una consulta y un nombre, tolerante a tildes, orden y errores de tipeo. */
export function similarity(query: string, candidate: string): number {
  const q = normalizeText(query)
  const c = normalizeText(candidate)
  if (q.length === 0 || c.length === 0) return 0
  if (q === c) return 1

  const qt = tokens(q)
  const ct = tokens(c)
  const matched = qt.filter((t) => ct.some((u) => tokenMatches(t, u))).length
  const covered = ct.filter((u) => qt.some((t) => tokenMatches(t, u))).length
  const tokenScore =
    qt.length > 0 && matched === qt.length
      ? 0.75 + 0.24 * (covered / ct.length)
      : qt.length > 0
        ? 0.6 * (matched / qt.length) * (covered / Math.max(ct.length, 1))
        : 0
  const editScore = 1 - levenshtein(q, c) / Math.max(q.length, c.length)
  return Math.max(tokenScore, editScore * 0.95)
}
