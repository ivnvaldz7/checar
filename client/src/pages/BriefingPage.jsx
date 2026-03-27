import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ClaimCard from '../components/ClaimCard'
import useAnalysisStore from '../store/analysisStore'
import { verdicts, verdictLabels } from '../tokens'

// ── Mock data de fallback ──────────────────────────────────────────────────
// Se usa cuando BriefingPage se abre directamente (sin pasar por AnalysisPage).
// Misma forma que analysis_complete (ver CONTEXT.md).

const MOCK_CLAIMS = [
  {
    claim: 'La inflación interanual acumuló un 211% en 2023',
    verdict: 'acertado',
    explanation:
      'Según el INDEC, el IPC registró una variación de 211,4% en 2023, confirmando el dato citado.',
    sources: [
      'https://www.indec.gob.ar/uploads/informesdeprensa/ipc_01_24.pdf',
      'https://chequeado.com/el-explicador/inflacion-2023/',
    ],
    historicalData: [
      { month: 'Ene', value: 6.0 },
      { month: 'Feb', value: 6.6 },
      { month: 'Mar', value: 7.7 },
      { month: 'Abr', value: 8.4 },
      { month: 'May', value: 7.8 },
      { month: 'Jun', value: 6.0 },
      { month: 'Jul', value: 6.3 },
      { month: 'Ago', value: 12.4 },
      { month: 'Sep', value: 12.7 },
      { month: 'Oct', value: 8.3 },
      { month: 'Nov', value: 12.8 },
      { month: 'Dic', value: 25.5 },
    ],
  },
  {
    claim: 'El déficit fiscal fue eliminado completamente en el primer trimestre de 2024',
    verdict: 'dudoso',
    explanation:
      'El Ministerio de Economía informó superávit financiero en enero-marzo 2024, aunque economistas señalan que el resultado excluye pagos diferidos y transferencias a provincias.',
    sources: [
      'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-35-46',
      'https://chequeado.com/el-explicador/deficit-fiscal-2024/',
    ],
    historicalData: null,
  },
  {
    claim: 'El desempleo se ubicó en 5,7% en el tercer trimestre de 2023',
    verdict: 'acertado',
    explanation:
      'La Encuesta Permanente de Hogares del INDEC para el tercer trimestre de 2023 registró una tasa de desocupación de 5,7%.',
    sources: [
      'https://www.indec.gob.ar/uploads/informesdeprensa/EPH_cont_3trim23_08_23.pdf',
    ],
    historicalData: [
      { month: 'Q1 22', value: 7.0 },
      { month: 'Q2 22', value: 6.9 },
      { month: 'Q3 22', value: 7.1 },
      { month: 'Q4 22', value: 6.3 },
      { month: 'Q1 23', value: 6.9 },
      { month: 'Q2 23', value: 6.2 },
      { month: 'Q3 23', value: 5.7 },
    ],
  },
  {
    claim: 'El gobierno transfirió fondos coparticipables por encima de lo estipulado legalmente',
    verdict: 'falso',
    explanation:
      'Según el Boletín Oficial y la OPC, las transferencias estuvieron por debajo de los índices de la Ley de Coparticipación Federal durante el período analizado.',
    sources: [
      'https://www.boletinoficial.gob.ar',
      'https://www.opc.gob.ar/publicaciones/',
    ],
    historicalData: null,
  },
  {
    claim: 'Las reservas del Banco Central superan los USD 30.000 millones',
    verdict: 'sin_datos',
    explanation:
      'No fue posible verificar este dato. Las reservas brutas del BCRA fluctúan diariamente y la información disponible no corresponde al período citado.',
    sources: [],
    historicalData: null,
  },
]

const MOCK_TITLE = 'Gobierno confirma superávit primario y apunta a reservas del BCRA'

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
  const [copied, setCopied] = useState(false)

  // Lee del store si viene de AnalysisPage; si no, usa el mock.
  const storeClaims = useAnalysisStore((s) => s.claims)
  const storeTitle  = useAnalysisStore((s) => s.articleTitle)
  const reset       = useAnalysisStore((s) => s.reset)

  const claims = storeClaims.length > 0 ? storeClaims : MOCK_CLAIMS
  const title  = storeTitle  || MOCK_TITLE

  const counts = VERDICT_COUNTS(claims)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText(claims, title))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback: no hay nada útil que hacer sin permisos de clipboard
    }
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
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-highest px-3 py-2 font-mono text-[10px] text-ink-1 rounded-[0.125rem] tracking-[0.05em] transition-colors"
          >
            <span className="material-icons text-[13px] text-primary">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'COPIADO' : 'COPIAR BRIEFING'}
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
                <span className="font-mono text-[9px] text-outline tracking-wide">#{i + 1}</span>
                <span className="flex-1 h-px bg-surface-container-highest" />
              </div>
              <ClaimCard {...claim} isLoading={false} />
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
