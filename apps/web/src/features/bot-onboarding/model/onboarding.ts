import type { PlatformRole } from '@appercot/protocol'

export type OnboardingStepState = 'done' | 'current' | 'upcoming'

export const getOnboardingSteps = (
  created: boolean,
  connected: boolean,
  chatted: boolean,
): [OnboardingStepState, OnboardingStepState, OnboardingStepState] => [
  created ? 'done' : 'current',
  created ? (connected ? 'done' : 'current') : 'upcoming',
  created && connected ? (chatted ? 'done' : 'current') : 'upcoming',
]

export const canManageBots = (role: PlatformRole) => role === 'admin' || role === 'owner'

const dismissedKey = (userId: string) => `appercot:bot-onboarding:${userId}:dismissed`

export const readOnboardingDismissed = (userId: string, storage?: Pick<Storage, 'getItem'>) => {
  try {
    return (storage ?? window.localStorage).getItem(dismissedKey(userId)) === '1'
  } catch {
    return false
  }
}

export const writeOnboardingDismissed = (
  userId: string,
  dismissed: boolean,
  storage?: Pick<Storage, 'setItem' | 'removeItem'>,
) => {
  try {
    const target = storage ?? window.localStorage
    if (dismissed) target.setItem(dismissedKey(userId), '1')
    else target.removeItem(dismissedKey(userId))
  } catch {
    return false
  }
  return true
}
