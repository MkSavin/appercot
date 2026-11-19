import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

interface ChoiceCardsProps<Value extends string> {
  name: string
  label: string
  value: Value
  options: readonly { value: Value; label: string; description: string; icon: LucideIcon }[]
  onChange: (value: Value) => void
  disabled?: boolean
  className?: string
}

export const ChoiceCards = <Value extends string>({
  name,
  label,
  value,
  options,
  onChange,
  disabled,
  className,
}: ChoiceCardsProps<Value>) => (
  <fieldset aria-label={label} disabled={disabled} className={cn('grid min-w-0 gap-3', className)}>
    {options.map(({ value: option, label: title, description, icon: Icon }) => (
      <label
        key={option}
        className="relative flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/45 has-[:checked]:border-primary has-[:checked]:bg-secondary/45 has-[:disabled]:cursor-not-allowed has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
      >
        <input
          type="radio"
          name={name}
          value={option}
          checked={value === option}
          onChange={() => onChange(option)}
          className="peer sr-only"
        />
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary">
          <Icon aria-hidden="true" className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
        </span>
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded-md border bg-background text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground"
        >
          <Check className="size-3.5" />
        </span>
      </label>
    ))}
  </fieldset>
)
