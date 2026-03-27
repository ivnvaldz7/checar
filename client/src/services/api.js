// Servicio HTTP — llamadas REST al backend.
// Por ahora solo tiene analyzeContent. Se expande cuando se agregan más rutas.

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

/**
 * Inicia un análisis en el servidor.
 * @param {{ input: string, type: 'url' | 'text' }} params
 * @returns {{ sessionId: string }}
 * @throws {Error} con mensaje legible para mostrar en UI
 */
export async function analyzeContent({ input, type }) {
  let res

  try {
    res = await fetch(`${SERVER_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, type }),
    })
  } catch {
    // Error de red — el servidor no está corriendo o no es alcanzable
    throw new Error(
      'No pudimos conectar con el servidor. ¿Está corriendo en puerto 3001?'
    )
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
