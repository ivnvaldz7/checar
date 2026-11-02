import test from 'node:test'
import assert from 'node:assert/strict'
import { isRateLimited } from '../src/routes/analyze.js'
import { normalizeSources } from '../src/services/claimVerifier.js'

test('limita el undécimo análisis de una misma dirección dentro de 15 minutos', () => {
  const address = `test-${Date.now()}-${Math.random()}`
  const now = Date.now()

  for (let i = 0; i < 10; i += 1) {
    assert.equal(isRateLimited(address, now + i), false)
  }
  assert.equal(isRateLimited(address, now + 11), true)
})

test('solo conserva fuentes con URL HTTP o HTTPS', () => {
  const sources = normalizeSources([
    'https://www.indec.gob.ar/datos',
    'javascript:alert(1)',
    { url: 'ftp://example.com/file', label: 'No válida' },
  ])

  assert.deepEqual(sources, [{ url: 'https://www.indec.gob.ar/datos', label: 'indec.gob.ar' }])
})
