import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

export const AccountDialog = ({
  title,
  description,
  children,
  submit,
  destructive = false,
}: {
  title: string
  description: string
  children: ReactNode
  submit: (form: FormData) => Promise<void>
  destructive?: boolean
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value)
        }}
      >
        <DialogTrigger asChild>
          <Button variant={destructive ? 'destructive' : 'outline'}>{title}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              setPending(true)
              setSaved(false)
              try {
                await submit(form)
                setOpen(false)
                setSaved(true)
              } catch (error) {
                showRequestError(error)
              } finally {
                setPending(false)
              }
            }}
          >
            {children}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  {t('common:cancel')}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant={destructive ? 'destructive' : 'default'}
                disabled={pending}
              >
                {title}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {saved ? (
        <p role="status" className="sr-only">
          {t('common:saved')}
        </p>
      ) : null}
    </>
  )
}
