import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ClaimCard from '../components/ClaimCard'
import useAnalysisStore from '../store/analysisStore'
import {
  connect,
  disconnect,
  onPipelineStep,
  onTranscriptChunk,
  onClaimDetected,
  onClaimVerified,
  onAnalysisComplete,
  onAnalysisError,
  onConnectError,
} from '../services/socket'

export default function AnalysisPage() {
  const { sessionId } = useParams()
  const navigate      = useNavigate()

  // ── Store ──────────────────────────────────────────
  const claims       = useAnalysisStore((s) => s.claims)
  const textChunks   = useAnalysisStore((s) => s.textChunks)
  const status       = useAnalysisStore((s) => s.status)
  const error        = useAnalysisStore((s) => s.error)
  const articleTitle = useAnalysisStore((s) => s.articleTitle)
  const addTextChunk = useAnalysisStore((s) => s.addTextChunk)
  const addClaim     = useAnalysisStore((s) => s.addClaim)
  const setComplete  = useAnalysisStore((s) => s.setComplete)
  const setError     = useAnalysisStore((s) => s.setError)

  // ── Estado local (UI transitoria) ─────────────────
  const [pipelineLabel, setPipelineLabel]     = useState('Conectando...')
  const [hasLoadingClaim, setHasLoadingClaim] = useState(false)
  const [mobileTab, setMobileTab]             = useState('article')

  const textRef = useRef(null)

  // ── Conexión Socket.io ─────────────────────────────
  useEffect(() => {
    connect(sessionId)

    onConnectError(() => {
      setError('No pudimos conectar con el servidor. ¿Está corriendo en puerto 3001?')
    })

    onPipelineStep(({ label }) => {
      setPipelineLabel(label)
    })

    onTranscriptChunk(({ chunk }) => {
      addTextChunk(chunk)
    })

    onClaimDetected(() => {
      setHasLoadingClaim(true)
    })

    onClaimVerified((claimData) => {
      addClaim(claimData)
      setHasLoadingClaim(false)
    })

    onAnalysisComplete((data) => {
      setComplete(data)
      navigate(`/briefing/${sessionId}`)
    })

    onAnalysisError(({ message }) => {
      setError(message)
    })

    return () => disconnect()
  }, [sessionId]) // eslint-disable-line

  // Auto-scroll cuando llegan nuevos chunks de texto
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight
    }
  }, [textChunks.length])

  // ── Derivados ──────────────────────────────────────
  const streamedText = textChunks.join('')
  const totalClaims  = claims.length + (hasLoadingClaim ? 1 : 0)
  const isDone       = status === 'success'
  const isStreaming  = status === 'streaming'

  // ── Logo inline reutilizable ───────────────────────
  const Logo = () => (
    <div className="flex items-center gap-2.5">
      <span className="material-icons text-primary text-[20px]">fact_check</span>
      <span className="font-grotesk font-bold text-[18px] tracking-tight text-ink-1">
        Chec<span className="text-primary">AR</span>
      </span>
    </div>
  )

  // ── Estado de error ────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-surface flex flex-col font-inter">
        <header className="h-14 bg-surface-container-low flex items-center px-5">
          <Logo />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface-container-low border-l-2 border-fail p-6">
            <p className="font-mono text-[9px] text-fail tracking-[0.2em] mb-3">ERROR DE ANÁLISIS</p>
            <p className="font-grotesk font-semibold text-ink-1 mb-2">
              El análisis se interrumpió
            </p>
            <p className="font-inter text-[13px] text-ink-2 mb-6 leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 font-mono text-[10px] text-outline hover:text-ink-2 transition-colors tracking-[0.1em]"
            >
              <span className="material-icons text-[14px]">arrow_back</span>
              VOLVER AL INICIO
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render principal ───────────────────────────────
  return (
    <div className="h-screen bg-surface flex flex-col font-inter overflow-hidden">

      {/* Header */}
      <header className="h-14 bg-surface-container-low flex items-center justify-between px-5 shrink-0">
        <Logo />
        <div className="flex items-center gap-3 min-w-0 flex-1 ml-6">
          {/* Indicador live */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fail opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-fail" />
          </span>
          {/* Título — máximo 60 caracteres, truncado con CSS */}
          {articleTitle && (
            <span className="font-mono text-[11px] text-ink-2 truncate" style={{ maxWidth: '36ch' }}>
              {articleTitle.length > 60 ? articleTitle.slice(0, 60) + '…' : articleTitle}
            </span>
          )}
        </div>
        {/* Pipeline step — shrink-0 para que no comprima el título */}
        <span className="font-mono text-[9px] text-outline tracking-[0.15em] shrink-0 ml-4 hidden sm:block">
          {pipelineLabel.toUpperCase()}
        </span>
      </header>

      {/* Split layout — columna en mobile, lado a lado en desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── Panel izquierdo: transcripción ── */}
        <div className="flex flex-col md:w-[55%] min-h-0 bg-surface">
          <div className="pl-6 pr-5 py-2.5 bg-surface-container-low shrink-0">
            <span className="font-mono text-[9px] text-outline tracking-[0.2em]">
              TRANSCRIPCIÓN EN TIEMPO REAL
            </span>
          </div>
          <div ref={textRef} className="flex-1 overflow-y-auto pl-6 pr-5 py-5">
            {articleTitle && (
              <h2 className="font-grotesk font-bold text-base text-ink-1 mb-4 leading-snug">
                {articleTitle}
              </h2>
            )}
            <p className="font-mono text-[12px] text-ink-2 leading-relaxed">
              {streamedText}
              {isStreaming && (
                <span className="inline-block w-0.5 h-[13px] bg-primary ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          </div>
        </div>

        {/* ── Panel derecho: claims ── */}
        <div className="flex flex-col md:w-[45%] overflow-hidden bg-surface-container-low">
          <div className="px-5 py-2.5 bg-surface-container flex items-center justify-between shrink-0">
            <span className="font-mono text-[9px] text-outline tracking-[0.2em]">DETECCIONES</span>
            {totalClaims > 0 && (
              <span className="font-mono text-[11px] font-bold text-primary">
                {totalClaims}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {claims.map((claim, i) => (
              <ClaimCard key={i} {...claim} isLoading={false} />
            ))}

            {hasLoadingClaim && <ClaimCard isLoading={true} />}

            {/* Estado vacío inicial */}
            {totalClaims === 0 && !isDone && (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <span className="material-icons text-outline text-3xl">manage_search</span>
                <p className="font-mono text-[9px] text-outline text-center tracking-[0.15em]">
                  LAS DETECCIONES<br />APARECERÁN AQUÍ
                </p>
              </div>
            )}

            {/* Análisis completo — fallback si la navegación falla */}
            {isDone && (
              <button
                onClick={() => navigate(`/briefing/${sessionId}`)}
                className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-grotesk font-semibold text-sm py-3 rounded-[0.125rem] hover:opacity-90 transition-opacity mt-2"
              >
                Ver briefing completo
                <span className="material-icons text-[16px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
