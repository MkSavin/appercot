import { GraphQLClient } from 'graphql-request'

export const getGraphqlEndpoint = (
  origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
) => new URL('/graphql', origin).toString()

export const graphqlClient = new GraphQLClient(getGraphqlEndpoint(), {
  credentials: 'include',
})
