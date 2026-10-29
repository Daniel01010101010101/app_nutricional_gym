import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface ProgressRingProps {
  value: number
  max: number
  size?: number
  stroke?: number
  /** Clase de color de texto (el anillo usa currentColor). */
  colorClass?: string
  children?: ReactNode
  label: string
  className?: string
}

/** Anillo de progreso accesible. Si se pasa del objetivo, el anillo completo cambia de tono. */
export function ProgressRing({
  value,
  max,
  size = 88,
  stroke = 9,
  colorClass = 'text-primary',
  children,
  label,
  className,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = max > 0 ? Math.min(value / max, 1) : 0
  const over = max > 0 && value > max * 1.1
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          className={cn(colorClass, over && 'opacity-60')}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - ratio) }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
