import { LoaderCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { type AdminInvite, createInviteRequest } from '@/entities/user'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

export const CreateInviteForm = ({ onCreated }: { onCreated: (invite: AdminInvite) => void }) => {
  const [maxUses, setMaxUses] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const invite = await createInviteRequest({
        maxUses: maxUses ? Number(maxUses) : undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      })
      onCreated(invite)
      setMaxUses('')
      setExpiresInDays('')
    } catch (error) {
      showRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      method="post"
      action="/admin/invites"
      aria-labelledby="create-invite-title"
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2"
      onSubmit={submit}
    >
      <h3 id="create-invite-title" className="font-medium sm:col-span-2">
        {strings.admin.createInvite}
      </h3>
      <div className="grid gap-2">
        <label htmlFor="invite-max-uses" className="text-sm">
          {strings.admin.maxUses}
        </label>
        <Input
          id="invite-max-uses"
          name="maxUses"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={maxUses}
          onChange={(event) => setMaxUses(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="invite-expiry" className="text-sm">
          {strings.admin.expiresInDays}
        </label>
        <Input
          id="invite-expiry"
          name="expiresInDays"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={expiresInDays}
          onChange={(event) => setExpiresInDays(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting} className="sm:col-span-2 sm:justify-self-start">
        {submitting ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <Plus aria-hidden="true" />
        )}
        {strings.admin.createInvite}
      </Button>
    </form>
  )
}
