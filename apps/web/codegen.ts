import type { CodegenConfig } from '@graphql-codegen/cli'

export default {
  schema: '../server/schema.graphql',
  documents: 'src/**/*.graphql.ts',
  generates: {
    'src/shared/api/graphql/generated/': {
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
      },
      config: {
        documentMode: 'string',
        useTypeImports: true,
      },
    },
  },
} satisfies CodegenConfig
