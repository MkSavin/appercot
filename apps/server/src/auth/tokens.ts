export const createRandomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Buffer.from(bytes).toString('base64url')
}

export const hashToken = (token: string) =>
  new Bun.CryptoHasher('sha256').update(token).digest('hex')
