import { OTPInput, OTPInputContext } from 'input-otp'
import { type ComponentProps, useContext } from 'react'
import { cn } from '@/shared/lib/cn'

export const InputOTP = ({
  className,
  containerClassName,
  ...props
}: ComponentProps<typeof OTPInput>) => (
  <OTPInput
    data-slot="input-otp"
    containerClassName={cn('flex items-center justify-center', containerClassName)}
    className={cn('disabled:cursor-not-allowed', className)}
    {...props}
  />
)

export const InputOTPGroup = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="input-otp-group" className={cn('flex gap-1 sm:gap-2', className)} {...props} />
)

export const InputOTPSlot = ({
  index,
  className,
  ...props
}: ComponentProps<'div'> & { index: number }) => {
  const slot = useContext(OTPInputContext)?.slots[index]
  return (
    <div
      data-slot="input-otp-slot"
      data-active={slot?.isActive}
      className={cn(
        'relative grid h-14 w-8 place-items-center rounded-lg border border-input bg-background text-xl font-semibold tabular-nums data-[active=true]:border-ring data-[active=true]:ring-2 data-[active=true]:ring-ring sm:w-11',
        className,
      )}
      {...props}
    >
      {slot?.char}
      {slot?.hasFakeCaret ? (
        <span aria-hidden="true" className="absolute h-5 w-px animate-pulse bg-foreground" />
      ) : null}
    </div>
  )
}
