export const readAuthReturn = (search: string) => {
  const next = new URLSearchParams(search).get('next')
  if (!next) return '/'
  const base = 'https://appercot.invalid'
  try {
    const url = new URL(next, base)
    if (
      next.startsWith('/') &&
      url.origin === base &&
      /^\/(?:browse(?:\/[a-zA-Z0-9-]+)?|settings(?:\/[a-z]+(?:\/[a-zA-Z0-9-]+)?)?|c\/[a-zA-Z0-9-]+(?:\/profile)?)?$/.test(
        url.pathname,
      )
    ) {
      return url.pathname + url.search
    }
  } catch {
    return '/'
  }
  return '/'
}

export const authHref = (path: '/login' | '/register', next: string) =>
  next === '/' ? path : `${path}?${new URLSearchParams({ next })}`
