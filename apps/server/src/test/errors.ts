export class TestFixtureError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly path?: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'TestFixtureError'
  }
}

export const fixtureNotFound = (kind: string, id: string) =>
  new TestFixtureError(404, 'TEST_FIXTURE_NOT_FOUND', `${kind} ${id} was not found`)

export const fixtureConflict = (message: string, path?: string) =>
  new TestFixtureError(409, 'TEST_FIXTURE_CONFLICT', message, path)
