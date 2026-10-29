import { Loader2 } from 'lucide-react'

import { trendWeight } from '@/domain/body/weightTrend'
import { Wizard } from '@/features/onboarding/pages/OnboardingPage'
import { valuesFromProfile } from '@/features/onboarding/model'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { useToday } from '@/hooks/useToday'

export function EditProfilePage() {
  const repos = useRepositories()
  const today = useToday()
  const profile = useLive(() => repos.profile.observe(), [])
  const settings = useLive(() => repos.settings.observe(), [])
  const weights = useLive(() => repos.body.observeWeights(), [])

  if (!profile.data || !settings.data || !weights.data) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status">
        <Loader2 aria-label="Cargando" className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const weightKg = trendWeight(weights.data, today) ?? profile.data.weightKg
  return (
    <Wizard
      initialStep={0}
      editing={profile.data}
      initialValues={valuesFromProfile(profile.data, { unit: settings.data.unit, weightKg, today })}
    />
  )
}
