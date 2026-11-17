import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  { ignores: ['**/shared/api/graphql/generated/**'] },
  { files: ['./src/shared/**'], rules: { 'fsd/public-api': 'off' } },
  { rules: { 'fsd/insignificant-slice': 'off' } },
])
