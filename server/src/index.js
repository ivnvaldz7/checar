import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { createAnalyzeRouter, pendingPipelines } from './routes/analyze.js'
import { runPipeline } from './pipeline.js'

const app = express()
const httpServer = createServer(app)

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOrigin = configuredOrigins.length === 0 ? true : configuredOrigins

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
})

app.use(cors({ origin: corsOrigin }))
app.use(express.json())

// Rutas
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/analyze', createAnalyzeRouter())

// Socket.io — gestión de sesiones
io.on('connection', (socket) => {
  console.log(`[socket] cliente conectado: ${socket.id}`)

  socket.on('join_session', ({ sessionId }) => {
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
