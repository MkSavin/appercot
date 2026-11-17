import type { BotCommand } from '@appercot/protocol'
import { Terminal } from 'lucide-react'
import { strings } from '@/shared/config'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/shared/ui/command'
import { filterBotCommands } from '../model/filter-commands'

interface CommandMenuProps {
  query: string
  commands: BotCommand[]
  onSelect: (command: string) => void
}

export const CommandMenu = ({ query, commands, onSelect }: CommandMenuProps) => {
  const open = query.startsWith('/') && !query.includes(' ') && !query.includes('\n')
  if (!open) return null
  const visibleCommands = filterBotCommands(commands, query)
  return (
    <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-20">
      <Command
        shouldFilter={false}
        className="rounded-xl border bg-popover shadow-lg"
        aria-label={strings.chat.commandsTitle}
      >
        <CommandList>
          <CommandEmpty>{strings.chat.noCommands}</CommandEmpty>
          <CommandGroup heading={strings.chat.commandsTitle}>
            {visibleCommands.map((command) => (
              <CommandItem
                key={command.name}
                value={command.name}
                onSelect={() => onSelect(`/${command.name}`)}
              >
                <Terminal aria-hidden="true" />
                <span className="font-medium">/{command.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {command.description}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}
