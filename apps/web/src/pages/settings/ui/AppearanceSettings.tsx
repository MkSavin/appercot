import { Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { testIds } from '@/shared/lib/test-ids'
import { getThemePreference, saveThemePreference, type ThemePreference } from '@/shared/lib/theme'
import { ChoiceCards } from '@/shared/ui/choice-cards'
import { LanguageSelect } from '@/shared/ui/language-select'

export const AppearanceSettings = () => {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(getThemePreference)
  const themes = [
    {
      value: 'system',
      label: t('settings:themes.system'),
      description: t('settings:themeDescriptions.system'),
      icon: Monitor,
    },
    {
      value: 'light',
      label: t('settings:themes.light'),
      description: t('settings:themeDescriptions.light'),
      icon: Sun,
    },
    {
      value: 'dark',
      label: t('settings:themes.dark'),
      description: t('settings:themeDescriptions.dark'),
      icon: Moon,
    },
  ] as const
  return (
    <>
      <section aria-labelledby="theme-title" className="grid gap-3">
        <h2 id="theme-title" className="text-base font-semibold">
          {t('settings:brightness')}
        </h2>
        <ChoiceCards
          name="theme"
          label={t('settings:brightness')}
          value={theme}
          options={themes}
          optionTestId={testIds.settings.theme}
          className="lg:grid-cols-3"
          onChange={(mode: ThemePreference) => {
            setTheme(mode)
            saveThemePreference(mode)
          }}
        />
      </section>
      <section aria-labelledby="language-title" className="grid gap-3">
        <div>
          <h2 id="language-title" className="text-base font-semibold">
            {t('settings:language')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('settings:languageDescription')}</p>
        </div>
        <LanguageSelect
          id="settings-language"
          testId={testIds.settings.language}
          className="sm:w-56"
        />
      </section>
    </>
  )
}
