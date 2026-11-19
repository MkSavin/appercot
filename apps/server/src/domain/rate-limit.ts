export class RateLimiter {
  private readonly hits = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  reset() {
    this.hits.clear()
  }

  allow(key: string, now = Date.now()) {
    const recent = (this.hits.get(key) ?? []).filter((timestamp) => now - timestamp < this.windowMs)
    if (recent.length >= this.limit) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(now)
    this.hits.set(key, recent)
    return true
  }
}
