import type { Muscle } from '@/domain/types'
import { cn } from '@/lib/utils'

interface Shape {
  muscle: Muscle | null
  d?: string
  cx?: number
  cy?: number
  rx?: number
  ry?: number
}

const ellipse = (muscle: Muscle | null, cx: number, cy: number, rx: number, ry: number): Shape => ({
  muscle,
  cx,
  cy,
  rx,
  ry,
})

/** Silueta frontal y posterior simplificada (dibujo propio). */
const FRONT: Shape[] = [
  ellipse(null, 50, 16, 10, 12),
  { muscle: null, d: 'M44 27h12v8H44z' },
  ellipse('shoulders', 30, 46, 9, 9),
  ellipse('shoulders', 70, 46, 9, 9),
  { muscle: 'chest', d: 'M36 40h13v20a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z' },
  { muscle: 'chest', d: 'M51 40h13v20a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z' },
  ellipse('biceps', 24, 68, 6, 13),
  ellipse('biceps', 76, 68, 6, 13),
  ellipse('forearms', 20, 96, 5, 13),
  ellipse('forearms', 80, 96, 5, 13),
  { muscle: 'abs', d: 'M40 68h20v30a5 5 0 0 1-5 5H45a5 5 0 0 1-5-5z' },
  { muscle: null, d: 'M38 104h24l-2 10H40z' },
  ellipse('quads', 42, 132, 8, 22),
  ellipse('quads', 58, 132, 8, 22),
  ellipse(null, 42, 172, 5, 14),
  ellipse(null, 58, 172, 5, 14),
]

const BACK: Shape[] = [
  ellipse(null, 50, 16, 10, 12),
  { muscle: 'traps', d: 'M40 30h20l8 12H32z' },
  ellipse('shoulders', 30, 46, 9, 9),
  ellipse('shoulders', 70, 46, 9, 9),
  { muscle: 'back', d: 'M35 44h30l-3 34a8 8 0 0 1-8 7h-8a8 8 0 0 1-8-7z' },
  ellipse('triceps', 24, 68, 6, 13),
  ellipse('triceps', 76, 68, 6, 13),
  ellipse('forearms', 20, 96, 5, 13),
  ellipse('forearms', 80, 96, 5, 13),
  { muscle: null, d: 'M40 86h20v12H40z' },
  ellipse('glutes', 43, 109, 9, 9),
  ellipse('glutes', 57, 109, 9, 9),
  ellipse('hamstrings', 42, 138, 7, 18),
  ellipse('hamstrings', 58, 138, 7, 18),
  ellipse('calves', 42, 172, 6, 13),
  ellipse('calves', 58, 172, 6, 13),
]

function Figure({
  shapes,
  primary,
  secondary,
  label,
}: {
  shapes: Shape[]
  primary: Muscle
  secondary: readonly Muscle[]
  label: string
}) {
  const fill = (m: Muscle | null) =>
    m === primary
      ? 'fill-primary'
      : m && secondary.includes(m)
        ? 'fill-primary/40'
        : 'fill-muted-foreground/20'
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 190" className="h-36 w-auto" aria-hidden>
        {shapes.map((s, i) =>
          s.d ? (
            <path key={i} d={s.d} className={fill(s.muscle)} />
          ) : (
            <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} className={fill(s.muscle)} />
          ),
        )}
      </svg>
      <figcaption className="text-[11px] font-medium text-muted-foreground">{label}</figcaption>
    </figure>
  )
}

/** Mapa muscular: principal en color de acento, secundarios atenuados. */
export function MuscleMap({
  primary,
  secondary,
  className,
}: {
  primary: Muscle
  secondary: readonly Muscle[]
  className?: string
}) {
  return (
    <div className={cn('flex justify-center gap-6', className)}>
      <Figure shapes={FRONT} primary={primary} secondary={secondary} label="Frente" />
      <Figure shapes={BACK} primary={primary} secondary={secondary} label="Espalda" />
    </div>
  )
}
