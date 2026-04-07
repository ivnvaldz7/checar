import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ClaimCard from '../components/ClaimCard'
import useAnalysisStore from '../store/analysisStore'
import { claimAccents, verdicts, verdictLabels } from '../tokens'

// ── Helpers ────────────────────────────────────────────────────────────────

function buildCopyText(claims, title) {
  const date = new Date().toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const lines = [
    'ChecAR — Briefing de verificación',
    `Fuente: ${title || 'Texto pegado'}`,
    `Fecha: ${date}`,
    '',
    'CLAIMS VERIFICADOS',
    '',
  ]
  claims.forEach((c, i) => {
    lines.push(`[${i + 1}] "${c.claim}"`)
    lines.push(`Veredicto: ${verdictLabels[c.verdict] ?? c.verdict}`)
    lines.push(`Explicación: ${c.explanation}`)
    if (c.sources?.length) {
      const srcList = c.sources.map(s => (typeof s === 'string' ? s : s.url)).join(', ')
      lines.push(`Fuentes: ${srcList}`)
    }
    if (c.historicalData) {
      const last = c.historicalData[c.historicalData.length - 1]
      lines.push(`Contexto histórico: último dato registrado → ${last.month}: ${last.value}`)
    }
    lines.push('')
  })
  return lines.join('\n')
}

const VERDICT_COUNTS = (claims) => ({
  acertado:  claims.filter((c) => c.verdict === 'acertado').length,
  dudoso:    claims.filter((c) => c.verdict === 'dudoso').length,
  falso:     claims.filter((c) => c.verdict === 'falso').length,
  sin_datos: claims.filter((c) => c.verdict === 'sin_datos').length,
})

const SUMMARY_ITEMS = [
  { key: 'acertado',  icon: 'check_circle', label: 'Acertados' },
  { key: 'dudoso',    icon: 'warning',      label: 'Dudosos'   },
  { key: 'falso',     icon: 'cancel',       label: 'Falsos'    },
  { key: 'sin_datos', icon: 'help',         label: 'Sin datos' },
]

// ── Componente ─────────────────────────────────────────────────────────────

export default function BriefingPage() {
  const navigate    = useNavigate()
  const [shareState, setShareState] = useState('idle')

  // Lee del store si viene de AnalysisPage; si no, usa el mock.
  const storeClaims = useAnalysisStore((s) => s.claims)
  const storeTitle  = useAnalysisStore((s) => s.articleTitle)
  const reset       = useAnalysisStore((s) => s.reset)

  const claims = storeClaims
  const title  = storeTitle || 'Texto pegado'

  const counts = VERDICT_COUNTS(claims)
  const claimLegend = claims.map((claim, index) => {
    const claimIndex = claim.claimIndex ?? index
    return {
      ...claim,
      claimIndex,
      accent: claimAccents[claimIndex % claimAccents.length],
    }
  })

  const briefingText = buildCopyText(claims, title)

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `ChecAR — ${title}`,
          text: briefingText,
        })
        setShareState('shared')
      } else {
        await navigator.clipboard.writeText(briefingText)
        setShareState('copied')
      }

      setTimeout(() => setShareState('idle'), 2500)
    } catch {
      // Si compartir falla o se cancela, evitamos romper la UI.
    }
  }

  if (claims.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex flex-col font-inter">
        <header className="h-14 bg-surface-container-low flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-icons text-primary text-[20px]">fact_check</span>
            <span className="font-grotesk font-bold text-[18px] tracking-tight text-ink-1">
              Chec<span className="text-primary">AR</span>
            </span>
          </div>
          <button
            onClick={() => { reset(); navigate('/') }}
            className="flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-highest px-3 py-2 font-mono text-[10px] text-ink-1 rounded-[0.125rem] tracking-[0.05em] transition-colors"
          >
            <span className="material-icons text-[13px] text-primary">arrow_back</span>
            VOLVER
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="max-w-lg w-full border border-bdr-faint bg-surface-container-low rounded-[0.2rem] p-6">
            <p className="font-mono text-[9px] text-outline tracking-[0.2em] mb-3">
              BRIEFING NO DISPONIBLE
            </p>
            <h1 className="font-grotesk font-bold text-[26px] text-ink-1 leading-tight mb-3">
              No hay un resumen verificado cargado en esta sesión.
            </h1>
            <p className="font-inter text-[14px] text-ink-2 leading-relaxed mb-6">
              El briefing ahora se guarda solo cuando el análisis termina bien.
              Si entraste directo a esta ruta o recargaste antes de completar el chequeo,
              hace falta iniciar una nueva consulta.
            </p>
            <button
              onClick={() => { reset(); navigate('/') }}
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-grotesk font-semibold text-sm px-4 py-3 rounded-[0.125rem] hover:opacity-90 transition-opacity"
            >
              Nueva consulta
              <span className="material-icons text-[16px]">arrow_forward</span>
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col font-inter">

      {/* Header */}
      <header className="h-14 bg-surface-container-low flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="material-icons text-primary text-[20px]">fact_check</span>
          <span className="font-grotesk font-bold text-[18px] tracking-tight text-ink-1">
            Chec<span className="text-primary">AR</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-highest px-3 py-2 font-mono text-[10px] text-ink-1 rounded-[0.125rem] tracking-[0.05em] transition-colors"
          >
            <span className="material-icons text-[13px] text-primary">
              {shareState === 'idle' ? 'ios_share' : 'check'}
            </span>
            {shareState === 'shared' && 'COMPARTIDO'}
            {shareState === 'copied' && 'COPIADO'}
            {shareState === 'idle' && 'COMPARTIR RESUMEN'}
          </button>
          <button
            onClick={() => { reset(); navigate('/') }}
            className="flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-highest px-3 py-2 font-mono text-[10px] text-ink-1 rounded-[0.125rem] tracking-[0.05em] transition-colors"
          >
            <span className="material-icons text-[13px] text-primary">add_circle</span>
            NUEVA CONSULTA
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-8">

        {/* Label sección */}
        <div className="flex items-center gap-3 mb-6">
          <span className="font-mono text-[9px] text-outline tracking-[0.2em] shrink-0">
            BRIEFING DE VERIFICACIÓN
          </span>
          <span className="flex-1 h-px bg-surface-container-highest" />
        </div>

        {/* Título y fecha */}
        <h1 className="font-grotesk font-bold text-xl text-ink-1 leading-snug mb-2">
          {title}
        </h1>
        <p className="font-mono text-[11px] text-outline mb-8">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>

        {/* Resumen por veredicto */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {SUMMARY_ITEMS.map(({ key, icon, label }) => (
            <div
              key={key}
              className="bg-surface-container-low p-3 flex flex-col items-center gap-1.5 rounded-[0.125rem]"
            >
              <span
                className="material-icons text-[20px]"
                style={{ color: verdicts[key] }}
              >
                {icon}
              </span>
              <span
                className="font-grotesk font-bold text-xl"
                style={{ color: verdicts[key] }}
              >
                {counts[key]}
              </span>
              <span className="font-mono text-[9px] text-outline text-center leading-tight tracking-[0.1em]">
                {label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-surface-container-low border border-bdr-faint rounded-[0.2rem] p-4 mb-8">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="font-mono text-[9px] text-outline tracking-[0.18em]">
              MAPA DE CLAIMS
            </span>
            <span className="font-mono text-[9px] text-outline tracking-[0.14em]">
              {claimLegend.length} REFERENCIAS
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-2.5">
            {claimLegend.map((claim) => (
              <div
                key={claim.claimIndex}
                className="rounded-[0.2rem] border px-3 py-2.5"
                style={{
                  borderColor: claim.accent.soft,
                  backgroundColor: 'rgba(255,255,255,0.015)',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-flex items-center justify-center min-w-6 h-6 rounded-full font-mono text-[9px] font-bold"
                    style={{
                      color: claim.accent.line,
                      backgroundColor: claim.accent.soft,
                    }}
                  >
                    #{claim.claimIndex + 1}
                  </span>
                  <span
                    className="font-mono text-[9px] tracking-[0.12em]"
                    style={{ color: claim.accent.line }}
                  >
                    {verdictLabels[claim.verdict] ?? claim.verdict}
                  </span>
                </div>
                <p className="font-inter text-[12px] text-ink-2 leading-relaxed line-clamp-2">
                  {claim.claim}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Label claims */}
        <div className="flex items-center gap-3 mb-5">
          <span className="font-mono text-[9px] text-outline tracking-[0.2em] shrink-0">
            CLAIMS VERIFICADOS
          </span>
          <span className="flex-1 h-px bg-surface-container-highest" />
          <span className="font-mono text-[9px] text-outline shrink-0">
            {claims.length} / 7
          </span>
        </div>

        {/* Lista de claims */}
        <div className="space-y-4 mb-10">
          {claims.map((claim, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="inline-flex items-center justify-center min-w-6 h-6 rounded-full font-mono text-[9px] font-bold"
                  style={{
                    color: claimAccents[(claim.claimIndex ?? i) % claimAccents.length].line,
                    backgroundColor: claimAccents[(claim.claimIndex ?? i) % claimAccents.length].soft,
                  }}
                >
                  #{(claim.claimIndex ?? i) + 1}
                </span>
                <span
                  className="flex-1 h-px"
                  style={{ backgroundColor: claimAccents[(claim.claimIndex ?? i) % claimAccents.length].soft }}
                />
              </div>
              <ClaimCard {...claim} claimIndex={claim.claimIndex ?? i} isLoading={false} />
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
