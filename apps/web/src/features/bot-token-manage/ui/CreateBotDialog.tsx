import { LoaderCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { createBotRequest, type IssuedBotToken } from '@/entities/bot'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

export const CreateBotDialog = ({ onCreated }: { onCreated: (issued: IssuedBotToken) => void }) => {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      const issued = await createBotRequest({
        username: String(form.get('username')).trim(),
        name: String(form.get('name')),
        description: String(form.get('description')),
      })
      setOpen(false)
      onCreated(issued)
    } catch (error) {
      showRequestError(error)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) setOpen(value)
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" />
          {strings.admin.createBot}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{strings.admin.createBot}</DialogTitle>
          <DialogDescription>{strings.settings.createBotDescription}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <label htmlFor="bot-name" className="text-sm font-medium">
                {strings.admin.botName}
              </label>
              <Input id="bot-name" name="name" required maxLength={100} />
            </div>
            <div className="grid content-start gap-2">
              <label htmlFor="bot-username" className="text-sm font-medium">
                {strings.admin.botUsername}
              </label>
              <Input
                id="bot-username"
                name="username"
                required
                pattern="[a-z][a-z0-9_]{2,31}bot"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="bot-username-help"
              />
              <p id="bot-username-help" className="text-xs text-muted-foreground">
                {strings.admin.botUsernameHint}
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="bot-description" className="text-sm font-medium">
              {strings.admin.botDescription}
            </label>
            <Textarea id="bot-description" name="description" maxLength={1000} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                {strings.chat.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              {strings.admin.createBot}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
