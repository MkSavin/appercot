import type { BotCommand } from '@appercot/protocol'

export interface CommandTextProps {
  commands?: readonly Pick<BotCommand, 'name' | 'description'>[]
  onCommand?: (command: string) => void
}
export const CommandText = ({ text, commands, onCommand }: CommandTextProps & { text: string }) => {
  if (!onCommand || !commands?.length) return text
  const pattern = /(^|[\s\p{Ps}\p{Pi}])\/([a-z0-9_]{1,32})(?![a-zA-Z0-9_/])/gu
  const parts: Array<string | React.JSX.Element> = []
  let offset = 0
  for (const match of text.matchAll(pattern)) {
    const command = commands.find(({ name }) => name === match[2])
    if (!command) continue
    const index = match.index + (match[1]?.length ?? 0)
    const value = `/${command.name}`
    parts.push(
      text.slice(offset, index),
      <button
        key={index}
        type="button"
        className="inline rounded-sm font-mono text-[0.92em] text-primary underline decoration-primary/50 underline-offset-2 hover:decoration-current focus-visible:outline-2"
        title={command.description}
        onClick={() => onCommand(value)}
      >
        {value}
      </button>,
    )
    offset = index + value.length
  }
  return [...parts, text.slice(offset)]
}
