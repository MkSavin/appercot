import SchemaBuilder from '@pothos/core'
import { GraphQLScalarType, valueFromASTUntyped } from 'graphql'
import { z } from 'zod'
import type { GraphQLContext } from './context'

export const JsonScalar = new GraphQLScalarType<unknown, unknown>({
  name: 'JSON',
  serialize: (value) => z.json().parse(value),
  parseValue: (value) => z.json().parse(value),
  parseLiteral: (ast, variables) => z.json().parse(valueFromASTUntyped(ast, variables)),
})

export const builder = new SchemaBuilder<{
  Context: GraphQLContext
  Defaults: 'v3'
  Scalars: {
    JSON: { Input: unknown; Output: unknown }
  }
}>({ defaults: 'v3' })

builder.addScalarType('JSON', JsonScalar, {})
