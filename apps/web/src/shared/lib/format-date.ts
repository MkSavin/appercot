import { normalizeLocale } from './locale'

export const formatDate = (
  value: Date | number,
  language: string | undefined,
  options: Intl.DateTimeFormatOptions,
) => new Intl.DateTimeFormat(normalizeLocale(language), options).format(value)
