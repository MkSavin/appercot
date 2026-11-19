import type { BotCommand } from '@appercot/protocol'
import { MessageSquareText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BotMessage } from '@/entities/message'

export const EmptyChat = ({
  chatId,
  welcome,
  commands,
  blocked,
  onCommand,
}: {
  chatId: string
  welcome?: string
  commands: BotCommand[]
  blocked: boolean
  onCommand: (command: string) => void
}) => {
  const { t } = useTranslation()
  return (
    <div className="grid flex-1 place-items-center text-center">
      <div
        className={
          welcome
            ? 'max-w-md rounded-2xl border bg-card px-5 py-4'
            : 'grid justify-items-center gap-3'
        }
      >
        {welcome ? (
          <BotMessage
            message={{
              id: 'welcome',
              chatId,
              seq: 1,
              sender: 'bot',
              content: { text: welcome },
              status: 'processed',
              createdAt: 0,
            }}
            commands={commands}
            onCommand={blocked ? undefined : onCommand}
          />
        ) : (
          <>
            <MessageSquareText
              aria-hidden="true"
              className="size-10 rounded-xl bg-accent p-2 text-primary"
            />
            <p className="text-sm text-muted-foreground">{t('chat:noMessages')}</p>
          </>
        )}
      </div>
    </div>
  )
}
