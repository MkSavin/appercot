import { GraphQLError } from 'graphql'
import { ZodError } from 'zod'
import { DomainError } from '../domain/errors'

export const toGraphQLError = (error: unknown): GraphQLError => {
  if (error instanceof GraphQLError) return error
  if (error instanceof DomainError) {
    return new GraphQLError(error.message, { extensions: { code: error.code } })
  }
  if (error instanceof ZodError) {
    return new GraphQLError('Invalid input', { extensions: { code: 'BAD_REQUEST' } })
  }
  return new GraphQLError('Internal server error', { extensions: { code: 'INTERNAL' } })
}
