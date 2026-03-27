// Servicio de Socket.io — wrapper sobre socket.io-client.
// El componente llama connect() al montar y disconnect() al desmontar.
// El singleton a nivel de módulo asegura una sola conexión activa a la vez.

import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

let socket = null

// ── Conexión ───────────────────────────────────────────────────────────────

/**
 * Conecta al servidor y emite join_session con el sessionId.
 * Si ya había una conexión activa, la cierra primero.
 */
export function connect(sessionId) {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  socket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
  })

  socket.on('connect', () => {
    socket.emit('join_session', { sessionId })
  })

  return socket
}

/**
 * Desconecta el socket limpiamente y elimina todos los listeners.
 */
export function disconnect() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

// ── Listeners de eventos del servidor ────────────────────────────────────
// Cada función reemplaza el listener anterior del mismo evento (off + on)
// para evitar duplicados si el componente se re-renderiza.

/** { step: string, label: string } */
export function onPipelineStep(cb) {
  if (!socket) return
  socket.off('pipeline_step')
  socket.on('pipeline_step', cb)
}

/** { chunk: string } */
export function onTranscriptChunk(cb) {
  if (!socket) return
  socket.off('transcript_chunk')
  socket.on('transcript_chunk', cb)
}

/** { claim: string, index: number, total: number } */
export function onClaimDetected(cb) {
  if (!socket) return
  socket.off('claim_detected')
  socket.on('claim_detected', cb)
}

/** { claim: string, verdict: string, explanation: string, sources: string[], historicalData?: array } */
export function onClaimVerified(cb) {
  if (!socket) return
  socket.off('claim_verified')
  socket.on('claim_verified', cb)
}

/** { claims: array, articleTitle: string, articleText: string } */
export function onAnalysisComplete(cb) {
  if (!socket) return
  socket.off('analysis_complete')
  socket.on('analysis_complete', cb)
}

/** { message: string, step: string } */
export function onAnalysisError(cb) {
  if (!socket) return
  socket.off('analysis_error')
  socket.on('analysis_error', cb)
}

/** Error de conexión al servidor (socket.io-client lo emite automáticamente) */
export function onConnectError(cb) {
  if (!socket) return
  socket.off('connect_error')
  socket.on('connect_error', cb)
}
