import { type BotCommand, BotCommandSchema } from '@appercot/protocol'

export class CommandDefinition {
  private readonly definition: BotCommand

  constructor(name: string, description: string) {
    this.definition = BotCommandSchema.parse({ name, description })
  }

  get name() {
    return this.definition.name
  }
  get description() {
    return this.definition.description
  }

  roles(...roles: string[]) {
    this.definition.roles = roles
    return this
  }

  shortcut(shortcut: string) {
    this.definition.shortcut = shortcut
    return this
  }

  toJSON() {
    return BotCommandSchema.parse(this.definition)
  }
}
