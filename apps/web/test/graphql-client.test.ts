import { expect, test } from 'bun:test'
import { getGraphqlEndpoint } from '../src/shared/api/graphql/client'

test('GraphQL endpoint is absolute and stays on the current origin', () => {
  expect(getGraphqlEndpoint('http://localhost:5173')).toBe('http://localhost:5173/graphql')
  expect(getGraphqlEndpoint('https://bots.example.test/base')).toBe(
    'https://bots.example.test/graphql',
  )
})
