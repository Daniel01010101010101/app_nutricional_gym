import { Camera, Columns2, ImagePlus, Loader2, Lock, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Segmented } from '@/components/form/ChipGroup'
import { NativeSelect } from '@/components/form/NativeSelect'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { DayKey } from '@/domain/types'
import { newId, nowIso } from '@/data/defaults'
import type { ProgressPhoto } from '@/data/schemas'
import { useLive } from '@/hooks/useLive'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useRepositories } from '@/hooks/useRepositories'
import { useToday } from '@/hooks/useToday'
import { compressImage } from '@/lib/image'
import { capitalize, formatDay } from '@/lib/format'
import { cn } from '@/lib/utils'

type Pose = ProgressPhoto['pose']

const POSE_LABEL: Record<Pose, string> = { front: 'Frente', side: 'Perfil', back: 'Espalda' }
const POSES: Pose[] = ['front', 'side', 'back']

function PhotoImage({ blob, alt, className }: { blob: Blob; alt: string; className?: string }) {
  const url = useObjectUrl(blob)
  if (!url) return null
  return <img src={url} alt={alt} className={className} />
}

function Thumb({ photo, onOpen }: { photo: ProgressPhoto; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted"
      aria-label={`Ver foto de ${POSE_LABEL[photo.pose].toLowerCase()} del ${formatDay(photo.date, "d 'de' MMMM")}`}
    >
      <PhotoImage blob={photo.thumb} alt="" className="size-full object-cover" />
      <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-left text-[11px] font-medium text-white">
        {POSE_LABEL[photo.pose]}
      </span>
    </button>
  )
}

function CompareView({ photos }: { photos: ProgressPhoto[] }) {
  const [pose, setPose] = useState<Pose>('front')
  const ofPose = photos.filter((p) => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date))
  const dates = [...new Set(ofPose.map((p) => p.date))]
  const [before, setBefore] = useState<DayKey | null>(null)
  const [after, setAfter] = useState<DayKey | null>(null)
  const beforeDate = before && dates.includes(before) ? before : dates[0]
  const afterDate = after && dates.includes(after) ? after : dates.at(-1)
  const left = ofPose.find((p) => p.date === beforeDate)
  const right = ofPose.find((p) => p.date === afterDate)
  const options = dates.map((d) => ({
    value: d,
    label: capitalize(formatDay(d, "d 'de' MMM yyyy")),
  }))

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <Segmented<Pose>
        aria-label="Pose"
        value={pose}
        onChange={setPose}
        options={POSES.map((p) => ({ value: p, label: POSE_LABEL[p] }))}
      />
      {dates.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Necesitas fotos de {POSE_LABEL[pose].toLowerCase()} en dos fechas distintas para comparar.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NativeSelect
              aria-label="Antes"
              value={beforeDate ?? ''}
              onChange={setBefore}
              options={options}
            />
            <NativeSelect
              aria-label="Después"
              value={afterDate ?? ''}
              onChange={setAfter}
              options={options}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[left, right].map((p, i) =>
              p ? (
                <figure key={p.id} className="space-y-1">
                  <PhotoImage
                    blob={p.blob}
                    alt={`${i === 0 ? 'Antes' : 'Después'}: ${formatDay(p.date, "d 'de' MMMM")}`}
                    className="aspect-[3/4] w-full rounded-xl object-cover"
                  />
                  <figcaption className="text-center text-xs text-muted-foreground">
                    {i === 0 ? 'Antes' : 'Después'}
                  </figcaption>
                </figure>
              ) : null,
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function PhotosPage() {
  const repos = useRepositories()
  const today = useToday()
  const photos = useLive(() => repos.body.observePhotos(), [])
  const [pose, setPose] = useState<Pose>('front')
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null)
  const [compare, setCompare] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setSaving(true)
    try {
      const [blob, thumb] = await Promise.all([
        compressImage(file, 1440, 0.82),
        compressImage(file, 360, 0.75),
      ])
      await repos.body.addPhoto({
        id: newId(),
        date: today,
        pose,
        blob,
        thumb,
        createdAt: nowIso(),
      })
      toast.success(`Foto de ${POSE_LABEL[pose].toLowerCase()} guardada.`)
    } catch {
      toast.error('No se pudo guardar la foto. Prueba con otra imagen.')
    } finally {
      setSaving(false)
    }
  }

  if (photos.loading) {
    return (
      <>
        <PageHeader title="Fotos" back="/progreso" />
        <Skeleton className="h-64 rounded-2xl" />
      </>
    )
  }

  const list = photos.data ?? []
  const byDate = new Map<DayKey, ProgressPhoto[]>()
  for (const p of [...list].sort((a, b) => b.date.localeCompare(a.date)))
    byDate.set(p.date, [...(byDate.get(p.date) ?? []), p])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fotos de progreso"
        back="/progreso"
        actions={
          list.length > 1 ? (
            <Button
              variant={compare ? 'secondary' : 'ghost'}
              size="icon"
              aria-label="Comparar fotos"
              aria-pressed={compare}
              onClick={() => setCompare((c) => !c)}
            >
              <Columns2 />
            </Button>
          ) : undefined
        }
      />

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        Tus fotos se guardan solo en este teléfono. Misma luz, misma hora y misma postura cada 2–4
        semanas.
      </p>

      {compare && <CompareView photos={list} />}

      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <Segmented<Pose>
          aria-label="Pose de la foto"
          value={pose}
          onChange={setPose}
          options={POSES.map((p) => ({ value: p, label: POSE_LABEL[p] }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={saving} onClick={() => cameraRef.current?.click()}>
            {saving ? <Loader2 className="animate-spin" /> : <Camera />} Tomar foto
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => galleryRef.current?.click()}>
            <ImagePlus /> Galería
          </Button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="Aún no hay fotos"
          description="Las fotos muestran cambios que la báscula no ve. Toma la primera hoy."
        />
      ) : (
        [...byDate.entries()].map(([date, items]) => (
          <Section key={date} title={capitalize(formatDay(date, "EEEE d 'de' MMMM yyyy"))}>
            <div className="grid grid-cols-3 gap-2">
              {items
                .sort((a, b) => POSES.indexOf(a.pose) - POSES.indexOf(b.pose))
                .map((p) => (
                  <Thumb key={p.id} photo={p} onOpen={() => setViewing(p)} />
                ))}
            </div>
          </Section>
        ))
      )}

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-md p-3">
          {viewing && (
            <>
              <DialogTitle className="px-1">{POSE_LABEL[viewing.pose]}</DialogTitle>
              <DialogDescription className="px-1">
                {capitalize(formatDay(viewing.date, "EEEE d 'de' MMMM yyyy"))}
              </DialogDescription>
              <PhotoImage
                blob={viewing.blob}
                alt={`${POSE_LABEL[viewing.pose]} del ${formatDay(viewing.date, "d 'de' MMMM")}`}
                className={cn('max-h-[70vh] w-full rounded-xl object-contain')}
              />
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  await repos.body.removePhoto(viewing.id)
                  setViewing(null)
                  toast('Foto eliminada.')
                }}
              >
                <Trash2 /> Borrar foto
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
