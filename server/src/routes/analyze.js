import { Router } from 'express'
import { randomUUID } from 'crypto'

const TTL_MS = 30_000 // tiempo máximo de espera para join_session
const MAX_INPUT_CHARS = 8_000

/**
 * Jobs pendientes: sessionId → { io, input, type }.
 * Se exporta para que index.js pueda consumir el job al recibir join_session.
 */
export const pendingPipelines = new Map()

/**
 * Crea el router para POST /api/analyze.
 * Ya no llama a runPipeline() directamente — guarda el job en pendingPipelines
 * y espera a que el cliente haga join_session antes de arrancar el pipeline.
 */
export function createAnalyzeRouter() {
  const router = Router()

  router.post('/', (req, res) => {
    const { input, type } = req.body

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return res.status(400).json({ error: 'El campo "input" es requerido y no puede estar vacío.' })
    }

    if (input.length > MAX_INPUT_CHARS) {
      return res.status(413).json({ error: `El campo "input" no puede superar los ${MAX_INPUT_CHARS} caracteres.` })
    }

    if (!['url', 'text'].includes(type)) {
      return res.status(400).json({ error: 'El campo "type" debe ser "url" o "text".' })
    }

    if (type === 'url') {
      let url
      try {
        url = new URL(input.trim())
      } catch {
        return res.status(400).json({ error: 'La URL no es válida.' })
      }

      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        return res.status(400).json({ error: 'Solo se admiten URLs HTTP/HTTPS sin credenciales.' })
      }
    }

    const sessionId = randomUUID()

    // Guardar el job — el pipeline arranca cuando llega join_session
    pendingPipelines.set(sessionId, { input: input.trim(), type })
    console.log(`[analyze] job pendiente registrado — sessionId: ${sessionId}`)

    // TTL: si el cliente no hace join_session en 30s, limpiar la entrada
    setTimeout(() => {
      if (pendingPipelines.has(sessionId)) {
        pendingPipelines.delete(sessionId)
        console.log(`[analyze] job expirado por TTL — sessionId: ${sessionId}`)
      }
    }, TTL_MS)

    res.json({ sessionId })
  })

  return router
}
