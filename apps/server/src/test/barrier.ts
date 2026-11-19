import { TestFixtureError } from './errors'

interface BarrierOptions {
  beforeDrain?: () => void | Promise<void>
  afterReset?: () => void | Promise<void>
}

export class OperationBarrier {
  private readonly active = new Set<AbortController>()
  private readonly waiters = new Set<() => void>()
  private tail: Promise<void> = Promise.resolve()
  private pendingResets = 0
  private paused = false
  private readonly beforeDrainHandlers = new Set<() => void | Promise<void>>()
  private readonly afterResetHandlers = new Set<() => void | Promise<void>>()

  constructor(private readonly options: BarrierOptions = {}) {}

  onBeforeDrain(handler: () => void | Promise<void>) {
    this.beforeDrainHandlers.add(handler)
  }

  onAfterReset(handler: () => void | Promise<void>) {
    this.afterResetHandlers.add(handler)
  }

  get isResetting() {
    return this.paused
  }

  async run<Result>(operation: (signal: AbortSignal) => Result | Promise<Result>): Promise<Result> {
    if (this.paused) throw this.resetError()
    const controller = new AbortController()
    this.active.add(controller)
    try {
      return await operation(controller.signal)
    } finally {
      this.active.delete(controller)
      if (!this.active.size) {
        for (const resolve of this.waiters) resolve()
        this.waiters.clear()
      }
    }
  }

  runReset<Result>(operation: () => Result | Promise<Result>): Promise<Result> {
    this.paused = true
    this.pendingResets += 1
    for (const controller of this.active) controller.abort()
    const result = this.tail.then(async () => {
      await this.options.beforeDrain?.()
      for (const handler of this.beforeDrainHandlers) await handler()
      for (const controller of this.active) controller.abort()
      while (this.active.size) {
        await new Promise<void>((resolve) => this.waiters.add(resolve))
      }
      try {
        const value = await operation()
        await this.options.afterReset?.()
        for (const handler of this.afterResetHandlers) await handler()
        return value
      } finally {
        this.pendingResets -= 1
        if (!this.pendingResets) this.paused = false
      }
    })
    this.tail = result.then(
      () => {},
      () => {},
    )
    return result
  }

  private resetError() {
    return new TestFixtureError(503, 'TEST_RESET_IN_PROGRESS', 'Test state reset is in progress')
  }
}
