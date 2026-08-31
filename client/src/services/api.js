// Servicio HTTP — llamadas REST al backend.
import { requireServerUrl } from './serverUrl'

const REQUEST_TIMEOUT_MS = 90_000

/**
 * Inicia un análisis en el servidor.
 * @param {{ input: string, type: 'url' | 'text' }} params
 * @returns {{ sessionId: string }}
 * @throws {Error} con mensaje legible para mostrar en UI
 */
export async function analyzeContent({ input, type }) {
  let res
  const serverUrl = requireServerUrl()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    res = await fetch(`${serverUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, type }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('El backend tardó demasiado en responder. Verificá que Render esté activo e intentá de nuevo.')
    }

    throw new Error('No pudimos conectar con el backend. Verificá la URL de Render y que el servicio esté activo.')
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    // El servidor respondió con un error HTTP
    let message
    try {
      const body = await res.json()
      message = body.message || body.error || `Error del servidor (${res.status})`
    } catch {
      message = `Error del servidor (${res.status})`
    }
    throw new Error(message)
  }

  return res.json() // { sessionId }
}
