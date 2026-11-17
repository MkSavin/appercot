export const UnreadBadge = ({ count }: { count: number }) => {
  if (count <= 0) return null
  const label = `Непрочитанных: ${count}`
  return (
    <span
      className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground"
      role="img"
      aria-label={label}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
