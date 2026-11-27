import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { resourceUrls } from '@/shared/config'
import { testId, testIds } from '@/shared/lib/test-ids'

export const OnboardingGuideLink = () => {
  const { t } = useTranslation('onboarding')
  return (
    <a
      {...testId(testIds.onboarding.guide)}
      href={resourceUrls.firstBotGuide}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
    >
      {t('fullGuide')}
      <ExternalLink aria-hidden="true" className="size-4" />
    </a>
  )
}
