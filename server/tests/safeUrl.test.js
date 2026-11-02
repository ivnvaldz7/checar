import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchPublicUrl, isBlockedAddress, validatePublicUrl } from '../src/services/safeUrl.js'

test('bloquea rangos privados, locales y reservados', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '::1', 'fc00::1', 'fe80::1']) {
    assert.equal(isBlockedAddress(address), true, address)
  }
  assert.equal(isBlockedAddress('8.8.8.8'), false)
})

test('rechaza un hostname que resuelve a una IP privada', async () => {
  await assert.rejects(
    validatePublicUrl('https://interno.example', { lookup: async () => [{ address: '10.0.0.4', family: 4 }] }),
    { code: 'UNSAFE_URL' },
  )
})

test('rechaza URLs con IP local literal', async () => {
  await assert.rejects(validatePublicUrl('http://127.0.0.1:3000'), { code: 'UNSAFE_URL' })
  await assert.rejects(validatePublicUrl('http://[::1]/'), { code: 'UNSAFE_URL' })
})

test('valida cada redirección antes de descargar contenido', async () => {
  await assert.rejects(
    fetchPublicUrl('https://public.example', {
      lookup: async (hostname) => hostname === 'public.example'
        ? [{ address: '8.8.8.8', family: 4 }]
        : [{ address: '127.0.0.1', family: 4 }],
      fetchImpl: async () => new Response(null, {
        status: 302,
        headers: { location: 'http://interno.example/metadata' },
      }),
    }),
    { code: 'UNSAFE_URL' },
  )
})
