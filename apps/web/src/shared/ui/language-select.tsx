import { useTranslation } from 'react-i18next'
import { normalizeLocale, type SupportedLocale, saveLocalePreference } from '@/shared/lib/locale'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

export const LanguageSelect = ({
  id,
  testId: selector,
  className,
}: {
  id?: string
  testId: string
  className?: string
}) => {
  const { t, i18n } = useTranslation()
  return (
    <Select
      value={normalizeLocale(i18n.resolvedLanguage)}
      onValueChange={(locale: SupportedLocale) => {
        saveLocalePreference(locale)
        void i18n.changeLanguage(locale)
      }}
    >
      <SelectTrigger
        id={id}
        {...testId(selector)}
        aria-label={t('settings:language')}
        className={className}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem {...testId(testIds.language.option('ru'))} value="ru">
          Русский
        </SelectItem>
        <SelectItem {...testId(testIds.language.option('en'))} value="en">
          English
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
