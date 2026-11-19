export class TransferCapacity {
  private readonly active = new Map<string, number>()
  private total = 0

  constructor(
    private readonly perActor: number,
    private readonly global: number,
  ) {}

  take(key: string) {
    const count = this.active.get(key) ?? 0
    if (count >= this.perActor || this.total >= this.global) return undefined
    this.active.set(key, count + 1)
    this.total++
    let released = false
    return () => {
      if (released) return
      released = true
      this.total--
      const current = this.active.get(key) ?? 1
      if (current === 1) this.active.delete(key)
      else this.active.set(key, current - 1)
    }
  }
}
export class FileRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'FileRequestError'
  }
}
