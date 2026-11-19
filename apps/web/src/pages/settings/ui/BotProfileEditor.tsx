import { useId, useState } from 'react'
import { BotAvatar, type fetchAdminBot, updateBotProfileRequest } from '@/entities/bot'
import { showRequestError } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

export const BotProfileEditor = ({
  bot,
  onSave,
}: {
  bot: Awaited<ReturnType<typeof fetchAdminBot>>
  onSave: (profile: Awaited<ReturnType<typeof updateBotProfileRequest>>) => void
}) => {
  const id = useId()
  const [avatar, setAvatar] = useState<string | null>()
  const [pending, setPending] = useState(false)
  const [reading, setReading] = useState(false)
  const [feedback, setFeedback] = useState('')
  return (
    <section className="grid gap-3">
      <h2 className="text-base font-semibold">О боте</h2>
      <form
        className="settings-card grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          setPending(true)
          setFeedback('')
          try {
            onSave(
              await updateBotProfileRequest(bot.id, {
                avatar,
                description: String(data.get('description') ?? ''),
                welcome: String(data.get('welcome') ?? ''),
              }),
            )
            setAvatar(undefined)
            setFeedback('Профиль бота сохранён')
          } catch (error) {
            showRequestError(error)
          } finally {
            setPending(false)
          }
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <BotAvatar
            bot={{ ...bot, avatar: avatar === undefined ? bot.avatar : avatar }}
            size="lg"
          />
          <div className="grid min-w-0 flex-1 gap-2">
            <label className="text-sm font-medium" htmlFor={`${id}-avatar`}>
              Аватар
            </label>
            <Input
              id={`${id}-avatar`}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={reading || pending}
              aria-describedby={`${id}-avatar-hint`}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                if (!file) return
                if (
                  file.size > 512 * 1024 ||
                  !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
                ) {
                  setFeedback('Выберите PNG, JPEG или WebP размером до 512 КБ.')
                  return
                }
                const reader = new FileReader()
                setFeedback('')
                setReading(true)
                reader.onload = () => setAvatar(String(reader.result))
                reader.onerror = () => setFeedback('Не удалось прочитать изображение.')
                reader.onloadend = () => setReading(false)
                reader.readAsDataURL(file)
              }}
            />
            <p id={`${id}-avatar-hint`} className="text-xs text-muted-foreground">
              PNG, JPEG или WebP до 512 КБ
            </p>
          </div>
          {(avatar === undefined ? bot.avatar : avatar) ? (
            <Button
              type="button"
              variant="outline"
              disabled={reading || pending}
              onClick={() => setAvatar(null)}
            >
              Убрать аватар
            </Button>
          ) : null}
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`${id}-description`}>
            Описание
          </label>
          <Textarea
            id={`${id}-description`}
            name="description"
            maxLength={1000}
            defaultValue={bot.description}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`${id}-welcome`}>
            Приветственное сообщение
          </label>
          <Textarea
            id={`${id}-welcome`}
            name="welcome"
            maxLength={2000}
            defaultValue={bot.welcome}
          />
          <p className="text-xs text-muted-foreground">
            Появится в центре чата до первого сообщения.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || reading}>
            Сохранить профиль бота
          </Button>
          {feedback ? (
            <p role="status" className="text-sm text-muted-foreground">
              {feedback}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  )
}
