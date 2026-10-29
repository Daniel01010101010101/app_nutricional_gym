import { Ruler } from 'lucide-react'
import { useWatch } from 'react-hook-form'

import { WhyButton } from '@/components/common/WhyButton'
import { ChoiceCards } from '@/components/form/ChoiceCards'
import { Segmented } from '@/components/form/ChipGroup'
import { Field } from '@/components/form/Field'
import { NumberField } from '@/components/form/NumberField'
import { estimateBodyFatNavy } from '@/domain/body/navy'
import { fmtPct } from '@/domain/shared/format'
import type { BodyFatMethod } from '@/domain/types'
import { BODY_FAT_METHOD_LABEL } from '@/lib/labels'

import type { OnboardingValues } from '../model'
import { useStepField } from '../useStepField'

const MEASURED_METHODS: BodyFatMethod[] = [
  'dexa',
  'bodpod',
  'skinfold-pro',
  'bia-pro',
  'bia-home',
  'visual',
]
const RELIABLE = new Set<BodyFatMethod>(['dexa', 'bodpod', 'skinfold-pro', 'bia-pro'])

function useNavyEstimate() {
  const [sex, heightCm, neckCm, waistCm, hipCm] = useWatch<
    OnboardingValues,
    ['sex', 'heightCm', 'neckCm', 'waistCm', 'hipCm']
  >({
    name: ['sex', 'heightCm', 'neckCm', 'waistCm', 'hipCm'],
  })
  if (!sex || !heightCm || !neckCm || !waistCm || (sex === 'female' && !hipCm)) return null
  try {
    return estimateBodyFatNavy({
      sex,
      heightCm,
      neckCm,
      waistCm,
      ...(hipCm !== undefined ? { hipCm } : {}),
    })
  } catch {
    return null
  }
}

export function BodyStep() {
  const knows = useStepField('knowsBodyFat')
  const pct = useStepField('bodyFatPct')
  const method = useStepField('bodyFatMethod')
  const neck = useStepField('neckCm')
  const waist = useStepField('waistCm')
  const hip = useStepField('hipCm')
  const chest = useStepField('chestCm')
  const arm = useStepField('armCm')
  const thigh = useStepField('thighCm')
  const sex = useWatch<OnboardingValues, 'sex'>({ name: 'sex' })
  const estimate = useNavyEstimate()

  return (
    <div className="space-y-6">
      <Field label="¿Conoces tu % de grasa corporal?">
        <Segmented
          aria-label="¿Conoces tu % de grasa?"
          value={knows.value ? 'yes' : 'no'}
          onChange={(v) => knows.onChange(v === 'yes')}
          options={[
            { value: 'yes', label: 'Sí, lo medí' },
            { value: 'no', label: 'No lo sé' },
          ]}
        />
      </Field>

      {knows.value ? (
        <>
          <Field label="% de grasa" htmlFor={pct.id} error={pct.error}>
            <NumberField
              id={pct.id}
              value={pct.value}
              onChange={pct.onChange}
              unit="%"
              invalid={Boolean(pct.error)}
              placeholder="18"
            />
          </Field>
          <Field
            label="¿Cómo lo mediste?"
            error={method.error}
            description="Con DEXA, BodPod, plicometría o bioimpedancia profesional usamos Katch-McArdle (más precisa). Con básculas caseras o estimaciones visuales, Mifflin-St Jeor."
          >
            <ChoiceCards
              aria-label="Método de medición"
              value={method.value}
              onChange={method.onChange}
              invalid={Boolean(method.error)}
              options={MEASURED_METHODS.map((m) => ({
                value: m,
                label: BODY_FAT_METHOD_LABEL[m],
                description: RELIABLE.has(m) ? 'Medición fiable' : 'Estimación aproximada',
              }))}
            />
          </Field>
        </>
      ) : (
        <>
          <div className="flex gap-3 rounded-2xl bg-muted/60 p-4 text-sm">
            <Ruler aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-1.5">
              <p className="font-semibold">Mídete con una cinta métrica, de pie y relajado:</p>
              <ul className="list-disc space-y-1 pl-4 text-[13px] text-muted-foreground">
                <li>
                  <strong className="text-foreground">Cuello:</strong> justo debajo de la nuez, con
                  la cinta inclinada hacia adelante.
                </li>
                <li>
                  <strong className="text-foreground">Cintura:</strong>{' '}
                  {sex === 'female'
                    ? 'en la parte más estrecha del abdomen.'
                    : 'a la altura del ombligo, al final de una exhalación normal.'}
                </li>
                {sex === 'female' && (
                  <li>
                    <strong className="text-foreground">Cadera:</strong> en la parte más ancha de
                    los glúteos.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cuello" htmlFor={neck.id} error={neck.error}>
              <NumberField
                id={neck.id}
                value={neck.value}
                onChange={neck.onChange}
                unit="cm"
                invalid={Boolean(neck.error)}
                placeholder="38"
              />
            </Field>
            <Field label="Cintura" htmlFor={waist.id} error={waist.error}>
              <NumberField
                id={waist.id}
                value={waist.value}
                onChange={waist.onChange}
                unit="cm"
                invalid={Boolean(waist.error)}
                placeholder="85"
              />
            </Field>
            {sex === 'female' && (
              <Field label="Cadera" htmlFor={hip.id} error={hip.error}>
                <NumberField
                  id={hip.id}
                  value={hip.value}
                  onChange={hip.onChange}
                  unit="cm"
                  invalid={Boolean(hip.error)}
                  placeholder="98"
                />
              </Field>
            )}
          </div>

          {estimate && (
            <div className="flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/8 p-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  % de grasa estimado
                </p>
                <p className="font-display text-4xl font-bold">{fmtPct(estimate.value)}</p>
              </div>
              <WhyButton explanation={estimate.explanation} />
            </div>
          )}
        </>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold">
          Medidas opcionales{' '}
          <span className="font-normal text-muted-foreground">(para seguir tu progreso)</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Pecho" htmlFor={chest.id} error={chest.error}>
            <NumberField
              id={chest.id}
              value={chest.value}
              onChange={chest.onChange}
              unit="cm"
              invalid={Boolean(chest.error)}
            />
          </Field>
          <Field label="Brazo" htmlFor={arm.id} error={arm.error}>
            <NumberField
              id={arm.id}
              value={arm.value}
              onChange={arm.onChange}
              unit="cm"
              invalid={Boolean(arm.error)}
            />
          </Field>
          <Field label="Muslo" htmlFor={thigh.id} error={thigh.error}>
            <NumberField
              id={thigh.id}
              value={thigh.value}
              onChange={thigh.onChange}
              unit="cm"
              invalid={Boolean(thigh.error)}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
