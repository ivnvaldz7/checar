import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyGroqError, generateGroqJson } from '../src/services/groqClient.js'

test('clasifica una clave de Groq rechazada sin exponerla', () => {
  const result = classifyGroqError({ status: 401, message: 'invalid key gsk_secretToken' })

  assert.match(result.userMessage, /credenciales/i)
  assert.doesNotMatch(result.message, /gsk_secretToken/)
})

test('pide JSON estructurado a Groq cuando no necesita búsqueda', async () => {
  const originalKey = process.env.GROQ_API_KEY
  const originalFetch = globalThis.fetch
  let request

  process.env.GROQ_API_KEY = 'gsk_test'
  globalThis.fetch = async (_url, options) => {
    request = options
    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"valid":true}' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const raw = await generateGroqJson({ prompt: 'Respondé JSON.' })
    assert.equal(raw, '{"valid":true}')
    const body = JSON.parse(request.body)
    assert.deepEqual(body.response_format, { type: 'json_object' })
    assert.equal(body.tools, undefined)
    assert.equal(body.max_completion_tokens, 512)
  } finally {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = originalKey
  }
})

test('usa JSON Schema estricto y reintenta una falla transitoria de generación', async () => {
  const originalKey = process.env.GROQ_API_KEY
  const originalFetch = globalThis.fetch
  const requests = []

  process.env.GROQ_API_KEY = 'gsk_test'
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body))
    if (requests.length === 1) {
      return new Response(JSON.stringify({
        error: { message: 'Failed to generate JSON. Please adjust your prompt.' },
      }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"claims":[]}' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const raw = await generateGroqJson({
      prompt: 'Respondé JSON.',
      schemaName: 'claims',
      responseSchema: {
        type: 'object',
        properties: { claims: { type: 'array', items: { type: 'string' } } },
        required: ['claims'],
        additionalProperties: false,
      },
    })

    assert.equal(raw, '{"claims":[]}')
    assert.equal(requests.length, 2)
    assert.deepEqual(requests[0].response_format, {
      type: 'json_schema',
      json_schema: {
        name: 'claims',
        strict: true,
        schema: {
          type: 'object',
          properties: { claims: { type: 'array', items: { type: 'string' } } },
          required: ['claims'],
          additionalProperties: false,
        },
      },
    })
  } finally {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = originalKey
  }
})

test('usa Browser Search sin structured output al investigar una afirmación', async () => {
  const originalKey = process.env.GROQ_API_KEY
  const originalFetch = globalThis.fetch
  let request

  process.env.GROQ_API_KEY = 'gsk_test'
  globalThis.fetch = async (_url, options) => {
    request = options
    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"verdict":"sin_datos"}' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    await generateGroqJson({ prompt: 'Investigá la afirmación.', search: true })
    const body = JSON.parse(request.body)
    assert.deepEqual(body.tools, [{ type: 'browser_search' }])
    assert.equal(body.tool_choice, 'required')
    assert.equal(body.response_format, undefined)
    assert.equal(body.max_completion_tokens, 512)
  } finally {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = originalKey
  }
})
