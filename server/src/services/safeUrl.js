import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_REDIRECTS = 3

function unsafeUrlError() {
  const error = new Error('La URL apunta a una dirección no permitida.')
  error.code = 'UNSAFE_URL'
  return error
}

function isBlockedIpv4(address) {
  const octets = address.split('.').map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true

  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

export function isBlockedAddress(address) {
  const normalized = address.toLowerCase()
  const family = isIP(normalized)
  if (family === 4) return isBlockedIpv4(normalized)
  if (family !== 6) return true

  if (normalized.startsWith('::ffff:')) return isBlockedIpv4(normalized.slice(7))

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('2001:db8:')
  )
}

export async function validatePublicUrl(value, { lookup = dnsLookup } = {}) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw unsafeUrlError()
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')))
  ) {
    throw unsafeUrlError()
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, order: 'verbatim' })

  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw unsafeUrlError()
  }

  return url
}

function isRedirect(response) {
  return [301, 302, 303, 307, 308].includes(response.status)
}

export async function fetchPublicUrl(value, {
  fetchImpl,
  lookup,
  signal,
  headers,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl es requerido')

  let url = await validatePublicUrl(value, { lookup })
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetchImpl(url, { signal, headers, redirect: 'manual' })
    if (!isRedirect(response)) return response

    const location = response.headers.get('location')
    if (!location || redirectCount === MAX_REDIRECTS) throw unsafeUrlError()
    url = await validatePublicUrl(new URL(location, url).toString(), { lookup })
  }

  throw unsafeUrlError()
}
