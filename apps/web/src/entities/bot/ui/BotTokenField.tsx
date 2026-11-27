import { CircleAlert, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { CopyIconButton } from '@/shared/ui/copy-icon-button'
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/ui/input-group'

export const BotTokenField = ({ token }: { token: string }) => {
  const { t } = useTranslation('bot')
  const id = useId()
  const inputId = `${id}-token`
  const descriptionId = `${id}-description`
  const [visible, setVisible] = useState(false)

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{t('token')}</FieldLabel>
      <InputGroup className="h-12 px-2">
        <InputGroupAddon className="pl-1">
          <KeyRound aria-hidden="true" className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          {...testId(testIds.bot.token)}
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={token}
          readOnly
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={descriptionId}
          className="font-mono text-sm"
        />
        <Button
          {...testId(testIds.bot.revealToken)}
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 md:size-9"
          aria-label={visible ? t('hideToken') : t('showToken')}
          aria-controls={inputId}
          aria-pressed={visible}
          title={visible ? t('hideToken') : t('showToken')}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
        <CopyIconButton text={token} label={t('copyToken')} testID={testIds.bot.copyToken} />
      </InputGroup>
      <FieldDescription id={descriptionId} className="flex items-start gap-2">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{t('tokenWarning')}</span>
      </FieldDescription>
    </Field>
  )
}
