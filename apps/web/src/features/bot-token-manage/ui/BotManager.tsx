import { KeyRound, LoaderCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import {
  type BotDetails,
  createBotRequest,
  type IssuedBotToken,
  resetBotTokenRequest,
  setBotListedRequest,
  setBotOwnerRequest,
} from '@/entities/bot'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

interface BotManagerProps {
  bots: BotDetails[]
  onChanged: (bot: BotDetails) => void
  onToken: (token: IssuedBotToken) => void
}

export const BotManager = ({ bots, onChanged, onToken }: BotManagerProps) => {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingBotId, setPendingBotId] = useState<string>()

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const issued = await createBotRequest({ username, name, description })
      onChanged(issued.bot)
      onToken(issued)
      setUsername('')
      setName('')
      setDescription('')
    } catch (error) {
      showRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const run = async (botId: string, operation: () => Promise<void>) => {
    setPendingBotId(botId)
    try {
      await operation()
    } catch (error) {
      showRequestError(error)
    } finally {
      setPendingBotId(undefined)
    }
  }

  return (
    <div className="grid gap-5">
      <form
        method="post"
        action="/admin/bots"
        aria-labelledby="create-bot-title"
        className="grid gap-4 rounded-xl border bg-card p-5"
        onSubmit={create}
      >
        <h3 id="create-bot-title" className="font-medium">
          {strings.admin.createBot}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="bot-username" className="text-sm">
              {strings.admin.botUsername}
            </label>
            <Input
              id="bot-username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              pattern="[a-z][a-z0-9_]{2,31}bot"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
            <p className="text-xs text-muted-foreground">{strings.admin.botUsernameHint}</p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="bot-name" className="text-sm">
              {strings.admin.botName}
            </label>
            <Input
              id="bot-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="bot-description" className="text-sm">
            {strings.admin.botDescription}
          </label>
          <Textarea
            id="bot-description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
          />
        </div>
        <Button type="submit" disabled={submitting} className="justify-self-start">
          {submitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {strings.admin.createBot}
        </Button>
      </form>
      <ul className="grid gap-3">
        {bots.map((bot) => (
          <BotAdminItem
            key={bot.id}
            bot={bot}
            pending={pendingBotId === bot.id}
            onChanged={onChanged}
            onToken={onToken}
            run={run}
          />
        ))}
      </ul>
    </div>
  )
}

interface BotAdminItemProps extends Omit<BotManagerProps, 'bots'> {
  bot: BotDetails
  pending: boolean
  run: (botId: string, operation: () => Promise<void>) => Promise<void>
}

const BotAdminItem = ({ bot, pending, onChanged, onToken, run }: BotAdminItemProps) => {
  const [owner, setOwner] = useState('')
  const ownerFormId = `bot-owner-${bot.id}`
  return (
    <li className="grid gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{bot.name}</h3>
            <Badge variant="secondary">
              {bot.listed ? strings.admin.listed : strings.admin.hidden}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">@{bot.username}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(bot.id, async () => {
                const issued = await resetBotTokenRequest(bot.id)
                onToken(issued)
              })
            }
          >
            <KeyRound aria-hidden="true" />
            {strings.admin.resetToken}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(bot.id, async () => {
                await setBotListedRequest(bot.id, !bot.listed)
                onChanged({ ...bot, listed: !bot.listed })
              })
            }
          >
            {bot.listed ? strings.admin.hide : strings.admin.show}
          </Button>
        </div>
      </div>
      <form
        method="post"
        action={`/admin/bots/${bot.id}/owner`}
        aria-label={`${strings.admin.owner}: ${bot.name}`}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          void run(bot.id, () => setBotOwnerRequest(bot.id, owner.trim()))
        }}
      >
        <div className="grid flex-1 gap-2">
          <label htmlFor={ownerFormId} className="text-sm">
            {strings.admin.owner}
          </label>
          <Input
            id={ownerFormId}
            name="username"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {strings.admin.saveOwner}
        </Button>
      </form>
      {pending ? (
        <span role="status" className="text-sm text-muted-foreground">
          {strings.admin.saving}
        </span>
      ) : null}
    </li>
  )
}
