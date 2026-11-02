import test from 'node:test'
import assert from 'node:assert/strict'
import { isRateLimited, releasePipelineSlot, tryAcquirePipelineSlot } from '../src/routes/analyze.js'
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

test('permite solo un análisis activo por dirección y libera el cupo al finalizar', () => {
  const address = `active-${Date.now()}-${Math.random()}`

  assert.equal(tryAcquirePipelineSlot(address), true)
  assert.equal(tryAcquirePipelineSlot(address), false)
  releasePipelineSlot(address)
  assert.equal(tryAcquirePipelineSlot(address), true)
  releasePipelineSlot(address)
})
