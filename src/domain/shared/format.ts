/** Formato numérico en español (Colombia): coma decimal. */
const formatters = new Map<number, Intl.NumberFormat>()

export function fmt(value: number, decimals = 0): string {
  let formatter = formatters.get(decimals)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
      useGrouping: 'min2',
    })
    formatters.set(decimals, formatter)
  }
  return formatter.format(value)
}

export function fmtPct(value: number, decimals = 1): string {
  return `${fmt(value, decimals)} %`
}

export function fmtKg(value: number, decimals = 1): string {
  return `${fmt(value, decimals)} kg`
}
