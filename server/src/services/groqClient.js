import { GROQ_MODEL } from './aiConfig.js'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

function redact(message) {
  return String(message || 'Error sin detalle')
    .replace(/gsk_[\w-]+/g, '[API_KEY_REDACTED]')
    .slice(0, 500)
}

export function classifyGroqError(error) {
  const status = Number(error?.status)
  const message = redact(error?.message)

  let userMessage = 'Groq no respondió correctamente. Intentá de nuevo en unos minutos.'
  if (status === 401 || status === 403 || /api key|authentication|unauthorized/i.test(message)) {
    userMessage = 'Groq rechazó las credenciales. Revisá GROQ_API_KEY en el backend.'
  } else if (status === 404 || /model.*not found|model.*decommissioned/i.test(message)) {
    userMessage = `El modelo de Groq configurado (${GROQ_MODEL}) no está disponible.`
  } else if (status === 429 || /rate limit|quota/i.test(message)) {
    userMessage = 'Groq alcanzó su límite de uso gratuito. Esperá unos minutos e intentá nuevamente.'
  }

  return { status: Number.isInteger(status) ? status : null, message, userMessage }
}

export function createGroqError(operation, error, step) {
  const details = classifyGroqError(error)
  console.error(`[groq] ${operation} falló`, details)

  const wrapped = new Error(details.userMessage)
  wrapped.step = step
  return wrapped
}

function makeApiError(status, payload) {
  const message = payload?.error?.message || payload?.message || `HTTP ${status}`
  const error = new Error(message)
  error.status = status
  return error
}

/**
 * Solicita a Groq una respuesta JSON. Browser Search no admite structured
 * outputs; por eso para búsquedas se exige JSON en el prompt y se parsea luego.
 */
export async function generateGroqJson({ prompt, search = false }) {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) {
    const error = new Error('GROQ_API_KEY no está configurada.')
    error.status = 401
    throw error
  }

  const body = {
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_completion_tokens: search ? 2048 : 1024,
    stream: false,
    ...(search
      ? {
          tool_choice: 'required',
          tools: [{ type: 'browser_search' }],
        }
      : { response_format: { type: 'json_object' } }),
  }

  let response
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (cause) {
    const error = new Error('No se pudo conectar con Groq.')
    error.cause = cause
    throw error
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw makeApiError(response.status, null)
  }

  if (!response.ok) throw makeApiError(response.status, payload)

  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Groq devolvió una respuesta vacía.')
  }

  return content
}
