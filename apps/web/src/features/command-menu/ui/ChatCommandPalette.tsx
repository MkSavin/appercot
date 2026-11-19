import type { BotCommand, Button } from '@appercot/protocol'
import { ArrowDown, ArrowUp, CornerDownLeft, PanelTop, Terminal } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { displayShortcut, matchesShortcut } from '@/shared/lib/shortcuts'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/shared/ui/command'
import { Kbd } from '@/shared/ui/kbd'

type VisibleCommand = Pick<BotCommand, 'name' | 'description' | 'shortcut'>
export type PaletteButton = { button: Button; key: string }
type Entry = {
  id: string
  label: string
  shortcut?: string
  description?: string
} & ({ kind: 'command' } | { kind: 'button'; item: PaletteButton })

export const buildPaletteEntries = (
  commands: readonly VisibleCommand[],
  buttons: readonly PaletteButton[],
) => {
  const entries: Entry[] = [
    ...commands.map(({ name, description, shortcut }) => ({
      id: name,
      kind: 'command' as const,
      label: `/${name}`,
      description,
      shortcut,
    })),
    ...buttons.map((item) => ({
      id: item.key,
      kind: 'button' as const,
      label: item.button.text,
      shortcut: item.button.shortcut,
      item,
    })),
  ]
  const key = (value: string) => displayShortcut(value)
  const reserved = new Set(['Mod+J', 'Mod+K', 'Ctrl+J', 'Ctrl+K', 'Meta+J', 'Meta+K'].map(key))
  for (const entry of entries) {
    if (!entry.shortcut) continue
    const normalized = key(entry.shortcut)
    if (reserved.has(normalized)) entry.shortcut = undefined
    else reserved.add(normalized)
  }
  const keys = [...'1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ']
  for (const entry of entries) {
    if (entry.shortcut) continue
    const prefix = entry.kind === 'command' ? 'Mod+Alt+' : 'Alt+'
    const shortcut = ['', 'Shift+']
      .flatMap((modifier) => keys.map((letter) => prefix + modifier + letter))
      .find((candidate) => !reserved.has(key(candidate)))
    if (shortcut) {
      reserved.add(key(shortcut))
      entry.shortcut = shortcut
    }
  }
  return entries
}

const worksOutsidePalette = (entry: Entry) =>
  entry.kind === 'command' ||
  Boolean(entry.shortcut && entry.item.button.shortcut === entry.shortcut)

export const explicitButtonShortcuts = (
  commands: readonly VisibleCommand[],
  buttons: readonly PaletteButton[],
) =>
  Object.fromEntries(
    buildPaletteEntries(commands, buttons)
      .filter((entry) => entry.kind === 'button' && worksOutsidePalette(entry))
      .map(({ id, shortcut }) => [id, shortcut]),
  )

const runEntry = (
  entry: Entry,
  onCommand: (command: string) => void,
  onButton: (item: PaletteButton) => void,
) => {
  if (entry.kind === 'command') onCommand(entry.label)
  else onButton(entry.item)
}

export const ChatCommandPalette = ({
  open,
  onOpenChange,
  commands,
  buttons = [],
  onCommand,
  onButton,
  enabled = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: readonly VisibleCommand[]
  buttons?: readonly PaletteButton[]
  onCommand: (value: string) => void
  onButton: (item: PaletteButton) => void
  enabled?: boolean
}) => {
  const entries = useMemo(() => buildPaletteEntries(commands, buttons), [commands, buttons])
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!enabled || event.defaultPrevented) return
      if (
        !open &&
        document.querySelector(
          '[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]',
        )
      )
        return
      if (matchesShortcut(event, 'Ctrl+J') || matchesShortcut(event, 'Meta+J')) {
        event.preventDefault()
        onOpenChange(!open)
        return
      }
      const entry = entries.find(
        (item) =>
          item.shortcut &&
          (open || worksOutsidePalette(item)) &&
          matchesShortcut(event, item.shortcut),
      )
      if (!entry) return
      event.preventDefault()
      onOpenChange(false)
      runEntry(entry, onCommand, onButton)
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [enabled, open, entries, onOpenChange, onCommand, onButton])
  const render = (entry: Entry) => (
    <CommandItem
      key={entry.id}
      value={`${entry.id} ${entry.label} ${entry.description ?? ''}`}
      onSelect={() => {
        onOpenChange(false)
        runEntry(entry, onCommand, onButton)
      }}
    >
      {entry.kind === 'command' ? <Terminal aria-hidden="true" /> : <PanelTop aria-hidden="true" />}
      <span
        className={
          entry.kind === 'command'
            ? 'shrink-0 font-mono text-xs text-primary'
            : 'min-w-0 flex-1 truncate'
        }
      >
        {entry.label}
      </span>
      {entry.description ? (
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{entry.description}</span>
      ) : null}
      {entry.shortcut ? (
        <CommandShortcut>
          <Kbd>{displayShortcut(entry.shortcut)}</Kbd>
        </CommandShortcut>
      ) : null}
    </CommandItem>
  )
  const commandEntries = entries.filter((entry) => entry.kind === 'command')
  const buttonEntries = entries.filter((entry) => entry.kind === 'button')
  return (
    <CommandDialog
      open={enabled && open}
      onOpenChange={onOpenChange}
      title="Команды чата"
      description="Поиск команд и кнопок последнего сообщения"
      className="sm:max-w-xl"
    >
      <CommandInput placeholder="Найдите команду или кнопку…" className="pr-9" />
      <CommandList className="min-h-20 p-1">
        <CommandEmpty>Ничего не найдено</CommandEmpty>
        {commandEntries.length ? (
          <CommandGroup heading="Команды">{commandEntries.map(render)}</CommandGroup>
        ) : null}
        {commandEntries.length && buttonEntries.length ? <CommandSeparator /> : null}
        {buttonEntries.length ? (
          <CommandGroup heading="Последнее сообщение бота">
            {buttonEntries.map(render)}
          </CommandGroup>
        ) : null}
      </CommandList>
      <div className="flex flex-wrap items-center gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd>
            <ArrowUp className="size-3" />
            <ArrowDown className="size-3" />
          </Kbd>
          Выбрать
        </span>
        <span className="flex items-center gap-1">
          <Kbd>
            <CornerDownLeft className="size-3" />
          </Kbd>
          Выполнить
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Kbd>Esc</Kbd>Закрыть
        </span>
      </div>
    </CommandDialog>
  )
}
