import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyGeminiError } from '../src/services/geminiConfig.js'

test('clasifica una clave rechazada sin exponerla', () => {
  const result = classifyGeminiError({ status: 403, message: 'API key AIzaSecretKey is not valid' })

  assert.match(result.userMessage, /credenciales/i)
  assert.doesNotMatch(result.message, /AIzaSecretKey/)
})

test('clasifica un modelo no disponible', () => {
  const result = classifyGeminiError({ status: 404, message: 'model not found' })

  assert.match(result.userMessage, /modelo/i)
})

test('clasifica límites de cuota', () => {
  const result = classifyGeminiError({ status: 429, message: 'RESOURCE_EXHAUSTED' })

  assert.match(result.userMessage, /límite/i)
})
