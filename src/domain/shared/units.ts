import type { WeightUnit } from '../types'

export const KG_PER_LB = 0.45359237

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value)
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg)
}
