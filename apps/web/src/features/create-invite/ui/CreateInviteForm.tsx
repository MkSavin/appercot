import { Copy, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type AdminInvite, createInviteRequest } from '@/entities/user'
import { showRequestError } from '@/shared/api'
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
import { InviteLimits, PlatformInviteRole, readInviteLimits } from '@/shared/ui/invite-fields'

export const CreateInviteForm = ({
  onCreated,
  single = false,
}: {
  onCreated: (invite: AdminInvite) => void
  single?: boolean
}) => {
  const { t } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [issued, setIssued] = useState<AdminInvite>()
  const [copied, setCopied] = useState(false)
  const title = single ? t('invitation:singleTitle') : t('admin:createInvite')
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setPending(true)
    try {
      const invite = await createInviteRequest({
        ...readInviteLimits(data),
        role: data.get('role') === 'admin' ? 'admin' : 'user',
      })
      setIssued(invite)
      onCreated(invite)
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
        if (pending) return
        setOpen(value)
        if (!value) {
          setIssued(undefined)
          setCopied(false)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" />
          {title}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{issued ? t('invitation:readyTitle') : title}</DialogTitle>
          <DialogDescription>
            {single ? t('invitation:singleDescription') : t('settings:platformInviteDescription')}
          </DialogDescription>
        </DialogHeader>
        {issued ? (
          <div className="grid gap-3">
            <label htmlFor={id} className="text-sm font-medium">
              {t('settings:botLink')}
            </label>
            <Input
              id={id}
              readOnly
              value={issued.url}
              onFocus={(event) => event.currentTarget.select()}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t('common:done')}</Button>
              </DialogClose>
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(issued.url)
                    setCopied(true)
                  } catch (error) {
                    showRequestError(error)
                  }
                }}
              >
                <Copy aria-hidden="true" />
                {copied ? t('message:copied') : t('admin:copyLink')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={submit}>
            <PlatformInviteRole />
            <InviteLimits single={single} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  {t('chat:cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {t('admin:createInvite')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
