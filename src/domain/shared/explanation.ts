/**
 * Cada número que muestra FORJA viene acompañado de una explicación generada por el
 * propio dominio. Así el botón "¿Por qué?" nunca queda desactualizado respecto al cálculo.
 */
export interface ExplanationStep {
  label: string
  value: string
}

export interface Explanation {
  /** Título corto: "Tu metabolismo basal". */
  title: string
  /** Una o dos frases en lenguaje claro. */
  summary: string
  /** Fórmula legible, si aplica. */
  formula?: string
  /** Sustitución paso a paso con tus datos. */
  steps?: ExplanationStep[]
  /** Por qué se usa esta regla. */
  rationale?: string
  /** Fuente científica o técnica. */
  reference?: string
}

export interface Calculated<T> {
  value: T
  explanation: Explanation
}

export function calculated<T>(value: T, explanation: Explanation): Calculated<T> {
  return { value, explanation }
}
