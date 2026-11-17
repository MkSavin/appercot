import { type JsonValue, JsonValueSchema } from '@appercot/protocol'
import type { BotApi } from './api'

export class BotStorage {
  private cache?: Record<string, JsonValue>

  constructor(
    private readonly api: BotApi,
    private readonly chatId: string,
  ) {}

  private async load() {
    if (!this.cache) this.cache = await this.api.kvGet({ chatId: this.chatId })
    return this.cache
  }

  async get<Value>(key: string): Promise<Value | undefined> {
    const values = await this.load()
    const value = values[key]
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
  }

  async all<Value = JsonValue>(): Promise<Record<string, Value>> {
    const values = await this.load()
    return JSON.parse(JSON.stringify(values))
  }

  async set(key: string, value: JsonValue) {
    const parsed = JsonValueSchema.parse(value)
    await this.api.kvSet({ chatId: this.chatId, entries: { [key]: parsed } })
    if (this.cache) this.cache[key] = parsed
  }

  async delete(key: string) {
    await this.api.kvSet({ chatId: this.chatId, entries: { [key]: null } })
    if (this.cache) delete this.cache[key]
  }
}
