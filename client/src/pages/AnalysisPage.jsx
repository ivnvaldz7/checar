import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ClaimCard from '../components/ClaimCard'
import useAnalysisStore from '../store/analysisStore'
import { claimAccents } from '../tokens'
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
  const [currentStep, setCurrentStep]         = useState('connection')
  const [detectedClaims, setDetectedClaims]   = useState([])
  const [showTranscript, setShowTranscript]   = useState(false)

  const textRef = useRef(null)

  // ── Conexión Socket.io ─────────────────────────────
  useEffect(() => {
    connect(sessionId)

    onConnectError(() => {
      setError('No pudimos conectar con el servidor. ¿Está corriendo en puerto 3001?')
    })

    onPipelineStep(({ step, label }) => {
      setCurrentStep(step)
      setPipelineLabel(label)
    })

    onTranscriptChunk(({ chunk }) => {
      addTextChunk(chunk)
    })

    onClaimDetected(({ claim, index, total }) => {
      setDetectedClaims((state) => {
        const next = [...state]
        next[index] = {
          claim,
          claimIndex: index,
          total,
        }
        return next
      })
    })

    onClaimVerified((claimData) => {
      addClaim(claimData)
    })

    onAnalysisComplete((data) => {
      setCurrentStep('complete')
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
  const verifiedClaimIndexes = new Set(
    claims.map((claim, index) => claim.claimIndex ?? index)
  )
  const pendingClaims = detectedClaims.filter(
    (claim) => claim && !verifiedClaimIndexes.has(claim.claimIndex)
  )
  const detectedCount = detectedClaims.filter(Boolean).length
  const totalClaims  = detectedCount || claims.length
  const isDone       = status === 'success'
  const isStreaming  = status === 'streaming'
  const transcriptWordCount = streamedText.trim().length > 0
    ? streamedText.trim().split(/\s+/).length
    : 0
  const observedClaims = detectedClaims.filter(Boolean).slice(-4)
  const stageItems = [
    {
      key: 'extraction',
      title: 'Apertura editorial',
      copy: 'Recuperamos la nota y ordenamos su estructura base.',
    },
    {
      key: 'validation',
      title: 'Filtro de relevancia',
      copy: 'Chequeamos si el contenido entra en el universo político verificable.',
    },
    {
      key: 'claim_detection',
      title: 'Selección de frases',
      copy: 'Señalamos los pasajes con más valor factual y potencial de contraste.',
    },
    {
      key: 'claim_verification',
      title: 'Contraste de evidencia',
      copy: 'Buscamos fuentes y resolvemos el estado de cada afirmación.',
    },
  ]
  const stageOrder = stageItems.map((item) => item.key)
  const visualStep = currentStep === 'transcript' ? 'extraction' : currentStep
  const activeStageIndex = stageOrder.indexOf(visualStep)

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

      <header className="h-14 bg-surface-container-low flex items-center justify-between px-5 shrink-0">
        <Logo />
        <div className="flex items-center gap-3 min-w-0 flex-1 ml-6">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fail opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-fail" />
          </span>
          {articleTitle && (
            <span className="font-mono text-[11px] text-ink-2 truncate" style={{ maxWidth: '36ch' }}>
              {articleTitle.length > 60 ? articleTitle.slice(0, 60) + '…' : articleTitle}
            </span>
          )}
        </div>
        <span className="font-mono text-[9px] text-outline tracking-[0.15em] shrink-0 ml-4 hidden sm:block">
          {pipelineLabel.toUpperCase()}
        </span>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex flex-col md:w-[58%] min-h-0 bg-surface">
          <div className="px-6 py-2.5 bg-surface-container-low shrink-0 flex items-center justify-between gap-4">
            <span className="font-mono text-[9px] text-outline tracking-[0.2em]">
              MESA DE EDICIÓN
            </span>
            <button
              type="button"
              onClick={() => setShowTranscript((state) => !state)}
              className="font-mono text-[9px] text-outline hover:text-ink-1 tracking-[0.14em] transition-colors"
            >
              {showTranscript ? 'OCULTAR TEXTO' : 'VER TEXTO EXTRAÍDO'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="border border-bdr-faint bg-surface-container-low/70 rounded-[0.2rem] overflow-hidden">
              <div className="px-5 py-5 border-b border-bdr-faint bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
                <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
                  <div>
                    <p className="font-mono text-[10px] text-outline tracking-[0.22em] mb-2">
                      EDICIÓN EN CURSO
                    </p>
                    <h2 className="font-grotesk font-bold text-[22px] leading-tight text-ink-1 max-w-[18ch]">
                      La nota se ordena como una pauta de afirmaciones chequeables.
                    </h2>
                    <p className="font-inter text-[13px] text-ink-2 leading-relaxed mt-3 max-w-[56ch]">
                      La vista prioriza el avance editorial, la lectura de etapas y el mapa cromático de claims.
                      El texto completo queda disponible solo cuando hace falta abrirlo.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 xl:grid-cols-1 gap-2">
                    <div className="border border-bdr-faint rounded-[0.2rem] px-3 py-3 bg-surface/30">
                      <p className="font-mono text-[8px] text-outline tracking-[0.18em] mb-1">ETAPA</p>
                      <p className="font-grotesk font-semibold text-[15px] text-ink-1">
                        {String(Math.max(activeStageIndex + 1, 1)).padStart(2, '0')} / 04
                      </p>
                      <p className="font-inter text-[11px] text-ink-2 leading-tight mt-1">
                        {pipelineLabel}
                      </p>
                    </div>
                    <div className="border border-bdr-faint rounded-[0.2rem] px-3 py-3 bg-surface/30">
                      <p className="font-mono text-[8px] text-outline tracking-[0.18em] mb-1">CLAIMS</p>
                      <p className="font-grotesk font-semibold text-[15px] text-ink-1">
                        {detectedCount}
                      </p>
                      <p className="font-inter text-[11px] text-ink-2 leading-tight mt-1">
                        {claims.length} verificados
                      </p>
                    </div>
                    <div className="border border-bdr-faint rounded-[0.2rem] px-3 py-3 bg-surface/30">
                      <p className="font-mono text-[8px] text-outline tracking-[0.18em] mb-1">TEXTO</p>
                      <p className="font-grotesk font-semibold text-[15px] text-ink-1">
                        {transcriptWordCount}
                      </p>
                      <p className="font-inter text-[11px] text-ink-2 leading-tight mt-1">
                        palabras capturadas
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid xl:grid-cols-[1fr_0.9fr]">
                <div className="px-5 py-4 border-b xl:border-b-0 xl:border-r border-bdr-faint">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="font-mono text-[9px] text-outline tracking-[0.18em] mb-1">
                        SECUENCIA
                      </p>
                      <p className="font-inter text-[12px] text-ink-2">
                        Cuatro instancias para pasar de nota a veredicto.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {stageItems.map((item, index) => {
                        const isActive = item.key === visualStep
                        const isComplete = activeStageIndex > index || visualStep === 'complete'
                        return (
                          <span
                            key={item.key}
                            className="w-8 h-1 rounded-full"
                            style={{
                              backgroundColor: isActive
                                ? '#e8e8e9'
                                : isComplete
                                  ? '#9a9a9d'
                                  : '#2a2b2d',
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {stageItems.map((item, index) => {
                      const isActive = item.key === visualStep
                      const isComplete = activeStageIndex > index || visualStep === 'complete'
                      const accent = isActive
                        ? '#e8e8e9'
                        : isComplete
                          ? '#9a9a9d'
                          : '#5a5b5f'

                      return (
                        <div
                          key={item.key}
                          className="rounded-[0.2rem] border px-4 py-3 transition-colors"
                          style={{
                            borderColor: isActive ? '#3a3b3e' : '#252628',
                            backgroundColor: isActive ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.012)',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full border font-mono text-[9px]"
                              style={{ borderColor: accent, color: accent }}
                            >
                              {isComplete ? 'OK' : String(index + 1).padStart(2, '0')}
                            </span>
                            <p className="font-grotesk font-semibold text-[14px]" style={{ color: accent }}>
                              {item.title}
                            </p>
                          </div>
                          <p className="font-inter text-[12px] text-ink-2 leading-relaxed">
                            {item.copy}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="font-mono text-[9px] text-outline tracking-[0.18em] mb-1">
                        RADAR DE CLAIMS
                      </p>
                      <p className="font-inter text-[12px] text-ink-2">
                        Frases detectadas, con prioridad para las últimas apariciones.
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-outline tracking-[0.12em]">
                      {detectedCount} / 7
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {observedClaims.length === 0 && (
                      <div className="grid gap-2.5">
                        {[0, 1, 2].map((index) => {
                          const accent = claimAccents[index % claimAccents.length]
                          return (
                            <div
                              key={index}
                              className="rounded-[0.2rem] border px-3 py-3"
                              style={{
                                borderColor: accent.soft,
                                backgroundColor: 'rgba(255,255,255,0.015)',
                              }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: accent.line, boxShadow: `0 0 0 4px ${accent.soft}` }}
                                />
                                <span className="font-mono text-[9px] tracking-[0.12em]" style={{ color: accent.line }}>
                                  CLAIM {index + 1}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="h-2 rounded bg-surface-container-highest w-[82%]" />
                                <div className="h-2 rounded bg-surface-container-highest w-[68%]" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {observedClaims.map((item) => {
                      const accent = claimAccents[item.claimIndex % claimAccents.length]
                      const isVerified = verifiedClaimIndexes.has(item.claimIndex)

                      return (
                        <div
                          key={item.claimIndex}
                          className="rounded-[0.2rem] border p-3"
                          style={{
                            borderColor: accent.soft,
                            backgroundColor: isVerified ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span
                              className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.1em]"
                              style={{ color: accent.line }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: accent.line, boxShadow: `0 0 0 4px ${accent.soft}` }}
                              />
                              CLAIM {item.claimIndex + 1}
                            </span>
                            <span className="font-mono text-[9px] text-outline tracking-[0.12em]">
                              {isVerified ? 'VERIFICADO' : 'EN ANÁLISIS'}
                            </span>
                          </div>
                          <p className="font-inter text-[12px] text-ink-2 leading-relaxed line-clamp-3">
                            {item.claim}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {showTranscript && (
              <div className="mt-5 border border-bdr-faint bg-surface-container-low rounded-[0.2rem] overflow-hidden">
                <div className="px-5 py-3 border-b border-bdr-faint flex items-center justify-between gap-4">
                  <span className="font-mono text-[9px] text-outline tracking-[0.2em]">
                    TEXTO EXTRAÍDO
                  </span>
                  <span className="font-mono text-[9px] text-outline tracking-[0.15em]">
                    {isStreaming ? 'ACTUALIZANDO' : 'CAPTURA'}
                  </span>
                </div>
                <div ref={textRef} className="max-h-[28vh] overflow-y-auto px-5 py-4">
                  {articleTitle && (
                    <h3 className="font-grotesk font-bold text-[17px] text-ink-1 mb-3 leading-snug">
                      {articleTitle}
                    </h3>
                  )}
                  <p className="font-mono text-[12px] text-ink-2 leading-relaxed">
                    {streamedText}
                    {isStreaming && (
                      <span className="inline-block w-0.5 h-[13px] bg-primary ml-0.5 animate-pulse align-middle" />
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:w-[42%] overflow-hidden bg-surface-container-low">
          <div className="px-5 py-2.5 bg-surface-container flex items-center justify-between shrink-0">
            <span className="font-mono text-[9px] text-outline tracking-[0.2em]">DETECCIONES</span>
            <div className="flex items-center gap-1.5">
              {claimAccents.slice(0, Math.max(Math.min(totalClaims || 4, 6), 4)).map((accent, index) => (
                <span
                  key={accent.line}
                  className="inline-flex items-center justify-center min-w-5 h-5 rounded-full font-mono text-[8px]"
                  style={{ color: accent.line, backgroundColor: accent.soft }}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {claims.map((claim, i) => (
              <ClaimCard
                key={claim.claimIndex ?? i}
                {...claim}
                claimIndex={claim.claimIndex ?? i}
                isLoading={false}
              />
            ))}

            {pendingClaims.map((claim) => (
              <ClaimCard
                key={`loading-${claim.claimIndex}`}
                claim={claim.claim}
                claimIndex={claim.claimIndex}
                isLoading={true}
              />
            ))}

            {totalClaims === 0 && !isDone && (
              <div className="space-y-3">
                <div className="border border-dashed border-bdr rounded-[0.2rem] p-4">
                  <p className="font-grotesk font-semibold text-[16px] text-ink-1 mb-2">
                    La mesa de verificación todavía está vacía.
                  </p>
                  <p className="font-inter text-[13px] text-ink-2 leading-relaxed">
                    Los próximos claims van a caer acá como una primera edición: color propio, estado visible y acceso directo al veredicto.
                  </p>
                </div>

                {[0, 1, 2].map((index) => {
                  const accent = claimAccents[index % claimAccents.length]
                  return (
                    <div
                      key={index}
                      className="rounded-[0.2rem] border p-3"
                      style={{
                        borderColor: accent.soft,
                        backgroundColor: 'rgba(255,255,255,0.015)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span
                          className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.1em]"
                          style={{ color: accent.line }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: accent.line, boxShadow: `0 0 0 4px ${accent.soft}` }}
                          />
                          CLAIM {index + 1}
                        </span>
                        <span className="font-mono text-[9px] text-outline tracking-[0.12em]">
                          EN ESPERA
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="h-2 rounded bg-surface-container-highest w-[88%]" />
                        <div className="h-2 rounded bg-surface-container-highest w-[66%]" />
                        <div className="h-2 rounded bg-surface-container-highest w-[78%]" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

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
