import { ChevronDown, Globe2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { normalizeLocale, saveLocalePreference } from '@/shared/lib/locale'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

const locales = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
] as const

export const LanguageSelect = ({
  id,
  testId: selector,
  className,
  size = 'default',
}: {
  id?: string
  testId: string
  className?: string
  size?: 'default' | 'sm'
}) => {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = normalizeLocale(i18n.resolvedLanguage)
  const selected = locales.find((locale) => locale.code === current) ?? locales[0]
  const changeLocale = (locale: string) => {
    const normalized = normalizeLocale(locale)
    saveLocalePreference(normalized)
    setOpen(false)
    void i18n.changeLanguage(normalized)
  }

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          {...testId(selector)}
          id={id}
          type="button"
          variant="outline"
          aria-label={`${t('settings:language')}: ${size === 'sm' ? selected.code.toUpperCase() : selected.label}`}
          className={cn(
            'w-full min-w-0 justify-between px-3 font-normal',
            size === 'sm' && 'w-auto min-w-20 px-2.5',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Globe2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {size === 'sm' ? selected.code.toUpperCase() : selected.label}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40 data-[state=closed]:animate-none data-[state=open]:animate-none"
      >
        <DropdownMenuRadioGroup value={current} onValueChange={changeLocale}>
          {locales.map((locale) => (
            <DropdownMenuRadioItem
              {...testId(testIds.language.option(locale.code))}
              key={locale.code}
              value={locale.code}
            >
              <span className="flex min-w-32 items-center justify-between gap-5">
                <span>{locale.label}</span>
                <span className="text-xs text-muted-foreground">{locale.code.toUpperCase()}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
