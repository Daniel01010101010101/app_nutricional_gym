import { Check, Plus, Search, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { normalizeText } from '@/domain/shared/text'
import { cn } from '@/lib/utils'

export interface SearchItem {
  id: string
  label: string
  sublabel?: string
  keywords?: string
}

interface MultiSelectSearchProps {
  items: readonly SearchItem[]
  value: readonly string[]
  onChange: (value: string[]) => void
  title: string
  description?: string
  addLabel: string
  emptyLabel?: string
}

/** Selección múltiple con buscador en una hoja inferior (útil para listas largas). */
export function MultiSelectSearch({
  items,
  value,
  onChange,
  title,
  description,
  addLabel,
  emptyLabel = 'Ninguno seleccionado',
}: MultiSelectSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const filtered = useMemo(() => {
    const terms = normalizeText(deferred).split(' ').filter(Boolean)
    if (terms.length === 0) return items.slice(0, 80)
    return items
      .filter((item) => {
        const haystack = normalizeText(
          `${item.label} ${item.sublabel ?? ''} ${item.keywords ?? ''}`,
        )
        return terms.every((t) => haystack.includes(t))
      })
      .slice(0, 80)
  }, [items, deferred])

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
        {value.map((id) => (
          <Badge
            key={id}
            variant="secondary"
            className="h-8 gap-1 rounded-full pr-1 pl-3 text-sm font-medium"
          >
            {byId.get(id)?.label ?? id}
            <button
              type="button"
              aria-label={`Quitar ${byId.get(id)?.label ?? id}`}
              className="grid size-6 place-items-center rounded-full hover:bg-background/60"
              onClick={() => toggle(id)}
            >
              <X className="size-3.5" />
            </button>
          </Badge>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus /> {addLabel}
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto h-[85vh] max-w-lg">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="px-4 pb-2">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-input bg-card px-3">
              <Search aria-hidden className="size-4 text-muted-foreground" />
              <span className="sr-only">Buscar</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="flex-1 bg-transparent outline-none"
                autoComplete="off"
              />
            </label>
          </div>
          <ul className="flex-1 overflow-y-auto px-2" aria-label={title}>
            {filtered.map((item) => {
              const selected = value.includes(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50',
                      selected && 'bg-primary/10',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-md border',
                        selected && 'border-primary bg-primary text-primary-foreground',
                      )}
                    >
                      {selected && <Check className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.sublabel}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="p-4 text-center text-sm text-muted-foreground">Sin resultados</li>
            )}
          </ul>
          <DrawerFooter>
            <Button onClick={() => setOpen(false)}>Listo ({value.length})</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
