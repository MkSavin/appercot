import { lookup } from 'node:dns/promises'
import { request as httpRequest, type IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { BlockList, isIP } from 'node:net'
import { Readable } from 'node:stream'
import { checkServerIdentity } from 'node:tls'
import { FileRequestError } from './media-capacity'

const blocked = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(network, prefix, 'ipv4')
for (const [network, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
] as const)
  blocked.addSubnet(network, prefix, 'ipv6')
const globalIPv6 = new BlockList()
globalIPv6.addSubnet('2000::', 3, 'ipv6')

const publicIp = (address: string, family: number) =>
  family === 4
    ? !blocked.check(address, 'ipv4')
    : family === 6 && globalIPv6.check(address, 'ipv6') && !blocked.check(address, 'ipv6')

const getResponse = async (url: URL, trustedHosts: string[], signal: AbortSignal) => {
  const trusted = trustedHosts.includes(url.host.toLowerCase())
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (!trusted && url.port)
  )
    throw new FileRequestError(400, 'Only approved HTTP(S) media URLs are allowed')
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const family = isIP(hostname)
  const addresses = family ? [{ address: hostname, family }] : await lookup(hostname, { all: true })
  const address = addresses.find((entry) => trusted || publicIp(entry.address, entry.family))
  if (!address) throw new FileRequestError(403, 'Media URL does not resolve to an allowed address')

  return new Promise<IncomingMessage>((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      {
        hostname: address.address,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        headers: { host: url.host, 'accept-encoding': 'identity' },
        ...(url.protocol === 'https:'
          ? {
              servername: family ? undefined : hostname,
              checkServerIdentity: (
                _host: string,
                certificate: Parameters<typeof checkServerIdentity>[1],
              ) => checkServerIdentity(hostname, certificate),
            }
          : {}),
        signal,
        agent: false,
        family: address.family,
      },
      resolve,
    )
    request.on('error', reject)
    request.setTimeout(30_000, () => request.destroy(new Error('Media source timed out')))
    request.end()
  })
}

export const downloadMedia = async (input: string, trustedHosts: string[], signal: AbortSignal) => {
  if (input.length > 8192) throw new FileRequestError(400, 'Media URL is too long')
  try {
    let url = new URL(input)
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(60 * 60_000)])
    for (let hop = 0; hop < 6; hop++) {
      const response = await getResponse(url, trustedHosts, deadline)
      const status = response.statusCode ?? 0
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.destroy()
        url = new URL(response.headers.location, url)
        continue
      }
      if (
        status !== 200 ||
        (response.headers['content-encoding'] &&
          response.headers['content-encoding'] !== 'identity')
      ) {
        response.destroy()
        throw new FileRequestError(422, 'Media source did not return a complete file')
      }
      return {
        body: Readable.toWeb(response, {
          strategy: { highWaterMark: 2 },
        }) as unknown as ReadableStream<Uint8Array>,
        mime: response.headers['content-type'] ?? '',
        length: response.headers['content-length'],
        name: url.pathname.split('/').pop() || 'file',
      }
    }
    throw new FileRequestError(422, 'Too many redirects from media source')
  } catch (error) {
    if (error instanceof FileRequestError) throw error
    throw new FileRequestError(422, 'Could not retrieve media URL')
  }
}
