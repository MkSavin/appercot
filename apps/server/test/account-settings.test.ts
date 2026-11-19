import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashToken } from '../src/auth/tokens'
import { totpCode } from '../src/auth/totp'
import { createServerFixture, graphqlRequest } from './helpers'

const decodeBase32 = (value: string) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bits = [...value]
    .map((character) => alphabet.indexOf(character).toString(2).padStart(5, '0'))
    .join('')
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)))
}

const sessionCookie = (response: Response) => {
  const cookie = response.headers.get('set-cookie')?.split(';')[0]
  if (!cookie) throw new Error('Session cookie is missing')
  return cookie
}

// @anchor INV:account-settings/manages-security
test('changes account data, enforces TOTP and revokes sessions on reset or deletion', async () => {
  expect(totpCode(Buffer.from('12345678901234567890'), 1)).toBe('287082')
  const directory = mkdtempSync(join(tmpdir(), 'appercot-totp-'))
  const fixture = createServerFixture(directory)
  try {
    const call = (query: string, variables: Record<string, unknown> = {}, cookie?: string) =>
      graphqlRequest(fixture.baseUrl, query, variables, cookie)
    const login = (username: string, password: string, otp?: string) =>
      call(
        'mutation($username: String!, $password: String!, $otp: String) { login(username: $username, password: $password, otp: $otp) { user { id twoFactorEnabled } } }',
        { username, password, otp },
      )
    const owner = sessionCookie((await login('admin', 'password123')).response)
    const signUp = await call(
      'mutation { register(username: "visitor", displayName: "Visitor", password: "password123", invite: "bootstrap-invite") { user { id } } }',
    )
    const { user } = signUp.body.data.register as { user: { id: string } }
    const cookie = sessionCookie(signUp.response)
    const otherCookie = sessionCookie((await login('visitor', 'password123')).response)
    const sessions = await call('query { mySessions { id current } }', {}, cookie)
    const rows = sessions.body.data.mySessions as Array<{ id: string; current: boolean }>
    expect(rows).toHaveLength(2)
    const otherId = rows.find((row) => !row.current)?.id
    const currentId = rows.find((row) => row.current)?.id
    expect(currentId).not.toBe(hashToken(cookie.split('=')[1] ?? ''))

    const socket = new WebSocket(`${fixture.baseUrl.replace('http:', 'ws:')}/api/ws`, {
      headers: { cookie: otherCookie },
    } as never)
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true })
      socket.addEventListener('error', () => reject(new Error('WebSocket failed')), { once: true })
    })
    const disconnected = new Promise<number>((resolve) =>
      socket.addEventListener('close', (event) => resolve(event.code), { once: true }),
    )
    expect(
      (await call('mutation($id: ID!) { revokeMySession(id: $id) }', { id: otherId }, cookie)).body
        .data.revokeMySession,
    ).toBe(true)
    expect(await disconnected).toBe(4401)
    expect(
      (await call('query { mySessions { id } }', {}, otherCookie)).body.errors?.[0]?.extensions
        ?.code,
    ).toBe('UNAUTHORIZED')

    const changeProfile =
      'mutation { updateProfile(username: "courier", displayName: "Courier", bio: "Parcel delivery") { username displayName bio } }'
    expect((await call(changeProfile, {}, cookie)).body.data.updateProfile).toEqual({
      username: 'courier',
      displayName: 'Courier',
      bio: 'Parcel delivery',
    })
    expect(
      (await call('query($id: ID!) { adminUser(userId: $id) { bio } }', { id: user.id }, cookie))
        .body.errors?.[0]?.extensions?.code,
    ).toBe('FORBIDDEN')
    expect(
      (
        await call(
          'mutation($id: ID!) { updateAdminUser(userId: $id, username: "runner", displayName: "Runner", bio: "Same-day delivery") { username bio } }',
          { id: user.id },
          owner,
        )
      ).body.data.updateAdminUser,
    ).toEqual({ username: 'runner', bio: 'Same-day delivery' })

    const setup = await call('mutation { beginTotp(password: "password123") }', {}, cookie)
    const secret = decodeBase32(setup.body.data.beginTotp as string)
    const earlierCode = totpCode(secret, Math.floor(Date.now() / 30_000) - 1)
    const enable = await call(
      'mutation($code: String!) { enableTotp(password: "password123", code: $code) }',
      { code: earlierCode },
      cookie,
    )
    const recovery = enable.body.data.enableTotp as string
    expect(recovery).toHaveLength(32)
    expect((await login('runner', 'password123')).body.errors?.[0]?.extensions?.code).toBe(
      'TOTP_REQUIRED',
    )
    expect(
      (await login('runner', 'password123', earlierCode)).body.errors?.[0]?.extensions?.code,
    ).toBe('TOTP_INVALID')
    const loginWithTotp = await login(
      'runner',
      'password123',
      totpCode(secret, Math.floor(Date.now() / 30_000)),
    )
    expect(loginWithTotp.body.data.login).toMatchObject({ user: { twoFactorEnabled: true } })
    const totpSession = sessionCookie(loginWithTotp.response)
    const change =
      'mutation($otp: String!) { changePassword(password: "password123", newPassword: "password456", otp: $otp) }'
    expect((await call(change, { otp: recovery }, totpSession)).body.data.changePassword).toBe(true)
    expect(
      (await call('query { mySessions { id } }', {}, cookie)).body.errors?.[0]?.extensions?.code,
    ).toBe('UNAUTHORIZED')
    expect(
      (await login('runner', 'password456', recovery)).body.errors?.[0]?.extensions?.code,
    ).toBe('TOTP_INVALID')
    expect(
      (
        await call(
          'mutation($id: ID!) { resetUserPassword(userId: $id, newPassword: "password789") }',
          { id: user.id },
          owner,
        )
      ).body.data.resetUserPassword,
    ).toBe(true)
    expect(
      (await call('query { mySessions { id } }', {}, totpSession)).body.errors?.[0]?.extensions
        ?.code,
    ).toBe('UNAUTHORIZED')

    const futureCode = totpCode(secret, Math.floor(Date.now() / 30_000) + 1)
    const lastCookie = sessionCookie((await login('runner', 'password789', futureCode)).response)
    expect(
      (await call('mutation { deleteMyAccount(password: "password123") }', {}, owner)).body
        .errors?.[0]?.extensions?.code,
    ).toBe('FORBIDDEN')
    expect(
      (await call('mutation { deleteMyAccount(password: "password789") }', {}, lastCookie)).body
        .errors?.[0]?.extensions?.code,
    ).toBe('TOTP_REQUIRED')

    const ownerSetup = await call('mutation { beginTotp(password: "password123") }', {}, owner)
    const ownerSecret = decodeBase32(ownerSetup.body.data.beginTotp as string)
    const ownerActivation = await call(
      'mutation($code: String!) { enableTotp(password: "password123", code: $code) }',
      { code: totpCode(ownerSecret, Math.floor(Date.now() / 30_000)) },
      owner,
    )
    const recovered = await login(
      'admin',
      'password123',
      ownerActivation.body.data.enableTotp as string,
    )
    expect(recovered.body.data.login).toMatchObject({ user: { twoFactorEnabled: false } })
  } finally {
    fixture.stop()
    rmSync(directory, { recursive: true, force: true })
  }
})

test('deletes a non-owner account and invalidates its cookie', async () => {
  const fixture = createServerFixture()
  try {
    const response = await graphqlRequest(
      fixture.baseUrl,
      'mutation { register(username: "visitor", displayName: "Visitor", password: "password123", invite: "bootstrap-invite") { user { id } } }',
    )
    const cookie = sessionCookie(response.response)
    const before = await graphqlRequest(fixture.baseUrl, 'query { mySessions { id } }', {}, cookie)
    expect(before.body.data.mySessions).toHaveLength(1)
    expect(
      (
        await graphqlRequest(
          fixture.baseUrl,
          'mutation { deleteMyAccount(password: "password123") }',
          {},
          cookie,
        )
      ).body.data.deleteMyAccount,
    ).toBe(true)
    expect(
      (await graphqlRequest(fixture.baseUrl, 'query { mySessions { id } }', {}, cookie)).body
        .errors?.[0]?.extensions?.code,
    ).toBe('UNAUTHORIZED')
  } finally {
    fixture.stop()
  }
})
