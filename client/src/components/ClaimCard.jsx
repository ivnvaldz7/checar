import { claimAccents, verdicts, verdictBg, verdictLabels } from '../tokens'

// ── Sparkline SVG inline ───────────────────────────────────────────────────
// Renderiza un gráfico de línea simple a partir de datos históricos.
// Solo aplica a claims numéricos (historicalData != null).

function Sparkline({ data }) {
  if (!data || data.length < 2) return null

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const W = 120
  const H = 32
  const PAD = 3

  const coords = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2)
    return [x, y]
  })

  const polyline = coords.map(([x, y]) => `${x},${y}`).join(' ')
  const [lastX, lastY] = coords[coords.length - 1]

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke="#5b51e8"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="#5b51e8" />
    </svg>
  )
}

// ── ClaimCard ──────────────────────────────────────────────────────────────
// Props:
//   claim         string  — texto del claim
//   verdict       string  — acertado | dudoso | falso | sin_datos
//   explanation   string  — explicación de la verificación
//   sources       { url: string, label: string }[] | string[] — fuentes (acepta ambos formatos)
//   historicalData { month: string, value: number }[] | null
//   isLoading     bool    — muestra esqueleto animado mientras se verifica

export default function ClaimCard({
  claimIndex,
  claim,
  verdict,
  explanation,
  sources,
  historicalData,
  isLoading,
}) {
  const accent = claimAccents[(claimIndex ?? 0) % claimAccents.length]

  // ── Estado loading ─────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="border-l-4 rounded-r-lg p-4 animate-claim-appear"
        style={{
          borderLeftColor: accent.line,
          backgroundColor: 'rgba(25, 25, 27, 0.92)',
          boxShadow: `inset 0 1px 0 ${accent.soft}`,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 min-w-6 px-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent.soft }} />
          <div className="h-2.5 bg-bg3 rounded w-20 animate-shimmer" />
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-2.5 bg-bg3 rounded w-full animate-shimmer" />
          <div className="h-2.5 bg-bg3 rounded w-4/5 animate-shimmer" />
          <div className="h-2.5 bg-bg3 rounded w-3/5 animate-shimmer" />
        </div>
        {/* Barra de progreso animada */}
        <div className="w-full h-0.5 bg-bg3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full animate-shimmer"
            style={{ width: '65%', backgroundColor: accent.line }}
          />
        </div>
      </div>
    )
  }

  // Normalizar fuentes: acepta { url, label }[] del pipeline o string[] del mock
  const normalizedSources = (sources || []).map(src =>
    typeof src === 'string'
      ? { url: src, label: src.replace(/^https?:\/\//, '').replace(/\/$/, '') }
      : src
  )

  // ── Estado verificado ──────────────────────────────
  const borderColor = verdicts[verdict] ?? verdicts.sin_datos
  const bgColor     = verdictBg[verdict] ?? verdictBg.sin_datos
  const label       = verdictLabels[verdict] ?? 'SIN DATOS'

  const badgeColors = {
    acertado:  'text-ok  bg-ok-bg  border border-ok/20',
    dudoso:    'text-warn bg-warn-bg border border-warn/20',
    falso:     'text-fail bg-fail-bg border border-fail/20',
    sin_datos: 'text-na  bg-na-bg  border border-na/20',
  }

  return (
    <div
      className="border-l-4 rounded-r-lg p-4 animate-claim-appear transition-all"
      style={{
        borderLeftColor: accent.line,
        backgroundColor: bgColor,
        boxShadow: `inset 0 1px 0 ${accent.soft}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center min-w-7 h-7 rounded-full font-mono text-[10px] font-bold"
            style={{ backgroundColor: accent.soft, color: accent.line }}
          >
            {(claimIndex ?? 0) + 1}
          </span>
          <span
            className={`text-[10px] font-grotesk font-semibold tracking-widest px-2 py-0.5 rounded ${badgeColors[verdict] ?? badgeColors.sin_datos}`}
          >
            {label}
          </span>
        </div>
        {historicalData && (
          <Sparkline data={historicalData} />
        )}
      </div>

      <p className="font-mono text-[13px] text-ink-1 leading-relaxed mb-3 italic">
        &ldquo;{claim}&rdquo;
      </p>

      {/* Explicación */}
      {explanation && (
        <p className="font-inter text-[12px] text-ink-2 leading-relaxed mb-3">
          {explanation}
        </p>
      )}

      {/* Fuentes */}
      {normalizedSources.length > 0 && (
        <div className="space-y-1">
          {normalizedSources.map((src, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="material-icons text-ink-3 text-[11px]">link</span>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-ink-3 hover:text-ink-2 truncate transition-colors"
              >
                {src.label}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Sin datos: mensaje informativo */}
      {verdict === 'sin_datos' && normalizedSources.length === 0 && (
        <p className="font-inter text-[11px] text-ink-3 italic mt-1">
          No hay fuentes suficientes para verificar esta afirmación.
        </p>
      )}
    </div>
  )
}
