import { Router } from 'express'
import { randomUUID } from 'crypto'
import { runPipeline } from '../pipeline.js'

const TTL_MS = 30_000 // tiempo máximo de espera para join_session

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

    if (!['url', 'text'].includes(type)) {
      return res.status(400).json({ error: 'El campo "type" debe ser "url" o "text".' })
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
