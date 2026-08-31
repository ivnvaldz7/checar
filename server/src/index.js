import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { createAnalyzeRouter, pendingPipelines } from './routes/analyze.js'
import { runPipeline } from './pipeline.js'

const app = express()
const httpServer = createServer(app)

if (!process.env.GEMINI_API_KEY?.trim()) {
  console.error('[config] GEMINI_API_KEY no está configurada. El backend no puede iniciar análisis.')
  throw new Error('Falta GEMINI_API_KEY')
}

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .map((origin) => origin.replace(/\/+$/, ''))
  .filter(Boolean)

const corsOrigin = configuredOrigins.length === 0 ? false : configuredOrigins

if (configuredOrigins.length === 0) {
  console.warn('[config] CLIENT_URL no está configurada; CORS queda deshabilitado. Configurá el dominio de Vercel en Render.')
}

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
})

app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '16kb' }))

// Rutas
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/analyze', createAnalyzeRouter())

// Express devuelve HTML por defecto cuando falla el parseo de JSON. El cliente
// espera JSON para poder mostrar un error accionable.
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'El cuerpo de la petición no contiene JSON válido.' })
  }
  return next(err)
})

// Socket.io — gestión de sesiones
io.on('connection', (socket) => {
  console.log(`[socket] cliente conectado: ${socket.id}`)

  socket.on('join_session', (payload = {}) => {
    const { sessionId } = payload
    if (
      typeof sessionId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)
    ) {
      socket.emit('analysis_error', {
        message: 'La sesión de análisis no es válida. Iniciá una nueva consulta.',
        step: 'connection',
      })
      return
    }

    socket.join(sessionId)
    console.log(`[socket] ${socket.id} se unió a sesión ${sessionId}`)

    // Buscar el job pendiente para esta sesión
    const job = pendingPipelines.get(sessionId)
    if (!job) {
      console.log(`[socket] sin job pendiente para sessionId: ${sessionId}`)
      return
    }

    // Consumir el job y arrancar el pipeline
    pendingPipelines.delete(sessionId)
    runPipeline({ io, sessionId, input: job.input, type: job.type }).catch((err) => {
      console.error('[socket] error no capturado en pipeline:', err)
    })
  })

  socket.on('disconnect', () => {
    console.log(`[socket] cliente desconectado: ${socket.id}`)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`[server] escuchando en puerto ${PORT}`)
})
