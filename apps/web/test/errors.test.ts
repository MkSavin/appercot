import '../src/shared/config/i18n'
import { expect, test } from 'bun:test'
import { ClientError } from 'graphql-request'
import { getRequestErrorMessage } from '../src/shared/api/errors'

const graphQLError = (code: string) =>
  new ClientError(
    {
      status: 200,
      headers: new Headers(),
      body: '',
      data: null,
      errors: [{ message: 'Server error', extensions: { code } }],
    },
    { query: 'mutation Test' },
  )

test('maps protocol errors to actionable Russian messages', () => {
  expect(getRequestErrorMessage(graphQLError('RATE_LIMIT'))).toContain('Слишком много')
  expect(getRequestErrorMessage(graphQLError('UNAUTHORIZED'))).toContain('Сессия')
  expect(getRequestErrorMessage(graphQLError('UNAUTHORIZED'), 'authentication')).toBe(
    'Неверное имя пользователя или пароль.',
  )
  expect(getRequestErrorMessage(graphQLError('BOT_BLOCKED'))).toContain('заблокирован')
  expect(getRequestErrorMessage(new Error('Offline'))).toBe('Offline')
  expect(getRequestErrorMessage(null)).toContain('Не удалось')
})

test('does not expose GraphQL request variables in transport errors', () => {
  const error = new ClientError(
    { status: 502, headers: new Headers(), body: '', data: null },
    { query: 'mutation Login', variables: { password: 'secret-password' } },
  )
  const message = getRequestErrorMessage(error)
  expect(message).not.toContain('secret-password')
  expect(message).toContain('сервером')
})
