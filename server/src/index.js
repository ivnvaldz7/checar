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

// ── CORS ────────────────────────────────────────────────────────────────────
// CLIENT_URL acepta una lista separada por comas. Cada entrada puede ser un
// origen exacto o un patrón con comodín de subdominio, por ejemplo
// "https://*.vercel.app" para habilitar los previews de Vercel.
const DEFAULT_ALLOWED_ORIGINS = [
  'https://checar-v2.vercel.app',
  'https://*.vercel.app',
]

const LOCAL_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

function parseOriginPatterns(value) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchesOrigin(origin, pattern) {
  if (pattern === origin) return true
  if (!pattern.includes('*')) return false

  const regex = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`, 'i')
  return regex.test(origin)
}

const configuredOrigins = parseOriginPatterns(process.env.CLIENT_URL)
const allowedOrigins = [
  ...new Set([
    ...LOCAL_ORIGINS,
    ...(configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS),
  ]),
]

if (configuredOrigins.length === 0) {
  console.warn('[config] CLIENT_URL no está configurada; usando orígenes por defecto para CORS.')
}
console.log(`[config] CORS permitido para: ${allowedOrigins.join(', ')}`)

const corsOrigin = (origin, callback) => {
  // Sin cabecera Origin: requests server-to-server, curl o health checks.
  if (!origin) return callback(null, true)

  const allowed = allowedOrigins.some((pattern) => matchesOrigin(origin, pattern))
  if (!allowed) console.warn(`[config] origen bloqueado por CORS: ${origin}`)

  return callback(null, allowed)
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
